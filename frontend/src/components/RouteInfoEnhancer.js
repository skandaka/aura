// Enhanced Route Information Display
// Shows detailed information about road network routing vs simple routing

class RouteInfoEnhancer {
    constructor() {
        this.routingMethod = 'unknown';
        this.roadNetworkData = null;
    }

    analyzeRoute(routeData) {
        // Determine routing method based on route data characteristics
        if (routeData.route_summary && routeData.route_summary.road_types) {
            this.routingMethod = 'road_network';
            this.roadNetworkData = routeData.route_summary;
        } else {
            this.routingMethod = 'simple';
        }
        
        return this.routingMethod;
    }

    showRoutingMethodNotification(method) {
        const notificationContainer = document.getElementById('notifications') || this.createNotificationContainer();
        
        let message, icon, className;
        
        if (method === 'road_network') {
            message = 'Using advanced road network routing for accurate pathfinding';
            icon = '🛣️';
            className = 'notification-success';
        } else {
            message = 'Using direct routing (road network unavailable)';
            icon = '📍';
            className = 'notification-warning';
        }
        
        const notification = document.createElement('div');
        notification.className = `route-notification ${className}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        notificationContainer.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    createNotificationContainer() {
        let container = document.getElementById('notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notifications';
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
        return container;
    }

    enhanceRouteDisplay(routeData) {
        const method = this.analyzeRoute(routeData);
        this.showRoutingMethodNotification(method);
        
        // Add routing method information to route display
        this.addRoutingMethodInfo(method, routeData);
        
        return method;
    }

    addRoutingMethodInfo(method, routeData) {
        const routeResults = document.getElementById('route-results');
        if (!routeResults) return;
        
        let routingInfoHTML = '';
        
        if (method === 'road_network' || (routeData.route_summary && routeData.route_summary.routing_engine === 'mapbox')) {
            const roadTypes = this.roadNetworkData?.road_types || routeData.route_summary?.road_types || [];
            const surfaceTypes = this.roadNetworkData?.surface_types || routeData.route_summary?.surface_types || [];
            const engineType = routeData.route_summary?.routing_engine === 'mapbox' ? 'Mapbox' : 'Road Network';
            
            routingInfoHTML = `
                <div class="routing-method-info road-network">
                    <h4>🛣️ ${engineType} Routing - High Accuracy</h4>
                    <p>This route follows actual roads, sidewalks, and intersections for precise navigation.</p>
                    
                    <div class="routing-details">
                        <div class="routing-feature">
                            <strong>Road Types Used:</strong>
                            <div class="feature-tags">
                                ${roadTypes.map(type => `<span class="feature-tag road-type">${type}</span>`).join('')}
                            </div>
                        </div>
                        
                        ${surfaceTypes.length > 0 ? `
                            <div class="routing-feature">
                                <strong>Surface Types:</strong>
                                <div class="feature-tags">
                                    ${surfaceTypes.map(type => `<span class="feature-tag surface-type">${type}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="routing-benefits">
                            <div class="benefit-item">✅ Follows actual intersections</div>
                            <div class="benefit-item">✅ Uses real sidewalk data</div>
                            <div class="benefit-item">✅ Avoids cutting through buildings</div>
                            <div class="benefit-item">✅ Professional-grade accuracy</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            routingInfoHTML = `
                <div class="routing-method-info simple">
                    <h4>📍 Direct Route Calculation</h4>
                    <p>Using direct point-to-point routing with accessibility considerations.</p>
                    
                    <div class="routing-details">
                        <div class="routing-note">
                            <strong>Note:</strong> This route may not follow exact roads. 
                            For best results, use the route as a general guide and 
                            follow actual sidewalks and crosswalks.
                        </div>
                        
                        <div class="routing-benefits">
                            <div class="benefit-item">✅ Quick calculation</div>
                            <div class="benefit-item">✅ Accessibility scoring included</div>
                            <div class="benefit-item">⚠️ May require manual adjustment</div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Insert routing info at the top of route results
        const firstChild = routeResults.firstChild;
        const routingInfoElement = document.createElement('div');
        routingInfoElement.innerHTML = routingInfoHTML;
        
        if (firstChild) {
            routeResults.insertBefore(routingInfoElement, firstChild);
        } else {
            routeResults.appendChild(routingInfoElement);
        }
    }

    showRoadNetworkStatus(isAvailable, location) {
        const statusElement = document.getElementById('road-network-status') || this.createStatusElement();
        
        if (isAvailable) {
            statusElement.innerHTML = `
                <div class="status-indicator status-success">
                    <span class="status-icon">🛣️</span>
                    <span class="status-text">Road network data available for this area</span>
                </div>
            `;
        } else {
            statusElement.innerHTML = `
                <div class="status-indicator status-warning">
                    <span class="status-icon">⚠️</span>
                    <span class="status-text">Limited road data - using direct routing</span>
                </div>
            `;
        }
        
        statusElement.style.display = 'block';
    }

    createStatusElement() {
        const statusElement = document.createElement('div');
        statusElement.id = 'road-network-status';
        statusElement.className = 'road-network-status';
        
        // Insert after the route form
        const routeForm = document.getElementById('route-form');
        if (routeForm && routeForm.parentElement) {
            routeForm.parentElement.insertBefore(statusElement, routeForm.nextSibling);
        }
        
        return statusElement;
    }
}

// Create global instance
window.routeInfoEnhancer = new RouteInfoEnhancer();
