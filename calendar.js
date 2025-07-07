// js/calendar.js - Modern Drag & Drop Logistics Planning Calendar
class LogisticsCalendar {
    constructor() {
        this.currentWeekStart = this.getWeekStart(new Date());
        this.selectedWarehouse = null;
        this.apiBase = this.getApiBasePath();
        this.draggedSlot = null;
        this.touchStartPos = null;
        
        // Time configuration
        this.startHour = 6;
        this.endHour = 22;
        this.slotDuration = 60; // minutes
        
        // Slot statuses with colors
        this.slotStatuses = {
            'reserved': { label: 'Rezervováno', color: '#3b82f6', bgColor: '#dbeafe' },
            'loaded': { label: 'Naloženo', color: '#10b981', bgColor: '#d1fae5' },
            'arrived': { label: 'Přijel', color: '#f59e0b', bgColor: '#fef3c7' },
            'canceled': { label: 'Zrušeno', color: '#ef4444', bgColor: '#fecaca' },
            'loading': { label: 'Nakládá se', color: '#8b5cf6', bgColor: '#ede9fe' }
        };
        
        this.dayNames = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
        this.monthNames = [
            'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
            'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
        ];
        
        this.init();
    }

    // Initialize calendar
    init() {
        this.createCalendarHTML();
        this.setupEventListeners();
        this.loadWarehouses();
        this.generateWeeklyCalendar();
        this.loadSlots();
    }

    // Get API base path
    getApiBasePath() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/js/') || currentPath.includes('/css/')) {
            return '../api';
        }
        return 'api';
    }

    // Get start of week (Monday)
    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    // Create calendar HTML structure
    createCalendarHTML() {
        const calendarContainer = document.getElementById('timeSlotsGrid') || document.getElementById('calendarGrid');
        if (!calendarContainer) return;

        calendarContainer.innerHTML = `
            <div class="logistics-calendar">
                <!-- Calendar Header -->
                <div class="calendar-header-controls">
                    <div class="week-navigation">
                        <button class="nav-btn" id="prevWeek">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <div class="current-week" id="currentWeek"></div>
                        <button class="nav-btn" id="nextWeek">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    
                    <div class="calendar-actions">
                        <select class="warehouse-selector" id="warehouseSelector">
                            <option value="">Všechny sklady</option>
                        </select>
                        <button class="today-btn" id="todayBtn">Dnes</button>
                        <button class="btn btn-small btn-success" id="newSlotBtn">
                            <i class="fas fa-plus"></i> Nový slot
                        </button>
                    </div>
                </div>

                <!-- Status Legend -->
                <div class="status-legend">
                    ${Object.entries(this.slotStatuses).map(([key, status]) => `
                        <div class="status-item">
                            <div class="status-color" style="background: ${status.bgColor}; border-color: ${status.color}"></div>
                            <span>${status.label}</span>
                        </div>
                    `).join('')}
                </div>

                <!-- Calendar Grid -->
                <div class="calendar-container">
                    <div class="calendar-grid" id="calendarGrid">
                        <!-- Will be generated dynamically -->
                    </div>
                </div>
            </div>

            <!-- Slot Booking Modal -->
            <div class="modal" id="slotBookingModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Vytvořit nový slot</h2>
                        <button class="close-btn" onclick="logisticsCalendar.closeBookingModal()">×</button>
                    </div>
                    <form id="slotBookingForm">
                        <div class="form-group">
                            <label for="slotWarehouse">Sklad *</label>
                            <select id="slotWarehouse" required>
                                <option value="">Vyberte sklad</option>
                            </select>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="slotDate">Datum *</label>
                                <input type="date" id="slotDate" required>
                            </div>
                            <div class="form-group">
                                <label for="slotTime">Čas *</label>
                                <input type="time" id="slotTime" required>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="slotDuration">Délka (minuty) *</label>
                                <select id="slotDuration" required>
                                    <option value="30">30 minut</option>
                                    <option value="60" selected>60 minut</option>
                                    <option value="90">90 minut</option>
                                    <option value="120">120 minut</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="slotCapacity">Kapacita *</label>
                                <input type="number" id="slotCapacity" min="1" max="10" value="1" required>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="slotType">Typ operace *</label>
                            <select id="slotType" required>
                                <option value="loading">Nakládka</option>
                                <option value="unloading" selected>Vykládka</option>
                                <option value="both">Nakládka/Vykládka</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="slotOrderNumber">Číslo objednávky</label>
                            <input type="text" id="slotOrderNumber" placeholder="např. ORD-2024-001">
                        </div>
                        
                        <div class="form-group">
                            <label for="slotNotes">Poznámky</label>
                            <textarea id="slotNotes" rows="3" placeholder="Dodatečné informace..."></textarea>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" onclick="logisticsCalendar.closeBookingModal()">
                                Zrušit
                            </button>
                            <button type="submit" class="btn btn-success">
                                <i class="fas fa-save"></i> Vytvořit slot
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    // Setup event listeners
    setupEventListeners() {
        // Week navigation
        document.getElementById('prevWeek')?.addEventListener('click', () => this.changeWeek(-1));
        document.getElementById('nextWeek')?.addEventListener('click', () => this.changeWeek(1));
        document.getElementById('todayBtn')?.addEventListener('click', () => this.goToToday());
        
        // Warehouse selector
        document.getElementById('warehouseSelector')?.addEventListener('change', (e) => {
            this.selectedWarehouse = e.target.value || null;
            this.loadSlots();
        });
        
        // New slot button
        document.getElementById('newSlotBtn')?.addEventListener('click', () => this.showBookingModal());
        
        // Slot booking form
        document.getElementById('slotBookingForm')?.addEventListener('submit', (e) => this.handleSlotCreation(e));
    }

    // Generate weekly calendar grid
    generateWeeklyCalendar() {
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;

        // Update week display
        this.updateWeekDisplay();

        // Clear existing content
        grid.innerHTML = '';

        // Create header row
        const headerRow = document.createElement('div');
        headerRow.className = 'calendar-header-row';
        
        // Time column header
        const timeHeader = document.createElement('div');
        timeHeader.className = 'time-header';
        timeHeader.textContent = 'Čas';
        headerRow.appendChild(timeHeader);

        // Day headers
        for (let i = 0; i < 7; i++) {
            const date = new Date(this.currentWeekStart);
            date.setDate(date.getDate() + i);
            
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.innerHTML = `
                <div class="day-name">${this.dayNames[i]}</div>
                <div class="day-date">${date.getDate()}.${date.getMonth() + 1}</div>
            `;
            
            // Highlight today
            if (this.isToday(date)) {
                dayHeader.classList.add('today');
            }
            
            headerRow.appendChild(dayHeader);
        }
        
        grid.appendChild(headerRow);

        // Create time rows
        for (let hour = this.startHour; hour < this.endHour; hour++) {
            const timeRow = document.createElement('div');
            timeRow.className = 'calendar-time-row';
            
            // Time cell
            const timeCell = document.createElement('div');
            timeCell.className = 'time-cell';
            timeCell.textContent = `${String(hour).padStart(2, '0')}:00`;
            timeRow.appendChild(timeCell);

            // Day cells for this hour
            for (let day = 0; day < 7; day++) {
                const date = new Date(this.currentWeekStart);
                date.setDate(date.getDate() + day);
                
                const dayCell = document.createElement('div');
                dayCell.className = 'day-cell';
                dayCell.dataset.date = date.toISOString().split('T')[0];
                dayCell.dataset.hour = hour;
                
                // Add drop zone
                this.makeDropZone(dayCell, date, hour);
                
                // Add click listener for new slot creation
                dayCell.addEventListener('click', () => this.showBookingModal(date, hour));
                
                timeRow.appendChild(dayCell);
            }
            
            grid.appendChild(timeRow);
        }
    }

    // Update week display
    updateWeekDisplay() {
        const weekElement = document.getElementById('currentWeek');
        if (!weekElement) return;

        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startStr = `${this.currentWeekStart.getDate()}.${this.currentWeekStart.getMonth() + 1}.`;
        const endStr = `${weekEnd.getDate()}.${weekEnd.getMonth() + 1}.${weekEnd.getFullYear()}`;
        
        weekElement.textContent = `${startStr} - ${endStr}`;
    }

    // Load warehouses for selectors
    async loadWarehouses() {
        try {
            const response = await fetch(`${this.apiBase}/warehouses.php`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.populateWarehouseSelectors(data.warehouses);
                }
            }
        } catch (error) {
            console.error('Failed to load warehouses:', error);
        }
    }

    // Populate warehouse selectors
    populateWarehouseSelectors(warehouses) {
        const selectors = ['warehouseSelector', 'slotWarehouse'];
        
        selectors.forEach(selectorId => {
            const selector = document.getElementById(selectorId);
            if (!selector) return;
            
            // Keep the default option for warehouseSelector
            if (selectorId === 'warehouseSelector') {
                selector.innerHTML = '<option value="">Všechny sklady</option>';
            } else {
                selector.innerHTML = '<option value="">Vyberte sklad</option>';
            }
            
            warehouses.forEach(warehouse => {
                const option = document.createElement('option');
                option.value = warehouse.id;
                option.textContent = warehouse.name;
                selector.appendChild(option);
            });
        });
    }

    // Load slots for current week
    async loadSlots() {
        const weekStart = this.currentWeekStart.toISOString().split('T')[0];
        const weekEnd = new Date(this.currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        try {
            let url = `${this.apiBase}/slots.php?date_from=${weekStart}&date_to=${weekEndStr}`;
            if (this.selectedWarehouse) {
                url += `&warehouse_id=${this.selectedWarehouse}`;
            }

            const response = await fetch(url, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.renderSlots(data.slots);
                }
            }
        } catch (error) {
            console.error('Failed to load slots:', error);
        }
    }

    // Render slots in calendar
    renderSlots(slots) {
        // Clear existing slots
        document.querySelectorAll('.slot-item').forEach(slot => slot.remove());

        slots.forEach(slot => {
            const slotDate = slot.slot_date;
            const slotHour = parseInt(slot.slot_time.split(':')[0]);
            const slotMinutes = parseInt(slot.slot_time.split(':')[1]);
            
            // Find the corresponding cell
            const cell = document.querySelector(`[data-date="${slotDate}"][data-hour="${slotHour}"]`);
            if (!cell) return;

            const slotElement = this.createSlotElement(slot);
            
            // Position slot based on minutes
            const minuteOffset = (slotMinutes / 60) * 100;
            slotElement.style.top = `${minuteOffset}%`;
            
            cell.appendChild(slotElement);
        });
    }

    // Create slot element
    createSlotElement(slot) {
        const slotElement = document.createElement('div');
        slotElement.className = 'slot-item';
        slotElement.draggable = true;
        slotElement.dataset.slotId = slot.id;
        
        // Determine slot status based on bookings
        let status = 'reserved';
        if (slot.current_bookings > 0) {
            // You can enhance this logic based on booking statuses
            status = slot.booking_status || 'reserved';
        }
        
        const statusConfig = this.slotStatuses[status] || this.slotStatuses.reserved;
        
        // Calculate duration height
        const durationHeight = (slot.duration_minutes / 60) * 100;
        slotElement.style.height = `${durationHeight}%`;
        slotElement.style.background = statusConfig.bgColor;
        slotElement.style.borderLeft = `4px solid ${statusConfig.color}`;
        
        const available = slot.max_capacity - slot.current_bookings;
        const endTime = this.addMinutes(slot.slot_time, slot.duration_minutes);
        
        slotElement.innerHTML = `
            <div class="slot-content">
                <div class="slot-time">${slot.slot_time.substring(0, 5)} - ${endTime}</div>
                <div class="slot-warehouse">${slot.warehouse_name}</div>
                <div class="slot-type">${this.getSlotTypeText(slot.slot_type)}</div>
                ${slot.notes ? `<div class="slot-order">${slot.notes}</div>` : ''}
                <div class="slot-capacity">${available}/${slot.max_capacity} volné</div>
            </div>
            <div class="slot-actions">
                <button class="slot-action-btn" onclick="logisticsCalendar.editSlot(${slot.id})" title="Upravit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="slot-action-btn delete" onclick="logisticsCalendar.deleteSlot(${slot.id})" title="Smazat">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Setup drag and drop
        this.setupSlotDragDrop(slotElement, slot);

        return slotElement;
    }

    // Setup drag and drop for slot
    setupSlotDragDrop(slotElement, slot) {
        // Mouse events
        slotElement.addEventListener('dragstart', (e) => {
            this.draggedSlot = slot;
            e.dataTransfer.effectAllowed = 'move';
            slotElement.classList.add('dragging');
        });

        slotElement.addEventListener('dragend', () => {
            slotElement.classList.remove('dragging');
            this.draggedSlot = null;
            this.clearDropZones();
        });

        // Touch events for mobile
        slotElement.addEventListener('touchstart', (e) => {
            this.touchStartPos = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            this.draggedSlot = slot;
        });

        slotElement.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.draggedSlot) return;

            const touch = e.touches[0];
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const dropZone = elementBelow?.closest('.day-cell');
            
            if (dropZone) {
                this.highlightDropZone(dropZone);
            }
        });

        slotElement.addEventListener('touchend', (e) => {
            if (!this.draggedSlot) return;

            const touch = e.changedTouches[0];
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const dropZone = elementBelow?.closest('.day-cell');
            
            if (dropZone) {
                this.handleSlotDrop(dropZone);
            }
            
            this.draggedSlot = null;
            this.clearDropZones();
        });
    }

    // Make cell a drop zone
    makeDropZone(cell, date, hour) {
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            this.highlightDropZone(cell);
        });

        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drop-highlight');
        });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleSlotDrop(cell);
        });
    }

    // Highlight drop zone
    highlightDropZone(cell) {
        this.clearDropZones();
        cell.classList.add('drop-highlight');
    }

    // Clear drop zone highlights
    clearDropZones() {
        document.querySelectorAll('.drop-highlight').forEach(cell => {
            cell.classList.remove('drop-highlight');
        });
    }

    // Handle slot drop
    async handleSlotDrop(dropCell) {
        if (!this.draggedSlot) return;

        const newDate = dropCell.dataset.date;
        const newHour = parseInt(dropCell.dataset.hour);
        const newTime = `${String(newHour).padStart(2, '0')}:00:00`;

        // Check if moving to same position
        if (newDate === this.draggedSlot.slot_date && newTime === this.draggedSlot.slot_time) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/slots.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    slot_id: this.draggedSlot.id,
                    slot_date: newDate,
                    slot_time: newTime
                })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showSuccess('Slot byl úspěšně přesunut');
                this.loadSlots(); // Reload to show updated position
            } else {
                throw new Error(result.error || 'Chyba při přesouvání slotu');
            }
        } catch (error) {
            this.showError(`Chyba při přesouvání: ${error.message}`);
        }
    }

    // Show booking modal
    showBookingModal(date = null, hour = null) {
        const modal = document.getElementById('slotBookingModal');
        if (!modal) return;

        // Pre-fill date and time if provided
        if (date) {
            document.getElementById('slotDate').value = date.toISOString().split('T')[0];
        }
        if (hour !== null) {
            document.getElementById('slotTime').value = `${String(hour).padStart(2, '0')}:00`;
        }

        modal.classList.add('active');
    }

    // Close booking modal
    closeBookingModal() {
        const modal = document.getElementById('slotBookingModal');
        if (modal) {
            modal.classList.remove('active');
            document.getElementById('slotBookingForm').reset();
        }
    }

    // Handle slot creation
    async handleSlotCreation(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const slotData = {
            warehouse_id: document.getElementById('slotWarehouse').value,
            slot_date: document.getElementById('slotDate').value,
            slot_time: document.getElementById('slotTime').value + ':00',
            duration_minutes: parseInt(document.getElementById('slotDuration').value),
            max_capacity: parseInt(document.getElementById('slotCapacity').value),
            slot_type: document.getElementById('slotType').value,
            notes: document.getElementById('slotOrderNumber').value 
                ? `${document.getElementById('slotOrderNumber').value}${document.getElementById('slotNotes').value ? ' - ' + document.getElementById('slotNotes').value : ''}`
                : document.getElementById('slotNotes').value
        };

        try {
            const response = await fetch(`${this.apiBase}/slots.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(slotData)
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showSuccess('Slot byl úspěšně vytvořen');
                this.closeBookingModal();
                this.loadSlots();
            } else {
                throw new Error(result.error || 'Chyba při vytváření slotu');
            }
        } catch (error) {
            this.showError(`Chyba při vytváření: ${error.message}`);
        }
    }

    // Edit slot
    editSlot(slotId) {
        if (window.crmApp && window.crmApp.editSlot) {
            window.crmApp.editSlot(slotId);
        }
    }

    // Delete slot
    async deleteSlot(slotId) {
        if (!confirm('Opravdu smazat tento slot?')) return;

        try {
            const response = await fetch(`${this.apiBase}/slots.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ slot_id: slotId })
            });

            const result = await response.json();
            
            if (response.ok && result.success) {
                this.showSuccess('Slot byl smazán');
                this.loadSlots();
            } else {
                throw new Error(result.error || 'Chyba při mazání slotu');
            }
        } catch (error) {
            this.showError(`Chyba při mazání: ${error.message}`);
        }
    }

    // Navigation methods
    changeWeek(direction) {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + (direction * 7));
        this.generateWeeklyCalendar();
        this.loadSlots();
    }

    goToToday() {
        this.currentWeekStart = this.getWeekStart(new Date());
        this.generateWeeklyCalendar();
        this.loadSlots();
    }

    // Utility methods
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    addMinutes(time, minutes) {
        const [hours, mins] = time.split(':').map(Number);
        const totalMinutes = hours * 60 + mins + minutes;
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMins = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
    }

    getSlotTypeText(type) {
        const texts = {
            loading: 'Nakládka',
            unloading: 'Vykládka',
            both: 'Nakládka/Vykládka'
        };
        return texts[type] || type;
    }

    showError(message) {
        if (window.crmApp && window.crmApp.showNotification) {
            window.crmApp.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        if (window.crmApp && window.crmApp.showNotification) {
            window.crmApp.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    // Public methods for external access
    refresh() {
        this.loadSlots();
    }

    setSelectedWarehouse(warehouseId) {
        this.selectedWarehouse = warehouseId;
        const selector = document.getElementById('warehouseSelector');
        if (selector) {
            selector.value = warehouseId || '';
        }
        this.loadSlots();
    }
}

// Initialize calendar when DOM is loaded
let logisticsCalendar;

function initLogisticsCalendar() {
    logisticsCalendar = new LogisticsCalendar();
}

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogisticsCalendar);
} else {
    initLogisticsCalendar();
}

// Export for backwards compatibility
window.logisticsCalendar = logisticsCalendar;

// Legacy function wrappers for compatibility
function changeMonth(direction) {
    if (logisticsCalendar) {
        logisticsCalendar.changeWeek(direction);
    }
}

function goToToday() {
    if (logisticsCalendar) {
        logisticsCalendar.goToToday();
    }
}

// Global calendar manager reference for backwards compatibility
window.calendarManager = {
    refreshAfterSlotAction: () => logisticsCalendar?.refresh(),
    loadSlotsForDate: (date) => logisticsCalendar?.loadSlots(),
    selectDate: (date) => {
        // Convert to week view containing this date
        if (logisticsCalendar) {
            logisticsCalendar.currentWeekStart = logisticsCalendar.getWeekStart(date);
            logisticsCalendar.generateWeeklyCalendar();
            logisticsCalendar.loadSlots();
        }
    }
};