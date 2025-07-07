<?php
// api/slots.php - Time slots management with calendar support
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

include_once '../config/database.php';
include_once '../classes/TimeSlot.php';
include_once '../middleware/license_check.php';

function authenticate() {
    if(!isset($_SESSION['user_id']) || !isset($_SESSION['user_type'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Neautorizovaný přístup']);
        exit;
    }
    return $_SESSION;
}

function checkAdminAccess($user) {
    if (!in_array($user['user_type'], ['super_admin', 'admin', 'logistics'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Nemáte oprávnění ke správě slotů']);
        exit;
    }
}

function validateSlotData($data, $isUpdate = false) {
    $errors = [];
    
    if (!$isUpdate || isset($data['warehouse_id'])) {
        if (empty($data['warehouse_id'])) {
            $errors[] = 'Sklad je povinný';
        }
    }
    
    if (!$isUpdate || isset($data['slot_date'])) {
        if (empty($data['slot_date'])) {
            $errors[] = 'Datum je povinné';
        } elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data['slot_date'])) {
            $errors[] = 'Neplatný formát data';
        } elseif (!$isUpdate && strtotime($data['slot_date']) < strtotime(date('Y-m-d'))) {
            $errors[] = 'Nelze vytvořit slot v minulosti';
        }
    }
    
    if (!$isUpdate || isset($data['slot_time'])) {
        if (empty($data['slot_time'])) {
            $errors[] = 'Čas je povinný';
        } elseif (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $data['slot_time'])) {
            $errors[] = 'Neplatný formát času';
        }
    }
    
    if (isset($data['duration_minutes'])) {
        $duration = intval($data['duration_minutes']);
        if ($duration < 15 || $duration > 480) {
            $errors[] = 'Délka slotu musí být mezi 15 a 480 minuty';
        }
    }
    
    if (isset($data['max_capacity'])) {
        $capacity = intval($data['max_capacity']);
        if ($capacity < 1 || $capacity > 50) {
            $errors[] = 'Kapacita musí být mezi 1 a 50';
        }
    }
    
    return $errors;
}

function logSlotAction($action, $slot_id, $user_id, $old_data = null, $new_data = null) {
    try {
        $logEntry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'action' => $action,
            'slot_id' => $slot_id,
            'user_id' => $user_id,
            'old_data' => $old_data,
            'new_data' => $new_data,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ];
        error_log('SLOT_ACTION: ' . json_encode($logEntry));
    } catch (Exception $e) {
        error_log('Slot action log error: ' . $e->getMessage());
    }
}

$database = new Database();
$db = $database->connect();
$timeSlot = new TimeSlot($db);

$user = authenticate();

// Check license for company users
if (isset($_SESSION['company_id'])) {
    try {
        checkLicenseMiddleware($_SESSION['company_id'], 'calendar');
    } catch(Exception $e) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Neplatná licence firmy',
            'code' => 'LICENSE_EXPIRED',
            'message' => $e->getMessage()
        ]);
        exit;
    }
}

switch($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        try {
            if (isset($_GET['id'])) {
                // Get specific slot by ID
                $slot_id = intval($_GET['id']);
                $slot = $timeSlot->getSlotById($slot_id);
                
                if ($slot) {
                    // Check company access
                    if ($user['user_type'] !== 'super_admin' && 
                        isset($_SESSION['company_id']) && 
                        $slot['company_id'] != $_SESSION['company_id']) {
                        http_response_code(403);
                        echo json_encode(['error' => 'Nemáte oprávnění k tomuto slotu']);
                        exit;
                    }
                    
                    echo json_encode([
                        'success' => true,
                        'slot' => $slot
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Slot nenalezen']);
                }
                
            } elseif (isset($_GET['date_from']) && isset($_GET['date_to'])) {
                // Get slots for date range (for calendar)
                $date_from = $_GET['date_from'];
                $date_to = $_GET['date_to'];
                $warehouse_id = isset($_GET['warehouse_id']) ? intval($_GET['warehouse_id']) : null;
                
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date_from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date_to)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Neplatný formát data']);
                    exit;
                }
                
                $company_id = $user['user_type'] === 'super_admin' ? null : $_SESSION['company_id'];
                $slots = $timeSlot->getSlotsForDateRange($date_from, $date_to, $company_id, $warehouse_id);
                
                echo json_encode([
                    'success' => true,
                    'slots' => $slots
                ]);
                
            } elseif (isset($_GET['warehouse_id']) && isset($_GET['date'])) {
                // Get available slots for specific warehouse and date
                $warehouse_id = intval($_GET['warehouse_id']);
                $date = $_GET['date'];
                
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Neplatný formát data']);
                    exit;
                }
                
                $slots = $timeSlot->getAvailableSlots($warehouse_id, $date);
                
                echo json_encode([
                    'success' => true,
                    'slots' => $slots
                ]);
                
            } elseif (isset($_GET['date'])) {
                // Get all slots for specific date
                $date = $_GET['date'];
                
                if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Neplatný formát data']);
                    exit;
                }
                
                $company_id = $user['user_type'] === 'super_admin' ? null : $_SESSION['company_id'];
                $slots = $timeSlot->getSlotsForDate($date, $company_id);
                
                echo json_encode([
                    'success' => true,
                    'slots' => $slots
                ]);
                
            } else {
                // Get all slots
                $company_id = $user['user_type'] === 'super_admin' ? null : $_SESSION['company_id'];
                $slots = $timeSlot->getAllSlots($company_id);
                
                echo json_encode([
                    'success' => true,
                    'slots' => $slots
                ]);
            }
            
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;
        
    case 'POST':
        checkAdminAccess($user);
        
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (!$data) {
                http_response_code(400);
                echo json_encode(['error' => 'Neplatná JSON data']);
                exit;
            }
            
            // Validation
            $errors = validateSlotData($data);
            if (!empty($errors)) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Chyby ve validaci',
                    'errors' => $errors
                ]);
                exit;
            }
            
            // Set default values
            $data['duration_minutes'] = $data['duration_minutes'] ?? 60;
            $data['max_capacity'] = $data['max_capacity'] ?? 1;
            $data['slot_type'] = $data['slot_type'] ?? 'unloading';
            $data['notes'] = $data['notes'] ?? '';
            $data['created_by'] = $user['user_id'];
            
            $result = $timeSlot->create($data);
            
            if ($result) {
                logSlotAction('created', $result, $user['user_id'], null, $data);
                
                echo json_encode([
                    'success' => true,
                    'slot_id' => $result,
                    'message' => 'Časový slot byl úspěšně vytvořen'
                ]);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Chyba při vytváření slotu']);
            }
            
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;
        
    case 'PUT':
        checkAdminAccess($user);
        
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (!$data || !isset($data['slot_id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID slotu je povinné']);
                exit;
            }
            
            $slot_id = intval($data['slot_id']);
            
            // Get current slot data for logging
            $currentSlot = $timeSlot->getSlotById($slot_id);
            if (!$currentSlot) {
                http_response_code(404);
                echo json_encode(['error' => 'Slot nenalezen']);
                exit;
            }
            
            // Check company access
            if ($user['user_type'] !== 'super_admin' && 
                isset($_SESSION['company_id']) && 
                $currentSlot['company_id'] != $_SESSION['company_id']) {
                http_response_code(403);
                echo json_encode(['error' => 'Nemáte oprávnění k tomuto slotu']);
                exit;
            }
            
            // Check if slot has active bookings
            $activeBookings = $timeSlot->getActiveBookingsCount($slot_id);
            if ($activeBookings > 0) {
                // If there are active bookings, limit what can be changed
                $allowedChanges = ['notes', 'max_capacity'];
                $hasRestrictedChanges = false;
                
                foreach ($data as $key => $value) {
                    if ($key !== 'slot_id' && !in_array($key, $allowedChanges)) {
                        if (isset($currentSlot[$key]) && $currentSlot[$key] != $value) {
                            $hasRestrictedChanges = true;
                            break;
                        }
                    }
                }
                
                if ($hasRestrictedChanges) {
                    http_response_code(400);
                    echo json_encode([
                        'error' => 'Slot má aktivní rezervace. Můžete změnit pouze poznámky a kapacitu.',
                        'active_bookings' => $activeBookings
                    ]);
                    exit;
                }
                
                // Check if new capacity is not lower than current bookings
                if (isset($data['max_capacity']) && $data['max_capacity'] < $activeBookings) {
                    http_response_code(400);
                    echo json_encode([
                        'error' => "Kapacita nemůže být nižší než počet aktivních rezervací ({$activeBookings})"
                    ]);
                    exit;
                }
            }
            
            // Validation for updates
            $errors = validateSlotData($data, true);
            if (!empty($errors)) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Chyby ve validaci',
                    'errors' => $errors
                ]);
                exit;
            }
            
            // Ensure time format is correct
            if (isset($data['slot_time']) && strlen($data['slot_time']) === 5) {
                $data['slot_time'] .= ':00';
            }
            
            // Set default values for missing fields
            $data['duration_minutes'] = $data['duration_minutes'] ?? $currentSlot['duration_minutes'];
            $data['max_capacity'] = $data['max_capacity'] ?? $currentSlot['max_capacity'];
            $data['slot_type'] = $data['slot_type'] ?? $currentSlot['slot_type'];
            $data['notes'] = $data['notes'] ?? $currentSlot['notes'];
            
            $result = $timeSlot->updateSlot($slot_id, $data, $user['user_id']);
            
            if ($result) {
                logSlotAction('updated', $slot_id, $user['user_id'], $currentSlot, $data);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Časový slot byl aktualizován',
                    'active_bookings' => $activeBookings
                ]);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Chyba při aktualizaci slotu']);
            }
            
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;
        
    case 'DELETE':
        checkAdminAccess($user);
        
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (!$data || !isset($data['slot_id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID slotu je povinné']);
                exit;
            }
            
            $slot_id = intval($data['slot_id']);
            
            // Get current slot data for logging
            $currentSlot = $timeSlot->getSlotById($slot_id);
            if (!$currentSlot) {
                http_response_code(404);
                echo json_encode(['error' => 'Slot nenalezen']);
                exit;
            }
            
            // Check company access
            if ($user['user_type'] !== 'super_admin' && 
                isset($_SESSION['company_id']) && 
                $currentSlot['company_id'] != $_SESSION['company_id']) {
                http_response_code(403);
                echo json_encode(['error' => 'Nemáte oprávnění k tomuto slotu']);
                exit;
            }
            
            $result = $timeSlot->deleteSlot($slot_id);
            
            if ($result) {
                logSlotAction('deleted', $slot_id, $user['user_id'], $currentSlot, null);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Časový slot byl smazán'
                ]);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Chyba při mazání slotu']);
            }
            
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Metoda není povolena']);
        break;
}
?>