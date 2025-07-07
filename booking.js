// js/booking.js - Booking Management with Slot Editing and Warehouse Functions (KOMPLETNÍ)
class BookingManager {
    constructor() {
        this.apiBase = this.getApiBasePath();
        this.setupEventListeners();
    }

    // Automatické určení správné cesty k API
    getApiBasePath() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/js/') || currentPath.includes('/css/')) {
            return '../api';
        }
        return 'api';
    }

    setupEventListeners() {
        console.log('BookingManager: Setting up event listeners...');
        
        // Booking form
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', this.handleBooking.bind(this));
            console.log('BookingManager: ✅ Booking form listener attached');
        }
        
        // New slot form
        const newSlotForm = document.getElementById('newSlotForm');
        if (newSlotForm) {
            newSlotForm.addEventListener('submit', this.handleNewSlot.bind(this));
            console.log('BookingManager: ✅ New slot form listener attached');
        }
        
        // Edit booking form
        const editBookingForm = document.getElementById('editBookingForm');
        if (editBookingForm) {
            editBookingForm.addEventListener('submit', this.handleEditBooking.bind(this));
            console.log('BookingManager: ✅ Edit booking form listener attached');
        }
        
        // Edit slot form - NOVÉ!
        const editSlotForm = document.getElementById('editSlotForm');
        if (editSlotForm) {
            editSlotForm.addEventListener('submit', this.handleEditSlot.bind(this));
            console.log('BookingManager: ✅ Edit slot form listener attached');
        }
        
        // User forms
        const addUserForm = document.getElementById('addUserForm');
        if (addUserForm) {
            addUserForm.addEventListener('submit', this.handleAddUser.bind(this));
            console.log('BookingManager: ✅ Add user form listener attached');
        }
        
        const editUserForm = document.getElementById('editUserForm');
        if (editUserForm) {
            editUserForm.addEventListener('submit', this.handleEditUser.bind(this));
            console.log('BookingManager: ✅ Edit user form listener attached');
        }
        
        // =============== WAREHOUSE FORMS - NOVĚ PŘIDÁNO ===============
        const addWarehouseForm = document.getElementById('addWarehouseForm');
        if (addWarehouseForm) {
            addWarehouseForm.addEventListener('submit', this.handleAddWarehouse.bind(this));
            console.log('BookingManager: ✅ Add warehouse form listener attached');
        }
        
        const editWarehouseForm = document.getElementById('editWarehouseForm');
        if (editWarehouseForm) {
            editWarehouseForm.addEventListener('submit', this.handleEditWarehouse.bind(this));
            console.log('BookingManager: ✅ Edit warehouse form listener attached');
        }
        
        // Date change for booking
        const bookingDate = document.getElementById('booking_date');
        if (bookingDate) {
            bookingDate.addEventListener('change', this.loadAvailableSlots.bind(this));
        }
        
        // Warehouse change for booking
        const bookingWarehouse = document.getElementById('booking_warehouse');
        if (bookingWarehouse) {
            bookingWarehouse.addEventListener('change', this.loadAvailableSlots.bind(this));
        }
        
        // Date change for edit booking
        const editBookingDate = document.getElementById('edit_booking_date');
        if (editBookingDate) {
            editBookingDate.addEventListener('change', this.loadAvailableSlotsForEdit.bind(this));
        }
        
        // Warehouse change for edit booking
        const editBookingWarehouse = document.getElementById('edit_booking_warehouse');
        if (editBookingWarehouse) {
            editBookingWarehouse.addEventListener('change', this.loadAvailableSlotsForEdit.bind(this));
        }
    }

    // =============== SLOT EDITING FUNCTIONS ===============

    // Load slot data for editing
    async loadSlotForEdit(slotId) {
        try {
            console.log('BookingManager: Loading slot for edit:', slotId);
            
            const response = await fetch(`${this.apiBase}/slots.php?id=${slotId}`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success && data.slot) {
                        console.log('BookingManager: Slot data loaded:', data.slot);
                        return data.slot;
                    } else {
                        throw new Error(data.error || 'Slot nenalezen');
                    }
                }
            } else {
                throw new Error('Chyba při načítání slotu');
            }
        } catch (error) {
            console.error('BookingManager: Failed to load slot:', error);
            this.showError('Chyba při načítání slotu: ' + error.message);
            return null;
        }
    }

    // Populate edit slot form with data
    async populateEditSlotForm(slotId) {
        try {
            const slot = await this.loadSlotForEdit(slotId);
            if (!slot) return false;

            // Fill form fields
            document.getElementById('edit_slot_id').value = slot.id;
            document.getElementById('edit_slot_warehouse').value = slot.warehouse_id;
            document.getElementById('edit_slot_date').value = slot.slot_date;
            document.getElementById('edit_slot_time').value = slot.slot_time.substring(0, 5); // Remove seconds
            document.getElementById('edit_slot_duration').value = slot.duration_minutes;
            document.getElementById('edit_slot_capacity').value = slot.max_capacity;
            document.getElementById('edit_slot_type').value = slot.slot_type;
            document.getElementById('edit_slot_notes').value = slot.notes || '';

            // Show warning if slot has active bookings
            const warningDiv = document.getElementById('edit_slot_warning');
            if (slot.current_bookings > 0) {
                if (warningDiv) {
                    warningDiv.innerHTML = `
                        <div class="alert-warning" style="background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Upozornění:</strong> Tento slot má ${slot.current_bookings} aktivní rezervac${slot.current_bookings === 1 ? 'i' : 'e'}. 
                            Lze změnit pouze poznámky a kapacitu.
                        </div>
                    `;
                    warningDiv.style.display = 'block';
                }

                // Disable fields that can't be changed
                document.getElementById('edit_slot_warehouse').disabled = true;
                document.getElementById('edit_slot_date').disabled = true;
                document.getElementById('edit_slot_time').disabled = true;
                document.getElementById('edit_slot_duration').disabled = true;
                document.getElementById('edit_slot_type').disabled = true;
            } else {
                if (warningDiv) {
                    warningDiv.style.display = 'none';
                }
                
                // Enable all fields
                document.getElementById('edit_slot_warehouse').disabled = false;
                document.getElementById('edit_slot_date').disabled = false;
                document.getElementById('edit_slot_time').disabled = false;
                document.getElementById('edit_slot_duration').disabled = false;
                document.getElementById('edit_slot_type').disabled = false;
            }

            // Load warehouses for dropdown
            await this.loadWarehousesForForm('edit_slot_warehouse');
            document.getElementById('edit_slot_warehouse').value = slot.warehouse_id;

            return true;
        } catch (error) {
            console.error('BookingManager: Error populating edit form:', error);
            this.showError('Chyba při načítání formuláře: ' + error.message);
            return false;
        }
    }

    // Handle edit slot form submission
    async handleEditSlot(e) {
        e.preventDefault();
        
        console.log('BookingManager: Edit slot form submitted');
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Convert slot_id to integer
        data.slot_id = parseInt(data.slot_id);

        console.log('BookingManager: Edit slot data:', data);

        // Client-side validation
        if (!this.validateSlotData(data)) {
            return; // Validation errors already shown
        }

        try {
            const response = await fetch(`${this.apiBase}/slots.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const text = await response.text();
            console.log('BookingManager: Edit slot response:', text);
            
            const result = text ? JSON.parse(text) : {};
            
            if (response.ok && result.success) {
                this.showSuccess('Časový slot byl úspěšně aktualizován!');
                this.closeModal('editSlotModal');
                
                // Refresh relevant views
                if (window.crmApp) {
                    if (document.getElementById('slots').classList.contains('active')) {
                        await window.crmApp.loadAllSlots();
                    }
                    
                    if (window.calendarManager && document.getElementById('calendar').classList.contains('active')) {
                        window.calendarManager.generateCalendar();
                    }
                }
            } else {
                throw new Error(result.error || 'Chyba při aktualizaci slotu');
            }
        } catch (error) {
            console.error('BookingManager: Edit slot error:', error);
            this.showError('Chyba při aktualizaci slotu: ' + error.message);
        }
    }

    // Show edit slot modal
    async showEditSlotModal(slotId) {
        console.log('BookingManager: Showing edit slot modal for slot:', slotId);
        
        // Clear any previous warnings
        const warningDiv = document.getElementById('edit_slot_warning');
        if (warningDiv) {
            warningDiv.style.display = 'none';
        }

        // Load slot data and populate form
        const success = await this.populateEditSlotForm(slotId);
        if (success) {
            this.showModal('editSlotModal');
        }
    }

    // =============== BOOKING FORM HANDLERS ===============

    async handleBooking(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Validation
        if (!data.time_slot_id) {
            this.showError('Vyberte časový slot');
            return;
        }

        if (!this.isValidLicensePlate(data.truck_license_plate)) {
            this.showError('Neplatný formát SPZ (např. 1A2 3456)');
            return;
        }

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
            
            if (!text) {
                throw new Error('Server vrátil prázdnou odpověď');
            }

            const result = JSON.parse(text);
            
            if (response.ok && result.success) {
                this.showSuccess('Rezervace byla úspěšně vytvořena!');
                this.closeModal('bookingModal');
                
                if (window.crmApp) {
                    await window.crmApp.loadDashboardData();
                    
                    if (document.getElementById('bookings').classList.contains('active')) {
                        await window.crmApp.loadAllBookings();
                    }
                }
                
                document.getElementById('bookingForm').reset();
            } else {
                throw new Error(result.error || 'Chyba při vytváření rezervace');
            }
        } catch (error) {
            console.error('Booking error:', error);
            this.showError('Chyba při vytváření rezervace: ' + error.message);
        }
    }

    async handleNewSlot(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Validation
        if (!this.validateSlotData(data, false)) {
            return;
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
            const result = text ? JSON.parse(text) : {};
            
            if (response.ok && result.success) {
                this.showSuccess('Časový slot byl úspěšně vytvořen!');
                this.closeModal('newSlotModal');
                document.getElementById('newSlotForm').reset();
                
                // Refresh calendar if we're on calendar page
                if (window.calendarManager && document.getElementById('calendar').classList.contains('active')) {
                    window.calendarManager.generateCalendar();
                }
                
                // Refresh slots if we're on slots page
                if (window.crmApp && document.getElementById('slots').classList.contains('active')) {
                    await window.crmApp.loadAllSlots();
                }
            } else {
                throw new Error(result.error || 'Chyba při vytváření slotu');
            }
        } catch (error) {
            console.error('Slot creation error:', error);
            this.showError('Chyba při vytváření slotu: ' + error.message);
        }
    }

    async handleEditBooking(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(this.apiBase + '/bookings.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const text = await response.text();
            const result = text ? JSON.parse(text) : {};
            
            if (response.ok && result.success) {
                this.showSuccess('Rezervace byla úspěšně aktualizována!');
                this.closeModal('editBookingModal');
                
                if (window.crmApp) {
                    await window.crmApp.loadDashboardData();
                    await window.crmApp.loadAllBookings();
                }
            } else {
                throw new Error(result.error || 'Chyba při aktualizaci rezervace');
            }
        } catch (error) {
            console.error('Edit booking error:', error);
            this.showError('Chyba při aktualizaci rezervace: ' + error.message);
        }
    }

    // =============== SLOT LOADING FUNCTIONS ===============

    async loadAvailableSlots() {
        const warehouseId = document.getElementById('booking_warehouse').value;
        const date = document.getElementById('booking_date').value;
        
        const slotSelect = document.getElementById('booking_slot');
        slotSelect.innerHTML = '<option value="">Načítání...</option>';
        
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
                    } else {
                        throw new Error(data.error || 'Chyba při načítání slotů');
                    }
                }
            } else {
                throw new Error('Chyba při komunikaci se serverem');
            }
        } catch (error) {
            console.error('Failed to load slots:', error);
            slotSelect.innerHTML = '<option value="">Chyba při načítání slotů</option>';
        }
    }

    updateSlotOptions(slots) {
        const slotSelect = document.getElementById('booking_slot');
        
        if (slots.length === 0) {
            slotSelect.innerHTML = '<option value="">Žádné dostupné sloty</option>';
            return;
        }

        slotSelect.innerHTML = '<option value="">Vyberte časový slot</option>';
        
        slots.forEach(slot => {
            const available = slot.max_capacity - slot.current_bookings;
            if (available > 0) {
                const option = document.createElement('option');
                option.value = slot.id;
                const endTime = this.addMinutes(slot.slot_time, slot.duration_minutes);
                option.textContent = `${slot.slot_time.substring(0, 5)} - ${endTime} (${available}/${slot.max_capacity} volné)`;
                slotSelect.appendChild(option);
            }
        });
    }

    async loadAvailableSlotsForEdit() {
        const warehouseId = document.getElementById('edit_booking_warehouse').value;
        const date = document.getElementById('edit_booking_date').value;
        const currentSlotId = document.getElementById('edit_booking_slot').value;
        
        const slotSelect = document.getElementById('edit_booking_slot');
        slotSelect.innerHTML = '<option value="">Načítání...</option>';
        
        if (!warehouseId || !date) {
            slotSelect.innerHTML = '<option value="">Nejprve vyberte sklad a datum</option>';
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/slots.php?warehouse_id=${warehouseId}&date=${date}&include_current=${currentSlotId}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success) {
                        slotSelect.innerHTML = '<option value="">Vyberte časový slot</option>';
                        
                        data.slots.forEach(slot => {
                            const option = document.createElement('option');
                            option.value = slot.id;
                            const endTime = this.addMinutes(slot.slot_time, slot.duration_minutes);
                            option.textContent = `${slot.slot_time.substring(0, 5)} - ${endTime}`;
                            if (slot.id == currentSlotId) {
                                option.selected = true;
                            }
                            slotSelect.appendChild(option);
                        });
                    } else {
                        throw new Error(data.error || 'Chyba při načítání slotů');
                    }
                }
            } else {
                throw new Error('Chyba při komunikaci se serverem');
            }
        } catch (error) {
            console.error('Failed to load slots for edit:', error);
            slotSelect.innerHTML = '<option value="">Chyba při načítání slotů</option>';
        }
    }

    // =============== BOOKING ACTIONS ===============

    async confirmBooking(bookingId) {
        if (!confirm('Potvrdit tuto rezervaci?')) return;
        
        try {
            const response = await fetch(this.apiBase + '/bookings.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    booking_id: bookingId,
                    action: 'update_status',
                    status: 'confirmed'
                })
            });

            const text = await response.text();
            const result = text ? JSON.parse(text) : {};
            
            if (response.ok && result.success) {
                this.showSuccess('Rezervace byla potvrzena');
                if (window.crmApp) {
                    await window.crmApp.loadDashboardData();
                    
                    if (document.getElementById('bookings').classList.contains('active')) {
                        await window.crmApp.loadAllBookings();
                    }
                }
            } else {
                throw new Error(result.error || 'Chyba při potvrzování');
            }
        } catch (error) {
            console.error('Confirm booking error:', error);
            this.showError(`Chyba při potvrzování: ${error.message}`);
        }
    }

    async rejectBooking(bookingId) {
        if (!confirm('Zamítnout tuto rezervaci?')) return;
        
        try {
            const response = await fetch(this.apiBase + '/bookings.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    booking_id: bookingId,
                    action: 'cancel'
                })
            });

            const text = await response.text();
            const result = text ? JSON.parse(text) : {};
            
            if (response.ok && result.success) {
                this.showSuccess('Rezervace byla zamítnuta');
                if (window.crmApp) {
                    await window.crmApp.loadDashboardData();
                    
                    if (document.getElementById('bookings').classList.contains('active')) {
                        await window.crmApp.loadAllBookings();
                    }
                }
            } else {
                throw new Error(result.error || 'Chyba při zamítání');
            }
        } catch (error) {
            console.error('Reject booking error:', error);
            this.showError(`Chyba při zamítání: ${error.message}`);
        }
    }

    async startBooking(bookingId) {
        if (!confirm('Spustit rezervaci a označit jako "Probíhající"?')) return;
        
        try {
            const response = await fetch(this.apiBase + '/bookings.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    booking_id: bookingId,
                    action: 'update_status',
                    status: 'in_progress'
                })
            });

            const text = await response.text();
            const result = text ? JSON.parse(text) : {};
            
            if (response.ok && result.success) {
                this.showSuccess('Rezervace byla spuštěna');
                if (window.crmApp) {
                    await window.crmApp.loadDashboardData();
                    
                    if (document.getElementById('bookings').classList.contains('active')) {
                        await window.crmApp.loadAllBookings();
                    }
                }
            } else {
                throw new Error(result.error || 'Chyba při spuštění');
            }
        } catch (error) {
            console.error('Start booking error:', error);
            this.showError(`Chyba při spuštění: ${error.message}`);
        }
    }

    async completeBooking(bookingId) {
        if (!confirm('Označit rezervaci jako dokončenou?')) return;
        
        try {
            const response = await fetch(this.apiBase + '/bookings.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    booking_id: bookingId,
                    action: 'update_status',
                    status: 'completed'
                })
            });

            const text = await response.text();
            const result = text ? JSON.parse(text) : {};
            
            if (response.ok && result.success) {
                this.showSuccess('Rezervace byla dokončena');
                if (window.crmApp) {
                    await window.crmApp.loadDashboardData();
                    
                    if (document.getElementById('bookings').classList.contains('active')) {
                        await window.crmApp.loadAllBookings();
                    }
                }
            } else {
                throw new Error(result.error || 'Chyba při dokončování');
            }
        } catch (error) {
            console.error('Complete booking error:', error);
            this.showError(`Chyba při dokončování: ${error.message}`);
        }
    }

    // =============== USER MANAGEMENT ===============

    async handleAddUser(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(this.apiBase + '/user.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const text = await response.text();
            const result = text ? JSON.parse(text) : {};
            
            if (response.ok && result.success) {
                this.showSuccess('Uživatel byl úspěšně vytvořen!');
                this.closeModal('addUserModal');
                document.getElementById('addUserForm').reset();
                
                if (window.crmApp) {
                    await window.crmApp.loadAllUsers();
                }
            } else {
                throw new Error(result.error || 'Chyba při vytváření uživatele');
            }
        } catch (error) {
            console.error('Add user error:', error);
            this.showError('Chyba při vytváření uživatele: ' + error.message);
        }
    }

    async handleEditUser(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(this.apiBase + '/user.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const text = await response.text();
            const result = text ? JSON.parse(text) : {};
            
            if (response.ok && result.success) {
                this.showSuccess('Uživatel byl úspěšně aktualizován!');
                this.closeModal('editUserModal');
                
                if (window.crmApp) {
                    await window.crmApp.loadAllUsers();
                }
            } else {
                throw new Error(result.error || 'Chyba při aktualizaci uživatele');
            }
        } catch (error) {
            console.error('Edit user error:', error);
            this.showError('Chyba při aktualizaci uživatele: ' + error.message);
        }
    }

    // =============== WAREHOUSE MANAGEMENT - NOVĚ PŘIDÁNO ===============

    // Handler pro vytvoření skladu
    async handleAddWarehouse(e) {
        e.preventDefault();
        
        console.log('BookingManager: Add warehouse form submitted');
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        console.log('BookingManager: Add warehouse data:', data);

        // Základní validace
        if (!data.name || data.name.trim() === '') {
            this.showError('Název skladu je povinný');
            return;
        }

        try {
            const response = await fetch(this.apiBase + '/warehouses.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const text = await response.text();
            console.log('BookingManager: Add warehouse response:', text);
            
            if (!text) {
                throw new Error('Server vrátil prázdnou odpověď');
            }
            
            const result = JSON.parse(text);
            
            if (response.ok && result.success) {
                this.showSuccess('Sklad byl úspěšně vytvořen!');
                this.closeModal('addWarehouseModal');
                document.getElementById('addWarehouseForm').reset();
                
                // Refresh warehouses
                if (window.crmApp && document.getElementById('warehouses').classList.contains('active')) {
                    await window.crmApp.loadAllWarehouses();
                }
                
                // Refresh warehouse options in forms
                await this.loadWarehousesForForm('booking_warehouse');
                await this.loadWarehousesForForm('slot_warehouse');
                await this.loadWarehousesForForm('edit_slot_warehouse');
                
            } else {
                throw new Error(result.error || result.message || 'Chyba při vytváření skladu');
            }
        } catch (error) {
            console.error('BookingManager: Add warehouse error:', error);
            this.showError('Chyba při vytváření skladu: ' + error.message);
        }
    }

    // Handler pro editaci skladu
    async handleEditWarehouse(e) {
        e.preventDefault();
        
        console.log('BookingManager: Edit warehouse form submitted');
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        console.log('BookingManager: Edit warehouse data:', data);

        // Validace
        if (!data.name || data.name.trim() === '') {
            this.showError('Název skladu je povinný');
            return;
        }

        if (!data.warehouse_id) {
            this.showError('ID skladu je povinné');
            return;
        }

        try {
            const response = await fetch(this.apiBase + '/warehouses.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            const text = await response.text();
            console.log('BookingManager: Edit warehouse response:', text);
            
            if (!text) {
                throw new Error('Server vrátil prázdnou odpověď');
            }
            
            const result = JSON.parse(text);
            
            if (response.ok && result.success) {
                this.showSuccess('Sklad byl úspěšně aktualizován!');
                this.closeModal('editWarehouseModal');
                
                // Refresh warehouses
                if (window.crmApp && document.getElementById('warehouses').classList.contains('active')) {
                    await window.crmApp.loadAllWarehouses();
                }
                
                // Refresh warehouse options in forms
                await this.loadWarehousesForForm('booking_warehouse');
                await this.loadWarehousesForForm('slot_warehouse');
                await this.loadWarehousesForForm('edit_slot_warehouse');
                
            } else {
                throw new Error(result.error || result.message || 'Chyba při aktualizaci skladu');
            }
        } catch (error) {
            console.error('BookingManager: Edit warehouse error:', error);
            this.showError('Chyba při aktualizaci skladu: ' + error.message);
        }
    }

    // =============== VALIDATION AND HELPER METHODS ===============

    // Validate slot data
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
        if (data.slot_time && !data.slot_time.match(/^\d{2}:\d{2}$/)) {
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

    isValidLicensePlate(plate) {
        // Czech license plate format: 1A2 3456 or similar
        const plateRegex = /^[A-Z0-9]{2,3}\s?[0-9]{4}$/;
        return plateRegex.test(plate.toUpperCase());
    }

    isValidWeight(weight) {
        return weight > 0 && weight <= 50000; // Max 50 tons
    }

    isValidDuration(duration) {
        return duration >= 15 && duration <= 480; // 15 minutes to 8 hours
    }

    addMinutes(time, minutes) {
        const [hours, mins] = time.split(':').map(Number);
        const totalMinutes = hours * 60 + mins + minutes;
        const newHours = Math.floor(totalMinutes / 60);
        const newMins = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
    }

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

    showModal(modalId) {
        if (window.crmApp) {
            window.crmApp.showModal(modalId);
        } else {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active');
            }
        }
    }

    // =============== WAREHOUSE LOADING ===============

    // Funkce pro načítání skladů do formulářů
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
                            // Store current value
                            const currentValue = select.value;
                            
                            select.innerHTML = '<option value="">Vyberte sklad</option>';
                            
                            data.warehouses.forEach(warehouse => {
                                const option = document.createElement('option');
                                option.value = warehouse.id;
                                option.textContent = warehouse.name;
                                select.appendChild(option);
                            });
                            
                            // Restore value if it was set
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

    // =============== AUTO-REFRESH AND UTILITIES ===============

    // Auto-refresh for active bookings
    startAutoRefresh() {
        setInterval(async () => {
            if (document.visibilityState === 'visible' && window.crmApp && window.crmApp.currentUser) {
                // Only refresh if we're on bookings page
                if (document.getElementById('bookings').classList.contains('active')) {
                    await window.crmApp.loadAllBookings();
                }
            }
        }, 60000); // Every minute
    }

    // Booking reminders
    async checkUpcomingBookings() {
        try {
            const response = await fetch(this.apiBase + '/bookings.php?upcoming=1&within_minutes=30', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success && data.bookings.length > 0) {
                        const count = data.bookings.length;
                        this.showSuccess(
                            `Máte ${count} rezervac${count === 1 ? 'i' : count < 5 ? 'e' : 'í'} v následujících 30 minutách`
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Failed to check upcoming bookings:', error);
        }
    }

    // =============== BULK OPERATIONS ===============

    // Bulk slot creation
    async createMultipleSlots(templateData, dates) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const date of dates) {
            try {
                const slotData = {
                    ...templateData,
                    slot_date: date.toISOString().split('T')[0]
                };

                const response = await fetch(this.apiBase + '/slots.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(slotData)
                });

                const text = await response.text();
                const result = text ? JSON.parse(text) : {};
                
                if (response.ok && result.success) {
                    results.success++;
                } else {
                    results.failed++;
                    results.errors.push(`${date.toLocaleDateString('cs-CZ')}: ${result.error}`);
                }
            } catch (error) {
                results.failed++;
                results.errors.push(`${date.toLocaleDateString('cs-CZ')}: ${error.message}`);
            }
        }

        // Show summary
        let message = `Vytvořeno slotů: ${results.success}, Chyby: ${results.failed}`;
        if (results.errors.length > 0) {
            message += '\nChyby:\n' + results.errors.slice(0, 3).join('\n');
            if (results.errors.length > 3) {
                message += `\n... a ${results.errors.length - 3} dalších`;
            }
        }

        this.showSuccess(message);
        
        // Refresh views
        if (window.calendarManager && document.getElementById('calendar').classList.contains('active')) {
            window.calendarManager.generateCalendar();
        }
        
        if (window.crmApp && document.getElementById('slots').classList.contains('active')) {
            await window.crmApp.loadAllSlots();
        }

        return results;
    }

    // =============== SEARCH AND FILTER ===============

    // Filter bookings by status
    filterBookings(status) {
        const rows = document.querySelectorAll('#bookingsTableBody tr');
        
        rows.forEach(row => {
            if (status === 'all') {
                row.style.display = '';
            } else {
                const statusCell = row.querySelector('.booking-status');
                if (statusCell && statusCell.classList.contains(`status-${status}`)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });
    }

    // Search bookings
    searchBookings(searchTerm) {
        const rows = document.querySelectorAll('#bookingsTableBody tr');
        const term = searchTerm.toLowerCase();
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(term)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // =============== EXPORT FUNCTIONALITY ===============

    // Export bookings to CSV
    exportBookingsToCSV() {
        const table = document.getElementById('bookingsTable');
        if (!table) return;

        let csv = [];
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cols = row.querySelectorAll('td, th');
            const rowData = [];
            
            cols.forEach(col => {
                // Clean up cell content
                let cellText = col.textContent.trim();
                cellText = cellText.replace(/"/g, '""'); // Escape quotes
                rowData.push(`"${cellText}"`);
            });
            
            csv.push(rowData.join(','));
        });

        // Create and download file
        const csvContent = csv.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `bookings_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // =============== STATISTICS AND ANALYTICS ===============

    // Get booking statistics
    async getBookingStatistics(dateFrom, dateTo) {
        try {
            const params = new URLSearchParams({
                stats: '1',
                date_from: dateFrom,
                date_to: dateTo
            });

            const response = await fetch(`${this.apiBase}/bookings.php?${params}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success) {
                        return data.statistics;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to get booking statistics:', error);
        }
        return null;
    }

    // =============== KEYBOARD SHORTCUTS ===============

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        if (document.getElementById('slots').classList.contains('active')) {
                            this.showModal('newSlotModal');
                        } else if (document.getElementById('bookings').classList.contains('active')) {
                            this.showModal('bookingModal');
                        }
                        break;
                    case 'f':
                        e.preventDefault();
                        // Focus search input if available
                        const searchInput = document.querySelector('input[type="search"]');
                        if (searchInput) {
                            searchInput.focus();
                        }
                        break;
                    case 'e':
                        e.preventDefault();
                        // Export current data
                        if (document.getElementById('bookings').classList.contains('active')) {
                            this.exportBookingsToCSV();
                        }
                        break;
                }
            }
        });
    }

    // =============== PERFORMANCE MONITORING ===============

    // Monitor API response times
    monitorPerformance() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const start = performance.now();
            const response = await originalFetch(...args);
            const duration = performance.now() - start;
            
            if (args[0].includes(this.apiBase)) {
                console.log(`API call to ${args[0]} took ${duration.toFixed(2)}ms`);
                
                // Log slow requests
                if (duration > 2000) {
                    console.warn(`Slow API request detected: ${args[0]} took ${duration.toFixed(2)}ms`);
                }
            }
            
            return response;
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('BookingManager: DOM loaded, initializing...');
    const bookingManager = new BookingManager();
    
    // Make it globally available
    window.bookingManager = bookingManager;
    window.BookingManager = BookingManager; // Make class available
    
    // Start auto-refresh
    bookingManager.startAutoRefresh();
    
    // Setup keyboard shortcuts
    bookingManager.setupKeyboardShortcuts();
    
    // Setup performance monitoring in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        bookingManager.monitorPerformance();
    }
    
    // Check for upcoming bookings every 5 minutes
    setInterval(() => {
        if (window.crmApp && window.crmApp.currentUser) {
            bookingManager.checkUpcomingBookings();
        }
    }, 300000);
    
    console.log('✅ BookingManager: Initialized successfully with warehouse management');
});

console.log('✅ BookingManager: Module loaded successfully with warehouse functions');