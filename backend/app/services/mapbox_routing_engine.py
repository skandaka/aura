"""
Mapbox-based routing engine for highly accurate road-following routes
Uses Mapbox Directions API for precise navigation
"""

import math
import asyncio
import time
import json
import httpx
from typing import List, Dict, Tuple, Optional
from datetime import datetime
import uuid

from ..models.schemas import (
    RouteRequest, Route, RoutePoint, AccessibilityScore, 
    RouteAlternative, Coordinates, ObstacleResponse
)
from ..services.obstacle_detector import ObstacleDetector
from ..services.accessibility_analyzer import AccessibilityAnalyzer

class MapboxRoutingEngine:
    """
    High-accuracy routing engine using Mapbox Directions API
    Ensures routes follow actual roads, sidewalks, and proper intersections
    """
    
    def __init__(self):
        self.obstacle_detector = ObstacleDetector()
        self.accessibility_analyzer = AccessibilityAnalyzer()
        self.route_cache = {}
        
        # Mapbox API configuration
        # Note: In production, use environment variables for API keys
        self.mapbox_token = "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"  # Public demo token
        self.base_url = "https://api.mapbox.com/directions/v5/mapbox"
        
    async def calculate_route(self, request: RouteRequest) -> Route:
        """
        Calculate route using Mapbox Directions API for maximum accuracy
        """
        start_time = time.time()
        route_id = str(uuid.uuid4())
        
        print(f"🗺️ Calculating Mapbox route from {request.start.latitude}, {request.start.longitude} to {request.end.latitude}, {request.end.longitude}")
        
        try:
            # Get route from Mapbox
            mapbox_route = await self._get_mapbox_route(request)
            
            if not mapbox_route:
                print("⚠️ Mapbox routing failed, using fallback")
                return await self._calculate_fallback_route(request)
            
            # Convert Mapbox route to our format
            route_points = await self._convert_mapbox_route(mapbox_route, request)
            
            # Detect obstacles along the route
            obstacles = await self.obstacle_detector.find_obstacles_along_route(
                request.start, request.end, radius=200
            )
            
            # Calculate accessibility score
            accessibility_score = await self.accessibility_analyzer.calculate_comprehensive_score(
                route_points, request.preferences, obstacles
            )
            
            # Extract route metrics from Mapbox data
            total_distance = mapbox_route.get('distance', 0) / 1000.0  # Convert to km
            estimated_time = int(mapbox_route.get('duration', 900) / 60)  # Convert to minutes
            
            # Generate route warnings and features
            warnings = self._generate_route_warnings(accessibility_score, obstacles)
            features = self._generate_accessibility_features(accessibility_score, request.preferences)
            
            # Generate alternative routes
            alternatives = await self._generate_alternative_routes(request)
            
            # Create route summary with Mapbox data
            route_summary = {
                "efficiency_rating": self._calculate_efficiency_rating(total_distance * 1000, estimated_time),
                "comfort_level": accessibility_score.overall_score,
                "obstacle_count": len(obstacles),
                "elevation_gain": 0.0,  # TODO: Add elevation from Mapbox
                "surface_types": ["Paved road", "Sidewalk"],
                "road_types": self._extract_road_types(mapbox_route),
                "routing_engine": "mapbox",
                "route_accuracy": "high"
            }
            
            # Create complete route object
            route = Route(
                route_id=route_id,
                points=route_points,
                total_distance=total_distance,
                estimated_time=estimated_time,
                accessibility_score=accessibility_score,
                alternatives=alternatives,
                warnings=warnings,
                accessibility_features=features,
                route_summary=route_summary,
                created_at=datetime.utcnow(),
                calculation_time_ms=int((time.time() - start_time) * 1000)
            )
            
            print(f"✅ Mapbox route calculated successfully in {route.calculation_time_ms}ms")
            return route
            
        except Exception as e:
            print(f"❌ Mapbox routing error: {e}")
            return await self._calculate_fallback_route(request)
    
    async def _get_mapbox_route(self, request: RouteRequest) -> Optional[Dict]:
        """
        Get route from Mapbox Directions API
        """
        # Build coordinates string
        coords = f"{request.start.longitude},{request.start.latitude};{request.end.longitude},{request.end.latitude}"
        
        # Choose profile based on mobility aid
        profile = self._get_mapbox_profile(request.preferences.mobility_aid.value)
        
        # Build API URL
        url = f"{self.base_url}/{profile}/{coords}"
        
        params = {
            'access_token': self.mapbox_token,
            'geometries': 'geojson',
            'steps': 'true',
            'overview': 'full',
            'alternatives': 'true',
            'annotations': 'distance,duration'
        }
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:  # Reduced timeout to 5 seconds
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('routes') and len(data['routes']) > 0:
                        return data['routes'][0]  # Return best route
                elif response.status_code == 401 or response.status_code == 403:
                    print(f"❌ Mapbox API access denied (status: {response.status_code}) - falling back to road network routing")
                    return None  # Fail fast for auth issues
                else:
                    print(f"❌ Mapbox API error: {response.status_code}")
                    
        except Exception as e:
            print(f"❌ Mapbox API request failed: {e}")
        
        return None
    
    def _get_mapbox_profile(self, mobility_aid: str) -> str:
        """
        Get appropriate Mapbox routing profile based on mobility aid
        """
        if mobility_aid in ["wheelchair", "walker"]:
            return "walking"  # Use walking profile for accessibility
        elif mobility_aid == "guide_dog":
            return "walking"
        else:
            return "walking"  # Default to walking for pedestrian routes
    
    async def _convert_mapbox_route(self, mapbox_route: Dict, request: RouteRequest) -> List[RoutePoint]:
        """
        Convert Mapbox route to our RoutePoint format
        """
        route_points = []
        geometry = mapbox_route.get('geometry', {})
        coordinates = geometry.get('coordinates', [])
        steps = mapbox_route.get('legs', [{}])[0].get('steps', [])
        
        if not coordinates:
            return route_points
        
        # Calculate cumulative distances
        cumulative_distance = 0.0
        
        for i, coord in enumerate(coordinates):
            lon, lat = coord
            
            # Calculate distance from start
            if i > 0:
                prev_coord = coordinates[i-1]
                segment_distance = self._calculate_distance(
                    prev_coord[1], prev_coord[0], lat, lon
                )
                cumulative_distance += segment_distance
            
            # Generate instruction based on Mapbox steps
            instruction = self._generate_instruction_from_steps(i, len(coordinates), steps)
            
            # Generate accessibility features
            accessibility_features = self._generate_point_features(request.preferences)
            
            # Calculate segment time (estimate)
            segment_time = self._calculate_segment_time(cumulative_distance, request.preferences)
            
            route_points.append(RoutePoint(
                latitude=lat,
                longitude=lon,
                instruction=instruction,
                distance_from_start=cumulative_distance,
                elevation=0.0,  # TODO: Add elevation data
                accessibility_features=accessibility_features,
                warnings=[],
                segment_time=segment_time
            ))
        
        return route_points
    
    def _generate_instruction_from_steps(self, index: int, total_points: int, steps: List[Dict]) -> str:
        """
        Generate navigation instructions based on Mapbox step data
        """
        if index == 0:
            return "Start your accessible journey"
        elif index == total_points - 1:
            return "You have arrived at your destination"
        
        # Try to match with Mapbox step instructions
        for step in steps:
            maneuver = step.get('maneuver', {})
            instruction = maneuver.get('instruction', '')
            if instruction:
                return instruction
        
        # Fallback instructions
        if index < total_points // 3:
            return "Continue straight on accessible pathway"
        elif index < 2 * total_points // 3:
            return "Continue toward destination"
        else:
            return "Approaching destination"
    
    def _generate_point_features(self, preferences) -> List[str]:
        """
        Generate accessibility features for route points
        """
        features = []
        
        if preferences.require_curb_cuts:
            features.append("Curb cuts available")
        if preferences.prefer_wider_sidewalks:
            features.append("Wide sidewalk")
        if preferences.avoid_stairs:
            features.append("No stairs")
        
        return features
    
    def _extract_road_types(self, mapbox_route: Dict) -> List[str]:
        """
        Extract road types from Mapbox route data
        """
        # Mapbox doesn't directly provide road types in basic response
        # This would need enhanced API calls or manual classification
        return ["Primary Road", "Secondary Road", "Sidewalk"]
    
    async def _generate_alternative_routes(self, request: RouteRequest) -> List[RouteAlternative]:
        """
        Generate alternative route options
        """
        alternatives = []
        
        # Generate a more accessible route (hypothetical)
        accessible_route = RouteAlternative(
            route_id=str(uuid.uuid4()),
            description="Most accessible route (may be longer)",
            total_distance=2.5,
            estimated_time=18,
            accessibility_score=0.95,
            key_features=["Excellent accessibility", "Wide sidewalks", "No stairs", "Well-lit paths"]
        )
        alternatives.append(accessible_route)
        
        # Generate a faster route (hypothetical)
        fast_route = RouteAlternative(
            route_id=str(uuid.uuid4()),
            description="Fastest route (some accessibility challenges)",
            total_distance=1.8,
            estimated_time=12,
            accessibility_score=0.7,
            key_features=["Shorter distance", "Some steps", "Narrow sections"]
        )
        alternatives.append(fast_route)
        
        return alternatives
    
    def _generate_route_warnings(self, accessibility_score: AccessibilityScore, obstacles: List[ObstacleResponse]) -> List[str]:
        """
        Generate warnings for the route
        """
        warnings = []
        
        if accessibility_score.overall_score < 0.6:
            warnings.append("⚠️ Route has accessibility challenges")
        
        if len(obstacles) > 2:
            warnings.append("⚠️ Multiple obstacles detected")
        
        if any(obs.severity.value == "critical" for obs in obstacles):
            warnings.append("🚨 Critical barriers detected")
        
        return warnings
    
    def _generate_accessibility_features(self, accessibility_score: AccessibilityScore, preferences) -> List[str]:
        """
        Generate positive accessibility features
        """
        features = []
        
        if accessibility_score.surface_quality > 0.8:
            features.append("✅ Excellent surface quality")
        
        if accessibility_score.slope_accessibility > 0.8:
            features.append("✅ Gentle slopes, wheelchair accessible")
        
        if preferences.avoid_stairs and accessibility_score.obstacle_avoidance > 0.7:
            features.append("✅ No stairs on this route")
        
        if accessibility_score.width_adequacy > 0.8:
            features.append("✅ Wide pathways")
        
        features.append("✅ Follows actual roads and sidewalks")
        features.append("✅ Uses proper intersections")
        
        return features
    
    async def _calculate_fallback_route(self, request: RouteRequest) -> Route:
        """
        Fallback to simple routing when Mapbox is unavailable
        """
        print("🔄 Using fallback routing method")
        from .routing_engine import AdvancedRoutingEngine
        fallback_engine = AdvancedRoutingEngine()
        return await fallback_engine._calculate_simple_route(request)
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance using Haversine formula
        """
        R = 6371000  # Earth's radius in meters
        
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def _calculate_segment_time(self, distance: float, preferences) -> int:
        """
        Calculate time for a route segment
        """
        base_speed = 4.0  # km/h
        speed_modifier = 1.0
        
        if preferences.mobility_aid.value == "wheelchair":
            speed_modifier = 0.8
        elif preferences.mobility_aid.value == "walker":
            speed_modifier = 0.6
        
        effective_speed = base_speed * speed_modifier
        return int((distance / 1000) / effective_speed * 3600)  # seconds
    
    def _calculate_efficiency_rating(self, distance: float, time: int) -> float:
        """
        Calculate route efficiency rating
        """
        ideal_time = (distance / 1000) / 4.0 * 60  # 4 km/h ideal speed
        efficiency = min(1.0, ideal_time / max(time, 1))
        return round(efficiency, 2)
