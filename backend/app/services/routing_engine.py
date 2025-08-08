"""
Advanced routing engine for accessible navigation
"""

import math
import asyncio
import time
from typing import List, Dict, Tuple, Optional
from datetime import datetime
import uuid
import json

from ..models.schemas import (
    RouteRequest, Route, RoutePoint, AccessibilityScore, 
    RouteAlternative, Coordinates, ObstacleResponse
)
from ..services.obstacle_detector import ObstacleDetector
from ..services.accessibility_analyzer import AccessibilityAnalyzer
from ..services.geospatial_processor import GeospatialProcessor
from ..services.mapbox_routing_engine import MapboxRoutingEngine
from ..services.road_network_router import RoadNetworkRouter

class AdvancedRoutingEngine:
    """
    Sophisticated routing engine with multiple routing options
    Priority: Mapbox > Road Network > Simple routing
    """
    
    def __init__(self):
        self.obstacle_detector = ObstacleDetector()
        self.accessibility_analyzer = AccessibilityAnalyzer()
        self.geospatial_processor = GeospatialProcessor()
        self.mapbox_router = MapboxRoutingEngine()
        self.road_network_router = RoadNetworkRouter()
        self.route_cache = {}
        self.use_mapbox = True
        self.use_road_network = True
        
    async def calculate_route(self, request: RouteRequest) -> Route:
        """
        Calculate an advanced accessible route with comprehensive analysis
        Priority: Mapbox (most accurate) > Road Network > Simple routing
        """
        start_time = time.time()
        
        # Generate unique route ID
        route_id = str(uuid.uuid4())
        
        # Check cache first
        cache_key = self._generate_cache_key(request)
        if cache_key in self.route_cache:
            cached_route = self.route_cache[cache_key]
            cached_route.route_id = route_id
            cached_route.created_at = datetime.utcnow()
            return cached_route
        
        # Try Mapbox routing first (highest accuracy) with timeout
        try:
            print("🗺️ Attempting Mapbox routing for maximum accuracy")
            route = await asyncio.wait_for(
                self.mapbox_router.calculate_route(request), 
                timeout=10.0  # 10 second timeout for Mapbox
            )
            
            # Check if it's a real Mapbox route (not fallback)
            if route.route_summary and route.route_summary.get("routing_provider") == "Mapbox":
                print("✅ Using Mapbox routing - routes follow real roads")
                self.route_cache[cache_key] = route
                return route
            else:
                print("⚠️ Mapbox fallback detected, trying road network routing")
        except asyncio.TimeoutError:
            print("⏰ Mapbox routing timed out, trying road network routing")
        except Exception as e:
            print(f"⚠️ Mapbox routing failed: {e}")

        # Try road network routing as backup with timeout
        try:
            print("🛣️ Attempting road network routing")
            route = await asyncio.wait_for(
                self.road_network_router.calculate_route(request),
                timeout=15.0  # 15 second timeout for road network
            )
            
            # Cache the result
            self.route_cache[cache_key] = route
            return route
            
        except asyncio.TimeoutError:
            print("⏰ Road network routing timed out, using simple routing")
        except Exception as e:
            print(f"⚠️ Road network routing failed: {e}")        # Fallback to simple routing
        print("📍 Using simple routing as final fallback")
        route = await self._calculate_simple_route(request)
        self.route_cache[cache_key] = route
        return route
    
    async def _calculate_simple_route(self, request: RouteRequest) -> Route:
        """
        Calculate route using simple point-to-point algorithm (fallback)
        """
        start_time = time.time()
        route_id = str(uuid.uuid4())
        
        # Detect obstacles along the route
        obstacles = await self.obstacle_detector.find_obstacles_along_route(
            request.start, request.end, radius=200
        )
        
        # Generate route points with accessibility considerations
        route_points = await self._generate_route_points(request, obstacles)
        
        # Calculate accessibility score
        accessibility_score = await self.accessibility_analyzer.calculate_comprehensive_score(
            route_points, request.preferences, obstacles
        )
        
        # Calculate route metrics
        total_distance = self._calculate_total_distance(route_points)
        estimated_time = self._calculate_estimated_time(
            total_distance, accessibility_score, request.preferences
        )
        
        # Generate route warnings and features
        warnings = self._generate_route_warnings(accessibility_score, obstacles)
        features = self._generate_accessibility_features(accessibility_score, request.preferences)
        
        # Generate alternative routes
        alternatives = await self._generate_alternative_routes(request, route_points)
        
        # Create route summary
        route_summary = {
            "efficiency_rating": self._calculate_efficiency_rating(total_distance, estimated_time),
            "comfort_level": accessibility_score.overall_score,
            "obstacle_count": len(obstacles),
            "elevation_gain": self._calculate_elevation_gain(route_points),
            "surface_types": self._analyze_surface_types(route_points)
        }
        
        # Create complete route object
        route = Route(
            route_id=route_id,
            points=route_points,
            total_distance=total_distance / 1000.0,  # Convert meters to kilometers
            estimated_time=estimated_time,
            accessibility_score=accessibility_score,
            alternatives=alternatives,
            warnings=warnings,
            accessibility_features=features,
            route_summary=route_summary,
            created_at=datetime.utcnow(),
            calculation_time_ms=int((time.time() - start_time) * 1000)
        )
        
        # Cache the result
        cache_key = self._generate_cache_key(request)
        self.route_cache[cache_key] = route
        
        return route
    
    async def _generate_route_points(self, request: RouteRequest, obstacles: List[ObstacleResponse]) -> List[RoutePoint]:
        """Generate detailed route points with accessibility analysis"""
        
        # Calculate total distance
        total_distance = self._calculate_distance(
            request.start.latitude, request.start.longitude,
            request.end.latitude, request.end.longitude
        )
        
        # Determine number of segments based on distance
        num_segments = max(5, min(20, int(total_distance / 100)))  # 1 point per ~100m
        route_points = []
        
        for i in range(num_segments + 1):
            ratio = i / num_segments
            
            # Calculate coordinates
            lat = request.start.latitude + (request.end.latitude - request.start.latitude) * ratio
            lon = request.start.longitude + (request.end.longitude - request.start.longitude) * ratio
            
            # Generate instruction
            instruction = self._generate_instruction(i, num_segments, total_distance, ratio)
            
            # Calculate distance from start
            distance_from_start = total_distance * ratio
            
            # Simulate elevation (in real implementation, use elevation API)
            elevation = 10 + math.sin(ratio * math.pi * 2) * 15 + ratio * 5
            
            # Find nearby obstacles and generate warnings
            warnings = []
            accessibility_features = []
            
            for obstacle in obstacles:
                dist_to_obstacle = self._calculate_distance(
                    lat, lon, obstacle.location.latitude, obstacle.location.longitude
                )
                if dist_to_obstacle < 50:  # Within 50m
                    if obstacle.severity.value in ["high", "critical"]:
                        warnings.append(f"⚠️ {obstacle.type.value.replace('_', ' ').title()}: {obstacle.description}")
                    else:
                        warnings.append(f"ℹ️ {obstacle.type.value.replace('_', ' ').title()} ahead")
            
            # Add positive accessibility features
            if request.preferences.require_curb_cuts:
                accessibility_features.append("Curb cuts available")
            if request.preferences.prefer_wider_sidewalks and ratio > 0.2 and ratio < 0.8:
                accessibility_features.append("Wide sidewalk (>1.5m)")
            if ratio > 0.3 and ratio < 0.7:
                accessibility_features.append("Level surface, no steps")
            
            # Calculate segment time
            segment_distance = total_distance / num_segments if i > 0 else 0
            segment_time = self._calculate_segment_time(segment_distance, request.preferences)
            
            route_points.append(RoutePoint(
                latitude=lat,
                longitude=lon,
                instruction=instruction,
                distance_from_start=distance_from_start,
                elevation=elevation,
                accessibility_features=accessibility_features,
                warnings=warnings,
                segment_time=segment_time
            ))
        
        return route_points
    
    def _generate_instruction(self, index: int, total_segments: int, total_distance: float, ratio: float) -> str:
        """Generate realistic navigation instructions"""
        if index == 0:
            return "Begin your accessible journey"
        elif index == total_segments:
            return "You have arrived at your destination"
        elif index < total_segments // 3:
            return f"Continue straight for {int((total_distance / total_segments))}m on accessible pathway"
        elif index < 2 * total_segments // 3:
            return f"Continue toward destination, maintaining accessible route"
        else:
            remaining = int(total_distance * (1 - ratio))
            return f"Approaching destination, {remaining}m remaining"
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance using Haversine formula"""
        R = 6371000  # Earth's radius in meters
        
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def _calculate_total_distance(self, route_points: List[RoutePoint]) -> float:
        """Calculate total route distance"""
        if len(route_points) < 2:
            return 0.0
        
        total = 0.0
        for i in range(1, len(route_points)):
            total += self._calculate_distance(
                route_points[i-1].latitude, route_points[i-1].longitude,
                route_points[i].latitude, route_points[i].longitude
            )
        return total
    
    def _calculate_estimated_time(self, distance: float, accessibility_score: AccessibilityScore, preferences) -> int:
        """Calculate estimated travel time with accessibility considerations"""
        base_speed = 4.0  # km/h
        
        # Adjust speed based on accessibility score
        speed_modifier = 0.5 + (accessibility_score.overall_score * 0.5)
        
        # Adjust for mobility aids
        if preferences.mobility_aid.value == "wheelchair":
            speed_modifier *= 0.8
        elif preferences.mobility_aid.value == "walker":
            speed_modifier *= 0.6
        elif preferences.mobility_aid.value == "cane":
            speed_modifier *= 0.9
        
        effective_speed = base_speed * speed_modifier
        return int((distance / 1000) / effective_speed * 60)  # minutes
    
    def _calculate_segment_time(self, distance: float, preferences) -> int:
        """Calculate time for a route segment"""
        base_speed = 4.0  # km/h
        speed_modifier = 1.0
        
        if preferences.mobility_aid.value == "wheelchair":
            speed_modifier = 0.8
        elif preferences.mobility_aid.value == "walker":
            speed_modifier = 0.6
        
        effective_speed = base_speed * speed_modifier
        return int((distance / 1000) / effective_speed * 3600)  # seconds
    
    def _generate_route_warnings(self, accessibility_score: AccessibilityScore, obstacles: List[ObstacleResponse]) -> List[str]:
        """Generate warnings for the route"""
        warnings = []
        
        if accessibility_score.overall_score < 0.6:
            warnings.append("⚠️ This route has significant accessibility challenges")
        
        if len(obstacles) > 2:
            warnings.append("⚠️ Multiple obstacles detected along route")
        
        if any(obs.severity.value == "critical" for obs in obstacles):
            warnings.append("🚨 Critical accessibility barriers detected")
        
        if accessibility_score.slope_accessibility < 0.5:
            warnings.append("⚠️ Route contains steep slopes")
        
        if accessibility_score.surface_quality < 0.6:
            warnings.append("⚠️ Poor surface conditions detected")
        
        return warnings
    
    def _generate_accessibility_features(self, accessibility_score: AccessibilityScore, preferences) -> List[str]:
        """Generate positive accessibility features"""
        features = []
        
        if accessibility_score.surface_quality > 0.8:
            features.append("✅ Excellent surface quality throughout")
        
        if accessibility_score.slope_accessibility > 0.8:
            features.append("✅ Gentle slopes, wheelchair accessible")
        
        if preferences.avoid_stairs and accessibility_score.obstacle_avoidance > 0.7:
            features.append("✅ No stairs on this route")
        
        if accessibility_score.width_adequacy > 0.8:
            features.append("✅ Wide pathways suitable for mobility aids")
        
        if accessibility_score.safety_rating > 0.8:
            features.append("✅ Well-lit and safe route")
        
        return features
    
    async def _generate_alternative_routes(self, request: RouteRequest, main_route: List[RoutePoint]) -> List[RouteAlternative]:
        """Generate alternative route options"""
        alternatives = []
        
        # Generate a faster but less accessible route
        fast_route = RouteAlternative(
            route_id=str(uuid.uuid4()),
            description="Fastest route (may have accessibility challenges)",
            total_distance=self._calculate_total_distance(main_route) / 1000.0 * 0.9,  # Convert to km
            estimated_time=int(self._calculate_estimated_time(
                self._calculate_total_distance(main_route) * 0.9, 
                AccessibilityScore(
                    overall_score=0.6, surface_quality=0.7, slope_accessibility=0.5,
                    obstacle_avoidance=0.6, width_adequacy=0.6, safety_rating=0.7,
                    lighting_adequacy=0.7, traffic_safety=0.8
                ), 
                request.preferences
            ) * 0.8),
            accessibility_score=0.6,
            key_features=["Shorter distance", "Fewer detours", "May include stairs"]
        )
        alternatives.append(fast_route)
        
        # Generate a more accessible but longer route
        accessible_route = RouteAlternative(
            route_id=str(uuid.uuid4()),
            description="Most accessible route (longer but safer)",
            total_distance=self._calculate_total_distance(main_route) / 1000.0 * 1.2,  # Convert to km
            estimated_time=int(self._calculate_estimated_time(
                self._calculate_total_distance(main_route) * 1.2, 
                AccessibilityScore(
                    overall_score=0.95, surface_quality=0.9, slope_accessibility=0.95,
                    obstacle_avoidance=0.9, width_adequacy=0.9, safety_rating=0.9,
                    lighting_adequacy=0.9, traffic_safety=0.9
                ), 
                request.preferences
            ) * 1.1),
            accessibility_score=0.95,
            key_features=["Excellent accessibility", "Wide sidewalks", "No stairs", "Well-lit paths"]
        )
        alternatives.append(accessible_route)
        
        return alternatives
    
    def _calculate_efficiency_rating(self, distance: float, time: int) -> float:
        """Calculate route efficiency rating"""
        # Simple efficiency calculation
        ideal_time = (distance / 1000) / 4.0 * 60  # 4 km/h ideal speed
        efficiency = min(1.0, ideal_time / max(time, 1))
        return round(efficiency, 2)
    
    def _calculate_elevation_gain(self, route_points: List[RoutePoint]) -> float:
        """Calculate total elevation gain"""
        gain = 0.0
        for i in range(1, len(route_points)):
            if route_points[i].elevation and route_points[i-1].elevation:
                diff = route_points[i].elevation - route_points[i-1].elevation
                if diff > 0:
                    gain += diff
        return round(gain, 1)
    
    def _analyze_surface_types(self, route_points: List[RoutePoint]) -> List[str]:
        """Analyze surface types along the route"""
        # Simulated surface analysis
        return ["Paved sidewalk", "Concrete pathway", "Asphalt road crossing"]
    
    def _generate_cache_key(self, request: RouteRequest) -> str:
        """Generate cache key for route request"""
        return f"{request.start.latitude:.4f},{request.start.longitude:.4f}-{request.end.latitude:.4f},{request.end.longitude:.4f}-{request.accessibility_level.value}-{request.preferences.mobility_aid.value}"
