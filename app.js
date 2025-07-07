// js/app.js - Hlavní aplikační logika s integrací moderního kalendáře
class CRMApp {
    constructor() {
        this.currentUser = null;
        this.refreshInterval = null;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.apiBase = 'api';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuthStatus();
        this.setupInitialData();
    }

    setupEventListeners() {
        // Auto-refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && this.currentUser) {
                this.loadDashboardData();
            }
        }, 30000);

        // Page visibility change - refresh when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.currentUser) {
                this.loadDashboardData();
            }
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshDashboard();
                        break;
                    case 'n':
                        e.preventDefault();
                        if (document.getElementById('calendar').classList.contains('active')) {
                            this.showNewSlotModal();
                        }
                        break;
                }
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });

        // Initialize sidebar navigation
        this.setupSidebarNavigation();
    }

    setupSidebarNavigation() {
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active from all links
                document.querySelectorAll('.sidebar-menu a').forEach(l => l.classList.remove('active'));
                
                // Add active to clicked link
                link.classList.add('active');
                
                // Get section from onclick attribute
                const onclick = link.getAttribute('onclick');
                if (onclick) {
                    const sectionMatch = onclick.match(/showSection\('([^']+)'\)/);
                    if (sectionMatch) {
                        this.showSection(sectionMatch[1]);
                    }
                }
            });
        });
    }

    async setupInitialData() {
        // Setup forms after auth check
        setTimeout(() => {
            this.loadWarehousesForForms();
            this.setupFormHandlers();
            this.setDefaultFormValues();
        }, 1000);
    }

    async checkAuthStatus() {
        try {
            console.log('Checking auth status...');
            
            const response = await fetch(this.apiBase + '/session.php', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    try {
                        const data = JSON.parse(text);
                        if (data.success && data.user) {
                            this.currentUser = data.user;
                            this.showMainContent();
                            await this.loadDashboardData();
                            this.setupCalendarIntegration();
                            return;
                        }
                    } catch (jsonError) {
                        console.error('Session JSON parse error:', jsonError);
                    }
                }
            }
            
            this.showLoginScreen();
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLoginScreen();
        }
    }

    setupCalendarIntegration() {
        // Wait for calendar to be initialized and integrate
        setTimeout(() => {
            if (window.logisticsCalendar) {
                // Link calendar with main app notifications
                window.logisticsCalendar.showSuccess = (message) => {
                    this.showNotification(message, 'success');
                };
                
                window.logisticsCalendar.showError = (message) => {
                    this.showNotification(message, 'error');
                };

                // Enhanced slot editing integration
                window.logisticsCalendar.editSlot = (slotId) => {
                    this.editSlot(slotId);
                };

                console.log('✅ Calendar integration completed');
            }
        }, 500);
    }

    showMainContent() {
        document.getElementById('loginContainer').style.display = 'none';
        const registerContainer = document.getElementById('registerContainer');
        if (registerContainer) {
            registerContainer.style.display = 'none';
        }
        document.getElementById('mainContent').style.display = 'block';
        
        this.updateUserInfo();
        this.setupAdminVisibility();
    }

    showLoginScreen() {
        document.getElementById('loginContainer').style.display = 'flex';
        const registerContainer = document.getElementById('registerContainer');
        if (registerContainer) {
            registerContainer.style.display = 'none';
        }
        document.getElementById('mainContent').style.display = 'none';
    }

    updateUserInfo() {
        if (!this.currentUser) return;
        
        const elements = {
            userName: this.currentUser.full_name,
            userAvatar: this.currentUser.full_name.charAt(0).toUpperCase(),
            userRole: this.getUserRoleText(this.currentUser.user_type)
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    setupAdminVisibility() {
        const adminElements = document.querySelectorAll('.admin-only');
        const isAdmin = this.currentUser && ['admin', 'logistics', 'super_admin'].includes(this.currentUser.user_type);
        
        adminElements.forEach(el => {
            el.style.display = isAdmin ? 'block' : 'none';
        });
    }

    getUserRoleText(userType) {
        const roles = {
            'super_admin': 'Super Admin',
            'admin': 'Administrátor',
            'logistics': 'Logistika',
            'driver': 'Řidič'
        };
        return roles[userType] || 'Uživatel';
    }

    // Enhanced section navigation with calendar integration
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show selected section
        const section = document.getElementById(sectionName);
        if (section) {
            section.classList.add('active');
            this.loadSectionData(sectionName);
        }
    }

    async loadSectionData(sectionName) {
        switch(sectionName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'calendar':
                // Initialize calendar after section becomes visible
                setTimeout(() => {
                    if (window.logisticsCalendar) {
                        window.logisticsCalendar.generateWeeklyCalendar();
                        window.logisticsCalendar.loadSlots();
                    }
                }, 100);
                break;
            case 'bookings':
                await this.loadAllBookings();
                break;
            case 'slots':
                await this.loadAllSlots();
                break;
            case 'warehouses':
                await this.loadAllWarehouses();
                break;
            case 'users':
                await this.loadAllUsers();
                break;
        }
    }

    // Dashboard Data Management
    async loadDashboardData() {
        try {
            // Load dashboard statistics
            const statsResponse = await fetch(`${this.apiBase}/bookings.php?dashboard_stats=1`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            
            if (statsResponse.ok) {
                const text = await statsResponse.text();
                if (text) {
                    const statsData = JSON.parse(text);
                    if (statsData.success) {
                        this.updateDashboardStats(statsData.stats);
                    }
                }
            }

            // Load upcoming bookings
            const upcomingResponse = await fetch(`${this.apiBase}/bookings.php?upcoming=1&limit=5`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            
            if (upcomingResponse.ok) {
                const text = await upcomingResponse.text();
                if (text) {
                    const upcomingData = JSON.parse(text);
                    if (upcomingData.success) {
                        this.updateUpcomingBookings(upcomingData.bookings);
                    }
                }
            }

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showNotification('Chyba při načítání dat dashboardu', 'error');
        }
    }

    updateDashboardStats(stats) {
        const elements = {
            pendingBookings: stats.pending || 0,
            confirmedBookings: stats.confirmed || 0,
            inProgressBookings: stats.in_progress || 0,
            completedToday: stats.completed_today || 0,
            bookingsBadge: (stats.pending + stats.confirmed) || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateUpcomingBookings(bookings) {
        const container = document.getElementById('upcomingBookingsList');
        if (!container) return;

        if (bookings.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b;">Žádné nadcházející rezervace</div>';
            return;
        }

        container.innerHTML = bookings.map(booking => this.createBookingCard(booking)).join('');
    }

    createBookingCard(booking) {
        const statusClass = this.getStatusClass(booking.booking_status);
        const statusText = this.getStatusText(booking.booking_status);
        const dateTime = new Date(`${booking.slot_date} ${booking.slot_time}`);
        const isToday = this.isDateToday(dateTime);
        const isTomorrow = this.isDateTomorrow(dateTime);
        
        let dateLabel = dateTime.toLocaleDateString('cs-CZ');
        if (isToday) dateLabel = 'DNES';
        else if (isTomorrow) dateLabel = 'ZÍTRA';

        return `
            <div class="booking-item" onclick="crmApp.viewBookingDetail(${booking.id})">
                <div class="booking-time">
                    <div class="booking-date">${dateLabel}</div>
                    <div class="booking-hour">${booking.slot_time.substring(0, 5)}</div>
                </div>
                <div class="booking-details">
                    <div class="booking-title">${booking.warehouse_name}</div>
                    <div class="booking-subtitle">
                        <span><i class="fas fa-truck"></i> ${booking.truck_license_plate}</span>
                        <span><i class="fas fa-user"></i> ${booking.driver_name}</span>
                        ${booking.cargo_weight ? `<span><i class="fas fa-weight-hanging"></i> ${(booking.cargo_weight/1000).toFixed(1)}t</span>` : ''}
                    </div>
                </div>
                <div class="booking-status ${statusClass}">${statusText}</div>
                <div class="booking-actions">
                    ${this.getBookingActions(booking)}
                </div>
            </div>
        `;
    }

    getBookingActions(booking) {
        if (!this.currentUser || this.currentUser.user_type === 'driver') return '';
        
        const actions = [];
        
        switch (booking.booking_status) {
            case 'pending':
                actions.push(`
                    <button class="btn btn-small btn-success" onclick="event.stopPropagation(); confirmBooking(${booking.id})">
                        <i class="fas fa-check"></i> Potvrdit
                    </button>
                    <button class="btn btn-small btn-danger" onclick="event.stopPropagation(); rejectBooking(${booking.id})">
                        <i class="fas fa-times"></i> Zamítnout
                    </button>
                `);
                break;
            case 'confirmed':
                actions.push(`
                    <button class="btn btn-small btn-success" onclick="event.stopPropagation(); startBooking(${booking.id})">
                        <i class="fas fa-play"></i> Začít
                    </button>
                `);
                break;
            case 'in_progress':
                actions.push(`
                    <button class="btn btn-small btn-warning" onclick="event.stopPropagation(); completeBooking(${booking.id})">
                        <i class="fas fa-flag-checkered"></i> Dokončit
                    </button>
                `);
                break;
        }
        
        return actions.join('');
    }

    // Notification System
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationsContainer');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: auto;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || 'fa-info-circle';
    }

    // Modal Management
    showModal(modalId, data = null) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            if (data) {
                this.populateModalData(modalId, data);
            }
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    }

    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        
        // Close calendar modal if exists
        if (window.logisticsCalendar) {
            window.logisticsCalendar.closeBookingModal();
        }
    }

    populateModalData(modalId, data) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        Object.entries(data).forEach(([key, value]) => {
            const input = modal.querySelector(`[name="${key}"], #${key}`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = value;
                } else {
                    input.value = value;
                }
            }
        });
    }

    // Slot Management
    showNewSlotModal() {
        if (window.logisticsCalendar) {
            window.logisticsCalendar.showBookingModal();
        } else {
            this.showModal('slotModal');
        }
    }

    async editSlot(slotId) {
        try {
            const response = await fetch(`${this.apiBase}/slots.php?id=${slotId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.showModal('editSlotModal', data.slot);
                } else {
                    this.showNotification('Chyba při načítání slotu', 'error');
                }
            }
        } catch (error) {
            this.showNotification('Chyba při načítání slotu: ' + error.message, 'error');
        }
    }

    async deleteSlot(slotId) {
        if (!confirm('Opravdu smazat tento slot?')) return;

        try {
            const response = await fetch(`${this.apiBase}/slots.php`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ slot_id: slotId })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showNotification('Slot byl smazán', 'success');
                this.refreshAfterSlotAction();
            } else {
                throw new Error(result.error || 'Chyba při mazání slotu');
            }
        } catch (error) {
            this.showNotification('Chyba při mazání: ' + error.message, 'error');
        }
    }

    // Refresh methods
    refreshAfterSlotAction() {
        // Refresh calendar if visible
        if (document.getElementById('calendar').classList.contains('active') && window.logisticsCalendar) {
            window.logisticsCalendar.refresh();
        }
        
        // Refresh slots table if visible
        if (document.getElementById('slots').classList.contains('active')) {
            this.loadAllSlots();
        }
        
        // Refresh dashboard
        if (document.getElementById('dashboard').classList.contains('active')) {
            this.loadDashboardData();
        }
    }

    refreshDashboard() {
        this.loadDashboardData();
        this.showNotification('Dashboard byl obnoven', 'success');
    }

    // Form setup and handling
    setupFormHandlers() {
        // Set up form submission handlers here if needed
        this.setupUserTypeHandlers();
    }

    setupUserTypeHandlers() {
        const userTypeSelect = document.getElementById('user_type');
        if (userTypeSelect) {
            userTypeSelect.addEventListener('change', (e) => {
                const driverFields = document.getElementById('userDriverFields');
                if (driverFields) {
                    driverFields.style.display = e.target.value === 'driver' ? 'block' : 'none';
                }
            });
        }
        
        const editUserTypeSelect = document.getElementById('edit_user_type');
        if (editUserTypeSelect) {
            editUserTypeSelect.addEventListener('change', (e) => {
                const driverFields = document.getElementById('editUserDriverFields');
                if (driverFields) {
                    driverFields.style.display = e.target.value === 'driver' ? 'block' : 'none';
                }
            });
        }
    }

    setDefaultFormValues() {
        const today = new Date().toISOString().split('T')[0];
        const slotDateInput = document.getElementById('slot_date');
        if (slotDateInput) {
            slotDateInput.value = today;
        }
    }

    async loadWarehousesForForms() {
        try {
            const response = await fetch(`${this.apiBase}/warehouses.php`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success) {
                        const selectors = [
                            'booking_warehouse',
                            'slot_warehouse', 
                            'edit_slot_warehouse',
                            'edit_booking_warehouse'
                        ];
                        
                        selectors.forEach(selectId => {
                            const select = document.getElementById(selectId);
                            if (select) {
                                const currentValue = select.value;
                                select.innerHTML = '<option value="">Vyberte sklad</option>';
                                
                                data.warehouses.forEach(warehouse => {
                                    const option = document.createElement('option');
                                    option.value = warehouse.id;
                                    option.textContent = warehouse.name;
                                    select.appendChild(option);
                                });
                                
                                if (currentValue) {
                                    select.value = currentValue;
                                }
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load warehouses:', error);
        }
    }

    // Data loading methods
    async loadAllBookings() {
        // Implementation for loading all bookings
        console.log('Loading all bookings...');
    }

    async loadAllSlots() {
        // Implementation for loading all slots
        console.log('Loading all slots...');
    }

    async loadAllWarehouses() {
        // Implementation for loading all warehouses
        console.log('Loading all warehouses...');
    }

    async loadAllUsers() {
        // Implementation for loading all users
        console.log('Loading all users...');
    }

    // Utility methods
    getStatusClass(status) {
        const classes = {
            pending: 'status-pending',
            confirmed: 'status-confirmed',
            in_progress: 'status-in-progress',
            completed: 'status-completed',
            cancelled: 'status-cancelled'
        };
        return classes[status] || 'status-pending';
    }

    getStatusText(status) {
        const texts = {
            pending: 'Čeká na potvrzení',
            confirmed: 'Potvrzeno',
            in_progress: 'Probíhá',
            completed: 'Dokončeno',
            cancelled: 'Zrušeno'
        };
        return texts[status] || 'Neznámý';
    }

    isDateToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    isDateTomorrow(date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return date.toDateString() === tomorrow.toDateString();
    }

    // Quick actions
    createNewSlot() {
        this.showSection('calendar');
        setTimeout(() => this.showNewSlotModal(), 200);
    }

    addUser() {
        this.showSection('users');
        setTimeout(() => this.showModal('addUserModal'), 200);
    }

    exportData() {
        this.showNotification('Export funkcionalita bude brzy k dispozici', 'info');
    }

    viewBookingDetail(bookingId) {
        console.log('Viewing booking detail:', bookingId);
        // Implementation for viewing booking details
    }

    editBooking(bookingId) {
        console.log('Editing booking:', bookingId);
        // Implementation for editing booking
    }
}

// Global functions for backward compatibility and HTML onclick handlers
function showSection(sectionName) {
    if (window.crmApp) {
        window.crmApp.showSection(sectionName);
    }
}

function logout() {
    if (confirm('Opravdu se chcete odhlásit?')) {
        window.location.href = 'logout.php';
    }
}

function refreshDashboard() {
    if (window.crmApp) {
        window.crmApp.refreshDashboard();
    }
}

function refreshCalendar() {
    if (window.logisticsCalendar) {
        window.logisticsCalendar.refresh();
        window.crmApp?.showNotification('Kalendář byl obnoven', 'success');
    }
}

function createNewSlot() {
    if (window.crmApp) {
        window.crmApp.createNewSlot();
    }
}

function addUser() {
    if (window.crmApp) {
        window.crmApp.addUser();
    }
}

function exportData() {
    if (window.crmApp) {
        window.crmApp.exportData();
    }
}

function showNewSlotModal() {
    if (window.crmApp) {
        window.crmApp.showNewSlotModal();
    }
}

function closeModal(modalId) {
    if (window.crmApp) {
        window.crmApp.closeModal(modalId);
    }
}

function showAddUserModal() {
    if (window.crmApp) {
        window.crmApp.showModal('addUserModal');
    }
}

function showAddWarehouseModal() {
    if (window.crmApp) {
        window.crmApp.showModal('addWarehouseModal');
    }
}

function editSlot(id) {
    if (window.crmApp) {
        window.crmApp.editSlot(id);
    }
}

function deleteSlot(id) {
    if (window.crmApp) {
        window.crmApp.deleteSlot(id);
    }
}

function viewBookingDetail(id) {
    if (window.crmApp) {
        window.crmApp.viewBookingDetail(id);
    }
}

function editBooking(id) {
    if (window.crmApp) {
        window.crmApp.editBooking(id);
    }
}

function toggleNotifications() {
    console.log('Toggle notifications - functionality to be implemented');
}

// Booking action functions
function confirmBooking(id) {
    console.log('Confirming booking:', id);
    if (window.bookingManager) {
        window.bookingManager.confirmBooking(id);
    }
}

function rejectBooking(id) {
    console.log('Rejecting booking:', id);
    if (window.bookingManager) {
        window.bookingManager.rejectBooking(id);
    }
}

function startBooking(id) {
    console.log('Starting booking:', id);
    if (window.bookingManager) {
        window.bookingManager.startBooking(id);
    }
}

function completeBooking(id) {
    console.log('Completing booking:', id);
    if (window.bookingManager) {
        window.bookingManager.completeBooking(id);
    }
}

// Filter functions
function filterBookings(status) {
    if (window.bookingManager) {
        window.bookingManager.filterBookings(status);
    }
}

function filterSlotsByDate(date) {
    const rows = document.querySelectorAll('#slotsTableBody tr');
    
    rows.forEach(row => {
        if (!date) {
            row.style.display = '';
        } else {
            const dateCell = row.cells[0];
            if (dateCell && dateCell.textContent.includes(date)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// Initialize application
let crmApp;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing CRM Application...');
    
    // Initialize main CRM app
    crmApp = new CRMApp();
    
    // Make globally available
    window.crmApp = crmApp;
    
    console.log('✅ CRM Application initialized successfully');
});

// Global reference for other scripts
window.crmApp = crmApp;