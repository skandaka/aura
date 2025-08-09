
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json

from ..services.config import settings

# Database setup
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class Route(Base):
    __tablename__ = "routes"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(String(50), unique=True, index=True)
    start_lat = Column(Float, nullable=False)
    start_lon = Column(Float, nullable=False)
    end_lat = Column(Float, nullable=False)
    end_lon = Column(Float, nullable=False)
    accessibility_level = Column(String(20), default="medium")
    total_distance = Column(Float)
    estimated_time = Column(Integer)
    accessibility_score = Column(Float)
    route_data = Column(JSON)  # Store complete route information
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(String(50), nullable=True)

class Obstacle(Base):
    __tablename__ = "obstacles"
    
    id = Column(Integer, primary_key=True, index=True)
    obstacle_id = Column(String(50), unique=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    description = Column(Text)
    reported_at = Column(DateTime, default=datetime.utcnow)
    verified = Column(Boolean, default=False)
    affects_wheelchair = Column(Boolean, default=True)
    affects_visually_impaired = Column(Boolean, default=False)
    affects_mobility_aid = Column(Boolean, default=True)
    reporter_id = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)

class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), unique=True, index=True)
    avoid_stairs = Column(Boolean, default=True)
    avoid_steep_slopes = Column(Boolean, default=True)
    max_slope_percentage = Column(Float, default=5.0)
    require_curb_cuts = Column(Boolean, default=True)
    avoid_construction = Column(Boolean, default=True)
    prefer_wider_sidewalks = Column(Boolean, default=True)
    require_tactile_guidance = Column(Boolean, default=False)
    mobility_aid = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class RouteAnalytics(Base):
    __tablename__ = "route_analytics"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(String(50), index=True)
    user_id = Column(String(50), nullable=True)
    calculation_time_ms = Column(Integer)
    accessibility_score = Column(Float)
    distance_km = Column(Float)
    obstacles_detected = Column(Integer, default=0)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_agent = Column(String(200), nullable=True)
    ip_address = Column(String(45), nullable=True)

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
