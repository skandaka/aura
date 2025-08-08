// RouteDisplay Component - Handles route visualization and results

class RouteDisplay {
    constructor() {
        this.currentRoute = null;
        this.alternatives = [];
        this.isLoading = false;
        this.map = null;
        this.mapView = 'standard';
        this.init();
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
        
        // Show loading in map area
        const mapDisplay = document.getElementById('map-display');
        if (mapDisplay) {
            mapDisplay.innerHTML = `
                <div class="loading-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #f5f5f5;">
                    <div class="loading-spinner" style="margin: 0 auto 2rem;"></div>
                    <h3 style="color: var(--primary-blue); margin-bottom: 1rem;">Calculating Route...</h3>
                    <p style="color: var(--dark-gray);">Finding the most accessible path for you</p>
                </div>
            `;
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
        
        // Hide welcome message
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        // Calculate accessibility score color and display value
        const accessibilityScore = routeData.accessibility_score?.overall_score || routeData.accessibility_score || 0;
        const scoreDisplay = Math.round(accessibilityScore * 100);
        const scoreClass = this.getScoreClass(scoreDisplay);
        
        // Format distance properly
        const distance = routeData.total_distance?.toFixed(2) || '0.00';
        const obstacleCount = routeData.route_summary?.obstacle_count || routeData.warnings?.length || 0;
        
        // Display interactive map
        this.displayMap(routeData);
        
        // Display results in panel
        const resultsPanel = document.getElementById('route-results');
        if (resultsPanel) {
            resultsPanel.innerHTML = `
                <div class="route-results">
                    <div class="route-header">
                        <h2 class="route-title">Route Results</h2>
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
                                <div class="metric-value">${routeData.estimated_time || 'N/A'} min</div>
                                <div class="metric-label">Est. Time</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Display interactive map
    displayMap(routeData) {
        const mapDisplay = document.getElementById('map-display');
        if (!mapDisplay) return;

        mapDisplay.innerHTML = `
            <div class="interactive-map">
                <div class="map-header">
                    <h3>📍 Schaumburg to Woodfield Mall</h3>
                    <div class="map-controls">
                        <button class="map-btn" onclick="window.routeDisplay.toggleMapView('standard')">Standard</button>
                        <button class="map-btn active" onclick="window.routeDisplay.toggleMapView('accessibility')">Accessibility</button>
                        <button class="map-btn" onclick="window.routeDisplay.toggleMapView('satellite')">Satellite</button>
                    </div>
                </div>
                
                <div class="map-canvas">
                    <div class="route-visualization">
                        <div class="start-point" title="Start: Schaumburg, IL">🚶‍♂️ Start</div>
                        <div class="route-path"></div>
                        <div class="end-point" title="End: Woodfield Mall">🛍️ Destination</div>
                        
                        <div class="route-features">
                            <div class="feature-point accessible" style="left: 25%;" title="Accessible crossing">♿</div>
                            <div class="feature-point sidewalk" style="left: 45%;" title="Wide sidewalk">🚶‍♀️</div>
                            <div class="feature-point lighting" style="left: 70%;" title="Well-lit area">💡</div>
                        </div>
                    </div>
                    
                    <div class="map-legend">
                        <div class="legend-item">
                            <span class="legend-color accessible"></span>
                            <span>Accessible path</span>
                        </div>
                        <div class="legend-item">
                            <span class="legend-color obstacles"></span>
                            <span>Potential obstacles</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Animate route
        setTimeout(() => {
            const routePath = mapDisplay.querySelector('.route-path');
            if (routePath) {
                routePath.style.animation = 'routeProgress 2s ease-in-out';
            }
        }, 500);
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
}

// Export for global access
window.RouteDisplay = RouteDisplay;
