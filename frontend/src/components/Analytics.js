// Analytics Component - Handles data visualization and usage analytics

class Analytics {
    constructor() {
        this.data = this.loadAnalyticsData();
        this.charts = {};
        this.init();
    }

    init() {
        console.log('Analytics component initialized');
        this.updateData();
    }

    // Load analytics data from localStorage
    loadAnalyticsData() {
        try {
            const stored = localStorage.getItem('aura_analytics');
            return stored ? JSON.parse(stored) : this.getDefaultData();
        } catch (error) {
            console.error('Error loading analytics data:', error);
            return this.getDefaultData();
        }
    }

    // Get default analytics data structure
    getDefaultData() {
        return {
            routes: {
                total: 0,
                successful: 0,
                failed: 0,
                totalDistance: 0,
                averageAccessibility: 0,
                byAccessibilityLevel: { high: 0, medium: 0, low: 0 }
            },
            obstacles: {
                total: 0,
                reported: 0,
                byType: {},
                bySeverity: { low: 0, medium: 0, high: 0, critical: 0 }
            },
            usage: {
                sessionsToday: 1,
                totalSessions: 1,
                lastSession: new Date().toISOString(),
                averageSessionTime: 0,
                popularDestinations: {}
            },
            accessibility: {
                averageScore: 0,
                scoreDistribution: {},
                improvementsSuggested: 0,
                routesOptimized: 0
            }
        };
    }

    // Update analytics data
    updateData() {
        // Update session data
        this.data.usage.totalSessions++;
        const today = new Date().toDateString();
        const lastSessionDate = new Date(this.data.usage.lastSession).toDateString();
        
        if (today !== lastSessionDate) {
            this.data.usage.sessionsToday = 1;
        } else {
            this.data.usage.sessionsToday++;
        }
        
        this.data.usage.lastSession = new Date().toISOString();
        this.saveAnalyticsData();
    }

    // Record route calculation
    recordRoute(routeData) {
        this.data.routes.total++;
        
        if (routeData.success) {
            this.data.routes.successful++;
            this.data.routes.totalDistance += routeData.distance || 0;
            
            // Update accessibility level counts
            const score = routeData.accessibility_score || 0;
            if (score >= 80) {
                this.data.routes.byAccessibilityLevel.high++;
            } else if (score >= 60) {
                this.data.routes.byAccessibilityLevel.medium++;
            } else {
                this.data.routes.byAccessibilityLevel.low++;
            }
            
            // Update average accessibility
            this.data.routes.averageAccessibility = 
                (this.data.routes.averageAccessibility * (this.data.routes.successful - 1) + score) / 
                this.data.routes.successful;
        } else {
            this.data.routes.failed++;
        }
        
        this.saveAnalyticsData();
    }

    // Record obstacle report
    recordObstacleReport(type, severity) {
        this.data.obstacles.total++;
        this.data.obstacles.reported++;
        
        // Update by type
        this.data.obstacles.byType[type] = (this.data.obstacles.byType[type] || 0) + 1;
        
        // Update by severity
        this.data.obstacles.bySeverity[severity] = (this.data.obstacles.bySeverity[severity] || 0) + 1;
        
        this.saveAnalyticsData();
    }

    // Show analytics dashboard
    showDashboard() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>📊 Analytics Dashboard</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    ${this.renderDashboard()}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Initialize charts after modal is added to DOM
        setTimeout(() => {
            this.initializeCharts();
        }, 100);
    }

    // Render dashboard content
    renderDashboard() {
        return `
            <div class="analytics-dashboard">
                <!-- Overview Cards -->
                <div class="overview-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                    <div class="stat-card routes">
                        <div class="stat-icon">🗺️</div>
                        <div class="stat-value">${this.data.routes.total}</div>
                        <div class="stat-label">Routes Calculated</div>
                        <div class="stat-sublabel">${this.data.routes.successful} successful</div>
                    </div>
                    
                    <div class="stat-card obstacles">
                        <div class="stat-icon">🚧</div>
                        <div class="stat-value">${this.data.obstacles.reported}</div>
                        <div class="stat-label">Obstacles Reported</div>
                        <div class="stat-sublabel">${Object.keys(this.data.obstacles.byType).length} types</div>
                    </div>
                    
                    <div class="stat-card accessibility">
                        <div class="stat-icon">♿</div>
                        <div class="stat-value">${this.data.routes.averageAccessibility.toFixed(1)}</div>
                        <div class="stat-label">Avg. Accessibility</div>
                        <div class="stat-sublabel">Out of 100</div>
                    </div>
                    
                    <div class="stat-card sessions">
                        <div class="stat-icon">👤</div>
                        <div class="stat-value">${this.data.usage.totalSessions}</div>
                        <div class="stat-label">Total Sessions</div>
                        <div class="stat-sublabel">${this.data.usage.sessionsToday} today</div>
                    </div>
                </div>

                <!-- Charts Section -->
                <div class="charts-section">
                    <div class="chart-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
                        <!-- Accessibility Distribution Chart -->
                        <div class="chart-container">
                            <h4 style="color: var(--primary-blue); margin-bottom: 1rem;">Route Accessibility Distribution</h4>
                            <div id="accessibilityChart" class="chart-placeholder">
                                ${this.renderAccessibilityChart()}
                            </div>
                        </div>
                        
                        <!-- Obstacles by Type Chart -->
                        <div class="chart-container">
                            <h4 style="color: var(--primary-blue); margin-bottom: 1rem;">Obstacles by Type</h4>
                            <div id="obstaclesChart" class="chart-placeholder">
                                ${this.renderObstaclesChart()}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Severity Distribution -->
                    <div class="severity-distribution" style="margin: 2rem 0;">
                        <h4 style="color: var(--primary-blue); margin-bottom: 1rem;">Obstacle Severity Distribution</h4>
                        ${this.renderSeverityChart()}
                    </div>
                </div>

                <!-- Detailed Stats -->
                <div class="detailed-stats">
                    <h4 style="color: var(--primary-blue); margin-bottom: 1rem;">Detailed Statistics</h4>
                    
                    <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
                        <!-- Route Statistics -->
                        <div class="stats-section">
                            <h5 style="color: var(--darker-gray); margin-bottom: 0.5rem;">📍 Route Statistics</h5>
                            <ul style="list-style: none; padding: 0;">
                                <li style="padding: 0.25rem 0; border-bottom: 1px solid var(--light-gray);">
                                    Total Distance: <strong>${this.data.routes.totalDistance.toFixed(2)} km</strong>
                                </li>
                                <li style="padding: 0.25rem 0; border-bottom: 1px solid var(--light-gray);">
                                    Success Rate: <strong>${this.getSuccessRate()}%</strong>
                                </li>
                                <li style="padding: 0.25rem 0; border-bottom: 1px solid var(--light-gray);">
                                    High Accessibility: <strong>${this.data.routes.byAccessibilityLevel.high} routes</strong>
                                </li>
                                <li style="padding: 0.25rem 0;">
                                    Average Route Length: <strong>${this.getAverageRouteLength()} km</strong>
                                </li>
                            </ul>
                        </div>
                        
                        <!-- Usage Statistics -->
                        <div class="stats-section">
                            <h5 style="color: var(--darker-gray); margin-bottom: 0.5rem;">📱 Usage Statistics</h5>
                            <ul style="list-style: none; padding: 0;">
                                <li style="padding: 0.25rem 0; border-bottom: 1px solid var(--light-gray);">
                                    Last Session: <strong>${this.formatDate(this.data.usage.lastSession)}</strong>
                                </li>
                                <li style="padding: 0.25rem 0; border-bottom: 1px solid var(--light-gray);">
                                    Sessions Today: <strong>${this.data.usage.sessionsToday}</strong>
                                </li>
                                <li style="padding: 0.25rem 0;">
                                    Account Age: <strong>${this.getAccountAge()} days</strong>
                                </li>
                            </ul>
                        </div>
                        
                        <!-- Impact Statistics -->
                        <div class="stats-section">
                            <h5 style="color: var(--darker-gray); margin-bottom: 0.5rem;">🌟 Impact Statistics</h5>
                            <ul style="list-style: none; padding: 0;">
                                <li style="padding: 0.25rem 0; border-bottom: 1px solid var(--light-gray);">
                                    Accessibility Improved: <strong>${this.data.accessibility.routesOptimized} routes</strong>
                                </li>
                                <li style="padding: 0.25rem 0; border-bottom: 1px solid var(--light-gray);">
                                    Community Contributions: <strong>${this.data.obstacles.reported} reports</strong>
                                </li>
                                <li style="padding: 0.25rem 0;">
                                    Average Impact Score: <strong>${this.calculateImpactScore()}/100</strong>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Export Options -->
                <div class="export-section" style="margin-top: 2rem; padding-top: 2rem; border-top: 2px solid var(--light-gray);">
                    <h4 style="color: var(--primary-blue); margin-bottom: 1rem;">📤 Export Data</h4>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button class="secondary-btn" onclick="analytics.exportData('json')">
                            Export as JSON
                        </button>
                        <button class="secondary-btn" onclick="analytics.exportData('csv')">
                            Export as CSV
                        </button>
                        <button class="secondary-btn" onclick="analytics.resetData()">
                            Reset All Data
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Render accessibility chart
    renderAccessibilityChart() {
        const data = this.data.routes.byAccessibilityLevel;
        const total = data.high + data.medium + data.low;
        
        if (total === 0) {
            return '<div class="no-data">No route data available</div>';
        }

        const highPercent = (data.high / total) * 100;
        const mediumPercent = (data.medium / total) * 100;
        const lowPercent = (data.low / total) * 100;

        return `
            <div class="accessibility-bars">
                <div class="bar-item">
                    <div class="bar-label">High (80+)</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${highPercent}%; background: var(--success-green);"></div>
                    </div>
                    <div class="bar-value">${data.high} (${highPercent.toFixed(1)}%)</div>
                </div>
                <div class="bar-item">
                    <div class="bar-label">Medium (60-79)</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${mediumPercent}%; background: var(--warning-orange);"></div>
                    </div>
                    <div class="bar-value">${data.medium} (${mediumPercent.toFixed(1)}%)</div>
                </div>
                <div class="bar-item">
                    <div class="bar-label">Low (< 60)</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${lowPercent}%; background: var(--error-red);"></div>
                    </div>
                    <div class="bar-value">${data.low} (${lowPercent.toFixed(1)}%)</div>
                </div>
            </div>
        `;
    }

    // Render obstacles chart
    renderObstaclesChart() {
        const data = this.data.obstacles.byType;
        const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
        
        if (entries.length === 0) {
            return '<div class="no-data">No obstacle data available</div>';
        }

        const maxValue = Math.max(...entries.map(([, count]) => count));

        return `
            <div class="obstacles-bars">
                ${entries.map(([type, count]) => {
                    const percent = (count / maxValue) * 100;
                    return `
                        <div class="bar-item">
                            <div class="bar-label">${this.formatObstacleType(type)}</div>
                            <div class="bar-container">
                                <div class="bar-fill" style="width: ${percent}%; background: var(--primary-blue);"></div>
                            </div>
                            <div class="bar-value">${count}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Render severity chart
    renderSeverityChart() {
        const data = this.data.obstacles.bySeverity;
        const total = Object.values(data).reduce((sum, count) => sum + count, 0);
        
        if (total === 0) {
            return '<div class="no-data">No severity data available</div>';
        }

        const severityColors = {
            low: 'var(--success-green)',
            medium: 'var(--warning-orange)',
            high: 'var(--error-red)',
            critical: '#d32f2f'
        };

        return `
            <div class="severity-chart" style="display: flex; gap: 1rem; align-items: end; height: 200px; padding: 1rem; background: var(--light-gray); border-radius: var(--border-radius-lg);">
                ${Object.entries(data).map(([severity, count]) => {
                    const height = total > 0 ? (count / total) * 150 : 0;
                    return `
                        <div class="severity-bar" style="flex: 1; display: flex; flex-direction: column; align-items: center;">
                            <div class="bar-value" style="margin-bottom: 0.5rem; font-weight: bold; color: var(--darker-gray);">
                                ${count}
                            </div>
                            <div class="bar" style="width: 100%; height: ${height}px; background: ${severityColors[severity]}; border-radius: var(--border-radius-sm) var(--border-radius-sm) 0 0;"></div>
                            <div class="bar-label" style="margin-top: 0.5rem; font-size: var(--font-size-sm); color: var(--dark-gray); text-align: center;">
                                ${severity.charAt(0).toUpperCase() + severity.slice(1)}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Initialize charts
    initializeCharts() {
        // Add animations to bars
        const bars = document.querySelectorAll('.bar-fill, .bar');
        bars.forEach(bar => {
            const width = bar.style.width;
            const height = bar.style.height;
            bar.style.width = '0';
            bar.style.height = '0';
            
            setTimeout(() => {
                bar.style.transition = 'width 1s ease, height 1s ease';
                bar.style.width = width;
                bar.style.height = height;
            }, 100);
        });
    }

    // Format obstacle type
    formatObstacleType(type) {
        const types = {
            'construction': 'Construction',
            'pothole': 'Potholes',
            'blocked_sidewalk': 'Blocked Paths',
            'steep_slope': 'Steep Slopes',
            'no_curb_cut': 'No Curb Cuts',
            'debris': 'Debris',
            'flooding': 'Flooding',
            'poor_lighting': 'Poor Lighting',
            'broken_infrastructure': 'Broken Infrastructure',
            'other': 'Other'
        };
        return types[type] || type;
    }

    // Calculate success rate
    getSuccessRate() {
        const total = this.data.routes.total;
        return total > 0 ? ((this.data.routes.successful / total) * 100).toFixed(1) : 0;
    }

    // Get average route length
    getAverageRouteLength() {
        const successful = this.data.routes.successful;
        return successful > 0 ? (this.data.routes.totalDistance / successful).toFixed(2) : 0;
    }

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    // Get account age
    getAccountAge() {
        const firstSession = localStorage.getItem('aura_first_session');
        if (!firstSession) {
            localStorage.setItem('aura_first_session', new Date().toISOString());
            return 0;
        }
        
        const daysDiff = Math.floor((new Date() - new Date(firstSession)) / (1000 * 60 * 60 * 24));
        return daysDiff;
    }

    // Calculate impact score
    calculateImpactScore() {
        const routes = this.data.routes.successful;
        const obstacles = this.data.obstacles.reported;
        const avgAccessibility = this.data.routes.averageAccessibility;
        
        // Weight different factors
        const routeScore = Math.min(routes * 5, 40); // Max 40 points for routes
        const obstacleScore = Math.min(obstacles * 10, 30); // Max 30 points for obstacle reports
        const accessibilityScore = Math.min(avgAccessibility * 0.3, 30); // Max 30 points for accessibility
        
        return Math.round(routeScore + obstacleScore + accessibilityScore);
    }

    // Export data
    exportData(format) {
        try {
            if (format === 'json') {
                const blob = new Blob([JSON.stringify(this.data, null, 2)], {
                    type: 'application/json'
                });
                this.downloadFile(blob, `aura-analytics-${Date.now()}.json`);
            } else if (format === 'csv') {
                const csv = this.convertToCSV();
                const blob = new Blob([csv], {
                    type: 'text/csv'
                });
                this.downloadFile(blob, `aura-analytics-${Date.now()}.csv`);
            }
            
            this.showNotification('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Failed to export data', 'error');
        }
    }

    // Convert data to CSV format
    convertToCSV() {
        const lines = [];
        
        // Routes data
        lines.push('Routes Data');
        lines.push('Metric,Value');
        lines.push(`Total Routes,${this.data.routes.total}`);
        lines.push(`Successful Routes,${this.data.routes.successful}`);
        lines.push(`Failed Routes,${this.data.routes.failed}`);
        lines.push(`Total Distance,${this.data.routes.totalDistance}`);
        lines.push(`Average Accessibility,${this.data.routes.averageAccessibility}`);
        lines.push('');
        
        // Obstacles data
        lines.push('Obstacles Data');
        lines.push('Type,Count');
        Object.entries(this.data.obstacles.byType).forEach(([type, count]) => {
            lines.push(`${type},${count}`);
        });
        lines.push('');
        
        return lines.join('\n');
    }

    // Download file
    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Reset all data
    resetData() {
        if (confirm('Are you sure you want to reset all analytics data? This action cannot be undone.')) {
            this.data = this.getDefaultData();
            this.saveAnalyticsData();
            
            // Refresh dashboard if open
            const dashboard = document.querySelector('.analytics-dashboard');
            if (dashboard) {
                dashboard.innerHTML = this.renderDashboard();
                setTimeout(() => this.initializeCharts(), 100);
            }
            
            this.showNotification('Analytics data reset successfully!', 'success');
        }
    }

    // Save analytics data
    saveAnalyticsData() {
        try {
            localStorage.setItem('aura_analytics', JSON.stringify(this.data));
        } catch (error) {
            console.error('Error saving analytics data:', error);
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
        }, 4000);
    }
}

// Add styles for analytics components
const analyticsStyles = document.createElement('style');
analyticsStyles.textContent = `
    .stat-card {
        background: var(--white);
        border-radius: var(--border-radius-lg);
        padding: 1.5rem;
        text-align: center;
        box-shadow: var(--shadow-sm);
        transition: transform var(--transition-base);
    }
    
    .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }
    
    .stat-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
    }
    
    .stat-value {
        font-size: 2rem;
        font-weight: bold;
        color: var(--primary-blue);
        margin-bottom: 0.25rem;
    }
    
    .stat-label {
        color: var(--darker-gray);
        font-weight: 600;
        margin-bottom: 0.25rem;
    }
    
    .stat-sublabel {
        color: var(--dark-gray);
        font-size: var(--font-size-sm);
    }
    
    .chart-container {
        background: var(--white);
        border-radius: var(--border-radius-lg);
        padding: 1.5rem;
        box-shadow: var(--shadow-sm);
    }
    
    .bar-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 0.75rem;
    }
    
    .bar-label {
        min-width: 120px;
        font-size: var(--font-size-sm);
        color: var(--darker-gray);
        font-weight: 600;
    }
    
    .bar-container {
        flex: 1;
        height: 20px;
        background: var(--light-gray);
        border-radius: var(--border-radius-sm);
        overflow: hidden;
    }
    
    .bar-fill {
        height: 100%;
        border-radius: var(--border-radius-sm);
        transition: width 1s ease;
    }
    
    .bar-value {
        min-width: 80px;
        text-align: right;
        font-size: var(--font-size-sm);
        color: var(--darker-gray);
        font-weight: 600;
    }
    
    .no-data {
        text-align: center;
        color: var(--dark-gray);
        padding: 2rem;
        font-style: italic;
    }
    
    .stats-section {
        background: var(--white);
        border-radius: var(--border-radius-lg);
        padding: 1.5rem;
        box-shadow: var(--shadow-sm);
    }
`;

document.head.appendChild(analyticsStyles);

// Export the Analytics class
window.Analytics = Analytics;
