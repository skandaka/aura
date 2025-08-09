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
        this.amenityMarkers = [];
        this.isInitialized = false;
        this.resizeObserver = null;
        
        const defaultToken = 'pk.eyJ1Ijoic2thdGUiLCJhIjoiY21kOTlxOW1iMDV1bzJtcHY3bmFobnVmcCJ9.zDBww977UxLmhPDSeZk5Jw';
        this.accessToken = (window.MAPBOX_TOKEN || localStorage.getItem('MAPBOX_TOKEN') || defaultToken);
        this.mapboxAvailable = typeof mapboxgl !== 'undefined';
        this.reportMode = false;
        this.tempReportMarker = null;
        this._boundHandleResize = () => {
            try { this.map && this.map.resize(); } catch {}
        };
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
            // Set access token if provided
            if (window.MAPBOX_TOKEN) {
                localStorage.setItem('MAPBOX_TOKEN', window.MAPBOX_TOKEN);
                this.accessToken = window.MAPBOX_TOKEN;
            } else if (!this.accessToken) {
                console.warn('⚠️ No Mapbox token configured for frontend map. Set window.MAPBOX_TOKEN or localStorage.MAPBOX_TOKEN to enable Directions and tiles.');
            }
            if (this.accessToken) {
                mapboxgl.accessToken = this.accessToken;
            }
            
            // Initialize Mapbox map
            this.map = new mapboxgl.Map({
                container: 'map-container',
                style: 'mapbox://styles/mapbox/streets-v12', // High-quality street style
                center: [-88.0834, 42.0334], // Default: Schaumburg, IL
                zoom: 13,
                pitch: 0, // 2D view for accessibility
                bearing: 0
            });
            
            // Remove non-essential controls per request (no buttons top-right or elsewhere)
            // Do not add NavigationControl or other UI controls
            
            // Wait for map to load
            await new Promise((resolve) => {
                this.map.on('load', resolve);
            });

            // Ensure map resizes to container after load and when container changes size
            this.map.resize();
            this.resizeObserver = new ResizeObserver(() => {
                try { this.map && this.map.resize(); } catch {}
            });
            const container = document.getElementById('map-container');
            if (container) this.resizeObserver.observe(container);

            // Also resize on window resize and after visibility changes
            window.addEventListener('resize', this._boundHandleResize);
            // Kick a couple of delayed resizes to catch parent visibility toggles
            setTimeout(this._boundHandleResize, 50);
            setTimeout(this._boundHandleResize, 300);

            // Add click handler for report mode
            this.map.on('click', (e) => this.onMapClick(e));

            this.isInitialized = true;
            console.log('✅ Mapbox map initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to initialize Mapbox map:', error);
            return false;
        }
    }

    async displayRoute(routeData) {
        if (!this.isInitialized || !this.map) {
            console.warn('Map not initialized');
            return;
        }

        this.currentRoute = routeData;
        this.clearRoute();

        try {
            let coordinates = this.extractCoordinates(routeData);
            const pts = (routeData.points || []);

            // Prefer Mapbox Directions geometry to ensure road/sidewalk following
            // Use it whenever backend geometry is sparse (< 12 vertices). Fallback to backend if Directions fails.
            if (pts.length >= 2 && (!coordinates || coordinates.length < 12)) {
                const start = [pts[0].longitude, pts[0].latitude];
                const end = [pts[pts.length - 1].longitude, pts[pts.length - 1].latitude];
                const directions = await this.fetchMapboxDirections(start, end);
                if (directions && directions.length >= 2) {
                    coordinates = directions;
                }
            }

            if (!coordinates || coordinates.length < 2) {
                console.warn('Not enough coordinates for route');
                return;
            }

            // Add route line and markers
            this.addRouteLine(coordinates);
            this.addStartMarker(coordinates[0]);
            this.addEndMarker(coordinates[coordinates.length - 1]);
            this.addObstacleMarkers(routeData.obstacles || []);
            await this.addAmenityMarkersNearRoute(coordinates);
            // Ensure proper resize before fitting bounds
            try { this.map.resize(); } catch {}
            this.fitMapToRoute(coordinates);
            console.log('✅ Mapbox route displayed successfully');
        } catch (error) {
            console.error('❌ Error displaying route on Mapbox:', error);
        }
    }

    async fetchMapboxDirections(startLngLat, endLngLat) {
        try {
            if (!this.accessToken) {
                return null;
            }
            const coords = `${startLngLat[0]},${startLngLat[1]};${endLngLat[0]},${endLngLat[1]}`;
            const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?geometries=geojson&overview=full&steps=true&access_token=${this.accessToken}`;
            const res = await fetch(url, { method: 'GET' });
            if (!res.ok) {
                console.warn('Mapbox Directions error:', res.status);
                return null;
            }
            const data = await res.json();
            const route = data && data.routes && data.routes[0];
            if (!route || !route.geometry || !route.geometry.coordinates) return null;
            return route.geometry.coordinates; // [lng, lat] list
        } catch (e) {
            console.warn('Mapbox Directions fetch failed:', e.message);
            return null;
        }
    }

    extractCoordinates(routeData) {
        const coordinates = [];
        if (routeData.points && Array.isArray(routeData.points)) {
            for (const point of routeData.points) {
                if (typeof point.longitude === 'number' && typeof point.latitude === 'number') {
                    coordinates.push([point.longitude, point.latitude]);
                }
            }
        }
        return coordinates; // Do not fallback to direct line; if empty, rendering will abort
    }

    addRouteLine(coordinates) {
        const sourceId = 'route-source';
        const layerMain = 'route-main';
        const layerCasing = 'route-casing';
        
        // Remove existing route if any
        if (this.map.getLayer(layerMain)) this.map.removeLayer(layerMain);
        if (this.map.getLayer(layerCasing)) this.map.removeLayer(layerCasing);
        if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
        
        // Add route source
        this.map.addSource(sourceId, {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }
        });
        
        // Google Maps-like casing (white outline)
        this.map.addLayer({
            id: layerCasing,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
                'line-color': '#ffffff',
                'line-width': 10,
                'line-opacity': 1
            }
        });
        
        // Main blue route line
        this.map.addLayer({
            id: layerMain,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
                'line-color': '#3478F6',
                'line-width': 6,
                'line-opacity': 0.95
            }
        });
        
        // Click + hover
        this.map.on('click', layerMain, (e) => {
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div style="padding: 10px;">
                        <strong>Accessible Route</strong><br>
                        <small>Road & sidewalk-following path</small>
                    </div>
                `)
                .addTo(this.map);
        });
        this.map.on('mouseenter', layerMain, () => { this.map.getCanvas().style.cursor = 'pointer'; });
        this.map.on('mouseleave', layerMain, () => { this.map.getCanvas().style.cursor = ''; });
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

        const addMarkers = (list) => {
            list.forEach(obstacle => {
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
        };

        if (obstacles && obstacles.length) {
            addMarkers(obstacles);
        }

        // If none provided, attempt nearby fetch
        if (!this.markers.obstacles.length) {
            try {
                const source = this.map.getSource('route-source');
                const data = source && source._data;
                const coords = data?.geometry?.coordinates;
                if (Array.isArray(coords) && coords.length) {
                    const mid = coords[Math.floor(coords.length / 2)];
                    const lat = mid[1];
                    const lon = mid[0];
                    fetch(`${window.location.origin}/api/obstacles?active_only=true&lat=${lat}&lon=${lon}&radius=600`)
                        .then(r => r.ok ? r.json() : null)
                        .then(list => { if (Array.isArray(list)) addMarkers(list); })
                        .catch(() => {});
                }
            } catch {}
        }

        // Final fallback: fetch all active obstacles if still none
        if (!this.markers.obstacles.length) {
            fetch(`${window.location.origin}/api/obstacles?active_only=true`)
.then(r => r.ok ? r.json() : null)
                                .then(list => { if (Array.isArray(list)) { addMarkers(list); console.log(`✅ Loaded ${list.length} global obstacles`); } })                .then(list => { if (Array.isArray(list)) { addMarkers(list); console.log(`✅ Loaded ${list.length} global obstacles`); } })
                .catch(() => {});
        }
    }

    async addAmenityMarkersNearRoute(coordinates) {
        try {
            // Clear existing amenity markers
            this.amenityMarkers.forEach(m => m.remove());
            this.amenityMarkers = [];

            if (!coordinates || coordinates.length === 0) return;

            // Use midpoint of the route to query nearby amenities
            const mid = coordinates[Math.floor(coordinates.length / 2)];
            const lat = mid[1];
            const lon = mid[0];

            const url = `${window.location.origin}/api/amenities?lat=${lat}&lon=${lon}&radius=1500`;
            console.log('🔎 Fetching nearby amenities:', url);
            const res = await fetch(url, { headers: { 'Accept': 'application/json' }});
            if (!res.ok) { console.warn('Amenity API error', res.status); return; }
            let amenities = await res.json();
            if (!Array.isArray(amenities) || amenities.length === 0) {
                console.log('ℹ️ No nearby amenities returned (filtered). Falling back to all demo amenities.');
                // Fallback: fetch all amenities (unfiltered)
                try {
                    const allRes = await fetch(`${window.location.origin}/api/amenities`);
                    if (allRes.ok) {
                        amenities = await allRes.json();
                    }
                } catch {}
            }

            if (!Array.isArray(amenities) || amenities.length === 0) {
                console.log('ℹ️ Still no amenities to display.');
                return;
            }

            const typeColors = {
                REST_SPOT: '#34a853',
                AUDIO_CROSSWALK: '#ffbf00',
                ELEVATOR: '#673ab7'
            };

            amenities.forEach(a => {
                if (!a?.location) return;
                const el = document.createElement('div');
                const color = typeColors[a.type] || '#34a853';
                el.className = 'amenity-marker';
                el.style.cssText = `
                    background: ${color};
                    width: 16px; height: 16px; border-radius: 50%;
                    border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,.35);
                `;
                const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
                    .setLngLat([a.location.longitude, a.location.latitude])
                    .setPopup(new mapboxgl.Popup().setHTML(`
                        <div style="padding:8px; max-width:220px">
                            <strong>${a.name || 'Amenity'}</strong><br/>
                            ${a.type ? `<small>Type: ${String(a.type).replace(/_/g, ' ')}</small><br/>` : ''}
                            ${a.description ? `<div style='margin-top:4px;'>${a.description}</div>` : ''}
                        </div>
                    `))
                    .addTo(this.map);
                this.amenityMarkers.push(marker);
            });
            console.log(`✅ Placed ${this.amenityMarkers.length} amenity markers`);
        } catch (e) {
            console.warn('Amenity markers failed:', e.message);
        }
    }

    fitMapToRoute(coordinates) {
        if (!coordinates || coordinates.length < 2) return;
        const bounds = new mapboxgl.LngLatBounds();
        for (const c of coordinates) bounds.extend(c);
        this.map.fitBounds(bounds, { padding: 60, maxZoom: 17.5, duration: 0 });
    }

    clearRoute() {
        // Remove route layers (support both old and new IDs)
        const layerIds = ['route-layer', 'route-shadow', 'route-main', 'route-casing'];
        layerIds.forEach(layerId => {
            if (this.map.getLayer(layerId)) {
                this.map.removeLayer(layerId);
            }
        });
        
        // Remove route source
        const sourceIds = ['route-source'];
        sourceIds.forEach(sourceId => {
            if (this.map.getSource(sourceId)) {
                this.map.removeSource(sourceId);
            }
        });
        
        // Remove markers
        Object.values(this.markers).forEach(marker => {
            if (Array.isArray(marker)) {
                marker.forEach(m => m.remove());
            } else if (marker) {
                marker.remove();
            }
        });
        
        // Clear amenity markers as well
        if (this.amenityMarkers && this.amenityMarkers.length) {
            this.amenityMarkers.forEach(m => m.remove());
            this.amenityMarkers = [];
        }
        
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

    enableReportMode() {
        this.reportMode = true;
        this.showToast('Click on the map to drop a pin for the obstacle');
        // Visually hint by changing cursor
        try { this.map.getCanvas().style.cursor = 'crosshair'; } catch {}
    }

    async onMapClick(e) {
        if (!this.reportMode) return;
        const lngLat = e.lngLat;

        // Place or move temp marker
        if (this.tempReportMarker) this.tempReportMarker.remove();
        this.tempReportMarker = new mapboxgl.Marker({ color: '#FF5722' }).setLngLat([lngLat.lng, lngLat.lat]).addTo(this.map);

        // Ask for basic info, then submit
        const type = prompt('Obstacle type (stairs, construction, broken_surface, narrow_path, steep_slope, blocked_access, temporary_barrier, other):', 'construction');
        if (!type) return;
        const severity = prompt('Severity (low, medium, high, critical):', 'medium');
        const description = prompt('Short description:', 'Temporary construction') || 'User reported obstacle';
        
        try {
            const payload = {
                location: { latitude: lngLat.lat, longitude: lngLat.lng },
                type, severity, description,
                affects_wheelchair: true,
                affects_visually_impaired: false,
                affects_mobility_aid: true
            };
            const res = await fetch(`${window.location.origin}/api/obstacles/report`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Report failed');
            this.showToast('Obstacle reported. Thank you!');

            // Add permanent obstacle marker
            const marker = new mapboxgl.Marker({ color: '#FF9800' })
                .setLngLat([lngLat.lng, lngLat.lat])
                .setPopup(new mapboxgl.Popup().setHTML(`<div style="padding:8px"><strong>Obstacle</strong><br/>${type} - ${severity}<br/>${description}</div>`))
                .addTo(this.map);
            this.markers.obstacles.push(marker);
        } catch (err) {
            console.error(err);
            this.showToast('Failed to report obstacle');
        } finally {
            this.reportMode = false;
            try { this.map.getCanvas().style.cursor = ''; } catch {}
            if (this.tempReportMarker) { this.tempReportMarker.remove(); this.tempReportMarker = null; }
        }
    }

    showToast(message) {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:6px 10px;border-radius:6px;z-index:9999;opacity:.95;font-size:12px;';
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2500);
    }
}

// Create global instance and helper to set token at runtime
window.mapboxMap = new MapboxMap();
window.setMapboxToken = function(token) {
    try {
        if (!token) return;
        localStorage.setItem('MAPBOX_TOKEN', token);
        window.MAPBOX_TOKEN = token;
        if (typeof mapboxgl !== 'undefined') {
            mapboxgl.accessToken = token;
        }
        console.log('✅ Mapbox token set for frontend');
    } catch {}
};

// Set the provided token at runtime so the frontend uses it immediately.
window.setMapboxToken('pk.eyJ1Ijoic2thdGUiLCJhIjoiY21kOTlxOW1iMDV1bzJtcHY3bmFobnVmcCJ9.zDBww977UxLmhPDSeZk5Jw');
