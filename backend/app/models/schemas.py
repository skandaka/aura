"""
Pydantic models for API request/response validation
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# Enums for validation
class AccessibilityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class MobilityAid(str, Enum):
    NONE = "none"
    WHEELCHAIR = "wheelchair"
    WALKER = "walker"
    CANE = "cane"
    GUIDE_DOG = "guide_dog"

class ObstacleType(str, Enum):
    CONSTRUCTION = "construction"
    STAIRS = "stairs"
    STEEP_SLOPE = "steep_slope"
    NARROW_PATH = "narrow_path"
    BROKEN_SURFACE = "broken_surface"
    BLOCKED_ACCESS = "blocked_access"
    TEMPORARY_BARRIER = "temporary_barrier"
    OTHER = "other"

class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TransportMode(str, Enum):
    WALKING = "walking"
    TRANSIT = "transit"
    MIXED = "mixed"

class TimePreference(str, Enum):
    FASTEST = "fastest"
    SHORTEST = "shortest"
    MOST_ACCESSIBLE = "most_accessible"
    BALANCED = "balanced"

# New: Amenities
class AmenityType(str, Enum):
    REST_SPOT = "rest_spot"
    AUDIO_CROSSWALK = "audio_crosswalk"
    ELEVATOR = "elevator"
    RAMP = "ramp"
    ACCESSIBLE_RESTROOM = "accessible_restroom"

# Base models
class Coordinates(BaseModel):
    """Geographic coordinates"""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")

class AccessibilityPreferences(BaseModel):
    """User accessibility preferences"""
    avoid_stairs: bool = True
    avoid_steep_slopes: bool = True
    max_slope_percentage: float = Field(5.0, ge=0, le=30)
    require_curb_cuts: bool = True
    avoid_construction: bool = True
    prefer_wider_sidewalks: bool = True
    require_tactile_guidance: bool = False
    mobility_aid: MobilityAid = MobilityAid.NONE

# Request models
class RouteRequest(BaseModel):
    """Route calculation request"""
    start: Coordinates
    end: Coordinates
    accessibility_level: AccessibilityLevel = AccessibilityLevel.MEDIUM
    preferences: AccessibilityPreferences = AccessibilityPreferences()
    transport_mode: TransportMode = TransportMode.WALKING
    time_preference: TimePreference = TimePreference.BALANCED
    user_id: Optional[str] = None

class ObstacleReport(BaseModel):
    """Obstacle reporting request"""
    location: Coordinates
    type: ObstacleType
    severity: SeverityLevel
    description: str
    affects_wheelchair: bool = True
    affects_visually_impaired: bool = False
    affects_mobility_aid: bool = True
    reporter_id: Optional[str] = None

# Response models
class RoutePoint(BaseModel):
    """Individual point in a route"""
    latitude: float
    longitude: float
    instruction: str
    distance_from_start: float
    elevation: Optional[float] = None
    accessibility_features: List[str] = []
    warnings: List[str] = []
    segment_time: Optional[int] = None  # seconds

class AccessibilityScore(BaseModel):
    """Comprehensive accessibility scoring"""
    overall_score: float = Field(..., ge=0, le=1)
    surface_quality: float = Field(..., ge=0, le=1)
    slope_accessibility: float = Field(..., ge=0, le=1)
    obstacle_avoidance: float = Field(..., ge=0, le=1)
    width_adequacy: float = Field(..., ge=0, le=1)
    safety_rating: float = Field(..., ge=0, le=1)
    lighting_adequacy: float = Field(..., ge=0, le=1)
    traffic_safety: float = Field(..., ge=0, le=1)

class RouteAlternative(BaseModel):
    """Alternative route option"""
    route_id: str
    description: str
    total_distance: float
    estimated_time: int
    accessibility_score: float
    key_features: List[str] = []

class Route(BaseModel):
    """Complete route response"""
    route_id: str
    points: List[RoutePoint]
    total_distance: float
    estimated_time: int
    accessibility_score: AccessibilityScore
    alternatives: List[RouteAlternative] = []
    warnings: List[str] = []
    accessibility_features: List[str] = []
    route_summary: Dict[str, Any] = {}
    created_at: datetime
    calculation_time_ms: Optional[int] = None
    # New: obstacles along the route for map rendering
    obstacles: List['ObstacleResponse'] = []

class AmenityResponse(BaseModel):
    """Amenity locations like rest spots, audio crosswalks, elevators, etc."""
    id: str
    name: str
    type: AmenityType
    description: Optional[str] = None
    location: Coordinates
    installed_at: Optional[datetime] = None

class ObstacleResponse(BaseModel):
    """Obstacle information response"""
    id: str
    location: Coordinates
    type: ObstacleType
    severity: SeverityLevel
    description: str
    reported_at: datetime
    verified: bool = False
    affects_wheelchair: bool = True
    affects_visually_impaired: bool = False
    affects_mobility_aid: bool = True
    estimated_clearance_date: Optional[datetime] = None
    impact_radius: float = 50.0  # meters

class AnalyticsResponse(BaseModel):
    """Route analytics response"""
    total_routes_calculated: int
    average_accessibility_score: float
    most_common_obstacles: List[Dict[str, Any]]
    popular_areas: List[Dict[str, Any]]
    user_satisfaction_rating: Optional[float] = None

# Utility response models
class HealthCheck(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    environment: str
    features: Dict[str, bool]
    uptime_seconds: Optional[int] = None

class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime

class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None

# Rebuild models to resolve forward refs now that ObstacleResponse exists
Route.model_rebuild(force=True)
