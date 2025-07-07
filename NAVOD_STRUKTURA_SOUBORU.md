# 📁 NÁVOD: Správná struktura souborů

## 🎯 PROBLÉM: "Nelze najít URL" nebo "Nic se nestane"
Váš server má specifickou strukturu adresářů, ale soubory z ZIP jsou v root adresáři.

## ✅ ŘEŠENIE: Správné umístění souborů

### **Vaše struktura adresářů:**
```
/váš-web-root/
├── index.html                    ← HTML soubory v root
├── /css/                         ← CSS soubory zde
│   └── style.css
├── /js/                          ← JavaScript soubory zde (ZATÍM NEVYTVÁREJTE!)
│   ├── app.js
│   ├── auth.js
│   ├── booking.js
│   ├── calendar.js
│   └── dashboard.js
├── /api/                         ← PHP soubory zde
│   ├── bookings.php
│   ├── companies.php
│   ├── login.php
│   ├── logout.php
│   ├── session.php
│   └── slots.php
├── /classes/                     ← PHP třídy zde
│   ├── Booking.php
│   ├── TimeSlot.php
│   ├── LicenseManager.php
│   └── User.php
└── /config/                      ← Konfigurace
    └── database.php
```

## 📥 JAK NAHRÁT SOUBORY:

### **Krok 1: Rozbalte ZIP archiv** 🗂️
Rozbalte `logisticky_kalendar_projekt.zip` na vašem počítači.

### **Krok 2: Nahrajte podle typu** 🚀

#### **HTML soubory** → **Root adresář**
- `index.html` → přímo do root (PŘEPSAT existující)

#### **CSS soubory** → **Adresář `/css/`**
- `style.css` → `/css/style.css` (PŘEPSAT existující)

#### **JavaScript soubory** → **Adresář `/js/`**
- `app.js` → `/js/app.js` (PŘEPSAT existující)
- `auth.js` → `/js/auth.js` (PŘEPSAT existující)
- `booking.js` → `/js/booking.js` (PŘEPSAT existující)
- `calendar.js` → `/js/calendar.js` (PŘEPSAT existující)
- `dashboard.js` → `/js/dashboard.js` (PŘEPSAT existující)

#### **PHP soubory** → **Adresář `/api/`**
- `slots.php` → `/api/slots.php` (PŘEPSAT existující)
- `warehouses.php` → `/api/warehouses.php` (přepsat pokud existuje)
- `bookings.php` → `/api/bookings.php` (PŘEPSAT existující)
- Ostatní PHP soubory jsou už správné

#### **PHP třídy** → **Adresář `/classes/`**
- `TimeSlot.php` → `/classes/TimeSlot.php` (PŘEPSAT existující)
- `User.php` → `/classes/User.php` (PŘEPSAT existující)  
- `Booking.php` → `/classes/Booking.php` (PŘEPSAT existující)
- `LicenseManager.php` → `/classes/LicenseManager.php` (PŘEPSAT existující)

### **Krok 3: Spusťte databázový upgrade** 💾
V phpMyAdmin spusťte obsah `safe_database_upgrade.sql`.

### **Krok 4: Test** ✅
Otevřete web → kalendář by měl fungovat!

## 🔧 RYCHLÝ FIX:

Pokud máte všechny soubory v root a nechcete je přesouvat:

### **Upravte index.html:**
Změňte řádky 869-873 z:
```html
<script src="js/app.js"></script>
<script src="js/auth.js"></script>
<script src="js/booking.js"></script>
<script src="js/calendar.js"></script>
<script src="js/dashboard.js"></script>
```

Na:
```html
<script src="app.js"></script>
<script src="auth.js"></script>
<script src="booking.js"></script>
<script src="calendar.js"></script>
<script src="dashboard.js"></script>
```

### **A v každém JS souboru změňte:**
V `getApiBasePath()` funkci změňte `return 'api';` na `return '.';`

## ⚡ Co oprawa způsobilo:

✅ **Fixované cesty k API** - JS soubory nyní najdou správné PHP soubory  
✅ **Fixovaný logout** - nyní správně přesměruje na `/api/logout.php`  
✅ **Automatická detekce** - kód sám detekuje, kde je umístěn  

## 🆘 Stále nefunguje?

1. **Zkontrolujte console** (F12 → Console) pro chyby
2. **Ověřte cesty** - existuje `/api/slots.php`?
3. **Databáze** - spustili jste upgrade?
4. **Cache** - vyčistěte cache (Ctrl+F5)

**Po správném umístění souborů bude vše fungovat!** 🎉