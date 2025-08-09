"""
API routes for Aura accessible routing application
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import time
from datetime import datetime
import asyncio

from ..models.database import get_db
from ..models.schemas import (
    RouteRequest, Route, ObstacleReport, ObstacleResponse,
    AnalyticsResponse, HealthCheck, SuccessResponse, ErrorResponse,
    AmenityResponse, Coordinates, AmenityType
)
from ..services.routing_engine import AdvancedRoutingEngine
from ..services.obstacle_detector import ObstacleDetector
from ..services.accessibility_analyzer import AccessibilityAnalyzer

# Create router
router = APIRouter()

# Initialize services
routing_engine = AdvancedRoutingEngine()
obstacle_detector = ObstacleDetector()
accessibility_analyzer = AccessibilityAnalyzer()

# In-memory demo amenities (could be replaced with DB)
DEMO_AMENITIES = [
    AmenityResponse(id="am_001", name="Rest Spot", type=AmenityType.REST_SPOT, description="Bench with shade", location=Coordinates(latitude=40.7582, longitude=-73.9855)),
    AmenityResponse(id="am_002", name="Audio Crosswalk", type=AmenityType.AUDIO_CROSSWALK, description="Audible pedestrian signal", location=Coordinates(latitude=40.7510, longitude=-73.9900)),
    AmenityResponse(id="am_003", name="Elevator", type=AmenityType.ELEVATOR, description="Street-to-platform elevator", location=Coordinates(latitude=40.7506, longitude=-73.9935)),
    # Schaumburg / Woodfield area
    AmenityResponse(id="am_101", name="Rest Spot", type=AmenityType.REST_SPOT, description="Bench near Woodfield Mall", location=Coordinates(latitude=42.0466, longitude=-88.0371)),
    AmenityResponse(id="am_102", name="Audio Crosswalk", type=AmenityType.AUDIO_CROSSWALK, description="Audible signal at Higgins Rd", location=Coordinates(latitude=42.0339, longitude=-88.0837)),
]

@router.get("/amenities", response_model=List[AmenityResponse])
async def get_amenities(lat: Optional[float] = None, lon: Optional[float] = None, radius: Optional[float] = 1500.0):
    """Return amenity points like rest spots and audio crosswalks. If lat/lon provided, filter by radius (meters)."""
    def haversine(lat1, lon1, lat2, lon2):
        from math import radians, sin, cos, asin, sqrt
        R = 6371000
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        return R * c

    if lat is None or lon is None:
        print("📍 Returning all amenities (no filtering parameters provided)")
        return DEMO_AMENITIES

    filtered = []
    for a in DEMO_AMENITIES:
        d = haversine(lat, lon, a.location.latitude, a.location.longitude)
        if d <= (radius or 1500.0):
            filtered.append(a)
    print(f"📍 Amenities request center=({lat:.4f},{lon:.4f}) radius={radius} -> {len(filtered)} matched")
    return filtered

@router.get("/amenities/all", response_model=List[AmenityResponse])
async def get_all_amenities():
    """Return all demo amenities unfiltered (debug/diagnostic)."""
    return DEMO_AMENITIES

@router.post("/calculate-route", response_model=Route)
async def calculate_route(request: RouteRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Calculate an advanced accessible route with comprehensive analysis
    """
    try:
        print(f"🔍 Received route request: {request}")
        start_time = time.time()
        
        # Calculate the route with a hard timeout to avoid hanging requests
        TIMEOUT_SECONDS = 20
        try:
            route = await asyncio.wait_for(routing_engine.calculate_route(request), timeout=TIMEOUT_SECONDS)
        except asyncio.TimeoutError:
            raise HTTPException(status_code=504, detail=f"Route calculation timed out after {TIMEOUT_SECONDS}s")
        
        # Log analytics in background
        background_tasks.add_task(
            log_route_analytics,
            db,
            route,
            int((time.time() - start_time) * 1000),
            request.user_id,
            True,
            None
        )
        
        return route
        
    except Exception as e:
        # Log error analytics in background
        background_tasks.add_task(
            log_route_analytics,
            db,
            None,
            int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0,
            request.user_id if 'request' in locals() else None,
            False,
            str(e)
        )
        
        raise HTTPException(status_code=getattr(e, 'status_code', 500), detail=f"Route calculation failed: {str(e)}")

@router.get("/route/{route_id}")
async def get_route(route_id: str):
    """Get details of a previously calculated route"""
    # In a real implementation, this would query the database
    # For now, check the routing engine cache
    for cached_route in routing_engine.route_cache.values():
        if cached_route.route_id == route_id:
            return cached_route
    
    raise HTTPException(status_code=404, detail="Route not found")

@router.get("/obstacles", response_model=List[ObstacleResponse])
async def get_obstacles(active_only: bool = True, lat: Optional[float] = None, lon: Optional[float] = None, radius: Optional[float] = None):
    """
    Get obstacles, optionally filtered by location
    """
    try:
        if lat is not None and lon is not None and radius is not None:
            from ..models.schemas import Coordinates
            center = Coordinates(latitude=lat, longitude=lon)
            # This would need to be implemented in obstacle_detector
            obstacles = await obstacle_detector.get_all_obstacles(active_only=active_only)
            # Filter by location (simplified implementation)
            filtered_obstacles = []
            for obstacle in obstacles:
                distance = obstacle_detector._calculate_distance(
                    lat, lon, obstacle.location.latitude, obstacle.location.longitude
                )
                if distance <= radius:
                    filtered_obstacles.append(obstacle)
            return filtered_obstacles
        else:
            return await obstacle_detector.get_all_obstacles(active_only=active_only)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve obstacles: {str(e)}")

@router.post("/obstacles/report", response_model=SuccessResponse)
async def report_obstacle(report: ObstacleReport, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Report a new accessibility obstacle"""
    try:
        obstacle_data = {
            "location": {
                "latitude": report.location.latitude,
                "longitude": report.location.longitude
            },
            "type": report.type.value,
            "severity": report.severity.value,
            "description": report.description,
            "affects_wheelchair": report.affects_wheelchair,
            "affects_visually_impaired": report.affects_visually_impaired,
            "affects_mobility_aid": report.affects_mobility_aid
        }
        
        obstacle_id = await obstacle_detector.report_obstacle(obstacle_data)
        
        # Log to database in background
        background_tasks.add_task(log_obstacle_report, db, obstacle_id, report.reporter_id)
        
        return SuccessResponse(
            message="Obstacle reported successfully",
            data={"obstacle_id": obstacle_id, "verification_required": True}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to report obstacle: {str(e)}")

@router.get("/obstacles/{obstacle_id}", response_model=ObstacleResponse)
async def get_obstacle(obstacle_id: str):
    """Get a specific obstacle by ID"""
    obstacle = await obstacle_detector.get_obstacle_by_id(obstacle_id)
    
    if obstacle is None:
        raise HTTPException(status_code=404, detail="Obstacle not found")
    
    return obstacle

@router.patch("/obstacles/{obstacle_id}/verify")
async def verify_obstacle(obstacle_id: str, verified: bool, db: Session = Depends(get_db)):
    """Verify or unverify an obstacle (admin function)"""
    success = await obstacle_detector.update_obstacle_verification(obstacle_id, verified)
    
    if not success:
        raise HTTPException(status_code=404, detail="Obstacle not found")
    
    return SuccessResponse(
        message=f"Obstacle {'verified' if verified else 'unverified'} successfully"
    )

@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(db: Session = Depends(get_db)):
    """Get route analytics and statistics"""
    try:
        # Get obstacle statistics
        obstacle_stats = obstacle_detector.get_obstacle_statistics()
        
        # In a real implementation, this would query the database for route analytics
        # For now, return simulated data
        analytics = AnalyticsResponse(
            total_routes_calculated=len(routing_engine.route_cache),
            average_accessibility_score=0.82,
            most_common_obstacles=[
                {"type": "stairs", "count": 15, "percentage": 35.0},
                {"type": "construction", "count": 12, "percentage": 28.0},
                {"type": "broken_surface", "count": 8, "percentage": 19.0},
                {"type": "narrow_path", "count": 7, "percentage": 16.0}
            ],
            popular_areas=[
                {"area": "Downtown San Francisco", "route_count": 45, "avg_accessibility": 0.78},
                {"area": "Mission District", "route_count": 32, "avg_accessibility": 0.85},
                {"area": "Financial District", "route_count": 28, "avg_accessibility": 0.80}
            ],
            user_satisfaction_rating=4.2
        )
        
        return analytics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analytics: {str(e)}")

@router.post("/route/{route_id}/feedback")
async def submit_route_feedback(route_id: str, rating: int, comments: Optional[str] = None, db: Session = Depends(get_db)):
    """Submit feedback for a route"""
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    # In a real implementation, this would save feedback to the database
    return SuccessResponse(
        message="Feedback submitted successfully",
        data={"route_id": route_id, "rating": rating}
    )

@router.get("/accessibility/report")
async def generate_accessibility_report(route_id: str):
    """Generate a detailed accessibility report for a route"""
    # Find the route
    route = None
    for cached_route in routing_engine.route_cache.values():
        if cached_route.route_id == route_id:
            route = cached_route
            break
    
    if route is None:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Generate comprehensive report
    report = accessibility_analyzer.generate_accessibility_report(
        route.accessibility_score,
        # Would need to get preferences from the original request
        None  # Simplified for now
    )
    
    return {
        "route_id": route_id,
        "accessibility_report": report,
        "generated_at": datetime.utcnow().isoformat()
    }

# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Aura API",
        "version": "1.0.0"
    }

@router.post("/geocode")
async def geocode_address(request: dict):
    """Convert address to coordinates"""
    try:
        from geopy.geocoders import Nominatim
        
        address = request.get("address", "").strip()
        if not address:
            raise HTTPException(status_code=400, detail="Address is required")
        
        # Initialize geocoder with a more specific user agent
        geolocator = Nominatim(user_agent="aura-accessibility-app/1.0")
        
        # Geocode the address
        location = geolocator.geocode(address, timeout=10)
        
        if not location:
            # Try with a more generic search if specific address fails
            generic_search = address.split(',')[0] if ',' in address else address
            location = geolocator.geocode(generic_search, timeout=10)
            
            if not location:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Address not found: '{address}'. Try a simpler format like 'City, State' or check the spelling."
                )
        
        return {
            "latitude": location.latitude,
            "longitude": location.longitude,
            "formatted_address": location.address,
            "raw_data": {
                "display_name": location.address,
                "importance": getattr(location.raw, 'importance', None),
                "place_id": getattr(location.raw, 'place_id', None)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Geocoding failed: {str(e)}")

@router.post("/reverse-geocode")
async def reverse_geocode_coordinates(request: dict):
    """Convert coordinates to address"""
    try:
        from geopy.geocoders import Nominatim
        
        latitude = request.get("latitude")
        longitude = request.get("longitude")
        
        if latitude is None or longitude is None:
            raise HTTPException(status_code=400, detail="Latitude and longitude are required")
        
        # Validate coordinate ranges
        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            raise HTTPException(status_code=400, detail="Invalid coordinates")
        
        # Initialize geocoder
        geolocator = Nominatim(user_agent="aura-accessibility-app")
        
        # Reverse geocode the coordinates
        location = geolocator.reverse((latitude, longitude), timeout=10)
        
        if not location:
            raise HTTPException(status_code=404, detail="Address not found for these coordinates")
        
        return {
            "address": location.address,
            "latitude": latitude,
            "longitude": longitude,
            "raw_data": {
                "display_name": location.address,
                "address_components": getattr(location.raw, 'address', {})
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reverse geocoding failed: {str(e)}")

# Background task functions
async def log_route_analytics(db: Session, route: Optional[Route], calculation_time_ms: int, user_id: Optional[str], success: bool, error_message: Optional[str]):
    """Log route calculation analytics to database"""
    try:
        from ..models.database import RouteAnalytics
        
        analytics = RouteAnalytics(
            route_id=route.route_id if route else None,
            user_id=user_id,
            calculation_time_ms=calculation_time_ms,
            accessibility_score=route.accessibility_score.overall_score if route else None,
            distance_km=route.total_distance / 1000 if route else None,
            obstacles_detected=len([w for w in route.warnings if "obstacle" in w.lower()]) if route else 0,
            success=success,
            error_message=error_message,
            timestamp=datetime.utcnow()
        )
        
        db.add(analytics)
        db.commit()
        
    except Exception as e:
        print(f"Failed to log analytics: {e}")

async def log_obstacle_report(db: Session, obstacle_id: str, reporter_id: Optional[str]):
    """Log obstacle report to database"""
    try:
        # In a real implementation, this would save to the database
        print(f"Obstacle {obstacle_id} reported by user {reporter_id}")
        
    except Exception as e:
        print(f"Failed to log obstacle report: {e}")
