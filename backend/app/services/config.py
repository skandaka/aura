import os
from pydantic import BaseModel
from typing import Optional

class Settings(BaseModel):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    API_PREFIX: str = "/api/v1"
    API_TITLE: str = "Aura Accessible Route Assistant API"
    API_VERSION: str = "3.0.0"
    
    DATABASE_URL: str = "sqlite:///./aura.db"
    
    MAPBOX_API_KEY: Optional[str] = None
    OPENSTREETMAP_API_URL: str = "https://nominatim.openstreetmap.org"
    
    DEFAULT_WALKING_SPEED: float = 4.0  # km/h
    MAX_ROUTE_DISTANCE: float = 50.0  # km
    DEFAULT_ACCESSIBILITY_RADIUS: float = 200.0  # meters
    
    CACHE_TTL: int = 3600  # seconds
    MAX_CACHE_SIZE: int = 1000
    
    SECRET_KEY: str = "aura-accessible-routing-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Global settings instance
settings = Settings()
