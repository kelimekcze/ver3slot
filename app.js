// js/app.js - Hlavní aplikační logika s integrací kalendáře
class CRMApp {
    constructor() {
        this.currentUser = null;
        this.refreshInterval = null;
        this.currentDate = new Date();
        this.selectedDate = null;
        // Opravená cesta k API - používáme relativní cestu
        this.apiBase = 'api';
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkAuthStatus();
        this.setupCalendarIntegration();
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

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshDashboard();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.createNewSlot();
                        break;
                }
            }
        });

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    }

    // Setup calendar integration
    setupCalendarIntegration() {
        // Setup warehouse selector for calendar
        const warehouseSelector = document.getElementById('warehouseSelector');
        if (warehouseSelector) {
            this.loadWarehousesForSelector();
        }

        // Setup calendar container
        this.setupCalendarContainer();
    }

    // Setup calendar container HTML
    setupCalendarContainer() {
        const calendarSection = document.getElementById('calendar');
        if (calendarSection) {
            const contentBody = calendarSection.querySelector('.content-body');
            if (contentBody && !document.getElementById('calendarContainer')) {
                contentBody.innerHTML = `
                    <div class="calendar-controls">
                        <div class="view-toggle">
                            <button class="view-btn active" data-view="week">Týden</button>
                            <button class="view-btn" data-view="day">Den</button>
                        </div>
                        <select id="warehouseSelector" class="warehouse-selector">
                            <option value="">Všechny sklady</option>
                        </select>
                        <button class="btn btn-small" onclick="crmApp.showNewSlotModal()">
                            <i class="fas fa-plus"></i> Nový slot
                        </button>
                    </div>
                    <div id="calendarContainer"></div>
                `;
            }
        }
    }

    // Load warehouses for selector
    async loadWarehousesForSelector() {
        try {
            const response = await fetch(`${this.apiBase}/warehouses.php`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success) {
                        const selector = document.getElementById('warehouseSelector');
                        if (selector) {
                            // Keep "All warehouses" option
                            const currentValue = selector.value;
                            selector.innerHTML = '<option value="">Všechny sklady</option>';
                            
                            data.warehouses.forEach(warehouse => {
                                const option = document.createElement('option');
                                option.value = warehouse.id;
                                option.textContent = warehouse.name;
                                selector.appendChild(option);
                            });
                            
                            // Restore selected value
                            if (currentValue) {
                                selector.value = currentValue;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load warehouses for selector:', error);
        }
    }

    async checkAuthStatus() {
        try {
            console.log('Checking auth status with:', this.apiBase + '/session.php');
            
            // Try to get current user from session
            const response = await fetch(this.apiBase + '/session.php', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log('Session response status:', response.status);
            
            if (response.ok) {
                const text = await response.text();
                console.log('Session response text:', text);
                
                if (text) {
                    try {
                        const data = JSON.parse(text);
                        if (data.success && data.user) {
                            this.currentUser = data.user;
                            this.showMainContent();
                            await this.loadDashboardData();
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

    showMainContent() {
        document.getElementById('loginContainer').style.display = 'none';
        const registerContainer = document.getElementById('registerContainer');
        if (registerContainer) {
            registerContainer.style.display = 'none';
        }
        document.getElementById('mainContent').style.display = 'block';
        
        this.updateUserInfo();
        this.setupAdminVisibility();
        this.setupCalendarIntegration(); // Setup calendar after showing main content
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

    // Navigation with calendar integration
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active class from all menu items
        document.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected section
        const section = document.getElementById(sectionName);
        if (section) {
            section.classList.add('active');
            
            // Load section-specific data
            this.loadSectionData(sectionName);
        }
        
        // Add active class to clicked menu item
        if (event && event.target) {
            event.target.classList.add('active');
        }
    }

    async loadSectionData(sectionName) {
        switch(sectionName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'calendar':
                // Setup calendar if not already done
                this.setupCalendarContainer();
                await this.loadWarehousesForSelector();
                
                // Initialize calendar manager if available
                if (window.calendarManager) {
                    window.calendarManager.generateCalendar();
                }
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

    // Dashboard Data
    async loadDashboardData() {
        try {
            console.log('Loading dashboard data...');
            
            // Load dashboard statistics
            const statsResponse = await fetch(`${this.apiBase}/bookings.php?dashboard_stats=1`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (statsResponse.ok) {
                const text = await statsResponse.text();
                if (text) {
                    try {
                        const statsData = JSON.parse(text);
                        if (statsData.success) {
                            this.updateDashboardStats(statsData.stats);
                        }
                    } catch (e) {
                        console.error('Stats JSON parse error:', e);
                    }
                }
            }

            // Load upcoming bookings
            const upcomingResponse = await fetch(`${this.apiBase}/bookings.php?upcoming=1&limit=5`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (upcomingResponse.ok) {
                const text = await upcomingResponse.text();
                if (text) {
                    try {
                        const upcomingData = JSON.parse(text);
                        if (upcomingData.success) {
                            this.updateUpcomingBookings(upcomingData.bookings);
                        }
                    } catch (e) {
                        console.error('Upcoming JSON parse error:', e);
                    }
                }
            }

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showNotification('Chyba při načítání dat: ' + error.message, 'error');
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
            default:
                actions.push(`
                    <button class="btn btn-small btn-outline" onclick="event.stopPropagation(); editBooking(${booking.id})">
                        <i class="fas fa-edit"></i> Upravit
                    </button>
                `);
        }
        
        return actions.join('');
    }

    // Utility Functions
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

    getSlotTypeText(type) {
        const texts = {
            loading: 'Nakládka',
            unloading: 'Vykládka',
            both: 'Nakládka/Vykládka'
        };
        return texts[type] || type;
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

    addMinutes(time, minutes) {
        const [hours, mins] = time.split(':').map(Number);
        const totalMinutes = hours * 60 + mins + minutes;
        const newHours = Math.floor(totalMinutes / 60);
        const newMins = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
    }

    // Notification System
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationsContainer');
        if (!container) {
            // Fallback to alert if notification container doesn't exist
            alert(message);
            return;
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div>
                <strong>${this.getNotificationTitle(type)}</strong>
                <p>${message}</p>
            </div>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;float:right;cursor:pointer;">×</button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationTitle(type) {
        const titles = {
            success: 'Úspěch',
            error: 'Chyba',
            warning: 'Upozornění',
            info: 'Informace'
        };
        return titles[type] || 'Informace';
    }

    // Quick Actions with calendar integration
    createNewSlot() {
        this.showNewSlotModal();
    }

    addUser() {
        this.showAddUserModal();
    }

    exportData() {
        this.showNotification('Export dat - TODO', 'info');
    }

    refreshDashboard() {
        this.showNotification('Obnovování dat...', 'info');
        this.loadDashboardData();
        
        // Refresh calendar if visible
        if (window.calendarManager && document.getElementById('calendar').classList.contains('active')) {
            window.calendarManager.generateCalendar();
        }
    }

    viewBookingDetail(bookingId) {
        this.showNotification(`Zobrazení detailu rezervace #${bookingId} - TODO`, 'info');
    }

    editBooking(bookingId) {
        this.showNotification(`Úprava rezervace #${bookingId} - TODO`, 'info');
    }

    async editSlot(slotId) {
        console.log('CRMApp: Edit slot:', slotId);
        
        if (window.bookingManager) {
            await window.bookingManager.showEditSlotModal(slotId);
        } else {
            this.showNotification('BookingManager není k dispozici', 'error');
        }
    }

    async deleteSlot(slotId) {
        if (confirm('Opravdu smazat tento slot?')) {
            console.log('CRMApp: Delete slot:', slotId);
            
            if (window.calendarManager) {
                await window.calendarManager.deleteSlot(slotId);
            } else {
                this.showNotification('CalendarManager není k dispozici', 'error');
            }
        }
    }

    toggleNotifications() {
        this.showNotification('Panel notifikací - TODO', 'info');
    }

    // Load Data Methods with calendar refresh
    async loadAllBookings() {
        try {
            const response = await fetch(`${this.apiBase}/bookings.php`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success) {
                        this.updateBookingsTable(data.bookings);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load bookings:', error);
        }
    }

    updateBookingsTable(bookings) {
        const tbody = document.getElementById('bookingsTableBody');
        if (!tbody) return;

        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">Žádné rezervace</td></tr>';
            return;
        }

        tbody.innerHTML = bookings.map(booking => `
            <tr>
                <td>${booking.slot_date}</td>
                <td>${booking.slot_time.substring(0, 5)}</td>
                <td>${booking.warehouse_name}</td>
                <td>${booking.truck_license_plate}</td>
                <td>${booking.driver_name}</td>
                <td><span class="booking-status ${this.getStatusClass(booking.booking_status)}">${this.getStatusText(booking.booking_status)}</span></td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="crmApp.viewBookingDetail(${booking.id})">
                        <i class="fas fa-eye"></i> Detail
                    </button>
                    ${booking.booking_status === 'pending' ? `
                    <button class="btn btn-small btn-success" onclick="confirmBooking(${booking.id})">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-small btn-danger" onclick="rejectBooking(${booking.id})">
                        <i class="fas fa-times"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    }

    async loadAllSlots() {
        try {
            const response = await fetch(`${this.apiBase}/slots.php`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success) {
                        this.updateSlotsTable(data.slots);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load slots:', error);
        }
    }

    updateSlotsTable(slots) {
        const tbody = document.getElementById('slotsTableBody');
        if (!tbody) return;

        if (slots.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">Žádné časové sloty</td></tr>';
            return;
        }

        tbody.innerHTML = slots.map(slot => `
            <tr>
                <td>${slot.slot_date}</td>
                <td>${slot.slot_time.substring(0, 5)}</td>
                <td>${slot.warehouse_name}</td>
                <td>${this.getSlotTypeText(slot.slot_type)}</td>
                <td>${slot.max_capacity}</td>
                <td>${slot.current_bookings}/${slot.max_capacity}</td>
                <td>${slot.notes || '-'}</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="crmApp.editSlot(${slot.id})">
                        <i class="fas fa-edit"></i> Upravit
                    </button>
                    <button class="btn btn-small btn-danger" onclick="crmApp.deleteSlot(${slot.id})">
                        <i class="fas fa-trash"></i> Smazat
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // WAREHOUSE FUNCTIONS - Zachováno z originálu
    async loadAllWarehouses() {
        console.log('CRMApp: Loading all warehouses...');
        try {
            const response = await fetch(`${this.apiBase}/warehouses.php`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success) {
                        this.updateWarehousesTable(data.warehouses);
                    } else {
                        throw new Error(data.error || 'Chyba při načítání skladů');
                    }
                }
            } else {
                throw new Error('Chyba při komunikaci se serverem');
            }
        } catch (error) {
            console.error('CRMApp: Failed to load warehouses:', error);
            this.showNotification('Chyba při načítání skladů: ' + error.message, 'error');
        }
    }

    updateWarehousesTable(warehouses) {
        console.log('CRMApp: Updating warehouses table with', warehouses.length, 'warehouses');
        const tbody = document.getElementById('warehousesTableBody');
        if (!tbody) return;

        if (warehouses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">Žádné sklady</td></tr>';
            return;
        }

        tbody.innerHTML = warehouses.map(warehouse => `
            <tr>
                <td>${warehouse.name}</td>
                <td>${warehouse.address || '-'}</td>
                <td>${warehouse.contact_person || '-'}<br><small>${warehouse.contact_phone || ''}</small></td>
                <td>${warehouse.working_hours_start || '08:00'} - ${warehouse.working_hours_end || '16:00'}</td>
                <td>${warehouse.max_simultaneous_slots || 5}</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="crmApp.editWarehouse(${warehouse.id})">
                        <i class="fas fa-edit"></i> Upravit
                    </button>
                    <button class="btn btn-small btn-danger" onclick="crmApp.deleteWarehouse(${warehouse.id})">
                        <i class="fas fa-trash"></i> Smazat
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async editWarehouse(warehouseId) {
        console.log('CRMApp: Edit warehouse:', warehouseId);
        
        try {
            const response = await fetch(`${this.apiBase}/warehouses.php?id=${warehouseId}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const text = await response.text();
                const data = JSON.parse(text);
                if (data.success && data.warehouse) {
                    const warehouse = data.warehouse;
                    document.getElementById('edit_warehouse_id').value = warehouse.id;
                    document.getElementById('edit_warehouse_name').value = warehouse.name;
                    document.getElementById('edit_warehouse_address').value = warehouse.address || '';
                    document.getElementById('edit_warehouse_contact_person').value = warehouse.contact_person || '';
                    document.getElementById('edit_warehouse_contact_phone').value = warehouse.contact_phone || '';
                    document.getElementById('edit_warehouse_contact_email').value = warehouse.contact_email || '';
                    document.getElementById('edit_warehouse_working_hours_start').value = warehouse.working_hours_start || '08:00';
                    document.getElementById('edit_warehouse_working_hours_end').value = warehouse.working_hours_end || '16:00';
                    document.getElementById('edit_warehouse_max_slots').value = warehouse.max_simultaneous_slots || 5;
                    
                    this.showModal('editWarehouseModal');
                }
            }
        } catch (error) {
            this.showNotification('Chyba při načítání skladu: ' + error.message, 'error');
        }
    }

    async deleteWarehouse(warehouseId) {
        if (confirm('Opravdu smazat tento sklad?')) {
            console.log('CRMApp: Delete warehouse:', warehouseId);
            
            try {
                const response = await fetch(`${this.apiBase}/warehouses.php`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ warehouse_id: warehouseId })
                });

                const text = await response.text();
                const result = text ? JSON.parse(text) : {};
                
                if (response.ok && result.success) {
                    this.showNotification('Sklad byl smazán', 'success');
                    await this.loadAllWarehouses(); // Refresh table
                    
                    // Refresh calendar warehouse selector
                    await this.loadWarehousesForSelector();
                } else {
                    throw new Error(result.error || 'Chyba při mazání skladu');
                }
            } catch (error) {
                this.showNotification('Chyba při mazání: ' + error.message, 'error');
            }
        }
    }

    async loadAllUsers() {
        console.log('CRMApp: Loading all users...');
        this.showNotification('Načítání uživatelů - TODO', 'info');
    }

    async loadWarehousesForForm(selectId) {
        try {
            const response = await fetch(`${this.apiBase}/warehouses.php`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success) {
                        const select = document.getElementById(selectId);
                        if (select) {
                            select.innerHTML = '<option value="">Vyberte sklad</option>';
                            
                            data.warehouses.forEach(warehouse => {
                                const option = document.createElement('option');
                                option.value = warehouse.id;
                                option.textContent = warehouse.name;
                                select.appendChild(option);
                            });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load warehouses:', error);
        }
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
        }
    }

    populateModalData(modalId, data) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        Object.entries(data).forEach(([key, value]) => {
            const field = modal.querySelector(`[name="${key}"], #${key}`);
            if (field) {
                field.value = value;
            }
        });
    }

    // Modal Methods with calendar integration
    showBookingModal(slotId = null) {
        this.showModal('bookingModal');
        
        if (slotId) {
            const slotSelect = document.getElementById('booking_slot');
            if (slotSelect) {
                slotSelect.value = slotId;
            }
        }
        
        this.loadWarehousesForForm('booking_warehouse');
    }

    showNewSlotModal() {
        this.showModal('newSlotModal');
        this.loadWarehousesForForm('slot_warehouse');
        
        // Set default date to today
        const dateInput = document.getElementById('slot_date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        
        // If calendar is active and has selected date, use that
        if (window.calendarManager && window.calendarManager.selectedDate) {
            const selectedDateStr = window.calendarManager.selectedDate.toISOString().split('T')[0];
            if (dateInput) {
                dateInput.value = selectedDateStr;
            }
        }
    }

    showAddUserModal() {
        console.log('CRMApp: Show add user modal');
        this.showModal('addUserModal');
    }

    showAddWarehouseModal() {
        console.log('CRMApp: Show add warehouse modal');
        this.showModal('addWarehouseModal');
    }

    // Calendar specific methods
    refreshCalendarAfterChange() {
        if (window.calendarManager && document.getElementById('calendar').classList.contains('active')) {
            window.calendarManager.generateCalendar();
        }
    }

    // Enhanced slot creation with calendar integration
    async createSlotFromCalendar(date, time, warehouseId) {
        const slotData = {
            warehouse_id: warehouseId,
            slot_date: date,
            slot_time: time + ':00',
            duration_minutes: 60,
            max_capacity: 1,
            slot_type: 'unloading',
            notes: ''
        };

        if (window.calendarManager) {
            return await window.calendarManager.createSlot(slotData);
        }
        
        return null;
    }
}

// Global instance
let crmApp = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    crmApp = new CRMApp();
    
    // Make it globally available
    window.crmApp = crmApp;
});

// Global functions for backward compatibility
function showSection(sectionName) {
    if (crmApp) crmApp.showSection(sectionName);
}

function logout() {
    if (window.authManager) {
        window.authManager.logout();
    }
}

function refreshDashboard() {
    if (crmApp) crmApp.refreshDashboard();
}

function createNewSlot() {
    if (crmApp) crmApp.createNewSlot();
}

function addUser() {
    if (crmApp) crmApp.addUser();
}

function exportData() {
    if (crmApp) crmApp.exportData();
}

function viewBookingDetail(id) {
    if (crmApp) crmApp.viewBookingDetail(id);
}

function editBooking(id) {
    if (crmApp) crmApp.editBooking(id);
}

function editSlot(id) {
    if (crmApp) crmApp.editSlot(id);
}

function deleteSlot(id) {
    if (crmApp) crmApp.deleteSlot(id);
}

function toggleNotifications() {
    if (crmApp) crmApp.toggleNotifications();
}

function showBookingModal(slotId = null) {
    if (crmApp) crmApp.showBookingModal(slotId);
}

function showNewSlotModal() {
    if (crmApp) crmApp.showNewSlotModal();
}

function closeModal(modalId) {
    if (crmApp) crmApp.closeModal(modalId);
}

function showAddUserModal() {
    if (crmApp) crmApp.showAddUserModal();
}

function showAddWarehouseModal() {
    if (crmApp) crmApp.showAddWarehouseModal();
}

function confirmBooking(id) {
    if (window.bookingManager) {
        window.bookingManager.confirmBooking(id);
    }
}

function rejectBooking(id) {
    if (window.bookingManager) {
        window.bookingManager.rejectBooking(id);
    }
}

function startBooking(id) {
    if (window.bookingManager) {
        window.bookingManager.startBooking(id);
    }
}

function completeBooking(id) {
    if (window.bookingManager) {
        window.bookingManager.completeBooking(id);
    }
}

console.log('✅ CRMApp: Module loaded successfully with calendar integration');