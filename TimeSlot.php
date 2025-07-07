<?php
// classes/TimeSlot.php - Time slot management class s podporou kalendáře
class TimeSlot {
    private $conn;
    private $table = 'time_slots';

    public function __construct($db) {
        $this->conn = $db;
    }

    // Create new time slot
    public function create($data) {
        try {
            $this->conn->beginTransaction();

            // Check for conflicts
            if ($this->hasConflict($data['warehouse_id'], $data['slot_date'], $data['slot_time'], $data['duration_minutes'])) {
                throw new Exception('Časový slot koliduje s existujícím slotem');
            }

            $query = "INSERT INTO " . $this->table . " 
                     (warehouse_id, slot_date, slot_time, duration_minutes, max_capacity, 
                      slot_type, notes, created_by) 
                     VALUES 
                     (:warehouse_id, :slot_date, :slot_time, :duration_minutes, :max_capacity, 
                      :slot_type, :notes, :created_by)";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':warehouse_id', $data['warehouse_id']);
            $stmt->bindParam(':slot_date', $data['slot_date']);
            $stmt->bindParam(':slot_time', $data['slot_time']);
            $stmt->bindParam(':duration_minutes', $data['duration_minutes']);
            $stmt->bindParam(':max_capacity', $data['max_capacity']);
            $stmt->bindParam(':slot_type', $data['slot_type']);
            $stmt->bindParam(':notes', $data['notes']);
            $stmt->bindParam(':created_by', $data['created_by']);

            if ($stmt->execute()) {
                $slotId = $this->conn->lastInsertId();
                $this->conn->commit();
                return $slotId;
            }

            $this->conn->rollback();
            return false;
        } catch(Exception $e) {
            $this->conn->rollback();
            error_log("Time slot creation error: " . $e->getMessage());
            throw $e;
        }
    }

    // Get slots for date range (for calendar view)
    public function getSlotsForDateRange($dateFrom, $dateTo, $companyId = null, $warehouseId = null) {
        try {
            $query = "SELECT ts.*, w.name as warehouse_name, w.company_id,
                            COUNT(b.id) as current_bookings,
                            b.booking_status,
                            b.id as booking_id,
                            u.full_name as created_by_name
                     FROM " . $this->table . " ts
                     JOIN warehouses w ON ts.warehouse_id = w.id
                     LEFT JOIN bookings b ON ts.id = b.time_slot_id 
                         AND b.booking_status IN ('pending', 'confirmed', 'in_progress')
                     LEFT JOIN users u ON ts.created_by = u.id
                     WHERE ts.is_active = 1 
                     AND ts.slot_date BETWEEN :date_from AND :date_to";

            if ($companyId) {
                $query .= " AND w.company_id = :company_id";
            }

            if ($warehouseId) {
                $query .= " AND ts.warehouse_id = :warehouse_id";
            }

            $query .= " GROUP BY ts.id ORDER BY ts.slot_date, ts.slot_time";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':date_from', $dateFrom);
            $stmt->bindParam(':date_to', $dateTo);
            
            if ($companyId) {
                $stmt->bindParam(':company_id', $companyId);
            }
            
            if ($warehouseId) {
                $stmt->bindParam(':warehouse_id', $warehouseId);
            }
            
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            error_log("Get slots for date range error: " . $e->getMessage());
            return [];
        }
    }

    // Update existing time slot
    public function updateSlot($slotId, $data, $userId) {
        try {
            $this->conn->beginTransaction();

            // Get current slot data
            $currentSlot = $this->getSlotById($slotId);
            if (!$currentSlot) {
                throw new Exception('Slot nenalezen');
            }

            // Prepare update data with current values as defaults
            $updateData = [
                'warehouse_id' => $data['warehouse_id'] ?? $currentSlot['warehouse_id'],
                'slot_date' => $data['slot_date'] ?? $currentSlot['slot_date'],
                'slot_time' => $data['slot_time'] ?? $currentSlot['slot_time'],
                'duration_minutes' => $data['duration_minutes'] ?? $currentSlot['duration_minutes'],
                'max_capacity' => $data['max_capacity'] ?? $currentSlot['max_capacity'],
                'slot_type' => $data['slot_type'] ?? $currentSlot['slot_type'],
                'notes' => $data['notes'] ?? $currentSlot['notes']
            ];

            // Check for conflicts if time/date/warehouse changed
            if ($updateData['warehouse_id'] != $currentSlot['warehouse_id'] ||
                $updateData['slot_date'] != $currentSlot['slot_date'] ||
                $updateData['slot_time'] != $currentSlot['slot_time'] ||
                $updateData['duration_minutes'] != $currentSlot['duration_minutes']) {
                
                if ($this->hasConflictExcluding($slotId, $updateData['warehouse_id'], 
                    $updateData['slot_date'], $updateData['slot_time'], $updateData['duration_minutes'])) {
                    throw new Exception('Časový slot koliduje s existujícím slotem');
                }
            }

            $query = "UPDATE " . $this->table . " 
                     SET warehouse_id = :warehouse_id,
                         slot_date = :slot_date,
                         slot_time = :slot_time,
                         duration_minutes = :duration_minutes,
                         max_capacity = :max_capacity,
                         slot_type = :slot_type,
                         notes = :notes,
                         updated_at = NOW()
                     WHERE id = :slot_id";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':slot_id', $slotId);
            $stmt->bindParam(':warehouse_id', $updateData['warehouse_id']);
            $stmt->bindParam(':slot_date', $updateData['slot_date']);
            $stmt->bindParam(':slot_time', $updateData['slot_time']);
            $stmt->bindParam(':duration_minutes', $updateData['duration_minutes']);
            $stmt->bindParam(':max_capacity', $updateData['max_capacity']);
            $stmt->bindParam(':slot_type', $updateData['slot_type']);
            $stmt->bindParam(':notes', $updateData['notes']);

            if ($stmt->execute()) {
                $this->conn->commit();
                return true;
            }

            $this->conn->rollback();
            return false;
        } catch(Exception $e) {
            $this->conn->rollback();
            error_log("Update slot error: " . $e->getMessage());
            throw $e;
        }
    }

    // Get slot by ID with full details including bookings
    public function getSlotById($slotId) {
        try {
            $query = "SELECT ts.*, w.name as warehouse_name, w.company_id,
                            COUNT(b.id) as current_bookings,
                            u.full_name as created_by_name,
                            GROUP_CONCAT(DISTINCT b.booking_status) as booking_statuses
                     FROM " . $this->table . " ts
                     JOIN warehouses w ON ts.warehouse_id = w.id
                     LEFT JOIN bookings b ON ts.id = b.time_slot_id 
                         AND b.booking_status IN ('pending', 'confirmed', 'in_progress')
                     LEFT JOIN users u ON ts.created_by = u.id
                     WHERE ts.id = :slot_id AND ts.is_active = 1
                     GROUP BY ts.id";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':slot_id', $slotId);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                return $stmt->fetch(PDO::FETCH_ASSOC);
            }

            return null;
        } catch(Exception $e) {
            error_log("Get slot by ID error: " . $e->getMessage());
            return null;
        }
    }

    // Get count of active bookings for slot
    public function getActiveBookingsCount($slotId) {
        try {
            $query = "SELECT COUNT(*) FROM bookings 
                     WHERE time_slot_id = :slot_id 
                     AND booking_status IN ('pending', 'confirmed', 'in_progress')";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':slot_id', $slotId);
            $stmt->execute();

            return $stmt->fetch(PDO::FETCH_COLUMN);
        } catch(Exception $e) {
            error_log("Get active bookings count error: " . $e->getMessage());
            return 0;
        }
    }

    // Get detailed bookings for slot
    public function getSlotBookingsDetailed($slotId) {
        try {
            $query = "SELECT b.*, u.full_name as driver_name, u.phone as driver_phone, u.email as driver_email
                     FROM bookings b
                     JOIN users u ON b.driver_id = u.id
                     WHERE b.time_slot_id = :slot_id
                     AND b.booking_status NOT IN ('cancelled')
                     ORDER BY b.created_at";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':slot_id', $slotId);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            error_log("Get slot bookings detailed error: " . $e->getMessage());
            return [];
        }
    }

    // Check for time conflicts
    private function hasConflict($warehouseId, $date, $time, $duration) {
        try {
            $endTime = $this->addMinutes($time, $duration);

            $query = "SELECT COUNT(*) FROM " . $this->table . " 
                     WHERE warehouse_id = :warehouse_id 
                     AND slot_date = :slot_date 
                     AND is_active = 1
                     AND (
                         (slot_time <= :start_time AND ADDTIME(slot_time, SEC_TO_TIME(duration_minutes * 60)) > :start_time)
                         OR 
                         (slot_time < :end_time AND ADDTIME(slot_time, SEC_TO_TIME(duration_minutes * 60)) >= :end_time)
                         OR
                         (slot_time >= :start_time AND slot_time < :end_time)
                     )";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':warehouse_id', $warehouseId);
            $stmt->bindParam(':slot_date', $date);
            $stmt->bindParam(':start_time', $time);
            $stmt->bindParam(':end_time', $endTime);
            $stmt->execute();

            return $stmt->fetch(PDO::FETCH_COLUMN) > 0;
        } catch(Exception $e) {
            error_log("Conflict check error: " . $e->getMessage());
            return true; // Safe side - assume conflict
        }
    }

    // Check for conflicts excluding specific slot
    private function hasConflictExcluding($excludeSlotId, $warehouseId, $date, $time, $duration) {
        try {
            $endTime = $this->addMinutes($time, $duration);

            $query = "SELECT COUNT(*) FROM " . $this->table . " 
                     WHERE warehouse_id = :warehouse_id 
                     AND slot_date = :slot_date 
                     AND is_active = 1
                     AND id != :exclude_slot_id
                     AND (
                         (slot_time <= :start_time AND ADDTIME(slot_time, SEC_TO_TIME(duration_minutes * 60)) > :start_time)
                         OR 
                         (slot_time < :end_time AND ADDTIME(slot_time, SEC_TO_TIME(duration_minutes * 60)) >= :end_time)
                         OR
                         (slot_time >= :start_time AND slot_time < :end_time)
                     )";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':exclude_slot_id', $excludeSlotId);
            $stmt->bindParam(':warehouse_id', $warehouseId);
            $stmt->bindParam(':slot_date', $date);
            $stmt->bindParam(':start_time', $time);
            $stmt->bindParam(':end_time', $endTime);
            $stmt->execute();

            return $stmt->fetch(PDO::FETCH_COLUMN) > 0;
        } catch(Exception $e) {
            error_log("Conflict check excluding error: " . $e->getMessage());
            return true;
        }
    }

    // Add minutes to time
    private function addMinutes($time, $minutes) {
        $timestamp = strtotime($time);
        $newTimestamp = $timestamp + ($minutes * 60);
        return date('H:i:s', $newTimestamp);
    }

    // Get all slots
    public function getAllSlots($companyId = null) {
        try {
            $query = "SELECT ts.*, w.name as warehouse_name, w.company_id,
                            COUNT(b.id) as current_bookings,
                            u.full_name as created_by_name
                     FROM " . $this->table . " ts
                     JOIN warehouses w ON ts.warehouse_id = w.id
                     LEFT JOIN bookings b ON ts.id = b.time_slot_id 
                         AND b.booking_status IN ('pending', 'confirmed', 'in_progress')
                     LEFT JOIN users u ON ts.created_by = u.id
                     WHERE ts.is_active = 1";

            if ($companyId) {
                $query .= " AND w.company_id = :company_id";
            }

            $query .= " GROUP BY ts.id ORDER BY ts.slot_date DESC, ts.slot_time DESC";

            $stmt = $this->conn->prepare($query);
            
            if ($companyId) {
                $stmt->bindParam(':company_id', $companyId);
            }
            
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            error_log("Get all slots error: " . $e->getMessage());
            return [];
        }
    }

    // Get slots for specific date
    public function getSlotsForDate($date, $companyId = null) {
        try {
            $query = "SELECT ts.*, w.name as warehouse_name, w.company_id,
                            COUNT(b.id) as current_bookings,
                            b.booking_status,
                            b.id as booking_id
                     FROM " . $this->table . " ts
                     JOIN warehouses w ON ts.warehouse_id = w.id
                     LEFT JOIN bookings b ON ts.id = b.time_slot_id 
                         AND b.booking_status IN ('pending', 'confirmed', 'in_progress')
                     WHERE ts.is_active = 1 AND ts.slot_date = :date";

            if ($companyId) {
                $query .= " AND w.company_id = :company_id";
            }

            $query .= " GROUP BY ts.id ORDER BY ts.slot_time";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':date', $date);
            
            if ($companyId) {
                $stmt->bindParam(':company_id', $companyId);
            }
            
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            error_log("Get slots for date error: " . $e->getMessage());
            return [];
        }
    }

    // Get available slots for warehouse and date
    public function getAvailableSlots($warehouseId, $date) {
        try {
            $query = "SELECT ts.*, w.name as warehouse_name,
                            COUNT(b.id) as current_bookings
                     FROM " . $this->table . " ts
                     JOIN warehouses w ON ts.warehouse_id = w.id
                     LEFT JOIN bookings b ON ts.id = b.time_slot_id 
                         AND b.booking_status IN ('pending', 'confirmed', 'in_progress')
                     WHERE ts.warehouse_id = :warehouse_id 
                     AND ts.slot_date = :date 
                     AND ts.is_active = 1
                     GROUP BY ts.id
                     HAVING (ts.max_capacity - COUNT(b.id)) > 0
                     ORDER BY ts.slot_time";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':warehouse_id', $warehouseId);
            $stmt->bindParam(':date', $date);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            error_log("Get available slots error: " . $e->getMessage());
            return [];
        }
    }

    // Delete slot (soft delete)
    public function deleteSlot($slotId) {
        try {
            // Check if slot has bookings
            $query = "SELECT COUNT(*) FROM bookings WHERE time_slot_id = :slot_id AND booking_status NOT IN ('cancelled')";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':slot_id', $slotId);
            $stmt->execute();

            if ($stmt->fetch(PDO::FETCH_COLUMN) > 0) {
                throw new Exception('Nelze smazat slot s aktivními rezervacemi');
            }

            // Soft delete
            $deleteQuery = "UPDATE " . $this->table . " SET is_active = 0, updated_at = NOW() WHERE id = :slot_id";
            $deleteStmt = $this->conn->prepare($deleteQuery);
            $deleteStmt->bindParam(':slot_id', $slotId);

            return $deleteStmt->execute();
        } catch(Exception $e) {
            error_log("Delete slot error: " . $e->getMessage());
            throw $e;
        }
    }

    // Get slot utilization statistics
    public function getSlotUtilization($warehouseId = null, $dateFrom = null, $dateTo = null) {
        try {
            $query = "SELECT 
                        DATE(ts.slot_date) as date,
                        COUNT(ts.id) as total_slots,
                        COUNT(b.id) as booked_slots,
                        ROUND((COUNT(b.id) / COUNT(ts.id)) * 100, 2) as utilization_percent
                     FROM " . $this->table . " ts
                     JOIN warehouses w ON ts.warehouse_id = w.id
                     LEFT JOIN bookings b ON ts.id = b.time_slot_id 
                         AND b.booking_status IN ('confirmed', 'in_progress', 'completed')
                     WHERE ts.is_active = 1";

            if ($warehouseId) {
                $query .= " AND ts.warehouse_id = :warehouse_id";
            }

            if ($dateFrom) {
                $query .= " AND ts.slot_date >= :date_from";
            }

            if ($dateTo) {
                $query .= " AND ts.slot_date <= :date_to";
            }

            $query .= " GROUP BY DATE(ts.slot_date) ORDER BY date DESC";

            $stmt = $this->conn->prepare($query);

            if ($warehouseId) {
                $stmt->bindParam(':warehouse_id', $warehouseId);
            }

            if ($dateFrom) {
                $stmt->bindParam(':date_from', $dateFrom);
            }

            if ($dateTo) {
                $stmt->bindParam(':date_to', $dateTo);
            }

            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            error_log("Get slot utilization error: " . $e->getMessage());
            return [];
        }
    }

    // Bulk create slots
    public function bulkCreateSlots($templateData, $dates) {
        try {
            $this->conn->beginTransaction();
            $created = 0;
            $errors = [];

            foreach ($dates as $date) {
                $slotData = $templateData;
                $slotData['slot_date'] = $date;

                try {
                    $slotId = $this->create($slotData);
                    if ($slotId) {
                        $created++;
                    } else {
                        $errors[] = "Chyba při vytváření slotu pro $date";
                    }
                } catch (Exception $e) {
                    $errors[] = "Chyba pro $date: " . $e->getMessage();
                }
            }

            if ($created > 0) {
                $this->conn->commit();
                return [
                    'success' => true,
                    'created' => $created,
                    'errors' => $errors
                ];
            } else {
                $this->conn->rollback();
                return [
                    'success' => false,
                    'created' => 0,
                    'errors' => $errors
                ];
            }
        } catch(Exception $e) {
            $this->conn->rollback();
            error_log("Bulk create slots error: " . $e->getMessage());
            return [
                'success' => false,
                'created' => 0,
                'errors' => [$e->getMessage()]
            ];
        }
    }

    // Get slots by warehouse
    public function getSlotsByWarehouse($warehouseId, $dateFrom = null, $dateTo = null) {
        try {
            $query = "SELECT ts.*, COUNT(b.id) as current_bookings
                     FROM " . $this->table . " ts
                     LEFT JOIN bookings b ON ts.id = b.time_slot_id 
                         AND b.booking_status IN ('pending', 'confirmed', 'in_progress')
                     WHERE ts.warehouse_id = :warehouse_id 
                     AND ts.is_active = 1";

            if ($dateFrom) {
                $query .= " AND ts.slot_date >= :date_from";
            }

            if ($dateTo) {
                $query .= " AND ts.slot_date <= :date_to";
            }

            $query .= " GROUP BY ts.id ORDER BY ts.slot_date, ts.slot_time";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':warehouse_id', $warehouseId);

            if ($dateFrom) {
                $stmt->bindParam(':date_from', $dateFrom);
            }

            if ($dateTo) {
                $stmt->bindParam(':date_to', $dateTo);
            }

            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            error_log("Get slots by warehouse error: " . $e->getMessage());
            return [];
        }
    }

    // Check warehouse capacity for date
    public function checkWarehouseCapacity($warehouseId, $date) {
        try {
            $query = "SELECT w.max_simultaneous_slots,
                            COUNT(ts.id) as current_slots
                     FROM warehouses w
                     LEFT JOIN " . $this->table . " ts ON w.id = ts.warehouse_id 
                         AND ts.slot_date = :date 
                         AND ts.is_active = 1
                     WHERE w.id = :warehouse_id
                     GROUP BY w.id";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':warehouse_id', $warehouseId);
            $stmt->bindParam(':date', $date);
            $stmt->execute();

            if ($stmt->rowCount() > 0) {
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                return [
                    'max_capacity' => $result['max_simultaneous_slots'],
                    'current_slots' => $result['current_slots'],
                    'available_slots' => $result['max_simultaneous_slots'] - $result['current_slots']
                ];
            }

            return null;
        } catch(Exception $e) {
            error_log("Check warehouse capacity error: " . $e->getMessage());
            return null;
        }
    }

    // Get today's slots
    public function getTodaysSlots($companyId = null) {
        try {
            $today = date('Y-m-d');
            return $this->getSlotsForDate($today, $companyId);
        } catch(Exception $e) {
            error_log("Get today's slots error: " . $e->getMessage());
            return [];
        }
    }

    // Get upcoming slots
    public function getUpcomingSlots($days = 7, $companyId = null) {
        try {
            $dateFrom = date('Y-m-d');
            $dateTo = date('Y-m-d', strtotime("+$days days"));

            $query = "SELECT ts.*, w.name as warehouse_name, w.company_id,
                            COUNT(b.id) as current_bookings
                     FROM " . $this->table . " ts
                     JOIN warehouses w ON ts.warehouse_id = w.id
                     LEFT JOIN bookings b ON ts.id = b.time_slot_id 
                         AND b.booking_status IN ('pending', 'confirmed', 'in_progress')
                     WHERE ts.is_active = 1 
                     AND ts.slot_date BETWEEN :date_from AND :date_to";

            if ($companyId) {
                $query .= " AND w.company_id = :company_id";
            }

            $query .= " GROUP BY ts.id ORDER BY ts.slot_date, ts.slot_time";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':date_from', $dateFrom);
            $stmt->bindParam(':date_to', $dateTo);
            
            if ($companyId) {
                $stmt->bindParam(':company_id', $companyId);
            }
            
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            error_log("Get upcoming slots error: " . $e->getMessage());
            return [];
        }
    }

    // Calendar specific methods

    // Get slots with booking details for calendar display
    public function getSlotsWithBookings($dateFrom, $dateTo, $companyId = null, $warehouseId = null) {
        try {
            $query = "SELECT ts.*, w.name as warehouse_name, w.company_id,
                            b.id as booking_id,
                            b.booking_status,
                            b.truck_license_plate,
                            b.cargo_type,
                            b.driver_id,
                            u.full_name as driver_name,
                            COUNT(DISTINCT b.id) as current_bookings
                     FROM " . $this->table . " ts
                     JOIN warehouses w ON ts.warehouse_id = w.id
                     LEFT JOIN bookings b ON ts.id = b.time_slot_id 
                         AND b.booking_status NOT IN ('cancelled')
                     LEFT JOIN users u ON b.driver_id = u.id
                     WHERE ts.is_active = 1 
                     AND ts.slot_date BETWEEN :date_from AND :date_to";

            if ($companyId) {
                $query .= " AND w.company_id = :company_id";
            }

            if ($warehouseId) {
                $query .= " AND ts.warehouse_id = :warehouse_id";
            }

            $query .= " GROUP BY ts.id, b.id ORDER BY ts.slot_date, ts.slot_time";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':date_from', $dateFrom);
            $stmt->bindParam(':date_to', $dateTo);
            
            if ($companyId) {
                $stmt->bindParam(':company_id', $companyId);
            }
            
            if ($warehouseId) {
                $stmt->bindParam(':warehouse_id', $warehouseId);
            }
            
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch(Exception $e) {
            error_log("Get slots with bookings error: " . $e->getMessage());
            return [];
        }
    }

    // Check if slot can be moved to new time
    public function canMoveSlot($slotId, $newDate, $newTime, $duration) {
        try {
            // Get current slot
            $currentSlot = $this->getSlotById($slotId);
            if (!$currentSlot) {
                return false;
            }

            // Check for conflicts excluding current slot
            return !$this->hasConflictExcluding($slotId, $currentSlot['warehouse_id'], $newDate, $newTime, $duration);
        } catch(Exception $e) {
            error_log("Can move slot error: " . $e->getMessage());
            return false;
        }
    }

    // Move slot to new date/time (for drag & drop)
    public function moveSlot($slotId, $newDate, $newTime) {
        try {
            $this->conn->beginTransaction();

            // Get current slot
            $currentSlot = $this->getSlotById($slotId);
            if (!$currentSlot) {
                throw new Exception('Slot nenalezen');
            }

            // Check if slot has active bookings
            if ($currentSlot['current_bookings'] > 0) {
                throw new Exception('Nelze přesunout slot s aktivními rezervacemi');
            }

            // Check for conflicts
            if ($this->hasConflictExcluding($slotId, $currentSlot['warehouse_id'], $newDate, $newTime, $currentSlot['duration_minutes'])) {
                throw new Exception('Kolize s jiným slotem');
            }

            // Update slot
            $query = "UPDATE " . $this->table . " 
                     SET slot_date = :new_date, slot_time = :new_time, updated_at = NOW()
                     WHERE id = :slot_id";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':slot_id', $slotId);
            $stmt->bindParam(':new_date', $newDate);
            $stmt->bindParam(':new_time', $newTime);

            if ($stmt->execute()) {
                $this->conn->commit();
                return true;
            }

            $this->conn->rollback();
            return false;
        } catch(Exception $e) {
            $this->conn->rollback();
            error_log("Move slot error: " . $e->getMessage());
            throw $e;
        }
    }
}
?>