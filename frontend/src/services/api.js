// API Service - Handles all API communications

class ApiService {
    constructor() {
        // For development, use explicit port 8003 where backend is running
        this.baseUrl = 'http://localhost:8003';
        this.apiBase = '/api';
    }

    // Generic API request method
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${this.apiBase}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            // Add a default timeout of 30 seconds
            signal: AbortSignal.timeout(30000)
        };

        const config = { ...defaultOptions, ...options };

        try {
            console.log(`API Request: ${config.method || 'GET'} ${url}`);
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            return data;
        } catch (error) {
            if (error.name === 'TimeoutError') {
                console.error('API Request timed out after 30 seconds');
                throw new Error('Request timed out. Please try again.');
            }
            console.error('API Error:', error);
            throw error;
        }
    }

    // Calculate accessible route
    async calculateRoute(routeRequest) {
        return this.request('/calculate-route', {
            method: 'POST',
            body: JSON.stringify(routeRequest)
        });
    }

    // Report obstacle
    async reportObstacle(obstacleData) {
        return this.request('/obstacles', {
            method: 'POST',
            body: JSON.stringify(obstacleData)
        });
    }

    // Get obstacles in area
    async getObstacles(bounds) {
        const params = new URLSearchParams({
            lat_min: bounds.lat_min,
            lat_max: bounds.lat_max,
            lng_min: bounds.lng_min,
            lng_max: bounds.lng_max
        });
        
        return this.request(`/obstacles?${params}`);
    }

    // Submit feedback
    async submitFeedback(feedbackData) {
        return this.request('/feedback', {
            method: 'POST',
            body: JSON.stringify(feedbackData)
        });
    }

    // Get analytics data
    async getAnalytics() {
        return this.request('/analytics');
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }

    // Geocode address to coordinates
    async geocodeAddress(address) {
        return this.request('/geocode', {
            method: 'POST',
            body: JSON.stringify({ address })
        });
    }

    // Reverse geocode coordinates to address
    async reverseGeocode(lat, lng) {
        return this.request('/reverse-geocode', {
            method: 'POST',
            body: JSON.stringify({ latitude: lat, longitude: lng })
        });
    }
}

// Create global API service instance
window.apiService = new ApiService();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}
