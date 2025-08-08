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

    // Display route results
    displayRoute(routeData) {
        this.currentRoute = routeData;
        this.isLoading = false;
        
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
                        <h2 class="route-title">📍 Schaumburg to Woodfield Mall</h2>
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
            return;
        }

        // Clear existing route and markers
        this.routeLayer.clearLayers();
        this.markersLayer.clearLayers();

        // Default coordinates for demo (Schaumburg to Woodfield Mall)
        const startCoords = [42.0330, -88.0831]; // Schaumburg
        const endCoords = [42.0466, -88.0371];   // Woodfield Mall

        // Add start marker
        const startMarker = L.marker(startCoords, {
            icon: L.divIcon({
                className: 'custom-marker start-marker',
                html: '<div style="background: #4CAF50; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🚶‍♂️</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).bindPopup('<b>Start Location</b><br>Schaumburg, IL');

        // Add end marker
        const endMarker = L.marker(endCoords, {
            icon: L.divIcon({
                className: 'custom-marker end-marker',
                html: '<div style="background: #F44336; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">�️</div>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).bindPopup('<b>Destination</b><br>Woodfield Mall');

        // Add markers to layer
        this.markersLayer.addLayer(startMarker);
        this.markersLayer.addLayer(endMarker);

        // Create route line
        const routeCoords = [
            startCoords,
            [42.0350, -88.0750], // Waypoint 1
            [42.0380, -88.0650], // Waypoint 2
            [42.0420, -88.0500], // Waypoint 3
            endCoords
        ];

        const routeLine = L.polyline(routeCoords, {
            color: '#667eea',
            weight: 6,
            opacity: 0.8,
            smoothFactor: 1
        }).bindPopup('Accessible Route<br>Distance: 2.1 km<br>Accessibility Score: 85/100');

        // Add route to layer
        this.routeLayer.addLayer(routeLine);

        // Add accessibility features along the route
        const accessibilityFeatures = [
            { coords: [42.0340, -88.0780], type: 'curb_cut', icon: '♿', color: '#4CAF50' },
            { coords: [42.0370, -88.0680], type: 'wide_sidewalk', icon: '🚶‍♀️', color: '#2196F3' },
            { coords: [42.0400, -88.0550], type: 'lighting', icon: '💡', color: '#FF9800' },
            { coords: [42.0440, -88.0450], type: 'accessible_crossing', icon: '🚸', color: '#4CAF50' }
        ];

        accessibilityFeatures.forEach(feature => {
            const featureMarker = L.marker(feature.coords, {
                icon: L.divIcon({
                    className: 'accessibility-feature',
                    html: `<div style="background: ${feature.color}; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.3);">${feature.icon}</div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).bindPopup(`Accessibility Feature: ${feature.type.replace('_', ' ')}`);
            
            this.routeLayer.addLayer(featureMarker);
        });

        // Fit map to show the entire route
        const group = new L.featureGroup([...this.routeLayer.getLayers(), ...this.markersLayer.getLayers()]);
        this.map.fitBounds(group.getBounds().pad(0.1));

        console.log('✅ Route displayed on map');
    }

    // Get score class for styling
    getScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'fair';
        return 'poor';
    }

    // Show error state
    showError(message) {
        const mapDisplay = document.getElementById('map-display');
        if (mapDisplay) {
            mapDisplay.innerHTML = `
                <div class="error-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #ffebee; color: #c62828;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                    <h3 style="margin-bottom: 0.5rem;">Route Calculation Failed</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary-blue); color: white; border: none; border-radius: 4px; cursor: pointer;">Try Again</button>
                </div>
            `;
        }
    }

    // Toggle map view
    toggleMapView(view) {
        this.mapView = view;
        // Update active button
        const buttons = document.querySelectorAll('.map-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        
        // Update map display based on view
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
}

// Export for global access
window.RouteDisplay = RouteDisplay;
