#!/bin/bash

# Aura - Accessible Urban Route Assistant
# Startup Script

echo "🚀 Starting Aura - Accessible Urban Route Assistant..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "requirements.txt" ]; then
    echo "❌ Please run this script from the project root directory."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📚 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check if installation was successful
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies. Please check the error messages above."
    exit 1
fi

# Create necessary directories
echo "📁 Setting up directories..."
mkdir -p backend/app/services
mkdir -p backend/app/models
mkdir -p backend/app/api
mkdir -p frontend/src/components
mkdir -p frontend/src/services
mkdir -p frontend/src/styles
mkdir -p frontend/public
mkdir -p data
mkdir -p logs

# Set up database (if needed)
echo "🗄️ Setting up database..."
python3 -c "
from backend.app.models.database import engine, Base
try:
    Base.metadata.create_all(bind=engine)
    print('✅ Database tables created successfully')
except Exception as e:
    print(f'⚠️ Database setup warning: {e}')
"

# Start the application
echo "🌟 Starting Aura application..."
echo "📱 Application will be available at: http://localhost:8000"
echo "📊 API documentation available at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the application"
echo ""

# Start uvicorn server
cd backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info
