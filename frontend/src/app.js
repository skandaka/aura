class AuraApp {
    constructor() {
        this.isLoading = true;
        this.currentRoute = null;
        this.preferences = this.loadPreferences();
        this.isCalculating = false;
        this.eventListenersSetup = false;

        this.routeDisplay = null;
        this.obstacleReporter = null;
        this.analytics = null;
    }

    async init() {
        console.log('🚀 Initializing Aura app...');
        
        this.debug('App initialization started');
        
        try {
            await this.initializeComponents();
            this.debug('Components initialized');
            
            this.setupDemoData();
            this.debug('Demo data setup complete');
            
            this.setupEventListeners();
            this.debug('Event listeners setup complete');
            
            this.hideLoadingScreen();
            
            setTimeout(() => {
                this.loadDemoLocationOnly();
            }, 2000);

            console.log('✅ Aura app initialized successfully');
            this.debug('✅ App initialization complete');
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    debug(message) {
        console.log(message);
    }

    showRoutingNotification(provider, usesRealRoads) {
        let message, icon, className;
        
        if (provider === 'Mapbox' && usesRealRoads) {
            message = '🗺️ Using Mapbox routing - Routes follow real roads and intersections';
            icon = '✅';
            className = 'notification-success';
        } else if (provider === 'Road Network' && usesRealRoads) {
            message = '🛣️ Using road network routing - Routes follow actual streets';
            icon = '✅';
            className = 'notification-success';
        } else {
            message = '📍 Using simplified routing - General direction guidance only';
            icon = '⚠️';
            className = 'notification-warning';
        }
        
        this.showNotification(message, icon, className);
    }

    showNotification(message, icon = 'ℹ️', className = 'notification-info') {
        const notificationContainer = document.getElementById('notifications') || this.createNotificationContainer();
        
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
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 8000);
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

    showLoadingScreen() {
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.querySelector('.loading-screen');
        const mainApp = document.querySelector('.main-app');
        
        if (loadingScreen) {
            loadingScreen.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
        
        if (mainApp) {
            mainApp.style.display = 'flex';
            mainApp.style.animation = 'fadeIn 0.5s ease forwards';
        }
    }

    async initializeComponents() {
        this.debug('Initializing components...');
        try {
            this.routeDisplay = new RouteDisplay();
            
            if (typeof MapboxMap === 'function') {
                if (!window.mapboxMap) window.mapboxMap = new MapboxMap();
                await window.mapboxMap.init();
            }
            
            this.obstacleReporter = new ObstacleReporter();
            this.analytics = new Analytics();
            
            this.debug('All components initialized');
            return true;
        } catch (error) {
            console.error('❌ Error initializing components:', error);
            return false;
        }
    }

    setupEventListeners() {
        if (this.eventListenersSetup) {
            this.debug('⚠️ Event listeners already setup, skipping...');
            return;
        }
        
        const routeForm = document.getElementById('route-form');
        if (routeForm) {
            this.debug('✅ Route form found, adding event listener');
            routeForm.removeEventListener('submit', this.handleRouteCalculation);
            routeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.debug('🔥 Form submit event triggered!');
                if (this.isCalculating) {
                    this.debug('⚠️ Route calculation already in progress, ignoring duplicate submission');
                    return;
                }
                this.handleRouteCalculation(e);
            });
        } else {
            this.debug('❌ Route form not found!');
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('demo-btn')) {
                this.debug(`🎯 Demo button clicked: ${e.target.dataset.demo}`);
                this.loadDemoLocation(e.target.dataset.demo);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.type === 'radio' && e.target.name.includes('input-type')) {
                this.toggleInputType(e.target.name, e.target.value);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.id === 'analyticsBtn') {
                this.analytics.showDashboard();
            } else if (e.target.id === 'reportObstacleBtn') {
                this.obstacleReporter.showReportModal();
            } else if (e.target.id === 'myReportsBtn') {
                this.obstacleReporter.showMyReports();
            } else if (e.target.id === 'settingsBtn') {
                this.showSettings();
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.type === 'range') {
                if (e.target.id === 'max-slope') {
                    const valueDisplay = document.getElementById('slope-value');
                    if (valueDisplay) {
                        valueDisplay.textContent = e.target.value + '%';
                    }
                } else {
                    const valueDisplay = document.getElementById(e.target.id + 'Value');
                    if (valueDisplay) {
                        valueDisplay.textContent = e.target.value;
                    }
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.obstacleReporter.showReportModal();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.analytics.showDashboard();
                        break;
                }
            }
        });

        console.log('✅ Event listeners setup complete');
        this.eventListenersSetup = true;
    }

    setupDemoData() {
        this.demoLocations = {
            downtown: {
                name: "Downtown NYC Route",
                start: { 
                    address: "Times Square, New York, NY 10036",
                    lat: 40.7589, 
                    lng: -73.9851 
                },
                end: { 
                    address: "Penn Station, New York, NY 10001",
                    lat: 40.7505, 
                    lng: -73.9934 
                },
                description: "Times Square to Penn Station - Busy urban route"
            },
            campus: {
                name: "University Campus Route",
                start: { 
                    address: "Columbia University, New York, NY 10027",
                    lat: 40.8075, 
                    lng: -73.9626 
                },
                end: { 
                    address: "Riverside Park, New York, NY 10025",
                    lat: 40.8176, 
                    lng: -73.9482 
                },
                description: "Columbia University to Riverside Park - Campus area"
            },
            hospital: {
                name: "Medical Center Route",
                start: { 
                    address: "Mount Sinai Hospital, New York, NY 10029",
                    lat: 40.7903, 
                    lng: -73.9531 
                },
                end: { 
                    address: "Central Park East, New York, NY 10021",
                    lat: 40.7831, 
                    lng: -73.9712 
                },
                description: "Mount Sinai Hospital to Central Park - Medical district"
            },
            shopping: {
                name: "Schaumburg to Woodfield Mall",
                start: { 
                    address: "Schaumburg, IL 60173",
                    lat: 42.0334, 
                    lng: -88.0834 
                },
                end: { 
                    address: "Woodfield Mall, Schaumburg, IL",
                    lat: 42.0466, 
                    lng: -88.0371 
                },
                description: "Schaumburg to Woodfield Mall - ~1 mile accessible route"
            }
        };

        console.log('✅ Demo data setup complete');
    }

    async handleRouteCalculation(event) {
        this.debug('🚀 handleRouteCalculation called!');
        event.preventDefault();
        
        if (this.isCalculating) {
            this.debug('⚠️ Route calculation already in progress, ignoring duplicate submission');
            return;
        }
        
        this.isCalculating = true;

        try {
            this.debug('🔄 Starting route calculation...');
            
            this.debug(`🔍 RouteDisplay status: ${this.routeDisplay ? 'EXISTS' : 'NULL'}`);
            console.log('🔍 RouteDisplay object:', this.routeDisplay);
            
            if (!this.routeDisplay) {
                this.debug('❌ RouteDisplay is null! Attempting to reinitialize...');
                await this.initializeComponents();
                if (!this.routeDisplay) {
                    throw new Error('RouteDisplay component failed to initialize');
                }
            }
            
            try {
                this.routeDisplay.showLoading();
                this.debug('✅ Loading state shown');
            } catch (loadingError) {
                this.debug('❌ Error showing loading: ' + loadingError.message);
                throw loadingError;
            }
            
            const formData = this.collectFormData();
            this.debug('📋 Form data collected: ' + JSON.stringify(formData).substring(0, 100) + '...');
            
            if (!this.validateFormData(formData)) {
                throw new Error('Please fill in all required fields');
            }
            this.debug('✅ Form data validated');

            console.log('🔍 Calculating route with data:', formData);

            this.debug('🌐 Calling backend API...');
            const routeData = await window.apiService.calculateRoute(formData);

            console.log('✅ Route calculated successfully:', routeData);
            this.debug('✅ Route data received');

            if (window.routeInfoEnhancer) {
                const routingMethod = window.routeInfoEnhancer.enhanceRouteDisplay(routeData);
            }

            this.routeDisplay.displayRoute(routeData);
            this.debug('✅ Route displayed');
            
            this.analytics.recordRoute({
                success: true,
                distance: routeData.distance,
                accessibility_score: routeData.accessibility_score
            });

            this.currentRoute = routeData;

        } catch (error) {
            console.error('❌ Route calculation failed:', error);
            this.debug('❌ Route calc error: ' + error.message);
            
            if (this.routeDisplay) {
                this.routeDisplay.showError(error.message);
            }
            
            if (this.analytics) {
                this.analytics.recordRoute({ success: false });
            }
            
            this.showNotification('Failed to calculate route: ' + error.message, 'error');
        } finally {
            this.isCalculating = false;
        }
    }

    collectFormData() {
        const startLat = parseFloat(document.getElementById('start-lat').value);
        const startLng = parseFloat(document.getElementById('start-lon').value);
        const endLat = parseFloat(document.getElementById('end-lat').value);
        const endLng = parseFloat(document.getElementById('end-lon').value);

        return {
            start: {
                latitude: startLat,
                longitude: startLng
            },
            end: {
                latitude: endLat,
                longitude: endLng
            },
            accessibility_level: document.getElementById('accessibility-level')?.value || 'medium',
            preferences: {
                avoid_stairs: document.getElementById('avoid-stairs')?.checked || false,
                avoid_steep_slopes: true,
                max_slope_percentage: parseFloat(document.getElementById('max-slope')?.value || 5),
                require_curb_cuts: document.getElementById('require-curb-cuts')?.checked || false,
                avoid_construction: document.getElementById('avoid-construction')?.checked || false,
                prefer_wider_sidewalks: document.getElementById('prefer-wider-sidewalks')?.checked || false,
                require_tactile_guidance: false,
                mobility_aid: document.getElementById('mobility-aid')?.value || 'none'
            },
            transport_mode: 'walking',
            time_preference: 'balanced',
            user_id: null
        };
    }

    validateFormData(data) {
        if (isNaN(data.start.latitude) || isNaN(data.start.longitude) ||
            isNaN(data.end.latitude) || isNaN(data.end.longitude)) {
            return false;
        }

        if (data.start.latitude < -90 || data.start.latitude > 90 ||
            data.start.longitude < -180 || data.start.longitude > 180 ||
            data.end.latitude < -90 || data.end.latitude > 90 ||
            data.end.longitude < -180 || data.end.longitude > 180) {
            return false;
        }

        return true;
    }

    loadDemoLocation(demoKey) {
        this.debug(`📍 Loading demo: ${demoKey}`);
        const demo = this.demoLocations[demoKey];
        if (!demo) {
            console.error('Demo location not found:', demoKey);
            this.debug(`❌ Demo not found: ${demoKey}`);
            return;
        }

        this.setLocationData('start', demo.start.address, demo.start.lat, demo.start.lng);
        this.setLocationData('end', demo.end.address, demo.end.lat, demo.end.lng);

        if (this.routeDisplay && this.routeDisplay.currentRoute) {
            this.routeDisplay.currentRoute = null;
            const resultsPanel = document.getElementById('route-results');
            if (resultsPanel) {
                resultsPanel.innerHTML = '';
            }
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                welcomeMessage.style.display = 'block';
            }
        }

        this.showNotification(`Demo route loaded: ${demo.description}`, 'success');
        
        console.log('📍 Demo location loaded:', demo.name);
        this.debug(`✅ Demo loaded: ${demo.name}`);
    }

    toggleInputType(inputName, inputType) {
        const locationKey = inputName.includes('start') ? 'start' : 'end';
        const addressInput = document.getElementById(`${locationKey}-address-input`);
        const coordinateInput = document.getElementById(`${locationKey}-coordinate-input`);

        if (inputType === 'address') {
            addressInput.style.display = 'flex';
            coordinateInput.style.display = 'none';
        } else {
            addressInput.style.display = 'none';
            coordinateInput.style.display = 'grid';
        }
    }

    setLocationData(locationKey, address, lat, lng) {
        const addressField = document.getElementById(`${locationKey}-address`);
        if (addressField) {
            addressField.value = address;
        }

        const latField = document.getElementById(`${locationKey}-lat`);
        const lngField = document.getElementById(`${locationKey}-lon`);
        if (latField && lngField) {
            latField.value = lat.toFixed(6);
            lngField.value = lng.toFixed(6);
        }

        this.updateLocationDisplay(locationKey, address, lat, lng);
    }

    updateLocationDisplay(locationKey, address, lat, lng) {
        const displayElement = document.getElementById(`${locationKey}-location-display`);
        if (displayElement) {
            displayElement.innerHTML = `
                <div class="location-address">${address}</div>
                <div class="location-coords">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
            `;
            displayElement.classList.add('active');
        }
    }

    async geocodeAddress(locationKey) {
        const addressField = document.getElementById(`${locationKey}-address`);
        const address = addressField.value.trim();

        if (!address) {
            this.showNotification('Please enter an address', 'warning');
            return;
        }

        const geocodeBtn = document.querySelector(`#${locationKey}-address-input .geocode-btn`);
        const originalText = geocodeBtn.innerHTML;
        geocodeBtn.innerHTML = '⏳ Finding...';
        geocodeBtn.disabled = true;

        try {
            const result = await window.apiService.geocodeAddress(address);
            
            if (result.latitude && result.longitude) {
                this.setLocationData(locationKey, result.formatted_address || address, result.latitude, result.longitude);
                this.showNotification('Location found successfully!', 'success');
            } else {
                throw new Error('Location not found');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            this.showNotification(`Could not find location: ${error.message}`, 'error');
        } finally {
            geocodeBtn.innerHTML = originalText;
            geocodeBtn.disabled = false;
        }
    }

    async reverseGeocode(locationKey) {
        const latField = document.getElementById(`${locationKey}-lat`);
        const lngField = document.getElementById(`${locationKey}-lon`);
        
        const lat = parseFloat(latField.value);
        const lng = parseFloat(lngField.value);

        if (isNaN(lat) || isNaN(lng)) {
            this.showNotification('Please enter valid coordinates', 'warning');
            return;
        }

        const reverseBtn = document.querySelector(`#${locationKey}-coordinate-input .reverse-geocode-btn`);
        const originalText = reverseBtn.innerHTML;
        reverseBtn.innerHTML = '⏳ Finding...';
        reverseBtn.disabled = true;

        try {
            const result = await window.apiService.reverseGeocode(lat, lng);
            
            if (result.address) {
                const addressField = document.getElementById(`${locationKey}-address`);
                if (addressField) {
                    addressField.value = result.address;
                }
                this.updateLocationDisplay(locationKey, result.address, lat, lng);
                this.showNotification('Address found successfully!', 'success');
            } else {
                throw new Error('Address not found');
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            this.showNotification(`Could not find address: ${error.message}`, 'error');
        } finally {
            reverseBtn.innerHTML = originalText;
            reverseBtn.disabled = false;
        }
    }

    showSettings() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>⚙️ Settings</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="settings-section">
                        <h4 style="color: var(--primary-blue); margin-bottom: 1rem;">Accessibility Preferences</h4>
                        
                        <div class="form-group">
                            <label for="settingsTheme">Theme</label>
                            <select id="settingsTheme">
                                <option value="auto">Auto (System)</option>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                                <option value="high-contrast">High Contrast</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="settingsFontSize">Font Size</label>
                            <select id="settingsFontSize">
                                <option value="small">Small</option>
                                <option value="medium" selected>Medium</option>
                                <option value="large">Large</option>
                                <option value="extra-large">Extra Large</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="settingsReduceMotion">
                                <span class="checkmark"></span>
                                Reduce motion and animations
                            </label>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="settingsHighContrast">
                                <span class="checkmark"></span>
                                Enable high contrast mode
                            </label>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="settingsScreenReader">
                                <span class="checkmark"></span>
                                Optimize for screen readers
                            </label>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h4 style="color: var(--primary-blue); margin: 2rem 0 1rem;">Notification Preferences</h4>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="settingsNotifications" checked>
                                <span class="checkmark"></span>
                                Enable notifications
                            </label>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="settingsSound">
                                <span class="checkmark"></span>
                                Enable sound alerts
                            </label>
                        </div>
                    </div>

                    <div class="settings-section">
                        <h4 style="color: var(--primary-blue); margin: 2rem 0 1rem;">Data & Privacy</h4>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="settingsAnalytics" checked>
                                <span class="checkmark"></span>
                                Allow usage analytics
                            </label>
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="settingsLocation">
                                <span class="checkmark"></span>
                                Remember location preferences
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="secondary-btn" onclick="app.resetSettings()">
                        Reset to Defaults
                    </button>
                    <button type="button" class="primary-btn" onclick="app.saveSettings()">
                        Save Settings
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.loadCurrentSettings();
    }

    loadCurrentSettings() {
        Object.keys(this.preferences).forEach(key => {
            const element = document.getElementById('settings' + key.charAt(0).toUpperCase() + key.slice(1));
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.preferences[key];
                } else {
                    element.value = this.preferences[key];
                }
            }
        });
    }

    saveSettings() {
        const settings = {
            theme: document.getElementById('settingsTheme').value,
            fontSize: document.getElementById('settingsFontSize').value,
            reduceMotion: document.getElementById('settingsReduceMotion').checked,
            highContrast: document.getElementById('settingsHighContrast').checked,
            screenReader: document.getElementById('settingsScreenReader').checked,
            notifications: document.getElementById('settingsNotifications').checked,
            sound: document.getElementById('settingsSound').checked,
            analytics: document.getElementById('settingsAnalytics').checked,
            location: document.getElementById('settingsLocation').checked
        };

        this.preferences = settings;
        this.savePreferences();
        this.applySettings();
        
        document.querySelector('.modal').remove();
        
        this.showNotification('Settings saved successfully!', 'success');
    }

    resetSettings() {
        if (confirm('Reset all settings to defaults?')) {
            this.preferences = this.getDefaultPreferences();
            this.savePreferences();
            this.applySettings();
            this.loadCurrentSettings();
            this.showNotification('Settings reset to defaults', 'success');
        }
    }

    applySettings() {
        const body = document.body;
        
        body.className = body.className.replace(/theme-\w+/g, '');
        if (this.preferences.theme !== 'auto') {
            body.classList.add(`theme-${this.preferences.theme}`);
        }

        body.className = body.className.replace(/font-size-\w+/g, '');
        body.classList.add(`font-size-${this.preferences.fontSize}`);

        if (this.preferences.reduceMotion) {
            body.classList.add('reduce-motion');
        } else {
            body.classList.remove('reduce-motion');
        }

        if (this.preferences.highContrast) {
            body.classList.add('high-contrast');
        } else {
            body.classList.remove('high-contrast');
        }
    }

    loadPreferences() {
        try {
            const stored = localStorage.getItem('aura_preferences');
            return stored ? JSON.parse(stored) : this.getDefaultPreferences();
        } catch (error) {
            console.error('Error loading preferences:', error);
            return this.getDefaultPreferences();
        }
    }

    getDefaultPreferences() {
        return {
            theme: 'auto',
            fontSize: 'medium',
            reduceMotion: false,
            highContrast: false,
            screenReader: false,
            notifications: true,
            sound: false,
            analytics: true,
            location: false
        };
    }

    savePreferences() {
        try {
            localStorage.setItem('aura_preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    showNotification(message, type = 'info') {
        if (!this.preferences.notifications) return;

        const notification = document.createElement('div');
        const colors = {
            'success': 'var(--success-green)',
            'error': 'var(--error-red)',
            'warning': 'var(--warning-orange)',
            'info': 'var(--info-blue)'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius-md);
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        if (this.preferences.sound && type === 'error') {
        }
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    getStatus() {
        return {
            version: '1.0.0',
            initialized: !this.isLoading,
            currentRoute: this.currentRoute !== null,
            components: {
                routeDisplay: this.routeDisplay !== null,
                obstacleReporter: this.obstacleReporter !== null,
                analytics: this.analytics !== null
            },
            preferences: this.preferences
        };
    }

    loadDemoLocationOnly() {
        console.log('🗺️ Loading demo location only (no auto-calculation)...');
        
        this.loadDemoLocation('shopping');
        this.debug('Demo location loaded, ready for user to calculate route');
    }
}

const appStyles = document.createElement('style');
appStyles.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    
    .main-app {
        display: none;
    }
    
    /* Theme support */
    .theme-dark {
        --white: #1a1a1a;
        --light-gray: #2d2d2d;
        --medium-gray: #404040;
        --dark-gray: #a0a0a0;
        --darker-gray: #d0d0d0;
        --black: #ffffff;
    }
    
    .theme-high-contrast {
        --primary-blue: #0066cc;
        --primary-purple: #6600cc;
        --white: #ffffff;
        --black: #000000;
        --medium-gray: #666666;
    }
    
    /* Font size support */
    .font-size-small { font-size: 14px; }
    .font-size-medium { font-size: 16px; }
    .font-size-large { font-size: 18px; }
    .font-size-extra-large { font-size: 22px; }
    
    /* Accessibility support */
    .reduce-motion *, .reduce-motion *::before, .reduce-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
    
    .high-contrast {
        filter: contrast(150%);
    }
    
    .high-contrast button, .high-contrast input, .high-contrast select {
        border-width: 2px !important;
    }
`;

document.head.appendChild(appStyles);

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM loaded, waiting for all scripts...');
    
    let retries = 0; const maxRetries = 20;
    while (retries < maxRetries) {
        const allScriptsLoaded = (
            typeof RouteDisplay !== 'undefined' &&
            typeof ObstacleReporter !== 'undefined' &&
            typeof Analytics !== 'undefined' &&
            typeof mapboxgl !== 'undefined' // Mapbox
        );
        if (allScriptsLoaded) break;
        await new Promise(r => setTimeout(r, 100));
        retries++;
    }
    if (retries >= maxRetries) console.error('❌ Some scripts failed to load');
    
    window.app = new AuraApp();
    window.app.init();
});

window.geocodeAddress = async function(locationKey) {
    if (window.app) {
        return window.app.geocodeAddress(locationKey);
    }
};

window.reverseGeocode = async function(locationKey) {
    if (window.app) {
        return window.app.reverseGeocode(locationKey);
    }
};

window.AuraApp = AuraApp;
