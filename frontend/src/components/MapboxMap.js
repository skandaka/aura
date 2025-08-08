// Mapbox Integration for Enhanced Route Visualization
// Provides high-quality maps and accurate route display

class MapboxMap {
    constructor() {
        this.map = null;
        this.currentRoute = null;
        this.routeLayer = null;
        this.markers = {
            start: null,
            end: null,
            obstacles: []
        };
        this.isInitialized = false;
        
        // Mapbox configuration
        this.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
        this.mapboxAvailable = typeof mapboxgl !== 'undefined';
    }

    async init() {
        console.log('🗺️ Initializing Mapbox Map...');
        
        // Check if Mapbox GL JS is available
        if (!this.mapboxAvailable) {
            console.warn('Mapbox GL JS not available, falling back to Leaflet');
            return false;
        }
        
        // Check if container exists
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) {
            console.warn('Map container not found');
            return false;
        }
        
        try {
            // Set access token
            mapboxgl.accessToken = this.accessToken;
            
            // Initialize Mapbox map
            this.map = new mapboxgl.Map({
                container: 'map-container',
                style: 'mapbox://styles/mapbox/streets-v12', // High-quality street style
                center: [-88.0834, 42.0334], // Default: Schaumburg, IL
                zoom: 13,
                pitch: 0, // 2D view for accessibility
                bearing: 0
            });
            
            // Add navigation controls
            this.map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
            
            // Add scale control
            this.map.addControl(new mapboxgl.ScaleControl({
                maxWidth: 100,
                unit: 'metric'
            }), 'bottom-left');
            
            // Wait for map to load
            await new Promise((resolve) => {
                this.map.on('load', resolve);
            });
            
            this.isInitialized = true;
            console.log('✅ Mapbox map initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize Mapbox map:', error);
            return false;
        }
    }

    displayRoute(routeData) {
        if (!this.isInitialized || !this.map) {
            console.warn('Map not initialized');
            return;
        }

        this.currentRoute = routeData;
        this.clearRoute();

        try {
            // Extract coordinates from route data
            const coordinates = this.extractCoordinates(routeData);
            
            if (coordinates.length < 2) {
                console.warn('Not enough coordinates for route');
                return;
            }

            // Add route line
            this.addRouteLine(coordinates);
            
            // Add start and end markers
            this.addStartMarker(coordinates[0]);
            this.addEndMarker(coordinates[coordinates.length - 1]);
            
            // Add obstacle markers
            this.addObstacleMarkers(routeData.obstacles || []);
            
            // Fit map to route
            this.fitMapToRoute(coordinates);
            
            console.log('✅ Mapbox route displayed successfully');
            
        } catch (error) {
            console.error('❌ Error displaying route on Mapbox:', error);
        }
    }

    extractCoordinates(routeData) {
        const coordinates = [];
        
        // Try to extract from points array
        if (routeData.points && Array.isArray(routeData.points)) {
            for (const point of routeData.points) {
                if (point.longitude && point.latitude) {
                    coordinates.push([point.longitude, point.latitude]);
                }
            }
        }
        
        // Fallback: create simple line from start to end
        if (coordinates.length === 0) {
            if (routeData.start_location && routeData.end_location) {
                coordinates.push([
                    routeData.start_location.longitude || -88.0834,
                    routeData.start_location.latitude || 42.0334
                ]);
                coordinates.push([
                    routeData.end_location.longitude || -88.0634,
                    routeData.end_location.latitude || 42.0553
                ]);
            }
        }
        
        return coordinates;
    }

    addRouteLine(coordinates) {
        const sourceId = 'route-source';
        const layerId = 'route-layer';
        
        // Remove existing route if any
        if (this.map.getLayer(layerId)) {
            this.map.removeLayer(layerId);
        }
        if (this.map.getSource(sourceId)) {
            this.map.removeSource(sourceId);
        }
        
        // Add route source
        this.map.addSource(sourceId, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates
                }
            }
        });
        
        // Add route layer with accessibility styling
        this.map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#667eea', // Accessibility blue
                'line-width': 6,
                'line-opacity': 0.9
            }
        });
        
        // Add route shadow for better visibility
        this.map.addLayer({
            id: 'route-shadow',
            type: 'line',
            source: sourceId,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#2c3e50',
                'line-width': 8,
                'line-opacity': 0.3
            }
        }, layerId); // Add below main route
        
        // Add click handler for route info
        this.map.on('click', layerId, (e) => {
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="padding: 10px;">
                        <strong>🛣️ Accessible Route</strong><br>
                        <small>High-accuracy navigation path</small><br>
                        <small>Follows roads and sidewalks</small>
                    </div>
                `)
                .addTo(this.map);
        });
        
        // Change cursor on hover
        this.map.on('mouseenter', layerId, () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });
        
        this.map.on('mouseleave', layerId, () => {
            this.map.getCanvas().style.cursor = '';
        });
    }

    addStartMarker(coordinates) {
        const marker = new mapboxgl.Marker({
            color: '#4CAF50', // Green for start
            scale: 1.2
        })
        .setLngLat(coordinates)
        .setPopup(new mapboxgl.Popup().setHTML(`
            <div style="padding: 10px;">
                <strong>🚀 Start Location</strong><br>
                <small>Begin your accessible journey here</small>
            </div>
        `))
        .addTo(this.map);
        
        this.markers.start = marker;
    }

    addEndMarker(coordinates) {
        const marker = new mapboxgl.Marker({
            color: '#F44336', // Red for end
            scale: 1.2
        })
        .setLngLat(coordinates)
        .setPopup(new mapboxgl.Popup().setHTML(`
            <div style="padding: 10px;">
                <strong>🎯 Destination</strong><br>
                <small>Your accessible route ends here</small>
            </div>
        `))
        .addTo(this.map);
        
        this.markers.end = marker;
    }

    addObstacleMarkers(obstacles) {
        // Clear existing obstacle markers
        this.markers.obstacles.forEach(marker => marker.remove());
        this.markers.obstacles = [];
        
        obstacles.forEach(obstacle => {
            if (obstacle.location) {
                const marker = new mapboxgl.Marker({
                    color: '#FF9800', // Orange for obstacles
                    scale: 0.8
                })
                .setLngLat([obstacle.location.longitude, obstacle.location.latitude])
                .setPopup(new mapboxgl.Popup().setHTML(`
                    <div style="padding: 10px;">
                        <strong>⚠️ ${obstacle.type || 'Obstacle'}</strong><br>
                        <small>${obstacle.description || 'Accessibility challenge detected'}</small>
                    </div>
                `))
                .addTo(this.map);
                
                this.markers.obstacles.push(marker);
            }
        });
    }

    fitMapToRoute(coordinates) {
        if (coordinates.length === 0) return;
        
        // Create bounds from coordinates
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        
        // Fit map to bounds with padding
        this.map.fitBounds(bounds, {
            padding: {
                top: 50,
                bottom: 50,
                left: 50,
                right: 50
            },
            maxZoom: 16
        });
    }

    clearRoute() {
        // Remove route layers
        const layerIds = ['route-layer', 'route-shadow'];
        layerIds.forEach(layerId => {
            if (this.map.getLayer(layerId)) {
                this.map.removeLayer(layerId);
            }
        });
        
        // Remove route source
        if (this.map.getSource('route-source')) {
            this.map.removeSource('route-source');
        }
        
        // Remove markers
        Object.values(this.markers).forEach(marker => {
            if (Array.isArray(marker)) {
                marker.forEach(m => m.remove());
            } else if (marker) {
                marker.remove();
            }
        });
        
        this.markers = { start: null, end: null, obstacles: [] };
    }

    changeStyle(style) {
        if (!this.isInitialized) return;
        
        const styles = {
            streets: 'mapbox://styles/mapbox/streets-v12',
            satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
            light: 'mapbox://styles/mapbox/light-v11'
        };
        
        if (styles[style]) {
            this.map.setStyle(styles[style]);
        }
    }

    isAvailable() {
        return this.mapboxAvailable && this.isInitialized;
    }
}

// Create global instance
window.mapboxMap = new MapboxMap();
