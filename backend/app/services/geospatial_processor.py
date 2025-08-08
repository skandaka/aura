"""
Geospatial processing and analysis service
"""

import math
from typing import List, Tuple, Dict, Optional
from ..models.schemas import Coordinates

class GeospatialProcessor:
    """
    Advanced geospatial processing for route optimization and analysis
    """
    
    def __init__(self):
        self.earth_radius = 6371000  # Earth's radius in meters
        
    def calculate_distance(self, point1: Coordinates, point2: Coordinates) -> float:
        """Calculate distance between two coordinates using Haversine formula"""
        lat1, lon1 = math.radians(point1.latitude), math.radians(point1.longitude)
        lat2, lon2 = math.radians(point2.latitude), math.radians(point2.longitude)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return self.earth_radius * c
    
    def calculate_bearing(self, point1: Coordinates, point2: Coordinates) -> float:
        """Calculate bearing from point1 to point2 in degrees"""
        lat1, lon1 = math.radians(point1.latitude), math.radians(point1.longitude)
        lat2, lon2 = math.radians(point2.latitude), math.radians(point2.longitude)
        
        dlon = lon2 - lon1
        
        y = math.sin(dlon) * math.cos(lat2)
        x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
        
        bearing = math.atan2(y, x)
        bearing = math.degrees(bearing)
        
        return (bearing + 360) % 360
    
    def interpolate_points(self, start: Coordinates, end: Coordinates, num_points: int) -> List[Coordinates]:
        """Interpolate points between start and end coordinates"""
        points = []
        
        for i in range(num_points + 1):
            ratio = i / num_points
            lat = start.latitude + (end.latitude - start.latitude) * ratio
            lon = start.longitude + (end.longitude - start.longitude) * ratio
            points.append(Coordinates(latitude=lat, longitude=lon))
        
        return points
    
    def create_buffer_zone(self, center: Coordinates, radius: float, num_points: int = 16) -> List[Coordinates]:
        """Create a circular buffer zone around a point"""
        buffer_points = []
        
        for i in range(num_points):
            angle = 2 * math.pi * i / num_points
            
            # Calculate offset in degrees (approximate)
            lat_offset = (radius / self.earth_radius) * math.cos(angle) * (180 / math.pi)
            lon_offset = (radius / (self.earth_radius * math.cos(math.radians(center.latitude)))) * math.sin(angle) * (180 / math.pi)
            
            buffer_lat = center.latitude + lat_offset
            buffer_lon = center.longitude + lon_offset
            
            buffer_points.append(Coordinates(latitude=buffer_lat, longitude=buffer_lon))
        
        return buffer_points
    
    def point_in_polygon(self, point: Coordinates, polygon: List[Coordinates]) -> bool:
        """Check if a point is inside a polygon using ray casting algorithm"""
        x, y = point.longitude, point.latitude
        n = len(polygon)
        inside = False
        
        p1x, p1y = polygon[0].longitude, polygon[0].latitude
        for i in range(1, n + 1):
            p2x, p2y = polygon[i % n].longitude, polygon[i % n].latitude
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y
        
        return inside
    
    def calculate_route_corridor(self, route_points: List[Coordinates], corridor_width: float) -> List[List[Coordinates]]:
        """Create a corridor around a route with specified width"""
        corridors = []
        
        for i in range(len(route_points) - 1):
            start_point = route_points[i]
            end_point = route_points[i + 1]
            
            # Calculate perpendicular offset
            bearing = self.calculate_bearing(start_point, end_point)
            left_bearing = (bearing - 90) % 360
            right_bearing = (bearing + 90) % 360
            
            # Create corridor polygon for this segment
            left_start = self._offset_point(start_point, left_bearing, corridor_width / 2)
            right_start = self._offset_point(start_point, right_bearing, corridor_width / 2)
            left_end = self._offset_point(end_point, left_bearing, corridor_width / 2)
            right_end = self._offset_point(end_point, right_bearing, corridor_width / 2)
            
            corridor_polygon = [left_start, left_end, right_end, right_start]
            corridors.append(corridor_polygon)
        
        return corridors
    
    def _offset_point(self, point: Coordinates, bearing: float, distance: float) -> Coordinates:
        """Offset a point by distance in the given bearing"""
        lat1 = math.radians(point.latitude)
        lon1 = math.radians(point.longitude)
        bearing_rad = math.radians(bearing)
        
        lat2 = math.asin(
            math.sin(lat1) * math.cos(distance / self.earth_radius) +
            math.cos(lat1) * math.sin(distance / self.earth_radius) * math.cos(bearing_rad)
        )
        
        lon2 = lon1 + math.atan2(
            math.sin(bearing_rad) * math.sin(distance / self.earth_radius) * math.cos(lat1),
            math.cos(distance / self.earth_radius) - math.sin(lat1) * math.sin(lat2)
        )
        
        return Coordinates(
            latitude=math.degrees(lat2),
            longitude=math.degrees(lon2)
        )
    
    def simplify_route(self, route_points: List[Coordinates], tolerance: float = 10.0) -> List[Coordinates]:
        """Simplify route using Douglas-Peucker algorithm"""
        if len(route_points) < 3:
            return route_points
        
        return self._douglas_peucker(route_points, tolerance)
    
    def _douglas_peucker(self, points: List[Coordinates], tolerance: float) -> List[Coordinates]:
        """Douglas-Peucker line simplification algorithm"""
        if len(points) < 3:
            return points
        
        # Find the point with maximum distance from line between first and last points
        max_distance = 0
        max_index = 0
        
        for i in range(1, len(points) - 1):
            distance = self._point_to_line_distance(points[i], points[0], points[-1])
            if distance > max_distance:
                max_distance = distance
                max_index = i
        
        # If max distance is greater than tolerance, recursively simplify
        if max_distance > tolerance:
            # Recursive call
            left_points = self._douglas_peucker(points[:max_index + 1], tolerance)
            right_points = self._douglas_peucker(points[max_index:], tolerance)
            
            # Combine results
            return left_points[:-1] + right_points
        else:
            return [points[0], points[-1]]
    
    def _point_to_line_distance(self, point: Coordinates, line_start: Coordinates, line_end: Coordinates) -> float:
        """Calculate perpendicular distance from point to line segment"""
        # Convert to Cartesian coordinates for easier calculation
        x0, y0 = point.longitude, point.latitude
        x1, y1 = line_start.longitude, line_start.latitude
        x2, y2 = line_end.longitude, line_end.latitude
        
        # Calculate distance
        numerator = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1)
        denominator = math.sqrt((y2 - y1)**2 + (x2 - x1)**2)
        
        if denominator == 0:
            return self.calculate_distance(point, line_start)
        
        # Convert back to meters (approximate)
        distance_degrees = numerator / denominator
        distance_meters = distance_degrees * 111320  # Approximate conversion
        
        return distance_meters
    
    def find_nearest_point_on_route(self, target: Coordinates, route_points: List[Coordinates]) -> Tuple[Coordinates, int, float]:
        """Find the nearest point on a route to a target point"""
        min_distance = float('inf')
        nearest_point = None
        nearest_segment = 0
        
        for i in range(len(route_points) - 1):
            # Check distance to current point
            distance_to_point = self.calculate_distance(target, route_points[i])
            if distance_to_point < min_distance:
                min_distance = distance_to_point
                nearest_point = route_points[i]
                nearest_segment = i
            
            # Check distance to line segment
            nearest_on_segment = self._nearest_point_on_segment(target, route_points[i], route_points[i + 1])
            distance_to_segment = self.calculate_distance(target, nearest_on_segment)
            
            if distance_to_segment < min_distance:
                min_distance = distance_to_segment
                nearest_point = nearest_on_segment
                nearest_segment = i
        
        return nearest_point, nearest_segment, min_distance
    
    def _nearest_point_on_segment(self, point: Coordinates, segment_start: Coordinates, segment_end: Coordinates) -> Coordinates:
        """Find the nearest point on a line segment to a given point"""
        # Simplified calculation - in real implementation would use proper projection
        # For now, return the closer endpoint
        dist_to_start = self.calculate_distance(point, segment_start)
        dist_to_end = self.calculate_distance(point, segment_end)
        
        return segment_start if dist_to_start < dist_to_end else segment_end
    
    def calculate_route_bounds(self, route_points: List[Coordinates]) -> Dict[str, float]:
        """Calculate bounding box for a route"""
        if not route_points:
            return {"north": 0, "south": 0, "east": 0, "west": 0}
        
        latitudes = [point.latitude for point in route_points]
        longitudes = [point.longitude for point in route_points]
        
        return {
            "north": max(latitudes),
            "south": min(latitudes),
            "east": max(longitudes),
            "west": min(longitudes)
        }
    
    def generate_waypoints(self, start: Coordinates, end: Coordinates, intermediate_points: List[Coordinates] = None) -> List[Coordinates]:
        """Generate optimized waypoints for a route"""
        waypoints = [start]
        
        if intermediate_points:
            # Sort intermediate points by distance from start
            sorted_points = sorted(
                intermediate_points,
                key=lambda p: self.calculate_distance(start, p)
            )
            waypoints.extend(sorted_points)
        
        waypoints.append(end)
        return waypoints
