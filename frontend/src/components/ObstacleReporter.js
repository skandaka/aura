// ObstacleReporter Component - Handles obstacle reporting functionality

class ObstacleReporter {
    constructor() {
        this.isReporting = false;
        this.reportedObstacles = this.loadReportedObstacles();
        this.init();
    }

    init() {
        // Initialize the obstacle reporter component
        console.log('ObstacleReporter component initialized');
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Listen for the report obstacle button click
        document.addEventListener('click', (e) => {
            if (e.target.id === 'reportObstacleBtn') {
                this.showReportModal();
            }
        });
    }

    // Show the obstacle reporting modal
    showReportModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🚧 Report Obstacle</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="obstacleReportForm">
                        <div class="form-group">
                            <label for="obstacleType">Obstacle Type *</label>
                            <select id="obstacleType" required>
                                <option value="">Select obstacle type</option>
                                <option value="construction">🚧 Construction Work</option>
                                <option value="pothole">🕳️ Pothole/Road Damage</option>
                                <option value="blocked_sidewalk">🚷 Blocked Sidewalk</option>
                                <option value="steep_slope">⛰️ Steep Slope/Stairs</option>
                                <option value="no_curb_cut">🚫 Missing Curb Cut</option>
                                <option value="debris">🗑️ Debris/Obstruction</option>
                                <option value="flooding">🌊 Flooding/Water</option>
                                <option value="poor_lighting">💡 Poor Lighting</option>
                                <option value="broken_infrastructure">⚠️ Broken Infrastructure</option>
                                <option value="other">❓ Other</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="obstacleSeverity">Severity Level *</label>
                            <select id="obstacleSeverity" required>
                                <option value="">Select severity</option>
                                <option value="low">🟢 Low - Minor inconvenience</option>
                                <option value="medium">🟡 Medium - Significant difficulty</option>
                                <option value="high">🟠 High - Major barrier</option>
                                <option value="critical">🔴 Critical - Completely inaccessible</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="obstacleLocation">Location *</label>
                            <div class="location-input-group">
                                <div class="coordinate-inputs">
                                    <input type="number" id="obstacleLat" placeholder="Latitude" step="any" required>
                                    <input type="number" id="obstacleLng" placeholder="Longitude" step="any" required>
                                </div>
                                <button type="button" class="secondary-btn" onclick="obstacleReporter.getCurrentLocation()">
                                    📍 Use Current Location
                                </button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="obstacleDescription">Description *</label>
                            <textarea id="obstacleDescription" placeholder="Please provide details about the obstacle, its impact on accessibility, and any additional context..." rows="4" required></textarea>
                        </div>

                        <div class="form-group">
                            <label for="affectedUsers">Affected User Groups</label>
                            <div class="checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" value="wheelchair">
                                    <span class="checkmark"></span>
                                    Wheelchair Users
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" value="mobility_aid">
                                    <span class="checkmark"></span>
                                    Mobility Aid Users (walkers, canes)
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" value="visual_impairment">
                                    <span class="checkmark"></span>
                                    Users with Visual Impairments
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" value="hearing_impairment">
                                    <span class="checkmark"></span>
                                    Users with Hearing Impairments
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" value="elderly">
                                    <span class="checkmark"></span>
                                    Elderly Users
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox" value="families">
                                    <span class="checkmark"></span>
                                    Families with Strollers
                                </label>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="reporterContact">Contact Information (Optional)</label>
                            <input type="email" id="reporterContact" placeholder="Email for follow-up (optional)">
                        </div>

                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="urgentReport">
                                <span class="checkmark"></span>
                                This is an urgent safety concern
                            </label>
                        </div>
                    </form>
                </div>
                <div class="modal-actions">
                    <button type="button" class="secondary-btn" onclick="this.closest('.modal').remove()">
                        Cancel
                    </button>
                    <button type="submit" class="primary-btn" onclick="obstacleReporter.submitReport(event)">
                        📤 Submit Report
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Focus on the first input
        setTimeout(() => {
            document.getElementById('obstacleType').focus();
        }, 100);
    }

    // Get current location for obstacle reporting
    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showNotification('Geolocation is not supported by this browser.', 'error');
            return;
        }

        const latInput = document.getElementById('obstacleLat');
        const lngInput = document.getElementById('obstacleLng');
        
        // Show loading state
        latInput.placeholder = 'Getting location...';
        lngInput.placeholder = 'Getting location...';

        navigator.geolocation.getCurrentPosition(
            (position) => {
                latInput.value = position.coords.latitude.toFixed(6);
                lngInput.value = position.coords.longitude.toFixed(6);
                latInput.placeholder = 'Latitude';
                lngInput.placeholder = 'Longitude';
                this.showNotification('Location detected successfully!', 'success');
            },
            (error) => {
                latInput.placeholder = 'Latitude';
                lngInput.placeholder = 'Longitude';
                
                let errorMessage = 'Unable to get location. ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Please enable location permissions.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out.';
                        break;
                    default:
                        errorMessage += 'Unknown error occurred.';
                        break;
                }
                
                this.showNotification(errorMessage, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 600000
            }
        );
    }

    // Submit obstacle report
    async submitReport(event) {
        event.preventDefault();
        
        if (this.isReporting) return;

        // Validate form
        const form = document.getElementById('obstacleReportForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        this.isReporting = true;
        const submitBtn = event.target;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<div class="btn-spinner"></div>';
        submitBtn.disabled = true;

        try {
            // Collect form data
            const formData = this.collectFormData();
            
            // Validate coordinates
            if (!this.validateCoordinates(formData.latitude, formData.longitude)) {
                throw new Error('Please provide valid coordinates');
            }

            // Submit to backend
            const response = await fetch('/api/obstacles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const result = await response.json();
            
            // Store locally
            this.reportedObstacles.push({
                ...formData,
                id: result.id || Date.now(),
                timestamp: new Date().toISOString(),
                status: 'submitted'
            });
            this.saveReportedObstacles();

            // Success feedback
            this.showNotification('Obstacle reported successfully! Thank you for helping improve accessibility.', 'success');
            
            // Close modal
            document.querySelector('.modal').remove();
            
            // Update analytics if available
            if (window.analytics) {
                window.analytics.recordObstacleReport(formData.type, formData.severity);
            }

        } catch (error) {
            console.error('Error submitting obstacle report:', error);
            this.showNotification(`Failed to submit report: ${error.message}`, 'error');
        } finally {
            this.isReporting = false;
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    // Collect form data
    collectFormData() {
        const affectedUsers = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .filter(cb => cb.value !== 'urgent')
            .map(cb => cb.value);

        return {
            type: document.getElementById('obstacleType').value,
            severity: document.getElementById('obstacleSeverity').value,
            latitude: parseFloat(document.getElementById('obstacleLat').value),
            longitude: parseFloat(document.getElementById('obstacleLng').value),
            description: document.getElementById('obstacleDescription').value.trim(),
            affected_users: affectedUsers,
            reporter_contact: document.getElementById('reporterContact').value.trim(),
            is_urgent: document.getElementById('urgentReport').checked,
            timestamp: new Date().toISOString(),
            source: 'user_report'
        };
    }

    // Validate coordinates
    validateCoordinates(lat, lng) {
        return !isNaN(lat) && !isNaN(lng) && 
               lat >= -90 && lat <= 90 && 
               lng >= -180 && lng <= 180;
    }

    // Show my reported obstacles
    showMyReports() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>📋 My Obstacle Reports</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    ${this.renderMyReports()}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Render my reports
    renderMyReports() {
        if (this.reportedObstacles.length === 0) {
            return `
                <div class="empty-state" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📋</div>
                    <h3 style="color: var(--dark-gray); margin-bottom: 1rem;">No Reports Yet</h3>
                    <p style="color: var(--dark-gray); margin-bottom: 2rem;">You haven't reported any obstacles yet. Help improve accessibility by reporting obstacles you encounter.</p>
                    <button class="primary-btn" onclick="this.closest('.modal').remove(); obstacleReporter.showReportModal();">
                        Report an Obstacle
                    </button>
                </div>
            `;
        }

        return `
            <div class="reports-list">
                ${this.reportedObstacles.map((report, index) => `
                    <div class="report-card" style="border: 2px solid var(--medium-gray); border-radius: var(--border-radius-lg); padding: 1.5rem; margin-bottom: 1rem; background: var(--white);">
                        <div class="report-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                            <div>
                                <h4 style="color: var(--primary-blue); margin-bottom: 0.5rem;">
                                    ${this.getObstacleIcon(report.type)} ${this.formatObstacleType(report.type)}
                                </h4>
                                <div class="report-meta" style="display: flex; gap: 1rem; font-size: var(--font-size-sm); color: var(--dark-gray);">
                                    <span>📅 ${new Date(report.timestamp).toLocaleDateString()}</span>
                                    <span class="severity-badge ${report.severity}" style="padding: 0.25rem 0.5rem; border-radius: var(--border-radius-sm); font-weight: bold;">
                                        ${this.formatSeverity(report.severity)}
                                    </span>
                                </div>
                            </div>
                            <button class="icon-btn" onclick="obstacleReporter.deleteReport(${index})" title="Delete Report">
                                🗑️
                            </button>
                        </div>
                        
                        <div class="report-details">
                            <p style="margin-bottom: 1rem; color: var(--darker-gray);">${report.description}</p>
                            
                            <div class="report-info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; font-size: var(--font-size-sm);">
                                <div>
                                    <strong>Location:</strong><br>
                                    ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}
                                </div>
                                ${report.affected_users.length > 0 ? `
                                    <div>
                                        <strong>Affected Users:</strong><br>
                                        ${report.affected_users.map(user => this.formatUserGroup(user)).join(', ')}
                                    </div>
                                ` : ''}
                                ${report.is_urgent ? `
                                    <div style="color: var(--error-red);">
                                        <strong>⚠️ Urgent Report</strong>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Delete a report
    deleteReport(index) {
        if (confirm('Are you sure you want to delete this report?')) {
            this.reportedObstacles.splice(index, 1);
            this.saveReportedObstacles();
            
            // Refresh the modal content
            const modalBody = document.querySelector('.modal .modal-body');
            if (modalBody) {
                modalBody.innerHTML = this.renderMyReports();
            }
            
            this.showNotification('Report deleted successfully.', 'success');
        }
    }

    // Format obstacle type for display
    formatObstacleType(type) {
        const types = {
            'construction': 'Construction Work',
            'pothole': 'Pothole/Road Damage',
            'blocked_sidewalk': 'Blocked Sidewalk',
            'steep_slope': 'Steep Slope/Stairs',
            'no_curb_cut': 'Missing Curb Cut',
            'debris': 'Debris/Obstruction',
            'flooding': 'Flooding/Water',
            'poor_lighting': 'Poor Lighting',
            'broken_infrastructure': 'Broken Infrastructure',
            'other': 'Other'
        };
        return types[type] || type;
    }

    // Get obstacle icon
    getObstacleIcon(type) {
        const icons = {
            'construction': '🚧',
            'pothole': '🕳️',
            'blocked_sidewalk': '🚷',
            'steep_slope': '⛰️',
            'no_curb_cut': '🚫',
            'debris': '🗑️',
            'flooding': '🌊',
            'poor_lighting': '💡',
            'broken_infrastructure': '⚠️',
            'other': '❓'
        };
        return icons[type] || '❓';
    }

    // Format severity
    formatSeverity(severity) {
        const severities = {
            'low': '🟢 Low',
            'medium': '🟡 Medium',
            'high': '🟠 High',
            'critical': '🔴 Critical'
        };
        return severities[severity] || severity;
    }

    // Format user group
    formatUserGroup(group) {
        const groups = {
            'wheelchair': 'Wheelchair Users',
            'mobility_aid': 'Mobility Aid Users',
            'visual_impairment': 'Visual Impairments',
            'hearing_impairment': 'Hearing Impairments',
            'elderly': 'Elderly Users',
            'families': 'Families with Strollers'
        };
        return groups[group] || group;
    }

    // Load reported obstacles from localStorage
    loadReportedObstacles() {
        try {
            const stored = localStorage.getItem('aura_reported_obstacles');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading reported obstacles:', error);
            return [];
        }
    }

    // Save reported obstacles to localStorage
    saveReportedObstacles() {
        try {
            localStorage.setItem('aura_reported_obstacles', JSON.stringify(this.reportedObstacles));
        } catch (error) {
            console.error('Error saving reported obstacles:', error);
        }
    }

    // Show notification
    showNotification(message, type = 'info') {
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
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    // Get statistics about reported obstacles
    getStatistics() {
        const total = this.reportedObstacles.length;
        const byType = {};
        const bySeverity = {};
        
        this.reportedObstacles.forEach(obstacle => {
            byType[obstacle.type] = (byType[obstacle.type] || 0) + 1;
            bySeverity[obstacle.severity] = (bySeverity[obstacle.severity] || 0) + 1;
        });

        return {
            total,
            byType,
            bySeverity,
            mostCommonType: Object.keys(byType).reduce((a, b) => byType[a] > byType[b] ? a : b, ''),
            urgentCount: this.reportedObstacles.filter(o => o.is_urgent).length
        };
    }
}

// Add styles for severity badges
const obstacleStyles = document.createElement('style');
obstacleStyles.textContent = `
    .severity-badge.low { background: var(--success-green); color: white; }
    .severity-badge.medium { background: var(--warning-orange); color: white; }
    .severity-badge.high { background: var(--error-red); color: white; }
    .severity-badge.critical { background: #d32f2f; color: white; }
    
    .location-input-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
`;

document.head.appendChild(obstacleStyles);

// Export the ObstacleReporter class
window.ObstacleReporter = ObstacleReporter;
