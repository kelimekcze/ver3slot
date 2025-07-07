-- ===================================================================
-- BEZPEČNÝ UPGRADE EXISTUJÍCÍ DATABÁZE PRO NOVÝ KALENDÁŘ
-- ===================================================================
-- Tento skript pouze přidá chybějící sloupce, neruší existující data
-- Spustit v phpMyAdmin po částech nebo celý najednou

-- 1. Přidání chybějících sloupců do tabulky time_slots
-- ===================================================================

-- Přidám sloupec pro stav slotu
ALTER TABLE `time_slots` 
ADD COLUMN `slot_status` ENUM('available','reserved','loaded','arrived','cancelled','loading') 
DEFAULT 'available' AFTER `slot_type`;

-- Přidám sloupec pro číslo objednávky
ALTER TABLE `time_slots` 
ADD COLUMN `order_number` VARCHAR(50) NULL AFTER `slot_status`;

-- Přidám sloupec pro typ operace (přejmenování z slot_type)
ALTER TABLE `time_slots` 
ADD COLUMN `operation_type` ENUM('loading','unloading','both') 
DEFAULT 'unloading' AFTER `order_number`;

-- Přidám sloupec pro kapacitu slotu (přejmenování z max_capacity)
ALTER TABLE `time_slots` 
ADD COLUMN `slot_capacity` INT DEFAULT 1 AFTER `operation_type`;

-- Přidám sloupec pro aktuální počet rezervací
ALTER TABLE `time_slots` 
ADD COLUMN `current_bookings` INT DEFAULT 0 AFTER `slot_capacity`;

-- ===================================================================
-- 2. Kopírování dat ze starých sloupců do nových
-- ===================================================================

-- Zkopíruju data z slot_type do operation_type
UPDATE `time_slots` SET `operation_type` = `slot_type`;

-- Zkopíruju data z max_capacity do slot_capacity  
UPDATE `time_slots` SET `slot_capacity` = `max_capacity`;

-- Spočítám současné rezervace pro každý slot
UPDATE `time_slots` ts SET 
  `current_bookings` = (
    SELECT COUNT(*) 
    FROM `bookings` b 
    WHERE b.time_slot_id = ts.id 
    AND b.booking_status IN ('pending', 'confirmed', 'in_progress')
  );

-- Nastavím správný status podle současných rezervací
UPDATE `time_slots` ts SET 
  `slot_status` = CASE 
    WHEN `current_bookings` >= `slot_capacity` THEN 'reserved'
    WHEN `current_bookings` > 0 THEN 'reserved' 
    ELSE 'available'
  END;

-- ===================================================================
-- 3. Aktualizace indexů pro nové sloupce
-- ===================================================================

-- Přidám index pro rychlé hledání podle statusu
ALTER TABLE `time_slots` ADD INDEX `idx_slot_status` (`slot_status`);

-- Přidám index pro číslo objednávky
ALTER TABLE `time_slots` ADD INDEX `idx_order_number` (`order_number`);

-- Přidám index pro typ operace
ALTER TABLE `time_slots` ADD INDEX `idx_operation_type` (`operation_type`);

-- ===================================================================
-- 4. Kontrolní dotazy (spustit pro ověření)
-- ===================================================================

-- Zkontroluj strukturu tabulky
-- DESCRIBE time_slots;

-- Zkontroluj data v nových sloupcích
-- SELECT id, slot_date, slot_time, slot_status, operation_type, slot_capacity, current_bookings FROM time_slots LIMIT 10;

-- Zkontroluj počty podle statusů
-- SELECT slot_status, COUNT(*) as pocet FROM time_slots GROUP BY slot_status;

-- ===================================================================
-- 5. Volitelné: Odstranění starých sloupců (POZOR - ZÁLOHUJ NEJDŘÍV!)
-- ===================================================================

-- POZOR: Tyto příkazy spustit POUZE pokud je vše v pořádku!
-- A POUZE po vytvoření zálohy databáze!

-- ALTER TABLE `time_slots` DROP COLUMN `slot_type`;
-- ALTER TABLE `time_slots` DROP COLUMN `max_capacity`;

-- ===================================================================
-- HOTOVO! Kalendář by nyní měl fungovat správně.
-- ===================================================================