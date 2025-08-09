
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

class OsrmRoutingEngine:

    def __init__(self):
        self.obstacle_detector = ObstacleDetector()
        self.accessibility_analyzer = AccessibilityAnalyzer()
        self.base_url = "https://router.project-osrm.org"
    
    async def calculate_route(self, request: RouteRequest) -> Optional[Route]:
        start_time = time.time()
        route_id = str(uuid.uuid4())
        
        print(f"🗺️ Calculating OSRM route from {request.start.latitude}, {request.start.longitude} to {request.end.latitude}, {request.end.longitude}")
        
        try:
            osrm_route = await self._get_osrm_route(request)
            if not osrm_route:
                return None
            
            route_points = await self._convert_osrm_route(osrm_route, request)
            
            obstacles = await self.obstacle_detector.find_obstacles_along_route(
                request.start, request.end, radius=200
            )
            
            accessibility_score = await self.accessibility_analyzer.calculate_comprehensive_score(
                route_points, request.preferences, obstacles
            )
            
            total_distance = osrm_route.get('distance', 0) / 1000.0
            estimated_time = int(osrm_route.get('duration', 900) / 60)
            
            warnings = self._generate_route_warnings(accessibility_score, obstacles)
            features = self._generate_accessibility_features(accessibility_score, request.preferences)
            
            route_summary = {
                "efficiency_rating": self._calculate_efficiency_rating(total_distance * 1000, estimated_time),
                "comfort_level": accessibility_score.overall_score,
                "obstacle_count": len(obstacles),
                "elevation_gain": 0.0,
                "surface_types": ["Paved sidewalk", "Crosswalk"],
                "road_types": ["Sidewalk", "Pedestrian path", "Street crossing"],
                "routing_engine": "osrm",
                "route_accuracy": "high"
            }
            
            route = Route(
                route_id=route_id,
                points=route_points,
                total_distance=total_distance,
                estimated_time=estimated_time,
                accessibility_score=accessibility_score,
                alternatives=[],
                warnings=warnings,
                accessibility_features=features,
                route_summary=route_summary,
                created_at=datetime.utcnow(),
                calculation_time_ms=int((time.time() - start_time) * 1000)
            )
            
            print(f"✅ OSRM route calculated successfully in {route.calculation_time_ms}ms")
            return route
        except Exception as e:
            print(f"❌ OSRM routing error: {e}")
            return None
    
    async def _get_osrm_route(self, request: RouteRequest) -> Optional[Dict]:
        coords = f"{request.start.longitude},{request.start.latitude};{request.end.longitude},{request.end.latitude}"
        url = f"{self.base_url}/route/v1/foot/{coords}"
        params = {
            'geometries': 'geojson',
            'overview': 'full',
            'steps': 'true',
            'alternatives': 'false'
        }
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('routes'):
                        return data['routes'][0]
                else:
                    print(f"❌ OSRM API error: {response.status_code}")
        except Exception as e:
            print(f"❌ OSRM API request failed: {e}")
        return None
    
    async def _convert_osrm_route(self, osrm_route: Dict, request: RouteRequest) -> List[RoutePoint]:
        route_points = []
        geometry = osrm_route.get('geometry', {})
        coordinates = geometry.get('coordinates', [])
        legs = osrm_route.get('legs', [])
        steps = legs[0].get('steps', []) if legs else []
        
        cumulative_distance = 0.0
        for i, coord in enumerate(coordinates):
            lon, lat = coord
            if i > 0:
                prev = coordinates[i-1]
                segment_distance = self._distance(prev[1], prev[0], lat, lon)
                cumulative_distance += segment_distance
            else:
                segment_distance = 0.0
            
            instruction = self._instruction_from_steps(i, len(coordinates), steps)
            features = self._point_features(request.preferences)
            segment_time = self._segment_time(segment_distance, request.preferences)
            
            route_points.append(RoutePoint(
                latitude=lat,
                longitude=lon,
                instruction=instruction,
                distance_from_start=cumulative_distance,
                elevation=0.0,
                accessibility_features=features,
                warnings=[],
                segment_time=segment_time
            ))
        return route_points
    
    def _instruction_from_steps(self, index: int, total: int, steps: List[Dict]) -> str:
        if index == 0:
            return "Start your accessible journey"
        if index == total - 1:
            return "You have arrived at your destination"
        for step in steps:
            name = step.get('name')
            maneuver = step.get('maneuver', {})
            instr = maneuver.get('instruction') or maneuver.get('type')
            if instr:
                return f"{instr} {('on ' + name) if name else ''}".strip()
        return "Continue on accessible path"
    
    def _point_features(self, preferences) -> List[str]:
        feats = ["Follows real roads/sidewalks"]
        if preferences.require_curb_cuts:
            feats.append("Curb cuts preferred")
        if preferences.avoid_stairs:
            feats.append("Avoids stairs")
        return feats
    
    def _segment_time(self, distance: float, preferences) -> int:
        base_speed = 4.0  # km/h
        mod = 1.0
        if preferences.mobility_aid.value == 'wheelchair':
            mod = 0.8
        elif preferences.mobility_aid.value == 'walker':
            mod = 0.6
        return int((distance/1000) / (base_speed*mod) * 3600)
    
    def _distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        return R * c
    
    def _generate_route_warnings(self, accessibility_score: AccessibilityScore, obstacles: List[ObstacleResponse]) -> List[str]:
        warnings = []
        if accessibility_score.overall_score < 0.6:
            warnings.append("⚠️ Route has accessibility challenges")
        if any(obs.severity.value == 'critical' for obs in obstacles):
            warnings.append("🚨 Critical barriers detected")
        return warnings
    
    def _generate_accessibility_features(self, accessibility_score: AccessibilityScore, preferences) -> List[str]:
        feats = ["✅ Follows actual roads and sidewalks", "✅ Proper intersections"]
        if preferences.avoid_stairs:
            feats.append("✅ Avoids stairs")
        if preferences.require_curb_cuts:
            feats.append("✅ Prefers curb cuts")
        return feats
    
    def _calculate_efficiency_rating(self, distance: float, time: int) -> float:
        ideal_time = (distance / 1000) / 4.0 * 60
        return round(min(1.0, ideal_time / max(time, 1)), 2)
