# 📁 NÁVOD: Správná struktura souborů

## 🎯 PROBLÉM: "Nelze najít URL" nebo "Nic se nestane"
Váš server má specifickou strukturu adresářů, ale soubory z ZIP jsou v root adresáři.

## ✅ ŘEŠENIE: Správné umístění souborů

### **Vaše struktura adresářů:**
```
/váš-web-root/
├── index.html                    ← HTML soubory v root
├── style.css                     ← CSS v root (nebo /css/)
├── /api/                         ← PHP soubory zde
│   ├── logout.php
│   ├── slots.php
│   ├── warehouses.php
│   ├── bookings.php
│   └── session.php
├── /js/                          ← JavaScript soubory zde
│   ├── app.js
│   ├── auth.js
│   ├── booking.js
│   ├── calendar.js
│   └── dashboard.js
└── /classes/                     ← PHP třídy zde
    ├── TimeSlot.php
    ├── User.php
    └── Booking.php
```

## 📥 JAK NAHRÁT SOUBORY:

### **Krok 1: Rozbalte ZIP archiv** 🗂️
Rozbalte `logisticky_kalendar_projekt.zip` na vašem počítači.

### **Krok 2: Nahrajte podle typu** 🚀

#### **HTML a CSS soubory** → **Root adresář**
- `index.html` → přímo do root
- `style.css` → přímo do root (nebo `/css/`)

#### **JavaScript soubory** → **Adresář `/js/`**
- `app.js` → `/js/app.js`
- `auth.js` → `/js/auth.js`
- `booking.js` → `/js/booking.js`
- `calendar.js` → `/js/calendar.js`
- `dashboard.js` → `/js/dashboard.js`

#### **PHP soubory** → **Adresář `/api/`**
- `slots.php` → `/api/slots.php`
- `warehouses.php` → `/api/warehouses.php`
- `bookings.php` → `/api/bookings.php`
- `login.php` → `/api/login.php`
- `logout.php` → `/api/logout.php`
- `session.php` → `/api/session.php`

#### **PHP třídy** → **Adresář `/classes/`**
- `TimeSlot.php` → `/classes/TimeSlot.php`
- `User.php` → `/classes/User.php`
- `Booking.php` → `/classes/Booking.php`
- `LicenseManager.php` → `/classes/LicenseManager.php`

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