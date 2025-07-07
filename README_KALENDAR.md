# 🚛 Moderní Drag & Drop Logistický Kalendář

Pokročilý slot systém pro logistické plánování s intuitivním drag & drop rozhraním.

## 🚀 Rychlá instalace

### 1. Nahrání souborů
```bash
# Nahrajte všechny soubory na váš server
# Struktura souborů:
├── index.html (hlavní stránka)
├── style.css (styly)
├── js/
│   ├── calendar.js (nový kalendář)
│   ├── app.js (hlavní aplikace)
│   ├── auth.js
│   ├── booking.js
│   └── dashboard.js
├── api/ (PHP backend soubory)
└── database_setup.sql
```

### 2. Databáze
```sql
-- Spustťte SQL skript pro vytvoření tabulek
mysql -u username -p database_name < database_setup.sql
```

### 3. Konfigurace
```php
// V config/database.php nastavte připojení k databázi
$host = 'localhost';
$dbname = 'your_database';
$username = 'your_username';
$password = 'your_password';
```

### 4. Přihlášení
- **Admin:** admin@demologistika.cz / password
- **Řidič:** driver@demologistika.cz / password

## ✨ Hlavní funkce

### 📅 Týdenní kalendář
- **Časový rozvrh:** 6:00 - 22:00 hodin
- **Týdenní zobrazení:** Přehledný pohled na celý týden
- **Navigace:** Snadné přepínání mezi týdny
- **Dnešní den:** Automatické zvýraznění

### 🖱️ Drag & Drop
- **Přesouvání slotů:** Uchopte a přetáhněte na nové místo
- **Vizuální feedback:** Indikátory při přetahování
- **Mobile podpora:** Funguje i na dotykových zařízeních
- **Validace:** Automatická kontrola konfliktů

### 🎨 Barevné stavy
| Stav | Barva | Popis |
|------|-------|--------|
| **Rezervováno** | 🔵 Modrá | Slot je rezervován |
| **Naloženo** | 🟢 Zelená | Náklad byl naložen |
| **Přijel** | 🟡 Žlutá | Vozidlo dorazilo |
| **Zrušeno** | 🔴 Červená | Operace zrušena |
| **Nakládá se** | 🟣 Fialová | Probíhá nakládka |

### 🏢 Multi-warehouse
- **Více skladů:** Správa více skladů současně
- **Filtrování:** Zobrazení podle konkrétního skladu
- **Přehlednost:** Název skladu u každého slotu

## 🎯 Jak používat

### Vytvoření nového slotu
1. **Klikněte na prázdnou buňku** v kalendáři
2. **Vyplňte formulář** s detaily slotu
3. **Uložte** - slot se okamžitě zobrazí

### Přesouvání slotů
1. **Uchopte slot** myší nebo prstem
2. **Přetáhněte** na nové místo a čas
3. **Pusťte** - slot se automaticky přesune

### Úprava slotu
1. **Najeďte myší** na slot
2. **Klikněte na ikonu úprav** ✏️
3. **Upravte detaily** a uložte

### Mazání slotu
1. **Najeďte myší** na slot
2. **Klikněte na ikonu koše** 🗑️
3. **Potvrďte** smazání

## 📱 Mobilní použití

### Touch ovládání
- **Dlouhý stisk:** Začne drag & drop
- **Přesunutí:** Vizuální indikátory
- **Puštění:** Dokončí přesun

### Responzivní design
- **Tablet:** Optimalizované rozložení
- **Telefon:** Přizpůsobené ovládání
- **Malé obrazovky:** Scrollovatelný kalendář

## ⚙️ Pokročilé funkce

### Klávesové zkratky
- **Ctrl+N:** Nový slot (v kalendáři)
- **Ctrl+R:** Obnovit data
- **Escape:** Zavřít modální okna

### Filtrování
- **Podle skladu:** Dropdown v hlavičce
- **Podle data:** Navigace mezi týdny
- **Podle stavu:** Barevné rozlišení

### Automatické funkce
- **Auto-refresh:** Každých 30 sekund
- **Konflikt check:** Validace překrývajících se slotů
- **Status tracking:** Historie změn stavů

## 🔧 Přizpůsobení

### Časový rozsah
```javascript
// V calendar.js změňte:
this.startHour = 5;  // Začátek (5:00)
this.endHour = 23;   // Konec (23:00)
```

### Barvy slotů
```css
/* V style.css upravte: */
:root {
    --slot-reserved: #dbeafe;
    --slot-loaded: #d1fae5;
    /* ... další barvy */
}
```

### Nové stavy
```javascript
// V calendar.js přidejte:
this.slotStatuses = {
    // Existující stavy...
    'delayed': { label: 'Zpožděno', color: '#f97316', bgColor: '#fed7aa' }
};
```

## 🐛 Řešení problémů

### Kalendář se nezobrazuje
✅ **Zkontrolujte:**
- Je načten CSS soubor `style.css`?
- Existuje element s ID `timeSlotsGrid`?
- Jsou v konzoli JavaScript chyby?

### Drag & Drop nefunguje
✅ **Zkontrolujte:**
- Mají sloty atribut `draggable="true"`?
- Jsou nastavené event listenery?
- Na mobilu zkuste touch události

### API volání selhávají
✅ **Zkontrolujte:**
- Správnost API endpointů
- CORS nastavení serveru
- JSON formát odpovědí

## 📊 Databázová struktura

### Hlavní tabulky
- **`time_slots`** - Časové sloty
- **`warehouses`** - Sklady
- **`bookings`** - Rezervace
- **`users`** - Uživatelé
- **`companies`** - Firmy

### Klíčové indexy
```sql
-- Pro vysoký výkon
INDEX idx_warehouse_date (warehouse_id, slot_date)
INDEX idx_date_time (slot_date, slot_time)
INDEX idx_slot_status (time_slot_id, booking_status)
```

## 🔐 Zabezpečení

### Přístupová práva
- **Admin:** Vytváření, úprava, mazání slotů
- **Logistika:** Správa rezervací a slotů
- **Řidič:** Pouze rezervace slotů

### Validace
- **Server-side:** PHP validace všech operací
- **Client-side:** JavaScript pre-validace
- **Database:** Constraints a triggery

## 📈 Optimalizace

### Výkon
- **Lazy loading:** Načítání pouze aktuálního týdne
- **Indexy:** Optimalizované databázové dotazy
- **Caching:** API odpovědi se ukládají

### Monitoring
```javascript
// Sledování výkonu
console.time('loadSlots');
await calendar.loadSlots();
console.timeEnd('loadSlots');
```

## 🆘 Podpora

### Časté problémy
1. **Přihlášení nefunguje** → Zkontrolujte databázové připojení
2. **Sloty se neukládají** → Ověřte oprávnění v databázi
3. **Kalendář je pomalý** → Zkontrolujte indexy v DB

### Kontakt
- 📧 **Email:** [váš-email@firma.cz]
- 📱 **Telefon:** [váš telefon]
- 🐛 **Bugs:** Vytvořte issue v projektu

---

## 🎉 Úspěšně nainstalováno!

Váš moderní logistický kalendář je připraven k použití. 

### Další kroky:
1. ✅ Vytvořte sklady ve správě
2. ✅ Přidejte uživatele a řidiče  
3. ✅ Začněte plánovat sloty v kalendáři
4. ✅ Vyškolte tým na nové rozhraní

**Užijte si moderní plánování logistiky! 🚛📅**