// booking.js - Opravená verze bez syntaktických chyb
class BookingManager {
    constructor() {
        this.apiBase = this.getApiBasePath();
        this.currentUser = null;
        this.setupEventListeners();
        console.log('BookingManager: Initialized with API base:', this.apiBase);
    }

    getApiBasePath() {
        // Detekce cesty k API podle struktury souborů
        const path = window.location.pathname;
        if (path.includes('/js/')) {
            return '../api';
        }
        return 'api';
    }

    setupEventListeners() {
        console.log('BookingManager: Setting up event listeners...');
        
        // Event delegation for dynamic content
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'bookingForm') {
                this.handleBooking(e);
            } else if (e.target.id === 'newSlotForm') {
                this.handleNewSlot(e);
            } else if (e.target.id === 'editSlotForm') {
                this.handleEditSlot(e);
            } else if (e.target.id === 'editBookingForm') {
                this.handleEditBooking(e);
            } else if (e.target.id === 'addUserForm') {
                this.handleAddUser(e);
            } else if (e.target.id === 'editUserForm') {
                this.handleEditUser(e);
            } else if (e.target.id === 'addWarehouseForm') {
                this.handleAddWarehouse(e);
            } else if (e.target.id === 'editWarehouseForm') {
                this.handleEditWarehouse(e);
            }
        });

        // Date change handlers
        document.addEventListener('change', (e) => {
            if (e.target.id === 'booking_date' || e.target.id === 'edit_booking_date') {
                this.loadAvailableSlots();
            } else if (e.target.id === 'booking_warehouse') {
                this.loadAvailableSlots();
            } else if (e.target.id === 'user_type' || e.target.id === 'edit_user_type') {
                this.toggleDriverFields(e.target);
            } else if (e.target.id === 'reg_user_type') {
                this.toggleDriverFields(e.target, 'driverFields');
            }
        });

        // Load warehouses for forms when DOM is ready
        setTimeout(() => {
            this.loadWarehousesForForm('booking_warehouse');
            this.loadWarehousesForForm('slot_warehouse');
            this.loadWarehousesForForm('edit_slot_warehouse');
        }, 1000);

        console.log('✅ BookingManager: Event listeners set up successfully');
    }

    toggleDriverFields(selectElement, containerId = null) {
        const userType = selectElement.value;
        let driverFields;
        
        if (containerId) {
            driverFields = document.getElementById(containerId);
        } else if (selectElement.id === 'user_type') {
            driverFields = document.getElementById('userDriverFields');
        } else if (selectElement.id === 'edit_user_type') {
            driverFields = document.getElementById('editUserDriverFields');
        }
        
        if (driverFields) {
            if (userType === 'driver') {
                driverFields.style.display = 'block';
            } else {
                driverFields.style.display = 'none';
            }
        }
    }

    // Handler pro vytvoření slotu
    async handleNewSlot(e) {
        e.preventDefault();
        
        console.log('BookingManager: New slot form submitted');
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        console.log('BookingManager: New slot data:', data);

        // Validace
        if (!this.validateSlotData(data)) {
            return; // Error message shown in validateSlotData
        }

        // Převod času na správný formát
        if (data.slot_time && data.slot_time.length === 5) {
            data.slot_time += ':00';
        }

        try {
            const response = await fetch(this.apiBase + '/slots.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const text = await response.text();
            console.log('BookingManager: New slot response:', text);
            
            if (!text) {
                throw new Error('Server vrátil prázdnou odpověď');
            }
            
            const result = JSON.parse(text);
            
            if (response.ok && result.success) {
                this.showSuccess('Časový slot byl úspěšně vytvořen!');
                this.closeModal('newSlotModal');
                document.getElementById('newSlotForm').reset();
                
                // Refresh calendar and slot views
                if (window.calendarManager && document.getElementById('calendar').classList.contains('active')) {
                    window.calendarManager.generateCalendar();
                }
                
                if (window.crmApp && document.getElementById('slots').classList.contains('active')) {
                    await window.crmApp.loadAllSlots();
                }
            } else {
                throw new Error(result.error || result.message || 'Chyba při vytváření slotu');
            }
        } catch (error) {
            console.error('BookingManager: New slot error:', error);
            this.showError('Chyba při vytváření slotu: ' + error.message);
        }
    }

    // Handler pro editaci slotu
    async handleEditSlot(e) {
        e.preventDefault();
        
        console.log('BookingManager: Edit slot form submitted');
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        console.log('BookingManager: Edit slot data:', data);

        // Validace
        if (!this.validateSlotData(data, true)) {
            return;
        }

        // Převod času na správný formát
        if (data.slot_time && data.slot_time.length === 5) {
            data.slot_time += ':00';
        }

        if (!data.slot_id) {
            this.showError('ID slotu je povinné');
            return;
        }

        try {
            const response = await fetch(this.apiBase + '/slots.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const text = await response.text();
            console.log('BookingManager: Edit slot response:', text);
            
            if (!text) {
                throw new Error('Server vrátil prázdnou odpověď');
            }
            
            const result = JSON.parse(text);
            
            if (response.ok && result.success) {
                this.showSuccess('Časový slot byl aktualizován!');
                this.closeModal('editSlotModal');
                
                // Refresh views
                if (window.calendarManager && document.getElementById('calendar').classList.contains('active')) {
                    window.calendarManager.generateCalendar();
                }
                
                if (window.crmApp && document.getElementById('slots').classList.contains('active')) {
                    await window.crmApp.loadAllSlots();
                }
            } else {
                throw new Error(result.error || result.message || 'Chyba při aktualizaci slotu');
            }
        } catch (error) {
            console.error('BookingManager: Edit slot error:', error);
            this.showError('Chyba při aktualizaci slotu: ' + error.message);
        }
    }

    // Handler pro rezervaci
    async handleBooking(e) {
        e.preventDefault();
        
        console.log('BookingManager: Booking form submitted');
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        console.log('BookingManager: Booking data:', data);

        try {
            const response = await fetch(this.apiBase + '/bookings.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const text = await response.text();
            console.log('BookingManager: Booking response:', text);
            
            if (!text) {
                throw new Error('Server vrátil prázdnou odpověď');
            }
            
            const result = JSON.parse(text);
            
            if (response.ok && result.success) {
                this.showSuccess('Rezervace byla úspěšně vytvořena!');
                this.closeModal('bookingModal');
                document.getElementById('bookingForm').reset();
                
                // Refresh dashboard and bookings
                if (window.crmApp) {
                    await window.crmApp.loadDashboardData();
                    
                    if (document.getElementById('bookings').classList.contains('active')) {
                        await window.crmApp.loadAllBookings();
                    }
                }
                
                // Refresh calendar if visible
                if (window.calendarManager && document.getElementById('calendar').classList.contains('active')) {
                    window.calendarManager.generateCalendar();
                }
            } else {
                throw new Error(result.error || result.message || 'Chyba při vytváření rezervace');
            }
        } catch (error) {
            console.error('BookingManager: Booking error:', error);
            this.showError('Chyba při vytváření rezervace: ' + error.message);
        }
    }

    // Načítání dostupných slotů
    async loadAvailableSlots() {
        const warehouseSelect = document.getElementById('booking_warehouse');
        const dateInput = document.getElementById('booking_date');
        const slotSelect = document.getElementById('booking_slot');

        if (!warehouseSelect || !dateInput || !slotSelect) {
            return;
        }

        const warehouseId = warehouseSelect.value;
        const date = dateInput.value;

        if (!warehouseId || !date) {
            slotSelect.innerHTML = '<option value="">Nejprve vyberte sklad a datum</option>';
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/slots.php?warehouse_id=${warehouseId}&date=${date}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success) {
                        this.updateSlotOptions(data.slots);
                        return;
                    }
                }
            }
            
            slotSelect.innerHTML = '<option value="">Žádné dostupné sloty</option>';
        } catch (error) {
            console.error('BookingManager: Failed to load slots:', error);
            slotSelect.innerHTML = '<option value="">Chyba při načítání slotů</option>';
        }
    }

    updateSlotOptions(slots) {
        const slotSelect = document.getElementById('booking_slot');
        if (!slotSelect) return;

        slotSelect.innerHTML = '<option value="">Vyberte časový slot</option>';

        if (!slots || slots.length === 0) {
            slotSelect.innerHTML += '<option value="">Žádné dostupné sloty</option>';
            return;
        }

        // Seřadit podle času
        slots.sort((a, b) => a.slot_time.localeCompare(b.slot_time));

        // Přidat pouze sloty s volnou kapacitou
        slots.forEach(slot => {
            const freeCapacity = slot.max_capacity - (slot.current_bookings || 0);
            if (freeCapacity > 0) {
                const option = document.createElement('option');
                option.value = slot.id;
                option.textContent = `${slot.slot_time.substring(0, 5)} (${freeCapacity} volných míst)`;
                slotSelect.appendChild(option);
            }
        });
    }

    // Načítání skladů do formulářů
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
                            const currentValue = select.value;
                            select.innerHTML = '<option value="">Vyberte sklad</option>';
                            
                            if (data.warehouses && data.warehouses.length > 0) {
                                data.warehouses.forEach(warehouse => {
                                    const option = document.createElement('option');
                                    option.value = warehouse.id;
                                    option.textContent = warehouse.name;
                                    select.appendChild(option);
                                });
                            }
                            
                            if (currentValue) {
                                select.value = currentValue;
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('BookingManager: Failed to load warehouses:', error);
        }
    }

    // Validace dat slotu
    validateSlotData(data, isEdit = false) {
        const errors = [];

        // Validate date
        if (data.slot_date) {
            const slotDate = new Date(data.slot_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (!isEdit && slotDate < today) {
                errors.push('Nelze vytvořit slot v minulosti');
            }
        }

        // Validate time format
        if (data.slot_time && !data.slot_time.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
            errors.push('Neplatný formát času');
        }

        // Validate duration
        if (data.duration_minutes) {
            const duration = parseInt(data.duration_minutes);
            if (duration < 15 || duration > 480) {
                errors.push('Délka slotu musí být mezi 15 a 480 minuty');
            }
        }

        // Validate capacity
        if (data.max_capacity) {
            const capacity = parseInt(data.max_capacity);
            if (capacity < 1 || capacity > 50) {
                errors.push('Kapacita musí být mezi 1 a 50');
            }
        }

        if (errors.length > 0) {
            this.showError('Chyby ve validaci:\n' + errors.join('\n'));
            return false;
        }

        return true;
    }

    // Utility methods
    showError(message) {
        console.error('BookingManager: Error -', message);
        if (window.crmApp && window.crmApp.showNotification) {
            window.crmApp.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        console.log('BookingManager: Success -', message);
        if (window.crmApp && window.crmApp.showNotification) {
            window.crmApp.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    closeModal(modalId) {
        if (window.crmApp) {
            window.crmApp.closeModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
            }
        }
    }

    // Additional handlers (simplified versions)
    async handleEditBooking(e) {
        e.preventDefault();
        this.showError('Edit booking functionality - to be implemented');
    }

    async handleAddUser(e) {
        e.preventDefault();
        this.showError('Add user functionality - to be implemented');
    }

    async handleEditUser(e) {
        e.preventDefault();
        this.showError('Edit user functionality - to be implemented');
    }

    async handleAddWarehouse(e) {
        e.preventDefault();
        this.showError('Add warehouse functionality - to be implemented');
    }

    async handleEditWarehouse(e) {
        e.preventDefault();
        this.showError('Edit warehouse functionality - to be implemented');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('BookingManager: DOM loaded, initializing...');
    const bookingManager = new BookingManager();
    
    // Make it globally available
    window.bookingManager = bookingManager;
    window.BookingManager = BookingManager;
    
    console.log('✅ BookingManager: Initialized successfully - FIXED VERSION');
});

console.log('✅ BookingManager: Module loaded successfully - FIXED VERSION');