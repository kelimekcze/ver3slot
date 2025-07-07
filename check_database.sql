-- Kontrola stávající databázové struktury
-- Spusťte tento skript nejprve pro zjištění, co už máte

-- =====================================================
-- 1. KONTROLA EXISTUJÍCÍCH TABULEK
-- =====================================================

SELECT 'Existující tabulky v databázi:' as info;
SELECT 
    table_name as 'Tabulka',
    table_rows as 'Počet řádků',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Velikost (MB)'
FROM information_schema.tables 
WHERE table_schema = DATABASE()
ORDER BY table_name;

-- =====================================================
-- 2. KONTROLA STRUKTURY HLAVNÍCH TABULEK
-- =====================================================

-- Kontrola tabulky time_slots
SELECT 'Struktura tabulky time_slots:' as info;
SELECT 
    column_name as 'Sloupec',
    column_type as 'Typ',
    is_nullable as 'Nullable',
    column_default as 'Default'
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
    AND table_name = 'time_slots'
ORDER BY ordinal_position;

-- Kontrola tabulky warehouses
SELECT 'Struktura tabulky warehouses:' as info;
SELECT 
    column_name as 'Sloupec',
    column_type as 'Typ',
    is_nullable as 'Nullable',
    column_default as 'Default'
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
    AND table_name = 'warehouses'
ORDER BY ordinal_position;

-- Kontrola tabulky bookings
SELECT 'Struktura tabulky bookings:' as info;
SELECT 
    column_name as 'Sloupec',
    column_type as 'Typ',
    is_nullable as 'Nullable',
    column_default as 'Default'
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
    AND table_name = 'bookings'
ORDER BY ordinal_position;

-- Kontrola tabulky users
SELECT 'Struktura tabulky users:' as info;
SELECT 
    column_name as 'Sloupec',
    column_type as 'Typ',
    is_nullable as 'Nullable',
    column_default as 'Default'
FROM information_schema.columns 
WHERE table_schema = DATABASE() 
    AND table_name = 'users'
ORDER BY ordinal_position;

-- =====================================================
-- 3. KONTROLA INDEXŮ
-- =====================================================

SELECT 'Existující indexy:' as info;
SELECT 
    table_name as 'Tabulka',
    index_name as 'Index',
    column_name as 'Sloupec',
    non_unique as 'Non_unique'
FROM information_schema.statistics 
WHERE table_schema = DATABASE()
    AND table_name IN ('time_slots', 'warehouses', 'bookings', 'users', 'companies')
ORDER BY table_name, index_name, seq_in_index;

-- =====================================================
-- 4. KONTROLA FOREIGN KEYS
-- =====================================================

SELECT 'Foreign key constraints:' as info;
SELECT 
    constraint_name as 'Constraint',
    table_name as 'Tabulka',
    column_name as 'Sloupec',
    referenced_table_name as 'Ref_tabulka',
    referenced_column_name as 'Ref_sloupec'
FROM information_schema.key_column_usage 
WHERE table_schema = DATABASE() 
    AND referenced_table_name IS NOT NULL
ORDER BY table_name;

-- =====================================================
-- 5. PŘEHLED DAT
-- =====================================================

-- Pokud existují, ukažme nějaká vzorová data
SELECT 'Vzorová data - time_slots (pokud existuje):' as info;
SELECT * FROM time_slots LIMIT 5;

SELECT 'Vzorová data - warehouses (pokud existuje):' as info;
SELECT * FROM warehouses LIMIT 5;

SELECT 'Vzorová data - bookings (pokud existuje):' as info;
SELECT * FROM bookings LIMIT 5;