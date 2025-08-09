class ApiService {
    constructor() {
        this.baseUrl = window.location.origin;
        this.apiBase = '/api';
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${this.apiBase}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
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

    async calculateRoute(routeRequest) {
        return this.request('/calculate-route', {
            method: 'POST',
            body: JSON.stringify(routeRequest)
        });
    }

    async reportObstacle(obstacleData) {
        return this.request('/report-obstacle', {
            method: 'POST',
            body: JSON.stringify(obstacleData)
        });
    }

    async getObstacles(bounds) {
        const params = new URLSearchParams({
            north: bounds.north,
            south: bounds.south,
            east: bounds.east,
            west: bounds.west
        });
        return this.request(`/obstacles?${params}`);
    }

    async submitFeedback(feedbackData) {
        return this.request('/feedback', {
            method: 'POST',
            body: JSON.stringify(feedbackData)
        });
    }

    async getAnalytics() {
        return this.request('/analytics');
    }

    async healthCheck() {
        return this.request('/health');
    }

    async geocodeAddress(address) {
        const params = new URLSearchParams({ address });
        return this.request(`/geocode?${params}`);
    }

    async reverseGeocode(lat, lon) {
        const params = new URLSearchParams({ lat, lon });
        return this.request(`/reverse-geocode?${params}`);
    }
}

window.apiService = new ApiService();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}
