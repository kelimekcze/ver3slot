-- Modern Logistics Calendar Database Setup
-- This script creates or updates the database structure for the drag & drop calendar system

-- =====================================================
-- 1. CREATE OR UPDATE TABLES
-- =====================================================

-- Companies table (if not exists)
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

-- Users table (enhanced for calendar integration)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    user_type ENUM('super_admin', 'admin', 'logistics', 'driver') NOT NULL,
    company_id INT,
    company_name VARCHAR(255),
    truck_license_plate VARCHAR(20),
    driver_license VARCHAR(50),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    INDEX idx_user_type (user_type),
    INDEX idx_company (company_id),
    INDEX idx_active (is_active)
);

-- Warehouses table (enhanced)
CREATE TABLE IF NOT EXISTS warehouses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_person VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    working_hours_start TIME DEFAULT '08:00:00',
    working_hours_end TIME DEFAULT '16:00:00',
    max_simultaneous_slots INT DEFAULT 10,
    company_id INT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    INDEX idx_company_warehouse (company_id),
    INDEX idx_active_warehouse (is_active)
);

-- Time slots table (main calendar entity)
CREATE TABLE IF NOT EXISTS time_slots (
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
    
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_warehouse_date (warehouse_id, slot_date),
    INDEX idx_date_time (slot_date, slot_time),
    INDEX idx_warehouse_datetime (warehouse_id, slot_date, slot_time),
    INDEX idx_active_slots (is_active),
    INDEX idx_slot_type (slot_type),
    
    -- Unique constraint to prevent overlapping slots
    UNIQUE KEY unique_slot_time (warehouse_id, slot_date, slot_time)
);

-- Bookings table (enhanced with more tracking)
CREATE TABLE IF NOT EXISTS bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    time_slot_id INT NOT NULL,
    driver_id INT NOT NULL,
    truck_license_plate VARCHAR(20) NOT NULL,
    cargo_type VARCHAR(255),
    cargo_weight DECIMAL(10,2),
    estimated_duration INT DEFAULT 60,
    actual_duration INT,
    special_requirements TEXT,
    booking_notes TEXT,
    booking_status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_updated_by INT,
    arrival_time TIMESTAMP NULL,
    departure_time TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (status_updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_slot_status (time_slot_id, booking_status),
    INDEX idx_driver_date (driver_id, created_at),
    INDEX idx_booking_status (booking_status),
    INDEX idx_truck_plate (truck_license_plate),
    INDEX idx_booking_dates (created_at, status_updated_at)
);

-- Slot status history (for tracking changes)
CREATE TABLE IF NOT EXISTS slot_status_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    time_slot_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_by INT,
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_slot_history (time_slot_id, created_at)
);

-- Booking status history (for tracking booking changes)
CREATE TABLE IF NOT EXISTS booking_status_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    old_status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'),
    new_status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'),
    changed_by INT,
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_booking_history (booking_id, created_at)
);

-- =====================================================
-- 2. CREATE VIEWS FOR EASIER DATA ACCESS
-- =====================================================

-- View for slot utilization statistics
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

-- View for upcoming slots with booking details
CREATE OR REPLACE VIEW upcoming_slots AS
SELECT 
    ts.id as slot_id,
    ts.warehouse_id,
    w.name as warehouse_name,
    ts.slot_date,
    ts.slot_time,
    ts.duration_minutes,
    ts.max_capacity,
    ts.slot_type,
    ts.notes,
    COUNT(b.id) as booking_count,
    GROUP_CONCAT(CONCAT(u.full_name, ' (', b.truck_license_plate, ')') SEPARATOR ', ') as bookings_summary
FROM time_slots ts
JOIN warehouses w ON ts.warehouse_id = w.id
LEFT JOIN bookings b ON ts.id = b.time_slot_id 
    AND b.booking_status IN ('confirmed', 'in_progress')
LEFT JOIN users u ON b.driver_id = u.id
WHERE ts.is_active = 1 
    AND ts.slot_date >= CURDATE()
    AND ts.slot_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
GROUP BY ts.id
ORDER BY ts.slot_date, ts.slot_time;

-- =====================================================
-- 3. CREATE STORED PROCEDURES
-- =====================================================

DELIMITER $$

-- Procedure to get available slots for a warehouse and date range
CREATE PROCEDURE GetAvailableSlots(
    IN p_warehouse_id INT,
    IN p_date_from DATE,
    IN p_date_to DATE
)
BEGIN
    SELECT 
        ts.id,
        ts.warehouse_id,
        w.name as warehouse_name,
        ts.slot_date,
        ts.slot_time,
        ts.duration_minutes,
        ts.max_capacity,
        ts.slot_type,
        ts.notes,
        COUNT(b.id) as current_bookings,
        (ts.max_capacity - COUNT(b.id)) as available_spots
    FROM time_slots ts
    JOIN warehouses w ON ts.warehouse_id = w.id
    LEFT JOIN bookings b ON ts.id = b.time_slot_id 
        AND b.booking_status IN ('pending', 'confirmed', 'in_progress')
    WHERE ts.is_active = 1
        AND (p_warehouse_id IS NULL OR ts.warehouse_id = p_warehouse_id)
        AND ts.slot_date BETWEEN p_date_from AND p_date_to
    GROUP BY ts.id
    HAVING available_spots > 0
    ORDER BY ts.slot_date, ts.slot_time;
END$$

-- Procedure to update booking status with history tracking
CREATE PROCEDURE UpdateBookingStatus(
    IN p_booking_id INT,
    IN p_new_status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'),
    IN p_changed_by INT,
    IN p_change_reason TEXT
)
BEGIN
    DECLARE old_status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
    
    -- Get current status
    SELECT booking_status INTO old_status 
    FROM bookings 
    WHERE id = p_booking_id;
    
    -- Update booking status
    UPDATE bookings 
    SET booking_status = p_new_status,
        status_updated_at = NOW(),
        status_updated_by = p_changed_by
    WHERE id = p_booking_id;
    
    -- Insert history record
    INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by, change_reason)
    VALUES (p_booking_id, old_status, p_new_status, p_changed_by, p_change_reason);
END$$

DELIMITER ;

-- =====================================================
-- 4. INSERT SAMPLE DATA (if tables are empty)
-- =====================================================

-- Sample company
INSERT IGNORE INTO companies (id, name, address, contact_email, contact_phone) VALUES 
(1, 'Demo Logistika s.r.o.', 'Praha 1, Václavské náměstí 123', 'info@demologistika.cz', '+420 123 456 789');

-- Sample admin user
INSERT IGNORE INTO users (id, username, email, password, full_name, user_type, company_id) VALUES 
(1, 'admin', 'admin@demologistika.cz', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Admin', 'admin', 1);

-- Sample driver
INSERT IGNORE INTO users (id, username, email, password, full_name, phone, user_type, company_id, truck_license_plate, driver_license) VALUES 
(2, 'driver1', 'driver@demologistika.cz', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jan Novák', '+420 987 654 321', 'driver', 1, '1A2 3456', 'CZ123456789');

-- Sample warehouses
INSERT IGNORE INTO warehouses (id, name, address, contact_person, contact_phone, working_hours_start, working_hours_end, max_simultaneous_slots, company_id) VALUES 
(1, 'Sklad Praha - Střed', 'Praha 1, Národní 123', 'Marie Svobodová', '+420 111 222 333', '06:00:00', '22:00:00', 8, 1),
(2, 'Sklad Brno - Jih', 'Brno, Mendlovo náměstí 456', 'Petr Dvořák', '+420 444 555 666', '07:00:00', '19:00:00', 6, 1),
(3, 'Sklad Ostrava - Sever', 'Ostrava, Stodolní 789', 'Anna Černá', '+420 777 888 999', '06:30:00', '20:30:00', 5, 1),
(4, 'Distribuční centrum', 'České Budějovice, Náměstí 147', 'Tomáš Novotný', '+420 222 333 444', '05:00:00', '23:00:00', 12, 1);

-- Sample time slots for current week
INSERT IGNORE INTO time_slots (warehouse_id, slot_date, slot_time, duration_minutes, max_capacity, slot_type, notes, created_by) VALUES 
-- Monday slots
(1, DATE_ADD(CURDATE(), INTERVAL (1 - WEEKDAY(CURDATE())) DAY), '08:00:00', 60, 2, 'unloading', 'Prioritní dodávky', 1),
(1, DATE_ADD(CURDATE(), INTERVAL (1 - WEEKDAY(CURDATE())) DAY), '10:00:00', 90, 1, 'loading', '', 1),
(1, DATE_ADD(CURDATE(), INTERVAL (1 - WEEKDAY(CURDATE())) DAY), '14:00:00', 60, 2, 'both', 'ORD-2024-001', 1),
(2, DATE_ADD(CURDATE(), INTERVAL (1 - WEEKDAY(CURDATE())) DAY), '09:00:00', 60, 1, 'unloading', '', 1),
(2, DATE_ADD(CURDATE(), INTERVAL (1 - WEEKDAY(CURDATE())) DAY), '15:00:00', 120, 2, 'loading', 'Velká dodávka', 1),

-- Tuesday slots
(1, DATE_ADD(CURDATE(), INTERVAL (2 - WEEKDAY(CURDATE())) DAY), '07:00:00', 60, 1, 'unloading', '', 1),
(1, DATE_ADD(CURDATE(), INTERVAL (2 - WEEKDAY(CURDATE())) DAY), '11:30:00', 60, 2, 'loading', 'ORD-2024-002', 1),
(3, DATE_ADD(CURDATE(), INTERVAL (2 - WEEKDAY(CURDATE())) DAY), '08:30:00', 90, 1, 'both', '', 1),
(3, DATE_ADD(CURDATE(), INTERVAL (2 - WEEKDAY(CURDATE())) DAY), '16:00:00', 60, 1, 'unloading', '', 1),

-- Wednesday slots
(2, DATE_ADD(CURDATE(), INTERVAL (3 - WEEKDAY(CURDATE())) DAY), '06:30:00', 60, 1, 'loading', 'Ranní odvoz', 1),
(2, DATE_ADD(CURDATE(), INTERVAL (3 - WEEKDAY(CURDATE())) DAY), '13:00:00', 60, 2, 'unloading', '', 1),
(4, DATE_ADD(CURDATE(), INTERVAL (3 - WEEKDAY(CURDATE())) DAY), '10:00:00', 120, 3, 'both', 'Distribuční centrum', 1),
(4, DATE_ADD(CURDATE(), INTERVAL (3 - WEEKDAY(CURDATE())) DAY), '18:00:00', 60, 1, 'unloading', '', 1),

-- Thursday slots
(1, DATE_ADD(CURDATE(), INTERVAL (4 - WEEKDAY(CURDATE())) DAY), '09:30:00', 60, 1, 'loading', '', 1),
(3, DATE_ADD(CURDATE(), INTERVAL (4 - WEEKDAY(CURDATE())) DAY), '12:00:00', 90, 2, 'unloading', 'ORD-2024-003', 1),
(3, DATE_ADD(CURDATE(), INTERVAL (4 - WEEKDAY(CURDATE())) DAY), '17:30:00', 60, 1, 'loading', '', 1),

-- Friday slots
(2, DATE_ADD(CURDATE(), INTERVAL (5 - WEEKDAY(CURDATE())) DAY), '08:00:00', 60, 2, 'both', 'Týdenní dodávka', 1),
(4, DATE_ADD(CURDATE(), INTERVAL (5 - WEEKDAY(CURDATE())) DAY), '14:30:00', 90, 2, 'unloading', '', 1),
(4, DATE_ADD(CURDATE(), INTERVAL (5 - WEEKDAY(CURDATE())) DAY), '19:00:00', 60, 1, 'loading', 'Večerní odvoz', 1);

-- Sample bookings
INSERT IGNORE INTO bookings (time_slot_id, driver_id, truck_license_plate, cargo_type, cargo_weight, booking_status) VALUES 
(1, 2, '1A2 3456', 'Elektronika', 2500.00, 'confirmed'),
(3, 2, '1A2 3456', 'Potraviny', 1800.00, 'pending'),
(8, 2, '1A2 3456', 'Textil', 3200.00, 'confirmed');

-- =====================================================
-- 5. CREATE TRIGGERS FOR AUTOMATIC TRACKING
-- =====================================================

DELIMITER $$

-- Trigger to update booking status timestamp
CREATE TRIGGER update_booking_status_time
    BEFORE UPDATE ON bookings
    FOR EACH ROW
BEGIN
    IF OLD.booking_status != NEW.booking_status THEN
        SET NEW.status_updated_at = NOW();
    END IF;
END$$

-- Trigger to set arrival time when status changes to in_progress
CREATE TRIGGER set_arrival_time
    BEFORE UPDATE ON bookings
    FOR EACH ROW
BEGIN
    IF OLD.booking_status != 'in_progress' AND NEW.booking_status = 'in_progress' THEN
        SET NEW.arrival_time = NOW();
    END IF;
END$$

-- Trigger to set departure time when status changes to completed
CREATE TRIGGER set_departure_time
    BEFORE UPDATE ON bookings
    FOR EACH ROW
BEGIN
    IF OLD.booking_status != 'completed' AND NEW.booking_status = 'completed' THEN
        SET NEW.departure_time = NOW();
        SET NEW.actual_duration = TIMESTAMPDIFF(MINUTE, NEW.arrival_time, NOW());
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- 6. GRANT PERMISSIONS (adjust as needed)
-- =====================================================

-- Grant permissions to application user (replace 'app_user' with your username)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON *.* TO 'app_user'@'localhost';
-- FLUSH PRIVILEGES;

-- =====================================================
-- 7. OPTIMIZATION COMMANDS
-- =====================================================

-- Analyze tables for better performance
ANALYZE TABLE companies, users, warehouses, time_slots, bookings, booking_status_history, slot_status_history;

-- Optimize tables
OPTIMIZE TABLE companies, users, warehouses, time_slots, bookings, booking_status_history, slot_status_history;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

SELECT 'Modern Logistics Calendar database setup completed successfully!' as message;

-- Display summary of created tables
SELECT 
    table_name,
    table_rows,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = DATABASE()
    AND table_name IN ('companies', 'users', 'warehouses', 'time_slots', 'bookings', 'booking_status_history', 'slot_status_history')
ORDER BY table_name;