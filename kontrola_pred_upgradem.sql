-- ===================================================================
-- KONTROLA DATABÁZE PŘED UPGRADEM
-- ===================================================================
-- Spustit tento skript PŘED upgrade, aby viděl současný stav

-- 1. Kontrola současné struktury tabulky time_slots
-- ===================================================================
DESCRIBE time_slots;

-- 2. Ukázka současných dat v time_slots
-- ===================================================================
SELECT 
    id,
    warehouse_id,
    slot_date,
    slot_time,
    duration_minutes,
    max_capacity,
    slot_type,
    notes,
    is_active
FROM time_slots 
ORDER BY slot_date, slot_time 
LIMIT 10;

-- 3. Počty slotů podle typu
-- ===================================================================
SELECT 
    slot_type,
    COUNT(*) as pocet_slotu
FROM time_slots 
GROUP BY slot_type;

-- 4. Počty slotů podle stavu (aktivní/neaktivní)
-- ===================================================================
SELECT 
    CASE WHEN is_active = 1 THEN 'Aktivní' ELSE 'Neaktivní' END as stav,
    COUNT(*) as pocet
FROM time_slots 
GROUP BY is_active;

-- 5. Kontrola rezervací na sloty
-- ===================================================================
SELECT 
    ts.id as slot_id,
    ts.slot_date,
    ts.slot_time,
    ts.max_capacity,
    COUNT(b.id) as pocet_rezervaci,
    GROUP_CONCAT(b.booking_status) as statusy_rezervaci
FROM time_slots ts
LEFT JOIN bookings b ON ts.id = b.time_slot_id
WHERE ts.is_active = 1
GROUP BY ts.id, ts.slot_date, ts.slot_time, ts.max_capacity
HAVING COUNT(b.id) > 0
ORDER BY ts.slot_date, ts.slot_time;

-- 6. Skladiště a jejich sloty
-- ===================================================================
SELECT 
    w.name as sklad,
    COUNT(ts.id) as pocet_slotu,
    SUM(CASE WHEN ts.is_active = 1 THEN 1 ELSE 0 END) as aktivni_sloty
FROM warehouses w
LEFT JOIN time_slots ts ON w.id = ts.warehouse_id
GROUP BY w.id, w.name
ORDER BY w.name;

-- ===================================================================
-- Co bude upgrade dělat:
-- ===================================================================
-- ✅ Přidá nové sloupce: slot_status, order_number, operation_type, slot_capacity, current_bookings
-- ✅ Zkopíruje data z slot_type → operation_type
-- ✅ Zkopíruje data z max_capacity → slot_capacity
-- ✅ Spočítá současné rezervace pro každý slot
-- ✅ Nastaví správný status podle rezervací
-- ✅ Přidá indexy pro rychlejší vyhledávání
-- ✅ NEZRUŠÍ žádná existující data

-- Po upgradu spustit: SELECT * FROM time_slots LIMIT 5;