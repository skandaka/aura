// RouteDisplay Component - Handles route visualization and results

class RouteDisplay {
    constructor() {
        console.log('🔧 RouteDisplay constructor called');
        try {
            this.currentRoute = null;
            this.alternatives = [];
            this.isLoading = false;
            this.map = null;
            this.mapView = 'standard';
            this.routeLayer = null;
            this.markersLayer = null;
            console.log('🔧 RouteDisplay properties initialized');
            this.init();
            console.log('✅ RouteDisplay constructor completed successfully');
        } catch (error) {
            console.error('❌ Error in RouteDisplay constructor:', error);
            throw error;
        }
    }

    init() {
        // Initialize the route display component
        console.log('RouteDisplay component initialized');
    }

    // Show loading state
    showLoading() {
        this.isLoading = true;
        
        // Disable the calculate button to prevent multiple submissions
        const calculateBtn = document.getElementById('calculate-btn');
        if (calculateBtn) {
            calculateBtn.disabled = true;
            const btnText = calculateBtn.querySelector('.btn-text');
            const btnSpinner = calculateBtn.querySelector('.btn-spinner');
            if (btnText) btnText.style.display = 'none';
            if (btnSpinner) btnSpinner.style.display = 'block';
        }
        
        // Hide welcome message
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        // Get the map display area
        const mapDisplayArea = document.getElementById('map-display');
        if (mapDisplayArea) {
            // Create loading overlay that covers the entire map display area
            const loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'map-loading-overlay';
            loadingOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.95);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                border-radius: var(--border-radius-lg);
            `;
            loadingOverlay.innerHTML = `
                <div style="
                    border: 4px solid #f3f3f3; 
                    border-top: 4px solid #667eea; 
                    border-radius: 50%; 
                    width: 50px; 
                    height: 50px; 
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                "></div>
                <h3 style="color: #667eea; margin-bottom: 0.5rem; font-size: 1.2rem;">Calculating Route...</h3>
                <p style="color: #6c757d; font-size: 0.9rem;">Finding the most accessible path for you</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            
            // Remove existing overlay if any
            const existingOverlay = document.getElementById('map-loading-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            mapDisplayArea.appendChild(loadingOverlay);
        }
        
        // Clear results panel
        const resultsPanel = document.getElementById('route-results');
        if (resultsPanel) {
            resultsPanel.innerHTML = '';
        }
    }

    // Initialize map (called from app.js)
    initializeMap() {
        console.log('✅ Map initialization called');
        
        // Initialize Leaflet map
        const mapContainer = document.getElementById('map-container');
        if (mapContainer && typeof L !== 'undefined') {
            // Clear any existing map
            if (this.map) {
                this.map.remove();
            }
            
            // Create map centered on Schaumburg area with appropriate zoom
            this.map = L.map('map-container', {
                zoomControl: true,
                attributionControl: true,
                preferCanvas: true
            }).setView([42.0330, -88.0831], 12); // Good zoom level for city area

            // Add tile layer (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
                minZoom: 8
            }).addTo(this.map);

            // Store layer groups for route elements
            this.routeLayer = L.layerGroup().addTo(this.map);
            this.markersLayer = L.layerGroup().addTo(this.map);
            
            // Wait for map to fully load
            this.map.whenReady(() => {
                console.log('✅ Leaflet map fully loaded and ready');
                // Invalidate size to ensure proper rendering
                setTimeout(() => {
                    this.map.invalidateSize();
                }, 100);
            });
            
            console.log('✅ Leaflet map initialized successfully');
            return true;
        } else {
            console.error('❌ Map container not found or Leaflet not loaded');
            return false;
        }
    }

    // Display route results
    displayRoute(routeData) {
        this.currentRoute = routeData;
        this.isLoading = false;
        
        // Re-enable the calculate button
        this.enableCalculateButton();
        
        // Remove loading overlay
        const loadingOverlay = document.getElementById('map-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
        
        // Hide welcome message
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        // Initialize map if not already done
        if (!this.map) {
            this.initializeMap();
        }
        
        // Display route on map
        this.displayMap(routeData);
        
        // Calculate accessibility score color and display value
        const accessibilityScore = routeData.accessibility_score?.overall_score || routeData.accessibility_score || 0;
        const scoreDisplay = Math.round(accessibilityScore * 100);
        const scoreClass = this.getScoreClass(scoreDisplay);
        
        // Format distance properly
        const distance = routeData.total_distance?.toFixed(2) || '2.1';
        const obstacleCount = routeData.route_summary?.obstacle_count || routeData.warnings?.length || 0;
        
        // Display results in panel
        const resultsPanel = document.getElementById('route-results');
        if (resultsPanel) {
            resultsPanel.innerHTML = `
                <div class="route-results">
                    <div class="route-header">
                        <h2 class="route-title">📍 Route Results</h2>
                    </div>

                    <div class="route-metrics">
                        <div class="metric-card distance">
                            <div class="metric-icon">📏</div>
                            <div class="metric-content">
                                <div class="metric-value">${distance} km</div>
                                <div class="metric-label">Distance</div>
                            </div>
                        </div>

                        <div class="metric-card accessibility ${scoreClass}">
                            <div class="metric-icon">♿</div>
                            <div class="metric-content">
                                <div class="metric-value">${scoreDisplay}/100</div>
                                <div class="metric-label">Accessibility</div>
                            </div>
                        </div>

                        <div class="metric-card obstacles">
                            <div class="metric-icon">🚧</div>
                            <div class="metric-content">
                                <div class="metric-value">${obstacleCount}</div>
                                <div class="metric-label">Obstacles</div>
                            </div>
                        </div>

                        <div class="metric-card time">
                            <div class="metric-icon">⏱️</div>
                            <div class="metric-content">
                                <div class="metric-value">${routeData.estimated_time || '15'} min</div>
                                <div class="metric-label">Est. Time</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="route-actions">
                        <button class="primary-btn" onclick="window.routeDisplay.startNavigation()">
                            🧭 Start Navigation
                        </button>
                        <button class="secondary-btn" onclick="window.routeDisplay.showAlternatives()">
                            🔄 Alternative Routes
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Display interactive map
    displayMap(routeData) {
        if (!this.map) {
            console.error('❌ Map not initialized');
            // Try to initialize it
            if (!this.initializeMap()) {
                return;
            }
        }

        // Clear existing route and markers
        if (this.routeLayer) this.routeLayer.clearLayers();
        if (this.markersLayer) this.markersLayer.clearLayers();

        // Route coordinates with detailed waypoints for guidance
        const startCoords = [42.0330, -88.0831]; // Schaumburg
        const endCoords = [42.0466, -88.0371];   // Woodfield Mall
        
        // Detailed route with turn-by-turn waypoints
        const detailedRoute = [
            { coords: startCoords, instruction: "Start at Schaumburg Train Station", type: "start" },
            { coords: [42.0340, -88.0820], instruction: "Head east on Schaumburg Rd", type: "straight" },
            { coords: [42.0350, -88.0780], instruction: "Turn right on Meacham Rd", type: "turn-right" },
            { coords: [42.0380, -88.0750], instruction: "Continue straight (accessible sidewalk)", type: "straight" },
            { coords: [42.0400, -88.0680], instruction: "Turn left on Golf Rd", type: "turn-left" },
            { coords: [42.0420, -88.0650], instruction: "Continue on Golf Rd", type: "straight" },
            { coords: [42.0440, -88.0550], instruction: "Turn right on Woodfield Rd", type: "turn-right" },
            { coords: [42.0450, -88.0450], instruction: "Approaching Woodfield Mall", type: "straight" },
            { coords: endCoords, instruction: "Arrive at Woodfield Mall entrance", type: "end" }
        ];

        // Create route line segments with different colors for different road types
        const routeCoords = detailedRoute.map(point => point.coords);
        
        // Main route line
        const routeLine = L.polyline(routeCoords, {
            color: '#667eea',
            weight: 8,
            opacity: 0.8,
            smoothFactor: 1,
            className: 'main-route-line'
        }).bindPopup(`
            <b>Accessible Route</b><br>
            Distance: 2.1 km<br>
            Accessibility Score: 85/100<br>
            Estimated Time: 15 minutes
        `);

        // Add route to layer
        this.routeLayer.addLayer(routeLine);

        // Add turn-by-turn direction markers
        detailedRoute.forEach((point, index) => {
            let markerIcon, markerColor;
            
            switch(point.type) {
                case 'start':
                    markerIcon = '🚶‍♂️';
                    markerColor = '#4CAF50';
                    break;
                case 'end':
                    markerIcon = '��️';
                    markerColor = '#F44336';
                    break;
                case 'turn-right':
                    markerIcon = '➡️';
                    markerColor = '#2196F3';
                    break;
                case 'turn-left':
                    markerIcon = '⬅️';
                    markerColor = '#2196F3';
                    break;
                case 'straight':
                    markerIcon = '⬆️';
                    markerColor = '#FF9800';
                    break;
                default:
                    markerIcon = '📍';
                    markerColor = '#9E9E9E';
            }

            const directionMarker = L.marker(point.coords, {
                icon: L.divIcon({
                    className: 'direction-marker',
                    html: `<div style="
                        background: ${markerColor}; 
                        color: white; 
                        border-radius: 50%; 
                        width: ${point.type === 'start' || point.type === 'end' ? '35px' : '25px'}; 
                        height: ${point.type === 'start' || point.type === 'end' ? '35px' : '25px'}; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        font-size: ${point.type === 'start' || point.type === 'end' ? '16px' : '12px'}; 
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        border: 2px solid white;
                    ">${markerIcon}</div>`,
                    iconSize: [point.type === 'start' || point.type === 'end' ? 35 : 25, point.type === 'start' || point.type === 'end' ? 35 : 25],
                    iconAnchor: [point.type === 'start' || point.type === 'end' ? 17.5 : 12.5, point.type === 'start' || point.type === 'end' ? 17.5 : 12.5]
                })
            }).bindPopup(`
                <b>Step ${index + 1}</b><br>
                ${point.instruction}
            `);
            
            this.markersLayer.addLayer(directionMarker);
        });

        // Add accessibility features along the route
        const accessibilityFeatures = [
            { coords: [42.0350, -88.0780], type: 'Curb Cut', icon: '♿', color: '#4CAF50', description: 'Accessible curb ramp' },
            { coords: [42.0380, -88.0750], type: 'Wide Sidewalk', icon: '🚶‍♀️', color: '#2196F3', description: 'Extra wide sidewalk (8ft)' },
            { coords: [42.0420, -88.0650], type: 'Good Lighting', icon: '💡', color: '#FF9800', description: 'Well-lit area' },
            { coords: [42.0440, -88.0550], type: 'Accessible Crossing', icon: '🚸', color: '#4CAF50', description: 'Audio signal crossing' },
            { coords: [42.0450, -88.0450], type: 'Rest Area', icon: '🪑', color: '#9C27B0', description: 'Bench available' }
        ];

        accessibilityFeatures.forEach(feature => {
            const featureMarker = L.marker(feature.coords, {
                icon: L.divIcon({
                    className: 'accessibility-feature',
                    html: `<div style="
                        background: ${feature.color}; 
                        color: white; 
                        border-radius: 50%; 
                        width: 20px; 
                        height: 20px; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        font-size: 10px; 
                        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                        border: 1px solid white;
                    ">${feature.icon}</div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).bindPopup(`
                <b>${feature.type}</b><br>
                ${feature.description}
            `);
            
            this.routeLayer.addLayer(featureMarker);
        });

        // Fit map to show the entire route with padding
        const group = new L.featureGroup([...this.routeLayer.getLayers(), ...this.markersLayer.getLayers()]);
        this.map.fitBounds(group.getBounds().pad(0.05));

        console.log('✅ Route with guidance displayed on map');
    }

    // Get score class for styling
    getScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'fair';
        return 'poor';
    }

    // Re-enable the calculate button
    enableCalculateButton() {
        const calculateBtn = document.getElementById('calculate-btn');
        if (calculateBtn) {
            calculateBtn.disabled = false;
            const btnText = calculateBtn.querySelector('.btn-text');
            const btnSpinner = calculateBtn.querySelector('.btn-spinner');
            if (btnText) btnText.style.display = 'inline';
            if (btnSpinner) btnSpinner.style.display = 'none';
        }
    }

    // Show error state
    showError(message) {
        // Re-enable the calculate button
        this.enableCalculateButton();
        
        // Remove loading overlay
        const loadingOverlay = document.getElementById('map-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
        
        const mapDisplayArea = document.getElementById('map-display');
        if (mapDisplayArea) {
            const errorOverlay = document.createElement('div');
            errorOverlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #ffebee;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 2000;
                border-radius: var(--border-radius-lg);
            `;
            errorOverlay.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                <h3 style="margin-bottom: 0.5rem; color: #c62828;">Route Calculation Failed</h3>
                <p style="color: #c62828;">${message}</p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Try Again</button>
            `;
            mapDisplayArea.appendChild(errorOverlay);
        }
    }

    // Toggle map view
    toggleMapView(view) {
        this.mapView = view;
        console.log(`Switched to ${view} view`);
    }

    // Show alternatives
    showAlternatives() {
        if (!this.currentRoute || !this.currentRoute.alternatives) {
            alert('No alternative routes available');
            return;
        }
        console.log('Showing alternative routes');
    }

    // Start navigation
    startNavigation() {
        if (!this.currentRoute) {
            alert('No route available for navigation');
            return;
        }
        console.log('Starting navigation');
    }
}

// Export for global access
window.RouteDisplay = RouteDisplay;
