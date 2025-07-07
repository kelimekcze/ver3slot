# 🛠️ NÁVOD: Upgrade databáze pro nový kalendář

## ❗ PROBLÉM: "Kalendář se točí"
Váš nový kalendář se pokouší načíst data, ale některé sloupce v databázi chybí.

## ✅ ŘEŠENÍ: Bezpečný upgrade databáze

### **Krok 1: Záloha databáze** 🔒
1. **V phpMyAdmin**: Jděte na vaši databázi `f189871`
2. **Klikněte "Export"**
3. **Stáhněte si zálohu** (pro případ problémů)

### **Krok 2: Kontrola současného stavu** 🔍
1. **V phpMyAdmin** otevřete SQL záložku
2. **Zkopírujte a spusťte obsah** souboru `kontrola_pred_upgradem.sql`
3. **Prohlédněte si výsledky** - uvidíte současný stav databáze

### **Krok 3: Spuštění upgradu** 🚀
1. **V phpMyAdmin** otevřete SQL záložku
2. **Zkopírujte a spusťte obsah** souboru `safe_database_upgrade.sql`
3. **Počkejte na dokončení** - může trvat několik sekund

### **Krok 4: Kontrola úspěchu** ✅
Po spuštění upgradu zkontrolujte:

```sql
-- Zkontroluj novou strukturu
DESCRIBE time_slots;

-- Zkontroluj data v nových sloupcích
SELECT id, slot_date, slot_time, slot_status, operation_type, slot_capacity, current_bookings 
FROM time_slots LIMIT 5;

-- Zkontroluj počty podle statusů
SELECT slot_status, COUNT(*) as pocet FROM time_slots GROUP BY slot_status;
```

### **Krok 5: Test kalendáře** 🎯
1. **Nahrajte nové soubory** na server (pokud jste to ještě neudělali)
2. **Otevřete kalendář** v prohlížeči
3. **Kalendář by měl fungovat** bez točení

## 🔧 Co upgrade dělá:

### **Přidává nové sloupce:**
- `slot_status` - stav slotu (available, reserved, loaded, arrived, cancelled, loading)
- `order_number` - číslo objednávky
- `operation_type` - typ operace (kopie z `slot_type`)
- `slot_capacity` - kapacita slotu (kopie z `max_capacity`) 
- `current_bookings` - počet současných rezervací

### **Zachovává data:**
- ✅ Všechna existující data zůstávají
- ✅ Kopíruje data ze starých sloupců do nových
- ✅ Automaticky spočítá současné rezervace
- ✅ Nastaví správné statusy podle rezervací

## ⚠️ Řešení problémů:

### **"Sloupec už existuje"**
Upgrade byl už spuštěn. Zkontrolujte strukturu:
```sql
DESCRIBE time_slots;
```

### **"Kalendář se stále točí"**
1. Zkontrolujte, zda jsou nové soubory na serveru
2. Vyčistěte cache prohlížeče (Ctrl+F5)
3. Zkontrolujte console v prohlížeči (F12) pro chyby

### **"Chyba v API"**
Zkontrolujte soubor `slots.php` - musí být nejnovější verze.

## 📞 Potřebujete pomoct?
Pokud něco nefunguje, pošlete mi:
1. Screenshot chyby z console (F12)
2. Výsledek z `DESCRIBE time_slots;`
3. Jaký krok nedopadl podle očekávání

**Upgrade je 100% bezpečný a nezruší žádná data!** ✅