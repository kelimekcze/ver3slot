// js/app.js - Hlavní aplikace CRM Time Slots (OPRAVENO PRO VAŠI STRUKTURU)
class CRMApp {
    constructor() {
        this.currentUser = null;
        this.refreshInterval = null;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.apiBase = this.getApiBasePath();
        
        this.init();
    }

    // Get API base path - OPRAVENO pro vaši strukturu adresářů
    getApiBasePath() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/js/')) {
            return '../api';
        }
        return 'api';
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuthStatus();
        this.setupAutoRefresh();
    }

    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Navigation buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-btn')) {
                e.preventDefault();
                const section = e.target.dataset.section;
                if (section) {
                    this.showSection(section);
                }
            }
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Handle notifications close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('notification-close')) {
                e.target.parentElement.remove();
            }
        });
    }

    async checkAuthStatus() {
        try {
            const response = await fetch(this.apiBase + '/session.php', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.user) {
                    this.currentUser = data.user;
                    this.showMainContent();
                    await this.loadDashboardData();
                    return;
                }
            }
        } catch (error) {
            console.error('Session check failed:', error);
        }
        
        this.showLoginScreen();
    }

    showLoginScreen() {
        document.body.className = 'login-page';
        
        const mainContainer = document.getElementById('mainContainer');
        const loginContainer = document.getElementById('loginContainer');
        
        if (mainContainer) mainContainer.style.display = 'none';
        if (loginContainer) loginContainer.style.display = 'flex';
        
        // Clear any refresh intervals
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    showMainContent() {
        document.body.className = 'main-page';
        
        const mainContainer = document.getElementById('mainContainer');
        const loginContainer = document.getElementById('loginContainer');
        const registerContainer = document.getElementById('registerContainer');
        
        if (loginContainer) loginContainer.style.display = 'none';
        if (registerContainer) registerContainer.style.display = 'none';
        if (mainContainer) mainContainer.style.display = 'block';
        
        this.updateUserInfo();
        this.showSection('dashboard');
        this.setupAutoRefresh();
    }

    updateUserInfo() {
        if (!this.currentUser) return;
        
        const userNameElement = document.getElementById('userName');
        const userTypeElement = document.getElementById('userType');
        
        if (userNameElement) {
            userNameElement.textContent = this.currentUser.full_name || this.currentUser.username;
        }
        
        if (userTypeElement) {
            const typeLabels = {
                'super_admin': 'Super Admin',
                'admin': 'Administrator',
                'logistics': 'Logistika',
                'driver': 'Řidič'
            };
            userTypeElement.textContent = typeLabels[this.currentUser.user_type] || this.currentUser.user_type;
        }
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => section.style.display = 'none');
        
        // Remove active class from all nav buttons
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => btn.classList.remove('active'));
        
        // Show selected section
        const targetSection = document.getElementById(`${sectionName}Section`);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
        
        // Add active class to current nav button
        const activeNavBtn = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNavBtn) {
            activeNavBtn.classList.add('active');
        }
        
        // Load section specific data
        this.loadSectionData(sectionName);
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'calendar':
                if (window.logisticsCalendar) {
                    window.logisticsCalendar.refresh();
                }
                break;
            case 'bookings':
                if (window.bookingManager) {
                    window.bookingManager.refresh();
                }
                break;
        }
    }

    async loadDashboardData() {
        try {
            // Load dashboard stats
            const statsResponse = await fetch(`${this.apiBase}/bookings.php?dashboard_stats=1`, {
                credentials: 'include'
            });
            
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                if (statsData.success) {
                    this.updateDashboardStats(statsData.stats);
                }
            }

            // Load upcoming bookings
            const upcomingResponse = await fetch(`${this.apiBase}/bookings.php?upcoming=1&limit=5`, {
                credentials: 'include'
            });
            
            if (upcomingResponse.ok) {
                const upcomingData = await upcomingResponse.json();
                if (upcomingData.success) {
                    this.updateUpcomingBookings(upcomingData.bookings);
                }
            }

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showNotification('Chyba při načítání dashboardu', 'error');
        }
    }

    updateDashboardStats(stats) {
        const elements = {
            'pending': document.getElementById('statPending'),
            'confirmed': document.getElementById('statConfirmed'),
            'in_progress': document.getElementById('statInProgress'),
            'completed_today': document.getElementById('statCompletedToday')
        };

        Object.entries(elements).forEach(([key, element]) => {
            if (element && stats[key] !== undefined) {
                element.textContent = stats[key];
            }
        });
    }

    updateUpcomingBookings(bookings) {
        const container = document.getElementById('upcomingBookings');
        if (!container) return;

        if (!bookings || bookings.length === 0) {
            container.innerHTML = '<p class="no-data">Žádné nadcházející rezervace</p>';
            return;
        }

        container.innerHTML = bookings.map(booking => `
            <div class="booking-item">
                <div class="booking-time">
                    ${this.formatDateTime(booking.slot_date, booking.slot_time)}
                </div>
                <div class="booking-details">
                    <strong>${booking.warehouse_name}</strong><br>
                    ${booking.cargo_type || 'Nespecifikováno'}<br>
                    <span class="status status-${booking.booking_status}">${this.getStatusLabel(booking.booking_status)}</span>
                </div>
            </div>
        `).join('');
    }

    formatDateTime(date, time) {
        const d = new Date(date + 'T' + time);
        return d.toLocaleDateString('cs-CZ') + ' ' + d.toLocaleTimeString('cs-CZ', {hour: '2-digit', minute: '2-digit'});
    }

    getStatusLabel(status) {
        const labels = {
            'pending': 'Čeká na potvrzení',
            'confirmed': 'Potvrzeno',
            'in_progress': 'Probíhá',
            'completed': 'Dokončeno',
            'cancelled': 'Zrušeno'
        };
        return labels[status] || status;
    }

    setupAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Refresh every 5 minutes
        this.refreshInterval = setInterval(() => {
            if (this.currentUser) {
                this.loadDashboardData();
            }
        }, 300000);
    }

    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display !== 'none') {
                modal.style.display = 'none';
            }
        });
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer') || this.createNotificationContainer();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">×</button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    async handleLogout() {
        if (window.authManager) {
            await window.authManager.logout();
        } else {
            // Fallback logout
            if (confirm('Opravdu se chcete odhlásit?')) {
                try {
                    await fetch(this.apiBase + '/logout.php', {
                        method: 'POST',
                        credentials: 'include'
                    });
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    this.currentUser = null;
                    this.showLoginScreen();
                    this.showNotification('Úspěšně odhlášen', 'success');
                }
            }
        }
    }

    // Slot management methods
    async deleteSlot(slotId) {
        if (!confirm('Opravdu chcete smazat tento slot?')) return;
        
        try {
            const response = await fetch(`${this.apiBase}/slots.php?id=${slotId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showNotification('Slot byl úspěšně smazán', 'success');
                    this.refreshCurrentView();
                } else {
                    throw new Error(data.error || 'Chyba při mazání slotu');
                }
            } else {
                throw new Error('Chyba serveru');
            }
        } catch (error) {
            console.error('Delete slot error:', error);
            this.showNotification('Chyba při mazání slotu: ' + error.message, 'error');
        }
    }

    async createSlot(slotData) {
        try {
            const response = await fetch(`${this.apiBase}/slots.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(slotData)
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showNotification('Slot byl úspěšně vytvořen', 'success');
                    this.refreshCurrentView();
                    return data.slot;
                } else {
                    throw new Error(data.error || 'Chyba při vytváření slotu');
                }
            } else {
                throw new Error('Chyba serveru');
            }
        } catch (error) {
            console.error('Create slot error:', error);
            this.showNotification('Chyba při vytváření slotu: ' + error.message, 'error');
            throw error;
        }
    }

    async loadWarehouses() {
        try {
            const response = await fetch(`${this.apiBase}/warehouses.php`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return data.warehouses;
                }
            }
            
            throw new Error('Chyba při načítání skladů');
        } catch (error) {
            console.error('Load warehouses error:', error);
            this.showNotification('Chyba při načítání skladů: ' + error.message, 'error');
            return [];
        }
    }

    refreshCurrentView() {
        // Refresh calendar if visible
        if (window.logisticsCalendar) {
            window.logisticsCalendar.refresh();
        }
        
        // Refresh bookings if visible
        if (window.bookingManager) {
            window.bookingManager.refresh();
        }
        
        // Refresh dashboard
        this.loadDashboardData();
    }

    // Utility methods
    formatDate(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleDateString('cs-CZ');
    }

    formatTime(time) {
        if (typeof time === 'string' && time.includes(':')) {
            return time.substring(0, 5);
        }
        return time;
    }

    isToday(date) {
        const today = new Date();
        const checkDate = new Date(date);
        return checkDate.toDateString() === today.toDateString();
    }
}

// Global logout function - OPRAVENO pro vaši strukturu
function logout() {
    if (confirm('Opravdu se chcete odhlásit?')) {
        // Determine API base path
        const currentPath = window.location.pathname;
        const apiBase = currentPath.includes('/js/') ? '../api' : 'api';
        window.location.href = apiBase + '/logout.php';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializace CRM aplikace...');
    window.crmApp = new CRMApp();
    
    // Initialize other components
    if (typeof initLogisticsCalendar === 'function') {
        initLogisticsCalendar();
    }
    
    console.log('✅ CRM aplikace inicializována');
});

// Make CRMApp globally available
window.CRMApp = CRMApp;