-- BEZPEČNÝ UPGRADE KALENDÁŘE
-- Tento skript pouze přidá chybějící sloupce a tabulky
-- NEROZBIJE vaše stávající data!

-- =====================================================
-- 1. BACKUP DOPORUČENÍ
-- =====================================================
-- DŮRAZNĚ DOPORUČUJEME ZÁLOHU PŘED SPUŠTĚNÍM:
-- mysqldump -u username -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql

-- =====================================================
-- 2. PŘIDÁNÍ CHYBĚJÍCÍCH SLOUPCŮ DO EXISTUJÍCÍCH TABULEK
-- =====================================================

-- Přidání sloupců do time_slots (pokud chybí)
ALTER TABLE time_slots 
ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 60 AFTER slot_time,
ADD COLUMN IF NOT EXISTS max_capacity INT DEFAULT 1 AFTER duration_minutes,
ADD COLUMN IF NOT EXISTS slot_type ENUM('loading', 'unloading', 'both') DEFAULT 'unloading' AFTER max_capacity,
ADD COLUMN IF NOT EXISTS notes TEXT AFTER slot_type,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT 1 AFTER notes,
ADD COLUMN IF NOT EXISTS created_by INT AFTER is_active,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER created_by,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Přidání sloupců do warehouses (pokud chybí)
ALTER TABLE warehouses 
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255) AFTER address,
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50) AFTER contact_person,
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255) AFTER contact_phone,
ADD COLUMN IF NOT EXISTS working_hours_start TIME DEFAULT '08:00:00' AFTER contact_email,
ADD COLUMN IF NOT EXISTS working_hours_end TIME DEFAULT '16:00:00' AFTER working_hours_start,
ADD COLUMN IF NOT EXISTS max_simultaneous_slots INT DEFAULT 10 AFTER working_hours_end,
ADD COLUMN IF NOT EXISTS company_id INT AFTER max_simultaneous_slots,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT 1 AFTER company_id,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER is_active,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Přidání sloupců do bookings (pokud chybí)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS cargo_weight DECIMAL(10,2) AFTER cargo_type,
ADD COLUMN IF NOT EXISTS estimated_duration INT DEFAULT 60 AFTER cargo_weight,
ADD COLUMN IF NOT EXISTS actual_duration INT AFTER estimated_duration,
ADD COLUMN IF NOT EXISTS special_requirements TEXT AFTER actual_duration,
ADD COLUMN IF NOT EXISTS booking_notes TEXT AFTER special_requirements,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER booking_status,
ADD COLUMN IF NOT EXISTS status_updated_by INT AFTER status_updated_at,
ADD COLUMN IF NOT EXISTS arrival_time TIMESTAMP NULL AFTER status_updated_by,
ADD COLUMN IF NOT EXISTS departure_time TIMESTAMP NULL AFTER arrival_time,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- Přidání sloupců do users (pokud chybí)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50) AFTER full_name,
ADD COLUMN IF NOT EXISTS company_id INT AFTER user_type,
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255) AFTER company_id,
ADD COLUMN IF NOT EXISTS truck_license_plate VARCHAR(20) AFTER company_name,
ADD COLUMN IF NOT EXISTS driver_license VARCHAR(50) AFTER truck_license_plate,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT 1 AFTER driver_license,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- =====================================================
-- 3. VYTVOŘENÍ CHYBĚJÍCÍCH TABULEK (pouze pokud neexistují)
-- =====================================================

-- Tabulka companies (pokud neexistuje)
CREATE TABLE IF NOT EXISTS companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabulka slot_status_history (pokud neexistuje)
CREATE TABLE IF NOT EXISTS slot_status_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    time_slot_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by INT,
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_slot_history (time_slot_id, created_at)
);

-- Tabulka booking_status_history (pokud neexistuje)
CREATE TABLE IF NOT EXISTS booking_status_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    old_status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'),
    new_status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'),
    changed_by INT,
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_booking_history (booking_id, created_at)
);

-- =====================================================
-- 4. PŘIDÁNÍ INDEXŮ PRO VÝKON (pouze pokud neexistují)
-- =====================================================

-- Přidání indexů do time_slots
ALTER TABLE time_slots 
ADD INDEX IF NOT EXISTS idx_warehouse_date (warehouse_id, slot_date),
ADD INDEX IF NOT EXISTS idx_date_time (slot_date, slot_time),
ADD INDEX IF NOT EXISTS idx_warehouse_datetime (warehouse_id, slot_date, slot_time),
ADD INDEX IF NOT EXISTS idx_active_slots (is_active),
ADD INDEX IF NOT EXISTS idx_slot_type (slot_type);

-- Přidání indexů do bookings
ALTER TABLE bookings 
ADD INDEX IF NOT EXISTS idx_slot_status (time_slot_id, booking_status),
ADD INDEX IF NOT EXISTS idx_driver_date (driver_id, created_at),
ADD INDEX IF NOT EXISTS idx_booking_status (booking_status),
ADD INDEX IF NOT EXISTS idx_truck_plate (truck_license_plate),
ADD INDEX IF NOT EXISTS idx_booking_dates (created_at, status_updated_at);

-- Přidání indexů do warehouses
ALTER TABLE warehouses 
ADD INDEX IF NOT EXISTS idx_company_warehouse (company_id),
ADD INDEX IF NOT EXISTS idx_active_warehouse (is_active);

-- Přidání indexů do users
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_user_type (user_type),
ADD INDEX IF NOT EXISTS idx_company (company_id),
ADD INDEX IF NOT EXISTS idx_active (is_active);

-- =====================================================
-- 5. AKTUALIZACE ENUM HODNOT (bezpečně)
-- =====================================================

-- Rozšíření booking_status enum (pokud už není)
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE table_schema = DATABASE() 
     AND table_name = 'bookings' 
     AND column_name = 'booking_status' 
     AND column_type LIKE '%pending%confirmed%in_progress%completed%cancelled%') = 0,
    'ALTER TABLE bookings MODIFY booking_status ENUM(''pending'', ''confirmed'', ''in_progress'', ''completed'', ''cancelled'') DEFAULT ''pending''',
    'SELECT ''booking_status already has correct enum values'' as info'
));

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 6. VYTVOŘENÍ VIEWS (pouze pokud neexistují)
-- =====================================================

-- View pro utilizaci slotů
CREATE OR REPLACE VIEW slot_utilization AS
SELECT 
    ts.id as slot_id,
    ts.warehouse_id,
    w.name as warehouse_name,
    ts.slot_date,
    ts.slot_time,
    ts.duration_minutes,
    ts.max_capacity,
    ts.slot_type,
    COUNT(b.id) as current_bookings,
    (ts.max_capacity - COUNT(b.id)) as available_capacity,
    ROUND((COUNT(b.id) / ts.max_capacity) * 100, 2) as utilization_percentage
FROM time_slots ts
JOIN warehouses w ON ts.warehouse_id = w.id
LEFT JOIN bookings b ON ts.id = b.time_slot_id 
    AND b.booking_status IN ('pending', 'confirmed', 'in_progress')
WHERE ts.is_active = 1
GROUP BY ts.id;

-- =====================================================
-- 7. VLOŽENÍ VZOROVÝCH DAT (pouze pokud tabulky jsou prázdné)
-- =====================================================

-- Vložení demo company (pouze pokud companies je prázdná)
INSERT INTO companies (id, name, address, contact_email, contact_phone) 
SELECT 1, 'Demo Logistika s.r.o.', 'Praha 1, Václavské náměstí 123', 'info@demologistika.cz', '+420 123 456 789'
WHERE NOT EXISTS (SELECT 1 FROM companies);

-- Vložení admin uživatele (pouze pokud admin neexistuje)
INSERT INTO users (id, username, email, password, full_name, user_type, company_id) 
SELECT 1, 'admin', 'admin@demologistika.cz', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Admin', 'admin', 1
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Vložení vzorových skladů (pouze pokud warehouses je prázdná nebo má méně než 2 záznamy)
INSERT INTO warehouses (name, address, contact_person, contact_phone, working_hours_start, working_hours_end, max_simultaneous_slots, company_id) 
SELECT * FROM (
    SELECT 'Sklad Praha - Střed' as name, 'Praha 1, Národní 123' as address, 'Marie Svobodová' as contact_person, '+420 111 222 333' as contact_phone, '06:00:00' as working_hours_start, '22:00:00' as working_hours_end, 8 as max_simultaneous_slots, 1 as company_id
    UNION ALL
    SELECT 'Sklad Brno - Jih', 'Brno, Mendlovo náměstí 456', 'Petr Dvořák', '+420 444 555 666', '07:00:00', '19:00:00', 6, 1
    UNION ALL
    SELECT 'Distribuční centrum', 'České Budějovice, Náměstí 147', 'Tomáš Novotný', '+420 222 333 444', '05:00:00', '23:00:00', 12, 1
) AS new_warehouses
WHERE (SELECT COUNT(*) FROM warehouses) < 2;

-- =====================================================
-- 8. DOKONČENÍ UPGRADU
-- =====================================================

-- Optimalizace tabulek
OPTIMIZE TABLE time_slots, warehouses, bookings, users;

-- Analýza tabulek pro lepší performance
ANALYZE TABLE time_slots, warehouses, bookings, users;

-- Výsledek
SELECT 'UPGRADE DOKONČEN ÚSPĚŠNĚ!' as result;
SELECT 'Vaše data zůstala zachována, přidány byly pouze chybějící sloupce a funkce.' as info;

-- Přehled aktualizovaných tabulek
SELECT 
    table_name as 'Aktualizovaná tabulka',
    table_rows as 'Počet řádků',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Velikost (MB)'
FROM information_schema.tables 
WHERE table_schema = DATABASE()
    AND table_name IN ('time_slots', 'warehouses', 'bookings', 'users', 'companies', 'slot_status_history', 'booking_status_history')
ORDER BY table_name;