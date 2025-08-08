// Interactive Map Component - Handles Leaflet map integration and route visualization

class InteractiveMap {
    constructor() {
        this.map = null;
        this.currentRoute = null;
        this.routeLayer = null;
        this.alternativeRoutes = [];
        this.markers = {
            start: null,
            end: null,
            obstacles: []
        };
        this.currentView = 'standard';
        this.isInitialized = false;
        
        // Map tile layers
        this.tileLayers = {
            standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri',
                maxZoom: 19
            }),
            accessibility: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
                className: 'accessibility-layer'
            })
        };
        
        this.init();
    }

    init() {
        console.log('🗺️ Initializing Interactive Map...');
        this.debug('Starting InteractiveMap initialization');
        
        // Check if Leaflet is available
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet library not loaded');
            this.debug('ERROR: Leaflet library not available');
            this.showMapError('Leaflet library not loaded');
            return;
        }
        
        this.debug('Leaflet library is available');
        this.initializeMap();
        this.setupEventListeners();
        this.setupCustomMarkers();
    }

    debug(message) {
        console.log(`[InteractiveMap] ${message}`);
    }

    initializeMap() {
        // Check if map container exists
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) {
            console.warn('Map container not found, retrying in 500ms...');
            this.debug('Map container not found, retrying...');
            setTimeout(() => this.initializeMap(), 500);
            return;
        }

        this.debug('Map container found, creating Leaflet map');

        // Default location (Schaumburg, IL)
        const defaultCenter = [42.0334, -88.0834];
        const defaultZoom = 13;

        try {
            // Initialize Leaflet map
            this.map = L.map('map-container', {
                center: defaultCenter,
                zoom: defaultZoom,
                zoomControl: false, // We'll add custom controls
                attributionControl: true
            });

            this.debug('Leaflet map created successfully');

            // Add zoom control in bottom right
            L.control.zoom({
                position: 'bottomright'
            }).addTo(this.map);

            // Add default tile layer
            this.tileLayers.standard.addTo(this.map);

            // Add scale control
            L.control.scale({
                position: 'bottomleft',
                metric: true,
                imperial: true
            }).addTo(this.map);

            // Create layer groups for different elements
            this.routeLayer = L.layerGroup().addTo(this.map);
            this.obstacleLayer = L.layerGroup().addTo(this.map);
            this.accessibilityLayer = L.layerGroup().addTo(this.map);

            this.isInitialized = true;
            console.log('✅ Map initialized successfully');

            // Show demo route initially
            this.showDemoRoute();

        } catch (error) {
            console.error('❌ Error initializing map:', error);
            this.debug('ERROR: ' + error.message);
            this.showMapError('Failed to initialize map: ' + error.message);
        }
    }

    showMapError(errorMsg = 'Unknown error') {
        this.debug('Showing map error: ' + errorMsg);
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div class="map-error" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666; text-align: center; padding: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="color: #e74c3c; margin-bottom: 1rem;">Map Loading Error</h3>
                    <p style="margin-bottom: 1rem;">Unable to load the interactive map.</p>
                    <p style="margin-bottom: 1rem; font-family: monospace; background: #fff; padding: 10px; border-radius: 5px; font-size: 12px;">${errorMsg}</p>
                    <p style="margin-bottom: 1rem;">This could be due to:</p>
                    <ul style="text-align: left; margin-bottom: 1rem;">
                        <li>Internet connection issues</li>
                        <li>Map service temporarily unavailable</li>
                        <li>Browser compatibility issues</li>
                    </ul>
                    <button onclick="location.reload()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Map view toggle buttons
        document.getElementById('standard-view')?.addEventListener('click', () => {
            this.switchMapView('standard');
        });

        document.getElementById('accessibility-view')?.addEventListener('click', () => {
            this.switchMapView('accessibility');
        });

        document.getElementById('satellite-view')?.addEventListener('click', () => {
            this.switchMapView('satellite');
        });

        // Map action buttons
        document.getElementById('center-route')?.addEventListener('click', () => {
            this.centerOnRoute();
        });

        document.getElementById('report-obstacle')?.addEventListener('click', () => {
            this.enableObstacleReporting();
        });

        document.getElementById('fullscreen-map')?.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Map click event for obstacle reporting
        if (this.map) {
            this.map.on('click', (e) => {
                if (this.obstacleReportingMode) {
                    this.reportObstacleAtLocation(e.latlng);
                }
            });
        }
    }

    setupCustomMarkers() {
        // Define custom marker icons
        this.markerIcons = {
            start: L.divIcon({
                className: 'custom-marker start-marker-custom',
                html: '<div style="background: #667eea; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            }),
            end: L.divIcon({
                className: 'custom-marker end-marker-custom',
                html: '<div style="background: #F44336; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            }),
            obstacle: L.divIcon({
                className: 'custom-marker obstacle-marker',
                html: '<div style="background: #FF9800; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        };
    }

    switchMapView(view) {
        if (!this.isInitialized) return;

        // Remove current tile layer
        Object.values(this.tileLayers).forEach(layer => {
            this.map.removeLayer(layer);
        });

        // Add new tile layer
        this.tileLayers[view].addTo(this.map);
        this.currentView = view;

        // Update button states
        document.querySelectorAll('.map-toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${view}-view`)?.classList.add('active');

        // Show/hide accessibility overlay
        if (view === 'accessibility') {
            this.showAccessibilityOverlay();
        } else {
            this.hideAccessibilityOverlay();
        }

        console.log(`🗺️ Switched to ${view} view`);
    }

    displayRoute(routeData) {
        if (!this.isInitialized) {
            console.warn('Map not initialized, cannot display route');
            return;
        }

        this.currentRoute = routeData;
        this.clearRoute();

        try {
            // Extract coordinates from route data
            const start = this.extractCoordinates(routeData.start_location);
            const end = this.extractCoordinates(routeData.end_location);
            const waypoints = this.extractWaypoints(routeData);

            // Add start and end markers
            this.addStartMarker(start);
            this.addEndMarker(end);

            // Draw route line
            this.drawRouteLine(waypoints);

            // Add obstacle markers
            this.addObstacleMarkers(routeData.obstacles || []);

            // Fit map to route bounds
            this.fitMapToRoute();

            console.log('✅ Route displayed on map');

        } catch (error) {
            console.error('❌ Error displaying route:', error);
        }
    }

    showDemoRoute() {
        // Show a demo route from Schaumburg to Woodfield Mall
        const demoRoute = {
            start_location: { latitude: 42.0334, longitude: -88.0834 },
            end_location: { latitude: 42.0553, longitude: -88.0634 },
            waypoints: [
                [42.0334, -88.0834],
                [42.0394, -88.0784],
                [42.0454, -88.0734],
                [42.0514, -88.0684],
                [42.0553, -88.0634]
            ],
            obstacles: [
                { latitude: 42.0414, longitude: -88.0754, type: 'construction' },
                { latitude: 42.0494, longitude: -88.0704, type: 'stairs' }
            ]
        };

        this.displayRoute(demoRoute);
    }

    extractCoordinates(location) {
        if (location.latitude && location.longitude) {
            return [location.latitude, location.longitude];
        }
        if (location.lat && location.lon) {
            return [location.lat, location.lon];
        }
        if (Array.isArray(location) && location.length >= 2) {
            return location;
        }
        return null;
    }

    extractWaypoints(routeData) {
        if (routeData.waypoints && Array.isArray(routeData.waypoints)) {
            return routeData.waypoints;
        }
        
        // If no waypoints, create a simple line between start and end
        const start = this.extractCoordinates(routeData.start_location);
        const end = this.extractCoordinates(routeData.end_location);
        
        if (start && end) {
            return [start, end];
        }
        
        return [];
    }

    addStartMarker(coordinates) {
        if (!coordinates) return;
        
        if (this.markers.start) {
            this.routeLayer.removeLayer(this.markers.start);
        }
        
        this.markers.start = L.marker(coordinates, { 
            icon: this.markerIcons.start 
        }).addTo(this.routeLayer);
        
        this.markers.start.bindPopup(`
            <div class="marker-popup">
                <strong>🚶‍♂️ Start Location</strong><br>
                <small>Lat: ${coordinates[0].toFixed(4)}, Lng: ${coordinates[1].toFixed(4)}</small>
            </div>
        `);
    }

    addEndMarker(coordinates) {
        if (!coordinates) return;
        
        if (this.markers.end) {
            this.routeLayer.removeLayer(this.markers.end);
        }
        
        this.markers.end = L.marker(coordinates, { 
            icon: this.markerIcons.end 
        }).addTo(this.routeLayer);
        
        this.markers.end.bindPopup(`
            <div class="marker-popup">
                <strong>🏁 Destination</strong><br>
                <small>Lat: ${coordinates[0].toFixed(4)}, Lng: ${coordinates[1].toFixed(4)}</small>
            </div>
        `);
    }

    drawRouteLine(waypoints) {
        if (!waypoints || waypoints.length < 2) return;

        // Create main route polyline with better road-following visualization
        const routeLine = L.polyline(waypoints, {
            color: '#667eea',
            weight: 6,
            opacity: 0.9,
            lineJoin: 'round',
            lineCap: 'round',
            dashArray: null, // Solid line for main route
            smoothFactor: 1.0 // Smooth the line to follow roads better
        }).addTo(this.routeLayer);

        // Add a subtle shadow/outline for better visibility
        const routeShadow = L.polyline(waypoints, {
            color: '#2c3e50',
            weight: 8,
            opacity: 0.3,
            lineJoin: 'round',
            lineCap: 'round',
            smoothFactor: 1.0
        }).addTo(this.routeLayer);

        // Send shadow to back
        routeShadow.bringToBack();

        // Add route popup with enhanced information
        routeLine.bindPopup(`
            <div class="route-popup">
                <strong>🛣️ Accessible Route</strong><br>
                <small>Follows roads and sidewalks</small><br>
                <small>Click for detailed route information</small>
            </div>
        `);

        // Add intermediate direction markers every few points
        this.addDirectionMarkers(waypoints);

        // Store reference for bounds calculation
        this.currentRouteLine = routeLine;
    }

    addDirectionMarkers(waypoints) {
        // Add direction arrows along the route for better visualization
        const markerInterval = Math.max(1, Math.floor(waypoints.length / 5)); // 5 markers max
        
        for (let i = markerInterval; i < waypoints.length - 1; i += markerInterval) {
            const currentPoint = waypoints[i];
            const nextPoint = waypoints[i + 1];
            
            // Calculate bearing for arrow direction
            const bearing = this.calculateBearing(currentPoint, nextPoint);
            
            // Create a small direction arrow
            const directionIcon = L.divIcon({
                className: 'direction-marker',
                html: `<div class="direction-arrow" style="transform: rotate(${bearing}deg)">➤</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            const directionMarker = L.marker(currentPoint, {
                icon: directionIcon,
                interactive: false
            }).addTo(this.routeLayer);
        }
    }

    calculateBearing(point1, point2) {
        const lat1 = point1[0] * Math.PI / 180;
        const lat2 = point2[0] * Math.PI / 180;
        const deltaLon = (point2[1] - point1[1]) * Math.PI / 180;
        
        const x = Math.sin(deltaLon) * Math.cos(lat2);
        const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
        
        const bearing = Math.atan2(x, y) * 180 / Math.PI;
        return (bearing + 360) % 360;
    }

    addObstacleMarkers(obstacles) {
        // Clear existing obstacle markers
        this.markers.obstacles.forEach(marker => {
            this.obstacleLayer.removeLayer(marker);
        });
        this.markers.obstacles = [];

        obstacles.forEach(obstacle => {
            const coords = this.extractCoordinates(obstacle);
            if (coords) {
                const marker = L.marker(coords, { 
                    icon: this.markerIcons.obstacle 
                }).addTo(this.obstacleLayer);
                
                marker.bindPopup(`
                    <div class="obstacle-popup">
                        <strong>🚧 ${obstacle.type || 'Obstacle'}</strong><br>
                        <small>${obstacle.description || 'Potential accessibility issue'}</small>
                    </div>
                `);
                
                this.markers.obstacles.push(marker);
            }
        });
    }

    fitMapToRoute() {
        if (!this.currentRouteLine) return;

        try {
            const bounds = this.currentRouteLine.getBounds();
            this.map.fitBounds(bounds, { padding: [20, 20] });
        } catch (error) {
            console.error('Error fitting map to route:', error);
        }
    }

    centerOnRoute() {
        if (this.currentRouteLine) {
            this.fitMapToRoute();
        } else if (this.markers.start && this.markers.end) {
            const group = new L.featureGroup([this.markers.start, this.markers.end]);
            this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
    }

    clearRoute() {
        if (this.routeLayer) {
            this.routeLayer.clearLayers();
        }
        if (this.obstacleLayer) {
            this.obstacleLayer.clearLayers();
        }
        this.markers.start = null;
        this.markers.end = null;
        this.markers.obstacles = [];
        this.currentRouteLine = null;
    }

    showAccessibilityOverlay() {
        // Add accessibility zones (demo implementation)
        this.accessibilityLayer.clearLayers();

        // High accessibility zone (example)
        const highAccessZone = L.circle([42.0394, -88.0784], {
            color: '#4CAF50',
            fillColor: '#4CAF50',
            fillOpacity: 0.2,
            radius: 200
        }).addTo(this.accessibilityLayer);

        // Medium accessibility zone
        const mediumAccessZone = L.circle([42.0454, -88.0734], {
            color: '#FF9800',
            fillColor: '#FF9800',
            fillOpacity: 0.2,
            radius: 150
        }).addTo(this.accessibilityLayer);

        // Low accessibility zone
        const lowAccessZone = L.circle([42.0414, -88.0754], {
            color: '#F44336',
            fillColor: '#F44336',
            fillOpacity: 0.2,
            radius: 100
        }).addTo(this.accessibilityLayer);
    }

    hideAccessibilityOverlay() {
        this.accessibilityLayer.clearLayers();
    }

    enableObstacleReporting() {
        this.obstacleReportingMode = true;
        this.map.getContainer().style.cursor = 'crosshair';
        
        // Show instruction
        const instruction = L.popup()
            .setLatLng(this.map.getCenter())
            .setContent('<strong>🚧 Click on map to report obstacle</strong><br><small>Click elsewhere to cancel</small>')
            .openOn(this.map);

        setTimeout(() => {
            this.map.closePopup(instruction);
        }, 3000);
    }

    reportObstacleAtLocation(latlng) {
        if (!this.obstacleReportingMode) return;

        this.obstacleReportingMode = false;
        this.map.getContainer().style.cursor = '';

        // Add temporary marker
        const tempMarker = L.marker([latlng.lat, latlng.lng], { 
            icon: this.markerIcons.obstacle 
        }).addTo(this.obstacleLayer);

        // Show obstacle reporting form (placeholder)
        tempMarker.bindPopup(`
            <div class="obstacle-report-popup">
                <strong>🚧 Report Obstacle</strong><br>
                <select id="obstacle-type-select" style="margin: 5px 0;">
                    <option value="stairs">Stairs</option>
                    <option value="construction">Construction</option>
                    <option value="broken_surface">Broken Surface</option>
                    <option value="narrow_path">Narrow Path</option>
                </select><br>
                <textarea placeholder="Description..." rows="2" style="width: 100%; margin: 5px 0;"></textarea><br>
                <button onclick="window.interactiveMap.submitObstacleReport(${latlng.lat}, ${latlng.lng})" 
                        style="background: #667eea; color: white; border: none; padding: 5px 10px; border-radius: 3px;">
                    Submit Report
                </button>
            </div>
        `).openPopup();
    }

    submitObstacleReport(lat, lng) {
        console.log(`📝 Obstacle reported at: ${lat}, ${lng}`);
        this.map.closePopup();
        // Here you would typically send the report to your backend
    }

    toggleFullscreen() {
        const mapContainer = document.getElementById('map-display');
        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen().then(() => {
                setTimeout(() => this.map.invalidateSize(), 100);
            });
        } else {
            document.exitFullscreen().then(() => {
                setTimeout(() => this.map.invalidateSize(), 100);
            });
        }
    }

    showMapError() {
        const mapContainer = document.getElementById('map-container');
        mapContainer.innerHTML = `
            <div class="map-error">
                <div class="error-content">
                    <span style="font-size: 3rem;">⚠️</span>
                    <h3>Map Loading Error</h3>
                    <p>Unable to load the interactive map. Please check your internet connection and refresh the page.</p>
                    <button onclick="location.reload()" class="retry-btn">Retry</button>
                </div>
            </div>
        `;
    }

    // Public API methods
    getMap() {
        return this.map;
    }

    isReady() {
        return this.isInitialized;
    }

    getCurrentView() {
        return this.currentView;
    }
}

// Initialize global instance
window.interactiveMap = null;
