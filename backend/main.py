#!/usr/bin/env python3
"""
Aura: Accessible Urban Route Assistant - Main Application Entry Point
A sophisticated accessible routing platform with advanced geospatial analysis
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from project .env (for MAPBOX_API_KEY, etc.)
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent / "app"))

from app.api.routes import router as api_router
from app.models.database import create_tables
from app.services.config import settings

# Create FastAPI application
app = FastAPI(
    title="Aura: Accessible Urban Route Assistant",
    description="""
    🌟 Advanced accessible routing platform with comprehensive accessibility analysis
    
    **Features:**
    - 🗺️ Real-time accessible route calculation
    - ♿ Multi-modal accessibility scoring
    - 🚧 Dynamic obstacle detection and avoidance
    - 🎯 Personalized routing preferences
    - 📱 Progressive Web App interface
    - 🔄 Real-time route optimization
    - 📊 Comprehensive analytics dashboard
    """,
    version="3.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Initialize database tables
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    create_tables()
    print("🚀 Aura: Accessible Urban Route Assistant")
    print("📊 Database initialized successfully")
    print("🌐 API Documentation: http://localhost:8000/api/docs")
    print("🎯 Frontend: http://localhost:8000")

# Serve static files from frontend directory
frontend_src_path = Path(__file__).parent.parent / "frontend" / "src"
frontend_public_path = Path(__file__).parent.parent / "frontend" / "public"

# Mount frontend src directory
if frontend_src_path.exists():
    app.mount("/src", StaticFiles(directory=str(frontend_src_path)), name="frontend_src")

# Mount frontend public directory  
if frontend_public_path.exists():
    app.mount("/public", StaticFiles(directory=str(frontend_public_path)), name="frontend_public")

# Serve the frontend application
@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    """Serve the main frontend application"""
    frontend_file = Path(__file__).parent.parent / "frontend" / "index.html"
    if frontend_file.exists():
        return FileResponse(str(frontend_file))
    
    # Fallback to embedded HTML if frontend files don't exist
    return HTMLResponse(content="""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Aura: Accessible Urban Route Assistant</title>
        <link rel="stylesheet" href="/static/styles/main.css">
        <link rel="manifest" href="/static/manifest.json">
        <meta name="theme-color" content="#667eea">
    </head>
    <body>
        <div id="app-root">
            <div class="loading-screen">
                <div class="logo">🌟 Aura</div>
                <div class="loading-text">Loading accessible routing platform...</div>
                <div class="loading-spinner"></div>
            </div>
        </div>
        <script src="/static/js/app.js"></script>
    </body>
    </html>
    """)

# Health check endpoint
@app.get("/health")
async def health_check():
    """System health check"""
    return {
        "status": "healthy",
        "service": "aura-accessible-router",
        "version": "3.0.0",
        "environment": settings.ENVIRONMENT,
        "features": {
            "advanced_routing": True,
            "real_time_obstacles": True,
            "accessibility_scoring": True,
            "multi_modal_support": True,
            "progressive_web_app": True
        }
    }

if __name__ == "__main__":
    print("🌟 Starting Aura: Accessible Urban Route Assistant")
    print(f"🔧 Environment: {settings.ENVIRONMENT}")
    print(f"📡 Host: {settings.HOST}:{settings.PORT}")
    print("✨ Advanced Features Enabled:")
    print("   • Sophisticated routing algorithms")
    print("   • Real-time accessibility analysis")
    print("   • Dynamic obstacle detection")
    print("   • Multi-modal transportation support")
    print("   • Progressive Web App interface")
    print("   • Comprehensive analytics")
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
