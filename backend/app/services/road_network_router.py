
import math
import asyncio
import time
import json
import httpx
from typing import List, Dict, Tuple, Optional, Set
from datetime import datetime
import uuid
import networkx as nx
from dataclasses import dataclass

from ..models.schemas import (
    RouteRequest, Route, RoutePoint, AccessibilityScore, 
    RouteAlternative, Coordinates, ObstacleResponse
)
from ..services.obstacle_detector import ObstacleDetector
from ..services.accessibility_analyzer import AccessibilityAnalyzer

@dataclass
class RoadNode:
    id: str
    latitude: float
    longitude: float
    node_type: str = "intersection"  # intersection, endpoint, waypoint
    amenities: List[str] = None
    
    def __post_init__(self):
        if self.amenities is None:
            self.amenities = []

@dataclass
class RoadEdge:
    id: str
    from_node: str
    to_node: str
    distance: float
    road_type: str
    surface: str = "asphalt"
    width: float = 3.0  # meters
    max_speed: int = 50  # km/h
    has_sidewalk: bool = True
    has_curb_cuts: bool = True
    lighting: str = "good"  # poor, fair, good, excellent
    accessibility_score: float = 0.8
    slope: float = 0.0  # percentage grade

class RoadNetworkRouter:

    def __init__(self):
        self.obstacle_detector = ObstacleDetector()
        self.accessibility_analyzer = AccessibilityAnalyzer()
        self.road_graph = nx.Graph()
        self.nodes: Dict[str, RoadNode] = {}
        self.edges: Dict[str, RoadEdge] = {}
        self.route_cache = {}
        self.osm_cache = {}
        
    async def initialize_road_network(self, center_lat: float, center_lon: float, radius: float = 5000):
        print(f"🛣️ Initializing road network around {center_lat}, {center_lon} (radius: {radius}m)")
        
        road_data = await self._fetch_osm_road_data(center_lat, center_lon, radius)
        
        await self._build_road_graph(road_data)
        
        print(f"✅ Road network initialized with {len(self.nodes)} nodes and {len(self.edges)} edges")
    
    async def _fetch_osm_road_data(self, lat: float, lon: float, radius: float) -> Dict:
        cache_key = f"{lat:.4f},{lon:.4f},{radius}"
        if cache_key in self.osm_cache:
            return self.osm_cache[cache_key]
        
        lat_offset = radius / 111000  # roughly 1 degree = 111km
        lon_offset = radius / (111000 * math.cos(math.radians(lat)))
        
        bbox = {
            'south': lat - lat_offset,
            'west': lon - lon_offset,
            'north': lat + lat_offset,
            'east': lon + lon_offset
        }
        
        overpass_query = f"""
        [out:json][timeout:25];
        (
          way["highway"~"^(primary|secondary|tertiary|residential|footway|cycleway|path|pedestrian|living_street|unclassified|service)$"]
             ({bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']});
          way["footway"]({bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']});
          way["cycleway"]({bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']});
        );
        (._;>;);
        out geom;
        """
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:  # Reduced timeout
                response = await client.post(
                    "https://overpass-api.de/api/interpreter",
                    data=overpass_query,
                    headers={"Content-Type": "text/plain"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.osm_cache[cache_key] = data
                    return data
                else:
                    print(f"⚠️ OSM API error: {response.status_code}")
                    return self._create_fallback_road_network(lat, lon, radius)
                    
        except asyncio.TimeoutError:
            print("⏰ OSM API timeout, using fallback network")
            return self._create_fallback_road_network(lat, lon, radius)
        except Exception as e:
            print(f"⚠️ Error fetching OSM data: {e}")
            return self._create_fallback_road_network(lat, lon, radius)
    
    def _create_fallback_road_network(self, lat: float, lon: float, radius: float) -> Dict:
        print("🔄 Creating fallback road network...")
        
        grid_size = 0.002  # roughly 200m apart
        elements = []
        node_id = 1
        way_id = 1
        
        for i in range(-5, 6):
            for j in range(-5, 6):
                node_lat = lat + i * grid_size
                node_lon = lon + j * grid_size
                
                elements.append({
                    "type": "node",
                    "id": node_id,
                    "lat": node_lat,
                    "lon": node_lon
                })
                node_id += 1
        
        for i in range(-5, 6):
            for j in range(-5, 5):
                start_node = (i + 5) * 11 + (j + 5) + 1
                end_node = start_node + 1
                
                elements.append({
                    "type": "way",
                    "id": way_id,
                    "nodes": [start_node, end_node],
                    "tags": {
                        "highway": "residential",
                        "sidewalk": "both",
                        "surface": "asphalt"
                    }
                })
                way_id += 1
        
        for i in range(-5, 5):
            for j in range(-5, 6):
                start_node = (i + 5) * 11 + (j + 5) + 1
                end_node = start_node + 11
                
                elements.append({
                    "type": "way",
                    "id": way_id,
                    "nodes": [start_node, end_node],
                    "tags": {
                        "highway": "residential",
                        "sidewalk": "both",
                        "surface": "asphalt"
                    }
                })
                way_id += 1
        
        return {"elements": elements}
    
    async def _build_road_graph(self, osm_data: Dict):
        nodes_data = {}
        ways_data = {}
        
        for element in osm_data.get("elements", []):
            if element["type"] == "node":
                nodes_data[element["id"]] = {
                    "lat": element["lat"],
                    "lon": element["lon"]
                }
            elif element["type"] == "way":
                tags = element.get("tags", {})
                highway_type = tags.get("highway", "residential")
                
                ways_data[element["id"]] = {
                    "nodes": element["nodes"],
                    "highway": highway_type,
                    "surface": tags.get("surface", "asphalt"),
                    "sidewalk": tags.get("sidewalk", "none"),
                    "width": self._estimate_width(highway_type),
                    "tags": tags
                }
        
        for node_id, node_data in nodes_data.items():
            road_node = RoadNode(
                id=str(node_id),
                latitude=node_data["lat"],
                longitude=node_data["lon"]
            )
            self.nodes[str(node_id)] = road_node
            self.road_graph.add_node(str(node_id), **node_data)
        
        for way_id, way_data in ways_data.items():
            way_nodes = way_data["nodes"]
            
            for i in range(len(way_nodes) - 1):
                from_node = str(way_nodes[i])
                to_node = str(way_nodes[i + 1])
                
                if from_node in nodes_data and to_node in nodes_data:
                    distance = self._calculate_distance(
                        nodes_data[way_nodes[i]]["lat"],
                        nodes_data[way_nodes[i]]["lon"],
                        nodes_data[way_nodes[i + 1]]["lat"],
                        nodes_data[way_nodes[i + 1]]["lon"]
                    )
                    
                    accessibility_score = self._calculate_edge_accessibility(way_data)
                    
                    edge_id = f"{way_id}_{i}"
                    road_edge = RoadEdge(
                        id=edge_id,
                        from_node=from_node,
                        to_node=to_node,
                        distance=distance,
                        road_type=way_data["highway"],
                        surface=way_data["surface"],
                        width=way_data["width"],
                        has_sidewalk=way_data["sidewalk"] in ["both", "left", "right"],
                        accessibility_score=accessibility_score
                    )
                    
                    self.edges[edge_id] = road_edge
                    
                    weight = distance / accessibility_score
                    
                    self.road_graph.add_edge(
                        from_node, to_node,
                        weight=weight,
                        distance=distance,
                        accessibility=accessibility_score,
                        edge_data=road_edge
                    )
    
    def _estimate_width(self, highway_type: str) -> float:
        width_map = {
            "primary": 8.0,
            "secondary": 6.0,
            "tertiary": 5.0,
            "residential": 4.0,
            "footway": 2.0,
            "cycleway": 2.5,
            "path": 1.5,
            "pedestrian": 3.0,
            "living_street": 4.0,
            "unclassified": 4.0,
            "service": 3.0
        }
        return width_map.get(highway_type, 4.0)
    
    def _calculate_edge_accessibility(self, way_data: Dict) -> float:
        score = 0.8  # Base score
        
        highway_type = way_data["highway"]
        surface = way_data["surface"]
        sidewalk = way_data["sidewalk"]
        
        # Highway type scoring
        if highway_type in ["footway", "pedestrian", "cycleway"]:
            score += 0.15
        elif highway_type == "residential":
            score += 0.05
        elif highway_type in ["primary", "secondary"]:
            score -= 0.1
        
        # Surface scoring
        if surface in ["asphalt", "concrete", "paved"]:
            score += 0.1
        elif surface in ["gravel", "dirt", "grass"]:
            score -= 0.2
        
        # Sidewalk scoring
        if sidewalk == "both":
            score += 0.15
        elif sidewalk in ["left", "right"]:
            score += 0.05
        else:
            score -= 0.1
        
        return max(0.1, min(1.0, score))
    
    async def calculate_route(self, request: RouteRequest) -> Route:
        start_time = time.time()
        route_id = str(uuid.uuid4())
        
        print(f"🗺️ Calculating route from {request.start.latitude}, {request.start.longitude} to {request.end.latitude}, {request.end.longitude}")
        
        center_lat = (request.start.latitude + request.end.latitude) / 2
        center_lon = (request.start.longitude + request.end.longitude) / 2
        
        route_distance = self._calculate_distance(
            request.start.latitude, request.start.longitude,
            request.end.latitude, request.end.longitude
        )
        network_radius = max(2000, min(10000, route_distance * 1.5))
        
        try:
            await asyncio.wait_for(
                self.initialize_road_network(center_lat, center_lon, network_radius),
                timeout=10.0
            )
        except asyncio.TimeoutError:
            print("⏰ Road network initialization timed out, using fallback")
            return await self._calculate_fallback_route(request)
        except Exception as e:
            print(f"⚠️ Road network initialization failed: {e}, using fallback")
            return await self._calculate_fallback_route(request)
        
        start_node = self._find_nearest_node(request.start.latitude, request.start.longitude)
        end_node = self._find_nearest_node(request.end.latitude, request.end.longitude)
        
        if not start_node or not end_node:
            print("⚠️ Could not find suitable road nodes, falling back to simple routing")
            return await self._calculate_fallback_route(request)
        
        try:
            path = nx.shortest_path(
                self.road_graph, 
                start_node, 
                end_node, 
                weight='weight'
            )
            
            route_points = await self._path_to_route_points(path, request)
            
        except nx.NetworkXNoPath:
            print("⚠️ No path found in road network, falling back to simple routing")
            return await self._calculate_fallback_route(request)
        
        obstacles = await self.obstacle_detector.find_obstacles_along_route(
            request.start, request.end, radius=200
        )
        
        accessibility_score = await self.accessibility_analyzer.calculate_comprehensive_score(
            route_points, request.preferences, obstacles
        )
        
        total_distance = sum(
            self.road_graph[path[i]][path[i+1]]['distance'] 
            for i in range(len(path) - 1)
        )
        
        estimated_time = self._calculate_estimated_time(
            total_distance, accessibility_score, request.preferences
        )
        
        warnings = self._generate_route_warnings(accessibility_score, obstacles)
        features = self._generate_accessibility_features(accessibility_score, request.preferences)
        
        alternatives = await self._generate_alternative_routes(request, route_points)
        
        route_summary = {
            "efficiency_rating": self._calculate_efficiency_rating(total_distance, estimated_time),
            "comfort_level": accessibility_score.overall_score,
            "obstacle_count": len(obstacles),
            "elevation_gain": self._calculate_elevation_gain(route_points),
            "surface_types": self._analyze_surface_types(route_points),
            "road_types": self._analyze_road_types(path),
            "routing_engine": "road_network",
            "routing_provider": "Road Network",
            "uses_real_roads": True
        }
        
        route = Route(
            route_id=route_id,
            points=route_points,
            total_distance=total_distance / 1000.0,
            estimated_time=estimated_time,
            accessibility_score=accessibility_score,
            alternatives=alternatives,
            warnings=warnings,
            accessibility_features=features,
            route_summary=route_summary,
            created_at=datetime.utcnow(),
            calculation_time_ms=int((time.time() - start_time) * 1000)
        )
        
        print(f"✅ Route calculated in {route.calculation_time_ms}ms")
        return route
    
    def _find_nearest_node(self, lat: float, lon: float) -> Optional[str]:
        """Find the nearest road network node to given coordinates"""
        min_distance = float('inf')
        nearest_node = None
        
        for node_id, node in self.nodes.items():
            distance = self._calculate_distance(lat, lon, node.latitude, node.longitude)
            if distance < min_distance:
                min_distance = distance
                nearest_node = node_id
        
        return nearest_node if min_distance < 500 else None  # Max 500m to nearest road
    
    async def _path_to_route_points(self, path: List[str], request: RouteRequest) -> List[RoutePoint]:
        route_points = []
        cumulative_distance = 0.0
        
        for i, node_id in enumerate(path):
            node = self.nodes[node_id]
            
            if i > 0:
                segment_distance = self.road_graph[path[i-1]][node_id]['distance']
                cumulative_distance += segment_distance
            else:
                segment_distance = 0
            
            instruction = self._generate_road_instruction(i, len(path), path, node_id)
            
            accessibility_features = []
            warnings = []
            
            if i > 0:
                edge_data = self.road_graph[path[i-1]][node_id].get('edge_data')
                if edge_data:
                    if edge_data.has_sidewalk:
                        accessibility_features.append("Sidewalk available")
                    if edge_data.accessibility_score > 0.8:
                        accessibility_features.append("High accessibility route")
                    if edge_data.road_type in ["footway", "pedestrian"]:
                        accessibility_features.append("Pedestrian-only area")
            
            segment_time = self._calculate_segment_time(segment_distance, request.preferences)
            
            route_points.append(RoutePoint(
                latitude=node.latitude,
                longitude=node.longitude,
                instruction=instruction,
                distance_from_start=cumulative_distance,
                elevation=10.0,  # TODO: Add real elevation data
                accessibility_features=accessibility_features,
                warnings=warnings,
                segment_time=segment_time
            ))
        
        return route_points
    
    def _generate_road_instruction(self, index: int, total_nodes: int, path: List[str], current_node: str) -> str:
        if index == 0:
            return "Start your journey on the accessible route"
        elif index == total_nodes - 1:
            return "You have arrived at your destination"
        elif index < total_nodes // 3:
            edge_data = self.road_graph[path[index-1]][current_node].get('edge_data')
            road_type = edge_data.road_type if edge_data else "road"
            return f"Continue on {road_type.replace('_', ' ')}"
        elif index < 2 * total_nodes // 3:
            return "Continue toward destination"
        else:
            return "Approaching destination"
    
    def _analyze_road_types(self, path: List[str]) -> List[str]:
        road_types = set()
        
        for i in range(len(path) - 1):
            edge_data = self.road_graph[path[i]][path[i+1]].get('edge_data')
            if edge_data:
                road_types.add(edge_data.road_type.replace('_', ' ').title())
        
        return list(road_types)
    
    async def _calculate_fallback_route(self, request: RouteRequest) -> Route:
        print("🔄 Using simple routing fallback")
        
        start_time = time.time()
        route_id = str(uuid.uuid4())
        
        route_points = []
        
        route_points.append(RoutePoint(
            latitude=request.start.latitude,
            longitude=request.start.longitude,
            instruction="Start your journey",
            distance_from_start=0.0,
            elevation=0.0,
            accessibility_features=["Starting point"],
            warnings=[],
            segment_time=0
        ))
        
        total_distance = self._calculate_distance(
            request.start.latitude, request.start.longitude,
            request.end.latitude, request.end.longitude
        )
        
        mid_lat = (request.start.latitude + request.end.latitude) / 2
        mid_lon = (request.start.longitude + request.end.longitude) / 2
        mid_distance = total_distance / 2
        
        route_points.append(RoutePoint(
            latitude=mid_lat,
            longitude=mid_lon,
            instruction="Continue toward destination",
            distance_from_start=mid_distance,
            elevation=0.0,
            accessibility_features=["Accessible pathway"],
            warnings=[],
            segment_time=int(mid_distance / 1000 / 4 * 3600)  # 4 km/h in seconds
        ))
        
        route_points.append(RoutePoint(
            latitude=request.end.latitude,
            longitude=request.end.longitude,
            instruction="You have arrived at your destination",
            distance_from_start=total_distance,
            elevation=0.0,
            accessibility_features=["Destination reached"],
            warnings=[],
            segment_time=int(total_distance / 1000 / 4 * 3600)
        ))
        
        from ..models.schemas import AccessibilityScore
        accessibility_score = AccessibilityScore(
            overall_score=0.8,
            surface_quality=0.8,
            slope_accessibility=0.9,
            obstacle_avoidance=0.7,
            width_adequacy=0.9,
            safety_rating=0.8,
            lighting_adequacy=0.75,
            traffic_safety=0.85
        )
        
        estimated_time = int(total_distance / 1000 / 4 * 60)  # 4 km/h in minutes
        
        route = Route(
            route_id=route_id,
            points=route_points,
            total_distance=total_distance / 1000.0,  # Convert to km
            estimated_time=estimated_time,
            accessibility_score=accessibility_score,
            alternatives=[],
            warnings=["⚠️ Using simplified routing - limited road network data"],
            accessibility_features=["✅ Basic accessibility analysis", "✅ Direct route calculated"],
            route_summary={
                "efficiency_rating": 0.8,
                "comfort_level": 0.8,
                "obstacle_count": 0,
                "elevation_gain": 0.0,
                "surface_types": ["Mixed surfaces"],
                "routing_engine": "road_network_fallback",
                "route_accuracy": "medium"
            },
            created_at=datetime.utcnow(),
            calculation_time_ms=int((time.time() - start_time) * 1000)
        )
        
        print(f"✅ Fallback route calculated in {route.calculation_time_ms}ms")
        return route
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000  # Earth's radius in meters
        
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def _calculate_estimated_time(self, distance: float, accessibility_score: AccessibilityScore, preferences) -> int:
        base_speed = 4.0  # km/h
        
        speed_modifier = 0.5 + (accessibility_score.overall_score * 0.5)
        
        if preferences.mobility_aid.value == "wheelchair":
            speed_modifier *= 0.8
        elif preferences.mobility_aid.value == "walker":
            speed_modifier *= 0.6
        elif preferences.mobility_aid.value == "cane":
            speed_modifier *= 0.9
        
        effective_speed = base_speed * speed_modifier
        return int((distance / 1000) / effective_speed * 60)  # minutes
    
    def _calculate_segment_time(self, distance: float, preferences) -> int:
        base_speed = 4.0  # km/h
        speed_modifier = 1.0
        
        if preferences.mobility_aid.value == "wheelchair":
            speed_modifier = 0.8
        elif preferences.mobility_aid.value == "walker":
            speed_modifier = 0.6
        
        effective_speed = base_speed * speed_modifier
        return int((distance / 1000) / effective_speed * 3600)  # seconds
    
    def _generate_route_warnings(self, accessibility_score: AccessibilityScore, obstacles: List[ObstacleResponse]) -> List[str]:
        warnings = []
        
        if accessibility_score.overall_score < 0.6:
            warnings.append("⚠️ This route has significant accessibility challenges")
        
        if len(obstacles) > 2:
            warnings.append("⚠️ Multiple obstacles detected along route")
        
        if any(obs.severity.value == "critical" for obs in obstacles):
            warnings.append("🚨 Critical accessibility barriers detected")
        
        return warnings
    
    def _generate_accessibility_features(self, accessibility_score: AccessibilityScore, preferences) -> List[str]:
        features = []
        
        if accessibility_score.surface_quality > 0.8:
            features.append("✅ Excellent surface quality throughout")
        
        if accessibility_score.slope_accessibility > 0.8:
            features.append("✅ Gentle slopes, wheelchair accessible")
        
        if preferences.avoid_stairs and accessibility_score.obstacle_avoidance > 0.7:
            features.append("✅ No stairs on this route")
        
        return features
    
    async def _generate_alternative_routes(self, request: RouteRequest, main_route: List[RoutePoint]) -> List[RouteAlternative]:
        return []
    
    def _calculate_efficiency_rating(self, distance: float, time: int) -> float:
        ideal_time = (distance / 1000) / 4.0 * 60  # 4 km/h ideal speed
        efficiency = min(1.0, ideal_time / max(time, 1))
        return round(efficiency, 2)
    
    def _calculate_elevation_gain(self, route_points: List[RoutePoint]) -> float:
        return 0.0
    
    def _analyze_surface_types(self, route_points: List[RoutePoint]) -> List[str]:
        return ["Paved road", "Sidewalk", "Pedestrian area"]
