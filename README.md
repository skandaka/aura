# Aura: The Accessible Urban Route Assistant

A sophisticated web application designed to provide accessible urban navigation for users with mobility challenges, visual impairments, and other accessibility needs.

## 🚀 How to Run the Application

### Prerequisites
- Python 3.13+ installed
- Basic terminal/command line knowledge

### Quick Start

1. **Navigate to the project directory:**
   ```bash
   cd /Users/skandaa/Desktop/aura/aura-sophisticated
   ```

2. **Start the backend server:**
   ```bash
   cd backend
   python main.py
   ```

3. **Access the application:**
   - Open your web browser
   - Go to: `http://localhost:8001`

### Alternative Running Methods

#### Using uvicorn directly:
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

#### Using Docker (if you have Docker installed):
```bash
docker-compose up --build
```

## 🌟 Features

### 🏠 Address Input (NEW!)
- **Address Mode**: Enter readable addresses like "Golden Gate Bridge, San Francisco, CA"
- **Coordinate Mode**: Traditional latitude/longitude input
- **Geocoding**: Automatic conversion between addresses and coordinates
- **Radio Button Toggle**: Easy switching between input modes

### Core Functionality
- **Advanced Accessibility Routing**: 7-component accessibility scoring system
- **Real-time Obstacle Detection**: Community-driven obstacle reporting and verification
- **Comprehensive Route Analysis**: Surface quality, slope analysis, safety scoring
- **Alternative Route Generation**: Multiple route options with detailed comparisons
- **Accessibility Preferences**: Customizable mobility aid and preference settings

### Advanced Components
- **Geospatial Processing**: Sophisticated coordinate analysis and route optimization
- **Analytics Dashboard**: Comprehensive usage analytics and impact tracking
- **Obstacle Management**: Community reporting system with severity classification
- **Progressive Web App**: Responsive design with accessibility-first approach

## 🏗️ Architecture

### Backend Structure
```
backend/
├── main.py                          # FastAPI application entry point
├── app/
│   ├── models/
│   │   ├── database.py             # SQLAlchemy models and database setup
│   │   └── schemas.py              # Pydantic models for API validation
│   ├── services/
│   │   ├── routing_engine.py       # Advanced routing engine with accessibility analysis
│   │   ├── obstacle_detector.py    # Obstacle detection and management system
│   │   ├── accessibility_analyzer.py # 7-component accessibility scoring
│   │   └── geospatial_processor.py # Spatial analysis and route processing
│   ├── api/
│   │   └── routes.py              # API endpoints and route handlers
│   └── config.py                  # Configuration management
```

### Frontend Structure
```
frontend/
├── index.html                      # Main application interface
├── src/
│   ├── app.js                     # Main application controller
│   ├── components/
│   │   ├── RouteDisplay.js        # Route visualization and results
│   │   ├── ObstacleReporter.js    # Obstacle reporting functionality
│   │   └── Analytics.js           # Analytics dashboard and data visualization
│   └── styles/
│       └── main.css              # Comprehensive styling with accessibility focus
```

## 🎯 How to Use the Application

### 1. **Choose Input Method**
- Select "Address" or "Coordinates" using radio buttons at the top of the form
- **Address Mode**: Type readable addresses like "Golden Gate Bridge, San Francisco, CA"
- **Coordinate Mode**: Enter precise latitude/longitude numbers

### 2. **Enter Locations**
- **Start Location**: Where your journey begins
- **End Location**: Your destination
- Click "📍 Find Location" to geocode addresses into coordinates

### 3. **Set Accessibility Preferences**
- **Accessibility Priority**: Choose High/Medium/Low based on your needs
- **Mobility Aid**: Select your mobility device (wheelchair, walker, cane, guide dog)
- **Route Preferences**: Check boxes for avoid stairs, prefer ramps, etc.

### 4. **Calculate Route**
- Click "🗺️ Calculate Accessible Route"
- View detailed accessibility analysis in the results panel
- See route recommendations with accessibility scores

### 5. **View Results**
- **Route Map**: Visual representation of your accessible route
- **Accessibility Score**: 7-component scoring breakdown
- **Alternative Routes**: Multiple options with different accessibility trade-offs
- **Analytics**: Route statistics and performance metrics

## 🛠️ Troubleshooting

### Application Won't Start
- Check Python version: `python --version` (requires 3.13+)
- Install dependencies: `pip install -r requirements.txt`
- Verify port 8001 is available
- Check terminal for error messages

### Geocoding Not Working
- Ensure internet connection is active
- Try different address formats (include city, state)
- Check browser console (F12) for errors
- Use more specific addresses

### Route Calculation Issues
- Verify coordinates are valid (latitude: -90 to 90, longitude: -180 to 180)
- Ensure both start and end locations are properly set
- Check that required form fields are filled
- Try coordinates instead of addresses if geocoding fails

### Form Resets When Clicking Calculate
- This issue has been fixed - ensure you're using the latest version
- Check browser console for JavaScript errors
- Try refreshing the page and re-entering data

## ✨ Example Addresses to Try

**Popular Landmarks:**
- "Golden Gate Bridge, San Francisco, CA"
- "Times Square, New York, NY" 
- "Space Needle, Seattle, WA"
- "Union Station, Los Angeles, CA"
- "Freedom Trail, Boston, MA"

**Accessible Destinations:**
- "Museum of Science, Boston, MA"
- "Central Park Zoo, New York, NY"
- "Pier 39, San Francisco, CA"
- "Pike Place Market, Seattle, WA"

## 🌐 Access Points

- **Main Application**: http://localhost:8001
- **API Documentation**: http://localhost:8001/api/docs  
- **Health Check**: http://localhost:8001/health

## 📱 API Endpoints

- `POST /api/calculate-route` - Calculate accessible routes
- `POST /api/geocode` - Convert addresses to coordinates
- `POST /api/reverse-geocode` - Convert coordinates to addresses
- `GET /api/obstacles` - Retrieve obstacle data
- `POST /api/obstacles` - Report new obstacles
- `GET /api/analytics` - Route analytics and statistics

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- pip (Python package installer)

### Installation & Setup

1. **Clone or navigate to the project directory:**
   ```bash
   cd /Users/skandaa/Desktop/aura/aura-sophisticated
   ```

2. **Run the startup script:**
   ```bash
   ./start.sh
   ```

   The script will automatically:
   - Create a virtual environment
   - Install all dependencies
   - Set up the database
   - Start the application

3. **Access the application:**
   - Main application: http://localhost:8000
   - API documentation: http://localhost:8000/docs
   - Interactive API explorer: http://localhost:8000/redoc

### Manual Installation (Alternative)

If you prefer manual setup:

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the application
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## 🎯 Usage Guide

### Basic Route Planning
1. **Enter Coordinates**: Input start and end coordinates (latitude, longitude)
2. **Set Preferences**: Choose mobility aid and accessibility preferences
3. **Calculate Route**: Click "Calculate Accessible Route"
4. **Review Results**: Analyze route options, accessibility scores, and obstacles

### Demo Locations
Use the pre-configured demo buttons for quick testing:
- **Downtown Route**: Times Square to Penn Station
- **Campus Route**: Columbia University Campus
- **Park Route**: Central Park Loop
- **Hospital Route**: Mount Sinai to Central Park

### Advanced Features

#### Obstacle Reporting
- Click the "🚧 Report Obstacle" button
- Fill in obstacle details, location, and severity
- Contribute to community accessibility data
- 
## 🎨 Accessibility Features

### Design Principles
- **WCAG 2.1 AA Compliance**: Meets accessibility guidelines
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Optimization**: ARIA labels and semantic HTML
- **High Contrast Mode**: Enhanced visibility options
- **Reduced Motion**: Respects user motion preferences

### Technical Accessibility
- Semantic HTML structure
- ARIA landmarks and labels
- Focus management and keyboard traps
- Color contrast ratios > 4.5:1
- Scalable fonts and responsive design

## 📊 Accessibility Scoring System

### 7-Component Analysis
1. **Surface Quality** (0-100): Path surface condition and smoothness
2. **Slope Analysis** (0-100): Gradient analysis and steep section detection
3. **Obstacle Avoidance** (0-100): Known obstacle detection and avoidance
4. **Width Adequacy** (0-100): Path width sufficiency for mobility aids
5. **Safety Score** (0-100): Lighting, traffic, and general safety assessment
6. **Lighting Assessment** (0-100): Illumination quality and visibility
7. **Traffic Analysis** (0-100): Pedestrian traffic and congestion levels

### Scoring Interpretation
- **80-100**: High accessibility - Excellent for all users
- **60-79**: Medium accessibility - Good with minor challenges
- **Below 60**: Low accessibility - Significant barriers present

## 🛠️ Development

### Project Structure
The application follows a sophisticated multi-tier architecture:
- **Presentation Layer**: Modern HTML5 + vanilla JavaScript
- **API Layer**: FastAPI with comprehensive validation
- **Business Logic**: Modular service components
- **Data Layer**: SQLAlchemy with SQLite database

### Key Technologies
- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Frontend**: Vanilla JavaScript, CSS Grid/Flexbox
- **Database**: SQLite with potential PostgreSQL upgrade
- **Geospatial**: Geopy, Haversine, NetworkX

### Contributing
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## 📝 Configuration

### Environment Variables
```bash
# Database Configuration
DATABASE_URL=sqlite:///./aura.db

# API Configuration
API_TITLE="Aura API"
API_VERSION="1.0.0"

# External Services (Optional)
MAPBOX_TOKEN=your_mapbox_token
GOOGLE_MAPS_KEY=your_google_maps_key
```

### Settings Customization
Modify `backend/app/config.py` for:
- Database connections
- API rate limiting
- External service integrations
- Feature flags


**Aura** - Making urban navigation accessible for everyone. 🌟♿🗺️
