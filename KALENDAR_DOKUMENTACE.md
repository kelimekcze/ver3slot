# Moderní Drag & Drop Logistický Kalendář

## 📋 Přehled

Pokročilý slot systém pro logistické plánování s intuitivním drag & drop rozhraním, navržený speciálně pro moderní logistické operace. Kalendář umožňuje efektivní správu časových slotů pro nakládku, vykládku a další logistické operace.

## ✨ Klíčové funkce

### 🗓️ Týdenní zobrazení
- Časový rozvrh od 6:00 do 22:00 hodin
- Přehledné zobrazení celého týdne najednou
- Snadná navigace mezi týdny
- Zvýraznění aktuálního dne

### 🖱️ Drag & Drop funkcionalita
- Intuitivní přesouvání slotů myší
- Podpora dotykového ovládání pro mobilní zařízení
- Vizuální indikátory při přetahování
- Automatická validace při přesouvání

### 🎨 Vizuální rozlišení stavů
- **Rezervováno** (modrá): Slot je rezervován
- **Naloženo** (zelená): Náklad byl naložen
- **Přijel** (žlutá): Vozidlo dorazilo na místo
- **Zrušeno** (červená): Operace byla zrušena
- **Nakládá se** (fialová): Probíhá nakládka

### 📱 Responzivní design
- Plně responzivní pro všechna zařízení
- Optimalizované pro mobile-first přístup
- Přizpůsobivé layout pro různé velikosti obrazovek

### 🏢 Multi-warehouse podpora
- Správa více skladů současně
- Filtrování podle konkrétního skladu
- Přehledné zobrazení názvu skladu u každého slotu

## 🚀 Instalace a integrace

### Základní integrace

1. **Vložte CSS a JavaScript soubory:**
```html
<link href="style.css" rel="stylesheet">
<script src="calendar.js"></script>
```

2. **Přidejte HTML kontejner:**
```html
<div id="calendarGrid">
    <!-- Kalendář se vygeneruje automaticky -->
</div>
```

3. **Inicializace:**
```javascript
// Kalendář se inicializuje automaticky při načtení stránky
// Nebo můžete vyvolat manuálně:
initLogisticsCalendar();
```

### Pokročilá konfigurace

```javascript
// Přístup k instanci kalendáře
const calendar = window.logisticsCalendar;

// Nastavení vybraného skladu
calendar.setSelectedWarehouse(warehouseId);

// Refresh dat
calendar.refresh();

// Navigace na konkrétní týden
calendar.currentWeekStart = calendar.getWeekStart(new Date('2024-01-15'));
calendar.generateWeeklyCalendar();
calendar.loadSlots();
```

## 🎯 API Integrace

### Požadované API endpointy

#### 1. Sklady (GET /api/warehouses.php)
```json
{
    "success": true,
    "warehouses": [
        {
            "id": 1,
            "name": "Sklad Praha - Střed"
        }
    ]
}
```

#### 2. Sloty (GET /api/slots.php)
```json
{
    "success": true,
    "slots": [
        {
            "id": 1,
            "warehouse_id": 1,
            "warehouse_name": "Sklad Praha",
            "slot_date": "2024-01-15",
            "slot_time": "08:00:00",
            "duration_minutes": 60,
            "max_capacity": 2,
            "current_bookings": 1,
            "slot_type": "unloading",
            "notes": "ORD-2024-001"
        }
    ]
}
```

#### 3. Vytvoření slotu (POST /api/slots.php)
```json
{
    "warehouse_id": 1,
    "slot_date": "2024-01-15",
    "slot_time": "08:00:00",
    "duration_minutes": 60,
    "max_capacity": 2,
    "slot_type": "unloading",
    "notes": "ORD-2024-001"
}
```

#### 4. Aktualizace slotu (PUT /api/slots.php)
```json
{
    "slot_id": 1,
    "slot_date": "2024-01-15",
    "slot_time": "09:00:00"
}
```

#### 5. Smazání slotu (DELETE /api/slots.php)
```json
{
    "slot_id": 1
}
```

## 🗄️ Databázová struktura

### Tabulka: time_slots

```sql
CREATE TABLE time_slots (
    id INT PRIMARY KEY AUTO_INCREMENT,
    warehouse_id INT NOT NULL,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    max_capacity INT DEFAULT 1,
    slot_type ENUM('loading', 'unloading', 'both') DEFAULT 'unloading',
    notes TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_warehouse_date (warehouse_id, slot_date),
    INDEX idx_date_time (slot_date, slot_time)
);
```

### Tabulka: warehouses

```sql
CREATE TABLE warehouses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_info TEXT,
    working_hours VARCHAR(100),
    max_concurrent_slots INT DEFAULT 10,
    company_id INT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id)
);
```

### Tabulka: bookings

```sql
CREATE TABLE bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    time_slot_id INT NOT NULL,
    driver_id INT NOT NULL,
    truck_license_plate VARCHAR(20),
    cargo_type VARCHAR(255),
    cargo_weight DECIMAL(10,2),
    estimated_duration INT DEFAULT 60,
    special_requirements TEXT,
    booking_status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (time_slot_id) REFERENCES time_slots(id),
    FOREIGN KEY (driver_id) REFERENCES users(id),
    
    INDEX idx_slot_status (time_slot_id, booking_status),
    INDEX idx_driver_date (driver_id, created_at)
);
```

## 🎨 Přizpůsobení designu

### CSS vlastnosti pro úpravu barev

```css
/* Hlavní barvy slotů */
:root {
    --slot-reserved: #dbeafe;
    --slot-reserved-border: #3b82f6;
    --slot-loaded: #d1fae5;
    --slot-loaded-border: #10b981;
    --slot-arrived: #fef3c7;
    --slot-arrived-border: #f59e0b;
    --slot-canceled: #fecaca;
    --slot-canceled-border: #ef4444;
    --slot-loading: #ede9fe;
    --slot-loading-border: #8b5cf6;
}

/* Přizpůsobení rozměrů */
.calendar-time-row {
    min-height: 80px; /* Výška řádku */
}

.slot-item {
    min-height: 30px; /* Minimální výška slotu */
    font-size: 12px; /* Velikost písma */
}
```

### Úprava časového rozsahu

```javascript
// V calendar.js změňte tyto hodnoty:
this.startHour = 5;  // Začátek (5:00)
this.endHour = 23;   // Konec (23:00)
```

## 🔧 Rozšíření funkcionality

### Přidání nových stavů slotů

```javascript
// V calendar.js rozšiřte slotStatuses objekt:
this.slotStatuses = {
    // Existující stavy...
    'delayed': { label: 'Zpožděno', color: '#f97316', bgColor: '#fed7aa' },
    'priority': { label: 'Prioritní', color: '#dc2626', bgColor: '#fecaca' }
};
```

### Vlastní validace při přesouvání

```javascript
// Upravte metodu handleSlotDrop v calendar.js:
async handleSlotDrop(dropCell) {
    if (!this.draggedSlot) return;

    // Vlastní validace
    if (!this.validateSlotMove(this.draggedSlot, dropCell)) {
        this.showError('Slot nelze přesunout na toto místo');
        return;
    }

    // Pokračuje stávající kód...
}

validateSlotMove(slot, cell) {
    // Implementujte vlastní logiku validace
    const newDate = cell.dataset.date;
    const newHour = parseInt(cell.dataset.hour);
    
    // Příklad: Nelze přesouvat sloty do víkendu
    const date = new Date(newDate);
    if (date.getDay() === 0 || date.getDay() === 6) {
        return false;
    }
    
    return true;
}
```

## 📱 Mobilní optimalizace

### Touch události

Kalendář automaticky podporuje dotykové ovládání:

- **Touchstart**: Začátek přetahování
- **Touchmove**: Přesun s vizuální zpětnou vazbou
- **Touchend**: Dokončení přesouvání

### Responzivní breakpointy

```css
/* Tablet */
@media (max-width: 1024px) {
    .calendar-grid { min-width: 600px; }
}

/* Mobilní telefon */
@media (max-width: 768px) {
    .calendar-time-row { min-height: 50px; }
    .slot-item { font-size: 10px; }
}

/* Malé mobilní telefony */
@media (max-width: 480px) {
    .calendar-grid { min-width: 400px; }
    .time-cell { width: 60px; }
}
```

## 🐛 Řešení problémů

### Časté problémy

#### 1. Kalendář se nezobrazuje
- Zkontrolujte, zda je správně vložen CSS soubor
- Ověřte, že existuje element s ID `calendarGrid` nebo `timeSlotsGrid`
- Zkontrolujte konzoli prohlížeče pro JavaScript chyby

#### 2. Drag & Drop nefunguje
- Ujistěte se, že sloty mají atribut `draggable="true"`
- Zkontrolujte, že jsou správně nastavené event listenery
- Na mobilních zařízeních zkuste touch události

#### 3. API volání selhávají
- Ověřte správnost API endpointů
- Zkontrolujte CORS nastavení
- Ujistěte se, že server vrací správný JSON formát

### Ladění

```javascript
// Zapnutí debug módu
window.logisticsCalendar.debug = true;

// Sledování událostí
window.addEventListener('dragstart', (e) => {
    console.log('Drag started:', e.target);
});

window.addEventListener('drop', (e) => {
    console.log('Drop event:', e.target);
});
```

## 🔄 Migrace ze starého kalendáře

### Kroky migrace

1. **Zálohujte stávající data**
2. **Nahraďte calendar.js soubor**
3. **Aktualizujte CSS styly**
4. **Upravte HTML strukturu**
5. **Otestujte funkcionalitu**

### Zachování kompatibility

```javascript
// Legacy funkce pro zpětnou kompatibilitu jsou zahrnuty:
function changeMonth(direction) {
    // Mapuje se na changeWeek
}

function goToToday() {
    // Zachována stejná funkcionalita
}

// Global reference
window.calendarManager = {
    refreshAfterSlotAction: () => logisticsCalendar?.refresh(),
    // Další metody...
};
```

## 📊 Výkon a optimalizace

### Doporučené optimalizace

- **Lazy loading**: Načítejte sloty pouze pro aktuální týden
- **Debouncing**: Použijte debounce pro drag operace
- **Virtual scrolling**: Pro velké množství slotů
- **Caching**: Cachujte API odpovědi

### Monitoring výkonu

```javascript
// Měření času načítání slotů
console.time('loadSlots');
await calendar.loadSlots();
console.timeEnd('loadSlots');

// Sledování paměti
console.log('Heap used:', performance.memory.usedJSHeapSize);
```

## 📝 Changelog

### Verze 1.0.0 (2024-01-XX)
- ✨ Nový drag & drop týdenní kalendář
- 🎨 Moderní design s barevným kódováním
- 📱 Plná mobilní podpora
- 🏢 Multi-warehouse funkcionalita
- ⚡ Optimalizovaný výkon

## 📞 Podpora

Pro podporu a hlášení chyb:
- Vytvořte issue v GitHub repository
- Kontaktujte vývojový tým
- Konzultujte dokumentaci API

## 📄 Licence

Tento projekt je licencován pod MIT licencí. Viz LICENSE soubor pro detaily.