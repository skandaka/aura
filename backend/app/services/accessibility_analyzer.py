
import math
from typing import List, Dict, Optional
from ..models.schemas import AccessibilityScore, RoutePoint, AccessibilityPreferences, ObstacleResponse

class AccessibilityAnalyzer:

    def __init__(self):
        self.scoring_weights = {
            'surface_quality': 0.20,
            'slope_accessibility': 0.25,
            'obstacle_avoidance': 0.20,
            'width_adequacy': 0.10,
            'safety_rating': 0.10,
            'lighting_adequacy': 0.08,
            'traffic_safety': 0.07
        }
    
    async def calculate_comprehensive_score(
        self, 
        route_points: List[RoutePoint], 
        preferences: AccessibilityPreferences, 
        obstacles: List[ObstacleResponse]
    ) -> AccessibilityScore:

        surface_quality = self._analyze_surface_quality(route_points, obstacles)
        slope_accessibility = self._analyze_slope_accessibility(route_points, preferences)
        obstacle_avoidance = self._analyze_obstacle_avoidance(obstacles, preferences)
        width_adequacy = self._analyze_width_adequacy(route_points, preferences)
        safety_rating = self._analyze_safety_rating(route_points)
        lighting_adequacy = self._analyze_lighting_adequacy(route_points)
        traffic_safety = self._analyze_traffic_safety(route_points)
        
        overall_score = (
            surface_quality * self.scoring_weights['surface_quality'] +
            slope_accessibility * self.scoring_weights['slope_accessibility'] +
            obstacle_avoidance * self.scoring_weights['obstacle_avoidance'] +
            width_adequacy * self.scoring_weights['width_adequacy'] +
            safety_rating * self.scoring_weights['safety_rating'] +
            lighting_adequacy * self.scoring_weights['lighting_adequacy'] +
            traffic_safety * self.scoring_weights['traffic_safety']
        )
        
        return AccessibilityScore(
            overall_score=round(overall_score, 3),
            surface_quality=round(surface_quality, 3),
            slope_accessibility=round(slope_accessibility, 3),
            obstacle_avoidance=round(obstacle_avoidance, 3),
            width_adequacy=round(width_adequacy, 3),
            safety_rating=round(safety_rating, 3),
            lighting_adequacy=round(lighting_adequacy, 3),
            traffic_safety=round(traffic_safety, 3)
        )
    
    def _analyze_surface_quality(self, route_points: List[RoutePoint], obstacles: List[ObstacleResponse]) -> float:
        base_score = 0.9  # ssume good surface quality by default
        
        surface_obstacles = [obs for obs in obstacles if obs.type.value in ["broken_surface", "narrow_path"]]
        
        for obstacle in surface_obstacles:
            penalty = {
                "critical": 0.4,
                "high": 0.3,
                "medium": 0.2,
                "low": 0.1
            }.get(obstacle.severity.value, 0.1)
            
            base_score -= penalty
        
        surface_variation_penalty = 0.0
        for point in route_points:
            if "uneven" in " ".join(point.warnings).lower():
                surface_variation_penalty += 0.05
            if "cracked" in " ".join(point.warnings).lower():
                surface_variation_penalty += 0.1
        
        base_score -= min(surface_variation_penalty, 0.3)
        
        return max(0.0, min(1.0, base_score))
    
    def _analyze_slope_accessibility(self, route_points: List[RoutePoint], preferences: AccessibilityPreferences) -> float:
        if len(route_points) < 2:
            return 1.0
        
        slope_scores = []
        max_slope_threshold = preferences.max_slope_percentage
        
        for i in range(1, len(route_points)):
            if route_points[i].elevation is not None and route_points[i-1].elevation is not None:
                distance = self._calculate_distance(
                    route_points[i-1].latitude, route_points[i-1].longitude,
                    route_points[i].latitude, route_points[i].longitude
                )
                
                elevation_change = abs(route_points[i].elevation - route_points[i-1].elevation)
                slope_percentage = (elevation_change / max(distance, 1)) * 100 if distance > 0 else 0
                
                if slope_percentage <= max_slope_threshold:
                    slope_scores.append(1.0)
                else:
                    excess_slope = slope_percentage - max_slope_threshold
                    penalty = min(1.0, excess_slope / 10.0)  # 10% slope = full penalty
                    slope_scores.append(max(0.0, 1.0 - penalty))
        
        return sum(slope_scores) / len(slope_scores) if slope_scores else 0.8
    
    def _analyze_obstacle_avoidance(self, obstacles: List[ObstacleResponse], preferences: AccessibilityPreferences) -> float:
        if not obstacles:
            return 1.0
        
        total_penalty = 0.0
        
        for obstacle in obstacles:
            severity_penalty = {
                "critical": 0.5,
                "high": 0.3,
                "medium": 0.15,
                "low": 0.05
            }.get(obstacle.severity.value, 0.1)
            
            if obstacle.type.value == "stairs" and preferences.avoid_stairs:
                severity_penalty *= 1.5
            
            if obstacle.type.value == "construction" and preferences.avoid_construction:
                severity_penalty *= 1.3
            
            if obstacle.type.value == "steep_slope" and preferences.avoid_steep_slopes:
                severity_penalty *= 1.4
            
            if preferences.mobility_aid.value == "wheelchair":
                if obstacle.affects_wheelchair:
                    severity_penalty *= 1.3
            elif preferences.mobility_aid.value in ["walker", "cane"]:
                if obstacle.affects_mobility_aid:
                    severity_penalty *= 1.2
            
            total_penalty += severity_penalty
        
        total_penalty = min(total_penalty, 0.8)
        
        return max(0.0, 1.0 - total_penalty)
    
    def _analyze_width_adequacy(self, route_points: List[RoutePoint], preferences: AccessibilityPreferences) -> float:
        base_score = 0.85
        
        if preferences.prefer_wider_sidewalks:
            width_bonus = 0.0
            for point in route_points:
                for feature in point.accessibility_features:
                    if "wide" in feature.lower() or "wider" in feature.lower():
                        width_bonus += 0.02
            
            base_score += min(width_bonus, 0.15)
        
        width_warnings = 0
        for point in route_points:
            for warning in point.warnings:
                if "narrow" in warning.lower() or "width" in warning.lower():
                    width_warnings += 1
        
        width_penalty = min(width_warnings * 0.1, 0.4)
        base_score -= width_penalty
        
        if preferences.mobility_aid.value == "wheelchair":
            base_score *= 0.95
        
        return max(0.0, min(1.0, base_score))
    
    def _analyze_safety_rating(self, route_points: List[RoutePoint]) -> float:
        base_safety = 0.8
        
        safety_features = 0
        safety_warnings = 0
        
        for point in route_points:
            for feature in point.accessibility_features:
                if any(keyword in feature.lower() for keyword in ["safe", "well-lit", "protected", "secure"]):
                    safety_features += 1
            
            for warning in point.warnings:
                if any(keyword in warning.lower() for keyword in ["unsafe", "danger", "hazard", "risk"]):
                    safety_warnings += 1
        
        safety_bonus = min(safety_features * 0.02, 0.15)
        safety_penalty = min(safety_warnings * 0.05, 0.3)
        
        final_score = base_safety + safety_bonus - safety_penalty
        
        return max(0.0, min(1.0, final_score))
    
    def _analyze_lighting_adequacy(self, route_points: List[RoutePoint]) -> float:
        base_lighting = 0.75
        
        lighting_features = 0
        
        for point in route_points:
            for feature in point.accessibility_features:
                if "lit" in feature.lower() or "lighting" in feature.lower():
                    lighting_features += 1
        
        lighting_bonus = min(lighting_features * 0.03, 0.2)
        
        return max(0.0, min(1.0, base_lighting + lighting_bonus))
    
    def _analyze_traffic_safety(self, route_points: List[RoutePoint]) -> float:
        base_traffic_safety = 0.85
        
        traffic_warnings = 0
        traffic_features = 0
        
        for point in route_points:
            for warning in point.warnings:
                if any(keyword in warning.lower() for keyword in ["traffic", "crossing", "busy road", "highway"]):
                    traffic_warnings += 1
            
            for feature in point.accessibility_features:
                if any(keyword in feature.lower() for keyword in ["crossing", "signal", "protected", "pedestrian"]):
                    traffic_features += 1
        
        traffic_penalty = min(traffic_warnings * 0.08, 0.4)
        traffic_bonus = min(traffic_features * 0.03, 0.15)
        
        final_score = base_traffic_safety - traffic_penalty + traffic_bonus
        
        return max(0.0, min(1.0, final_score))
    
    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000
        
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        
        return R * c
    
    def generate_accessibility_report(self, score: AccessibilityScore, preferences: AccessibilityPreferences) -> Dict[str, any]:

        def score_to_grade(score_value: float) -> str:
            if score_value >= 0.9:
                return "Excellent"
            elif score_value >= 0.8:
                return "Good"
            elif score_value >= 0.7:
                return "Fair"
            elif score_value >= 0.6:
                return "Poor"
            else:
                return "Very Poor"
        
        return {
            "overall_grade": score_to_grade(score.overall_score),
            "overall_percentage": round(score.overall_score * 100, 1),
            "component_analysis": {
                "surface_quality": {
                    "score": score.surface_quality,
                    "grade": score_to_grade(score.surface_quality),
                    "weight": self.scoring_weights['surface_quality']
                },
                "slope_accessibility": {
                    "score": score.slope_accessibility,
                    "grade": score_to_grade(score.slope_accessibility),
                    "weight": self.scoring_weights['slope_accessibility']
                },
                "obstacle_avoidance": {
                    "score": score.obstacle_avoidance,
                    "grade": score_to_grade(score.obstacle_avoidance),
                    "weight": self.scoring_weights['obstacle_avoidance']
                },
                "width_adequacy": {
                    "score": score.width_adequacy,
                    "grade": score_to_grade(score.width_adequacy),
                    "weight": self.scoring_weights['width_adequacy']
                },
                "safety_rating": {
                    "score": score.safety_rating,
                    "grade": score_to_grade(score.safety_rating),
                    "weight": self.scoring_weights['safety_rating']
                },
                "lighting_adequacy": {
                    "score": score.lighting_adequacy,
                    "grade": score_to_grade(score.lighting_adequacy),
                    "weight": self.scoring_weights['lighting_adequacy']
                },
                "traffic_safety": {
                    "score": score.traffic_safety,
                    "grade": score_to_grade(score.traffic_safety),
                    "weight": self.scoring_weights['traffic_safety']
                }
            },
            "recommendations": self._generate_recommendations(score, preferences)
        }
    
    def _generate_recommendations(self, score: AccessibilityScore, preferences: AccessibilityPreferences) -> List[str]:
        recommendations = []
        
        if score.surface_quality < 0.7:
            recommendations.append("Consider alternative routes with better surface conditions")
        
        if score.slope_accessibility < 0.6:
            recommendations.append("Route may be challenging due to steep slopes - consider longer but flatter alternatives")
        
        if score.obstacle_avoidance < 0.7:
            recommendations.append("Multiple obstacles detected - allow extra travel time")
        
        if score.width_adequacy < 0.7 and preferences.mobility_aid.value == "wheelchair":
            recommendations.append("Pathway width may be inadequate for wheelchair access")
        
        if score.safety_rating < 0.7:
            recommendations.append("Consider traveling during daylight hours for better safety")
        
        if score.lighting_adequacy < 0.6:
            recommendations.append("Route may have poor lighting - bring flashlight for evening travel")
        
        if score.overall_score < 0.6:
            recommendations.append("This route has significant accessibility challenges - strongly consider alternatives")
        
        return recommendations
