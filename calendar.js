// js/calendar.js - Calendar and Slots Management (KOMPLETNÍ S AUTO-REFRESH)
class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.apiBase = this.getApiBasePath();
        this.monthNames = [
            'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
            'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
        ];
        this.dayNames = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
    }

    // Automatické určení správné cesty k API
    getApiBasePath() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/js/') || currentPath.includes('/css/')) {
            return '../api';
        }
        return 'api';
    }

    generateCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        this.updateMonthDisplay(year, month);
        this.renderCalendarDays(year, month);
    }

    updateMonthDisplay(year, month) {
        const monthElement = document.getElementById('currentMonth');
        if (monthElement) {
            monthElement.textContent = `${this.monthNames[month]} ${year}`;
        }
    }

    renderCalendarDays(year, month) {
        const calendarGrid = document.getElementById('calendarGrid');
        if (!calendarGrid) return;

        calendarGrid.innerHTML = '';
        
        // Add day headers
        this.dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.style.fontWeight = 'bold';
            dayHeader.style.textAlign = 'center';
            dayHeader.style.padding = '10px';
            dayHeader.style.fontSize = '14px';
            dayHeader.style.color = '#666';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        
        // Adjust for Monday start (0 = Sunday, 1 = Monday)
        const dayOfWeek = firstDay.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate.setDate(startDate.getDate() - mondayOffset);
        
        // Generate 42 days (6 weeks)
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = this.createDayElement(date, month);
            calendarGrid.appendChild(dayElement);
        }
    }

    createDayElement(date, currentMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();
        
        // Style for dates outside current month
        if (date.getMonth() !== currentMonth) {
            dayElement.style.opacity = '0.3';
            dayElement.style.cursor = 'default';
        }
        
        // Highlight today
        if (this.isToday(date)) {
            dayElement.style.background = '#667eea';
            dayElement.style.color = 'white';
            dayElement.style.fontWeight = 'bold';
        }
        
        // Highlight selected date
        if (this.selectedDate && this.isSameDate(date, this.selectedDate)) {
            dayElement.classList.add('selected');
        }
        
        // Add click event for current month dates only
        if (date.getMonth() === currentMonth) {
            dayElement.addEventListener('click', () => {
                this.selectDate(date, dayElement);
            });
        }
        
        return dayElement;
    }

    selectDate(date, dayElement) {
        // Remove previous selection
        document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
        
        // Add selection to clicked day
        dayElement.classList.add('selected');
        
        this.selectedDate = date;
        this.loadSlotsForDate(date);
    }

    async loadSlotsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        
        try {
            const response = await fetch(`${this.apiBase}/slots.php?date=${dateStr}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success) {
                        this.updateTimeSlotsGrid(data.slots);
                    } else {
                        throw new Error(data.error || 'Chyba při načítání slotů');
                    }
                }
            } else {
                throw new Error('Chyba při komunikaci se serverem');
            }
        } catch (error) {
            console.error('Failed to load slots for date:', error);
            const grid = document.getElementById('timeSlotsGrid');
            if (grid) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">Chyba při načítání slotů</div>';
            }
        }
    }

    updateTimeSlotsGrid(slots) {
        const grid = document.getElementById('timeSlotsGrid');
        if (!grid) return;

        if (slots.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-calendar-times" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>Žádné sloty pro vybraný den</p>
                    <button class="btn btn-small" onclick="crmApp.showNewSlotModal()" style="margin-top: 15px;">
                        <i class="fas fa-plus"></i> Vytvořit slot
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = slots.map(slot => this.createSlotCard(slot)).join('');
    }

    createSlotCard(slot) {
        const available = slot.max_capacity - slot.current_bookings;
        const isFull = available <= 0;
        const startTime = slot.slot_time.substring(0, 5);
        const endTime = this.addMinutes(slot.slot_time, slot.duration_minutes);
        
        return `
            <div class="time-slot ${isFull ? 'full' : ''}" data-slot-id="${slot.id}">
                <div class="slot-time">${startTime} - ${endTime}</div>
                <div class="slot-info">
                    <span>${this.getSlotTypeText(slot.slot_type)}</span>
                    <span class="slot-capacity ${isFull ? 'full' : ''}">${available}/${slot.max_capacity} volné</span>
                </div>
                <div style="font-weight: 500; margin: 10px 0;">${slot.warehouse_name}</div>
                ${slot.notes ? `<div style="font-size: 12px; color: #666; margin-top: 10px;">${slot.notes}</div>` : ''}
                <div class="slot-actions" style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                    ${this.getSlotActions(slot, available)}
                </div>
            </div>
        `;
    }

    getSlotActions(slot, available) {
        const actions = [];
        
        // Book slot action (for drivers and when available)
        if (available > 0 && window.crmApp && window.crmApp.currentUser) {
            if (window.crmApp.currentUser.user_type === 'driver') {
                actions.push(`
                    <button class="btn btn-small btn-success" onclick="event.stopPropagation(); calendarManager.bookSlot(${slot.id})">
                        <i class="fas fa-plus"></i> Rezervovat
                    </button>
                `);
            }
        }
        
        // Admin actions
        if (window.crmApp && window.crmApp.currentUser && ['admin', 'logistics', 'super_admin'].includes(window.crmApp.currentUser.user_type)) {
            actions.push(`
                <button class="btn btn-small btn-secondary" onclick="event.stopPropagation(); calendarManager.editSlot(${slot.id})">
                    <i class="fas fa-edit"></i> Upravit
                </button>
            `);
            
            if (slot.current_bookings === 0) {
                actions.push(`
                    <button class="btn btn-small btn-danger" onclick="event.stopPropagation(); calendarManager.deleteSlot(${slot.id})">
                        <i class="fas fa-trash"></i> Smazat
                    </button>
                `);
            }
        }
        
        // Show bookings button
        if (slot.current_bookings > 0) {
            actions.push(`
                <button class="btn btn-small btn-outline" onclick="event.stopPropagation(); calendarManager.showSlotBookings(${slot.id})">
                    <i class="fas fa-eye"></i> Rezervace (${slot.current_bookings})
                </button>
            `);
        }
        
        return actions.join('');
    }

    bookSlot(slotId) {
        if (window.crmApp) {
            window.crmApp.showBookingModal(slotId);
            
            // Pre-fill the slot in booking form
            const slotSelect = document.getElementById('booking_slot');
            if (slotSelect) {
                slotSelect.innerHTML = `<option value="${slotId}" selected>Vybraný slot</option>`;
            }
            
            // Pre-fill the date
            const dateInput = document.getElementById('booking_date');
            if (dateInput && this.selectedDate) {
                dateInput.value = this.selectedDate.toISOString().split('T')[0];
            }
        }
    }

    editSlot(slotId) {
        if (window.crmApp) {
            window.crmApp.editSlot(slotId);
        }
    }

    // OPRAVENÁ FUNKCE S AUTO-REFRESH
    async deleteSlot(slotId) {
        if (confirm('Opravdu smazat tento slot?')) {
            try {
                const response = await fetch(`${this.apiBase}/slots.php`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ slot_id: slotId })
                });

                const text = await response.text();
                const result = text ? JSON.parse(text) : {};
                
                if (response.ok && result.success) {
                    this.showSuccess('Slot byl smazán');
                    
                    // AUTO-REFRESH: Refresh slots tabulky pokud jsme na slots stránce
                    if (window.crmApp && document.getElementById('slots').classList.contains('active')) {
                        await window.crmApp.loadAllSlots();
                    }
                    
                    // AUTO-REFRESH: Refresh kalendář pokud je vybraný datum
                    if (this.selectedDate) {
                        await this.loadSlotsForDate(this.selectedDate);
                    }
                    
                } else {
                    throw new Error(result.error || 'Chyba při mazání slotu');
                }
            } catch (error) {
                this.showError(`Chyba při mazání: ${error.message}`);
            }
        }
    }

    async showSlotBookings(slotId) {
        try {
            const response = await fetch(`${this.apiBase}/bookings.php?slot_id=${slotId}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    if (data.success) {
                        this.displaySlotBookingsModal(data.bookings);
                    } else {
                        throw new Error(data.error || 'Chyba při načítání rezervací');
                    }
                }
            } else {
                throw new Error('Chyba při komunikaci se serverem');
            }
        } catch (error) {
            this.showError(`Chyba při načítání rezervací: ${error.message}`);
        }
    }

    displaySlotBookingsModal(bookings) {
        // Create a simple modal to show slot bookings
        const modalHtml = `
            <div class="modal active" id="slotBookingsModal" style="z-index: 1001;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 class="modal-title">Rezervace slotu</h2>
                        <button class="close-btn" onclick="calendarManager.closeSlotBookingsModal()">×</button>
                    </div>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${bookings.map(booking => `
                            <div class="booking-item" style="margin-bottom: 15px; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <strong>${booking.driver_name}</strong><br>
                                        <small>SPZ: ${booking.truck_license_plate}</small><br>
                                        ${booking.cargo_type ? `<small>Náklad: ${booking.cargo_type}</small>` : ''}
                                    </div>
                                    <span class="booking-status ${this.getStatusClass(booking.booking_status)}">
                                        ${this.getStatusText(booking.booking_status)}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    closeSlotBookingsModal() {
        const modal = document.getElementById('slotBookingsModal');
        if (modal) {
            modal.remove();
        }
    }

    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.generateCalendar();
        
        // Clear selected date and slots when changing month
        this.selectedDate = null;
        const grid = document.getElementById('timeSlotsGrid');
        if (grid) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">Vyberte den pro zobrazení slotů</div>';
        }
    }

    // Utility methods
    isToday(date) {
        const today = new Date();
        return this.isSameDate(date, today);
    }

    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    addMinutes(time, minutes) {
        const [hours, mins] = time.split(':').map(Number);
        const totalMinutes = hours * 60 + mins + minutes;
        const newHours = Math.floor(totalMinutes / 60);
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

    // Quick date navigation
    goToToday() {
        this.currentDate = new Date();
        this.generateCalendar();
        
        // Auto-select today
        const today = new Date();
        this.selectedDate = today;
        this.loadSlotsForDate(today);
    }

    goToDate(date) {
        this.currentDate = new Date(date);
        this.generateCalendar();
        this.selectedDate = new Date(date);
        this.loadSlotsForDate(this.selectedDate);
    }

    // ENHANCED: Refresh after slot creation
    async refreshAfterSlotAction() {
        // Refresh slots tabulky pokud jsme na slots stránce
        if (window.crmApp && document.getElementById('slots').classList.contains('active')) {
            await window.crmApp.loadAllSlots();
        }
        
        // Refresh kalendář pokud je vybraný datum
        if (this.selectedDate) {
            await this.loadSlotsForDate(this.selectedDate);
        }
        
        // Refresh dashboard stats
        if (window.crmApp && document.getElementById('dashboard').classList.contains('active')) {
            await window.crmApp.loadDashboardData();
        }
    }

    // Bulk slot operations
    async createMultipleSlots(templateSlot, dates) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const date of dates) {
            try {
                const slotData = {
                    ...templateSlot,
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
        
        // Refresh all views
        await this.refreshAfterSlotAction();
    }

    // Real-time updates support
    handleSlotUpdate(slotData) {
        // Called when slot is updated via websocket or polling
        if (this.selectedDate) {
            this.loadSlotsForDate(this.selectedDate);
        }
    }

    handleBookingUpdate(bookingData) {
        // Called when booking is updated
        if (this.selectedDate) {
            this.loadSlotsForDate(this.selectedDate);
        }
    }

    // Performance optimizations
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Enhanced error handling
    async safeApiCall(apiCall, fallbackMessage = 'Operace selhala') {
        try {
            return await apiCall();
        } catch (error) {
            console.error('API call failed:', error);
            this.showError(`${fallbackMessage}: ${error.message}`);
            return null;
        }
    }
}

// Initialize calendar manager
const calendarManager = new CalendarManager();

// Make it globally available
window.calendarManager = calendarManager;

// Global calendar functions
function changeMonth(direction) {
    calendarManager.changeMonth(direction);
}

function goToToday() {
    calendarManager.goToToday();
}

function selectSlot(slotId) {
    if (window.crmApp && window.crmApp.currentUser && window.crmApp.currentUser.user_type === 'driver') {
        calendarManager.bookSlot(slotId);
    } else {
        calendarManager.showError('Pouze řidiči mohou rezervovat sloty');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Generate calendar when calendar section becomes active
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const calendarSection = document.getElementById('calendar');
                if (calendarSection && calendarSection.classList.contains('active')) {
                    calendarManager.generateCalendar();
                }
            }
        });
    });

    // Start observing
    const calendarSection = document.getElementById('calendar');
    if (calendarSection) {
        observer.observe(calendarSection, { attributes: true });
    }

    console.log('✅ CalendarManager: Initialized with auto-refresh support');
});