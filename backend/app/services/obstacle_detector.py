
import math
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import uuid

from ..models.schemas import Coordinates, ObstacleResponse, ObstacleType, SeverityLevel

class ObstacleDetector:

    def __init__(self):
        self.obstacles_db = self._initialize_sample_obstacles()
        self.detection_radius = 400.0  # meters (increased for demo visibility)
        
    def _initialize_sample_obstacles(self) -> Dict[str, Dict]:
        return {
            "obs_001": {
                "id": "obs_001",
                "location": {"latitude": 37.7749, "longitude": -122.4194},
                "type": "construction",
                "severity": "high",
                "description": "Major sidewalk construction blocking wheelchair access. Detour required via adjacent street.",
                "reported_at": datetime.now(),
                "verified": True,
                "affects_wheelchair": True,
                "affects_visually_impaired": False,
                "affects_mobility_aid": True,
                "estimated_clearance_date": datetime.now() + timedelta(days=14),
                "impact_radius": 75.0
            },
            "obs_002": {
                "id": "obs_002",
                "location": {"latitude": 37.7849, "longitude": -122.4094},
                "type": "stairs",
                "severity": "critical",
                "description": "Steep stairs with 15 steps, no ramp alternative. Handrails available but insufficient for wheelchair access.",
                "reported_at": datetime.now(),
                "verified": True,
                "affects_wheelchair": True,
                "affects_visually_impaired": True,
                "affects_mobility_aid": True,
                "estimated_clearance_date": None,
                "impact_radius": 25.0
            },
            "obs_003": {
                "id": "obs_003",
                "location": {"latitude": 37.7650, "longitude": -122.4094},
                "type": "broken_surface",
                "severity": "medium",
                "description": "Cracked sidewalk with uneven surface causing trip hazard. Multiple potholes and raised concrete sections.",
                "reported_at": datetime.now() - timedelta(days=3),
                "verified": False,
                "affects_wheelchair": True,
                "affects_visually_impaired": True,
                "affects_mobility_aid": True,
                "estimated_clearance_date": datetime.now() + timedelta(days=7),
                "impact_radius": 30.0
            },
            "obs_004": {
                "id": "obs_004",
                "location": {"latitude": 37.7750, "longitude": -122.4150},
                "type": "narrow_path",
                "severity": "medium",
                "description": "Sidewalk narrows to less than 1 meter due to utility poles and street furniture.",
                "reported_at": datetime.now() - timedelta(hours=6),
                "verified": True,
                "affects_wheelchair": True,
                "affects_visually_impaired": False,
                "affects_mobility_aid": True,
                "estimated_clearance_date": None,
                "impact_radius": 20.0
            },
            "obs_005": {
                "id": "obs_005",
                "location": {"latitude": 40.7128, "longitude": -74.0060},
                "type": "temporary_barrier",
                "severity": "high",
                "description": "Temporary construction barrier blocking sidewalk access during building renovation.",
                "reported_at": datetime.now() - timedelta(hours=2),
                "verified": True,
                "affects_wheelchair": True,
                "affects_visually_impaired": True,
                "affects_mobility_aid": True,
                "estimated_clearance_date": datetime.now() + timedelta(days=5),
                "impact_radius": 50.0
            },
            "obs_006": {
                "id": "obs_006",
                "location": {"latitude": 34.0522, "longitude": -118.2437},
                "type": "steep_slope",
                "severity": "high",
                "description": "Sidewalk slope exceeds 8.3% (ADA maximum) for over 100 meters. No alternative route available.",
                "reported_at": datetime.now() - timedelta(days=1),
                "verified": True,
                "affects_wheelchair": True,
                "affects_visually_impaired": False,
                "affects_mobility_aid": True,
                "estimated_clearance_date": None,
                "impact_radius": 100.0
            },
            "obs_101": {
                "id": "obs_101",
                "location": {"latitude": 42.0414, "longitude": -88.0754},
                "type": "construction",
                "severity": "medium",
                "description": "Sidewalk construction near intersection causing detour.",
                "reported_at": datetime.now() - timedelta(hours=5),
                "verified": True,
                "affects_wheelchair": True,
                "affects_visually_impaired": True,
                "affects_mobility_aid": True,
                "estimated_clearance_date": datetime.now() + timedelta(days=3),
                "impact_radius": 40.0
            },
            "obs_102": {
                "id": "obs_102",
                "location": {"latitude": 42.0494, "longitude": -88.0704},
                "type": "narrow_path",
                "severity": "low",
                "description": "Path narrows due to utility work; passable with caution.",
                "reported_at": datetime.now() - timedelta(days=1),
                "verified": False,
                "affects_wheelchair": True,
                "affects_visually_impaired": False,
                "affects_mobility_aid": True,
                "estimated_clearance_date": None,
                "impact_radius": 20.0
            },
            "obs_103": {
                "id": "obs_103",
                "location": {"latitude": 42.0389, "longitude": -88.0748},
                "type": "broken_surface",
                "severity": "medium",
                "description": "Uneven sidewalk slabs – reduced smoothness.",
                "reported_at": datetime.now() - timedelta(hours=8),
                "verified": True,
                "affects_wheelchair": True,
                "affects_visually_impaired": True,
                "affects_mobility_aid": True,
                "estimated_clearance_date": None,
                "impact_radius": 30.0
            },
            "obs_104": {
                "id": "obs_104",
                "location": {"latitude": 42.0422, "longitude": -88.0622},
                "type": "construction",
                "severity": "high",
                "description": "Temporary construction narrowing path; expect short detour.",
                "reported_at": datetime.now() - timedelta(hours=3),
                "verified": True,
                "affects_wheelchair": True,
                "affects_visually_impaired": True,
                "affects_mobility_aid": True,
                "estimated_clearance_date": datetime.now() + timedelta(days=2),
                "impact_radius": 45.0
            }
        }
    
    async def find_obstacles_along_route(self, start: Coordinates, end: Coordinates, radius: float = None) -> List[ObstacleResponse]:
        if radius is None:
            radius = self.detection_radius
        print(f"🔎 Detecting obstacles within {radius}m corridor...")
        
        obstacles = []
        
        route_points = self._generate_route_corridor(start, end, num_points=10)
        
        for obstacle_data in self.obstacles_db.values():
            obstacle_location = Coordinates(
                latitude=obstacle_data["location"]["latitude"],
                longitude=obstacle_data["location"]["longitude"]
            )
            
            for route_point in route_points:
                distance = self._calculate_distance(
                    route_point.latitude, route_point.longitude,
                    obstacle_location.latitude, obstacle_location.longitude
                )
                
                if distance <= radius:
                    obstacle = ObstacleResponse(
                        id=obstacle_data["id"],
                        location=obstacle_location,
                        type=ObstacleType(obstacle_data["type"]),
                        severity=SeverityLevel(obstacle_data["severity"]),
                        description=obstacle_data["description"],
                        reported_at=obstacle_data["reported_at"],
                        verified=obstacle_data["verified"],
                        affects_wheelchair=obstacle_data["affects_wheelchair"],
                        affects_visually_impaired=obstacle_data["affects_visually_impaired"],
                        affects_mobility_aid=obstacle_data["affects_mobility_aid"],
                        estimated_clearance_date=obstacle_data.get("estimated_clearance_date"),
                        impact_radius=obstacle_data.get("impact_radius", 50.0)
                    )
                    obstacles.append(obstacle)
                    break
        
        obstacles.sort(key=lambda obs: (
            {"critical": 0, "high": 1, "medium": 2, "low": 3}[obs.severity.value],
            self._calculate_distance(start.latitude, start.longitude, obs.location.latitude, obs.location.longitude)
        ))
        
        print(f"✅ Found {len(obstacles)} obstacles along corridor")
        return obstacles
    
    async def get_all_obstacles(self, active_only: bool = True) -> List[ObstacleResponse]:
        obstacles = []
        
        for obstacle_data in self.obstacles_db.values():
            if active_only and obstacle_data.get("estimated_clearance_date"):
                if obstacle_data["estimated_clearance_date"] < datetime.now():
                    continue
            
            obstacle = ObstacleResponse(
                id=obstacle_data["id"],
                location=Coordinates(
                    latitude=obstacle_data["location"]["latitude"],
                    longitude=obstacle_data["location"]["longitude"]
                ),
                type=ObstacleType(obstacle_data["type"]),
                severity=SeverityLevel(obstacle_data["severity"]),
                description=obstacle_data["description"],
                reported_at=obstacle_data["reported_at"],
                verified=obstacle_data["verified"],
                affects_wheelchair=obstacle_data["affects_wheelchair"],
                affects_visually_impaired=obstacle_data["affects_visually_impaired"],
                affects_mobility_aid=obstacle_data["affects_mobility_aid"],
                estimated_clearance_date=obstacle_data.get("estimated_clearance_date"),
                impact_radius=obstacle_data.get("impact_radius", 50.0)
            )
            obstacles.append(obstacle)
        
        return obstacles
    
    async def report_obstacle(self, obstacle_data: Dict) -> str:
        obstacle_id = f"obs_{len(self.obstacles_db) + 1:03d}"
        
        new_obstacle = {
            "id": obstacle_id,
            "location": {
                "latitude": obstacle_data["location"]["latitude"],
                "longitude": obstacle_data["location"]["longitude"]
            },
            "type": obstacle_data["type"],
            "severity": obstacle_data["severity"],
            "description": obstacle_data["description"],
            "reported_at": datetime.now(),
            "verified": False,  # New reports start unverified
            "affects_wheelchair": obstacle_data.get("affects_wheelchair", True),
            "affects_visually_impaired": obstacle_data.get("affects_visually_impaired", False),
            "affects_mobility_aid": obstacle_data.get("affects_mobility_aid", True),
            "estimated_clearance_date": obstacle_data.get("estimated_clearance_date"),
            "impact_radius": obstacle_data.get("impact_radius", 50.0)
        }
        
        self.obstacles_db[obstacle_id] = new_obstacle
        
        return obstacle_id
    
    async def get_obstacle_by_id(self, obstacle_id: str) -> Optional[ObstacleResponse]:
        if obstacle_id not in self.obstacles_db:
            return None
        
        obstacle_data = self.obstacles_db[obstacle_id]
        return ObstacleResponse(
            id=obstacle_data["id"],
            location=Coordinates(
                latitude=obstacle_data["location"]["latitude"],
                longitude=obstacle_data["location"]["longitude"]
            ),
            type=ObstacleType(obstacle_data["type"]),
            severity=SeverityLevel(obstacle_data["severity"]),
            description=obstacle_data["description"],
            reported_at=obstacle_data["reported_at"],
            verified=obstacle_data["verified"],
            affects_wheelchair=obstacle_data["affects_wheelchair"],
            affects_visually_impaired=obstacle_data["affects_visually_impaired"],
            affects_mobility_aid=obstacle_data["affects_mobility_aid"],
            estimated_clearance_date=obstacle_data.get("estimated_clearance_date"),
            impact_radius=obstacle_data.get("impact_radius", 50.0)
        )
    
    async def update_obstacle_verification(self, obstacle_id: str, verified: bool) -> bool:
        if obstacle_id not in self.obstacles_db:
            return False
        
        self.obstacles_db[obstacle_id]["verified"] = verified
        return True
    
    def _generate_route_corridor(self, start: Coordinates, end: Coordinates, num_points: int = 10) -> List[Coordinates]:
        points = []
        
        for i in range(num_points + 1):
            ratio = i / num_points
            lat = start.latitude + (end.latitude - start.latitude) * ratio
            lon = start.longitude + (end.longitude - start.longitude) * ratio
            points.append(Coordinates(latitude=lat, longitude=lon))
        
        return points
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000  # Earth's radius in meters
        
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def get_obstacle_statistics(self) -> Dict[str, any]:
        """Get statistics about obstacles in the system"""
        total_obstacles = len(self.obstacles_db)
        verified_obstacles = sum(1 for obs in self.obstacles_db.values() if obs["verified"])
        
        severity_counts = {}
        type_counts = {}
        
        for obstacle in self.obstacles_db.values():
            severity = obstacle["severity"]
            obstacle_type = obstacle["type"]
            
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
            type_counts[obstacle_type] = type_counts.get(obstacle_type, 0) + 1
        
        return {
            "total_obstacles": total_obstacles,
            "verified_obstacles": verified_obstacles,
            "verification_rate": verified_obstacles / total_obstacles if total_obstacles > 0 else 0,
            "severity_distribution": severity_counts,
            "type_distribution": type_counts
        }
