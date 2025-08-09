// RouteDisplay Component - Handles route visualization and results

class RouteDisplay {
    constructor() {
        console.log('🔧 RouteDisplay constructor called');
        try {
            this.currentRoute = null;
            this.alternatives = [];
            this.isLoading = false;
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

    // Initialize map using Mapbox only
    initializeMap() {
        console.log('✅ Map initialization (Mapbox) called');
        if (!window.mapboxMap) {
            if (typeof MapboxMap === 'function') {
                window.mapboxMap = new MapboxMap();
            } else {
                console.error('❌ MapboxMap not available');
                return false;
            }
        }
        return !!window.mapboxMap && !!window.mapboxMap.init && (typeof mapboxgl !== 'undefined');
    }

    // Display route using Mapbox renderer
    displayRoute(routeData) {
        this.currentRoute = routeData;
        this.isLoading = false;
        this.enableCalculateButton();
        const overlay = document.getElementById('map-loading-overlay');
        if (overlay) overlay.remove();
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) welcomeMessage.style.display = 'none';
        if (!this.initializeMap()) {
            console.error('❌ Mapbox initialization failed');
            return;
        }
        try {
            window.mapboxMap.displayRoute(routeData);
        } catch (e) {
            console.error('❌ Error rendering mapbox route:', e);
        }
        
        // Calculate accessibility score color and display value
        const accessibilityScore = routeData.accessibility_score?.overall_score || routeData.accessibility_score || 0;
        const scoreDisplay = Math.round(accessibilityScore * 100);
        const scoreClass = this.getScoreClass(scoreDisplay);
        
        // Format distance properly
        const distance = routeData.total_distance?.toFixed(2) || '2.1';
        const obstacleCount = routeData.route_summary?.obstacle_count || routeData.warnings?.length || 0;
        
        // Display results in panel (no nav/alternatives buttons)
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
                </div>
            `;
        }
    }

    // Keep UI helpers
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

    // Get score class for styling
    getScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'fair';
        return 'poor';
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

    // Removed: Start navigation and Alternatives (no-op stubs to avoid errors if referenced)
    startNavigation() { /* removed per request */ }
    nextInstruction() { /* removed per request */ }
    previousInstruction() { /* removed per request */ }
    updateNavigationDisplay() { /* removed per request */ }
    showAlternatives() { /* removed per request */ }
    selectAlternativeRoute(/* routeType */) { /* removed per request */ }

    createNotificationContainer() {
        let container = document.getElementById('notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications';
            container.className = 'notifications-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
        return container;
    }
}

// Export for global access
window.RouteDisplay = RouteDisplay;
