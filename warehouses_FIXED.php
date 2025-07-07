<?php
// api/warehouses.php - FIXED VERSION bez middleware závislostí
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

include_once '../config/database.php';

function authenticate() {
    if(!isset($_SESSION['user_id']) || !isset($_SESSION['user_type'])) {
        http_response_code(401);
        echo json_encode([
            'error' => 'Neautorizovaný přístup',
            'code' => 'UNAUTHORIZED'
        ]);
        exit;
    }
    return $_SESSION;
}

function checkCreateDeleteAccess($user) {
    // Super admin a admin může vytvářet a mazat sklady
    if (!in_array($user['user_type'], ['super_admin', 'admin'])) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Nemáte oprávnění k této akci',
            'message' => 'Pouze Super Admin a Admin může spravovat sklady',
            'code' => 'INSUFFICIENT_PERMISSIONS'
        ]);
        exit;
    }
}

function checkEditAccess($user) {
    // Super admin, admin a logistics mohou editovat
    if (!in_array($user['user_type'], ['super_admin', 'admin', 'logistics'])) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Nemáte oprávnění k úpravě skladů',
            'message' => 'Pouze Admin a Logistika mohou upravovat sklady',
            'code' => 'INSUFFICIENT_PERMISSIONS'
        ]);
        exit;
    }
}

function checkViewAccess($user) {
    // Všichni ověření uživatelé mohou zobrazit sklady
    if (!in_array($user['user_type'], ['super_admin', 'admin', 'logistics', 'driver'])) {
        http_response_code(403);
        echo json_encode([
            'error' => 'Nemáte oprávnění k zobrazení skladů',
            'code' => 'INSUFFICIENT_PERMISSIONS'
        ]);
        exit;
    }
}

function validateWarehouseData($data, $isEdit = false) {
    $errors = [];
    
    // Název je povinný
    if (empty($data['name']) || trim($data['name']) === '') {
        $errors[] = 'Název skladu je povinný';
    }
    
    // Validace emailu (pokud je zadán)
    if (!empty($data['contact_email']) && !filter_var($data['contact_email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Neplatný formát emailu';
    }
    
    // Validace pracovní doby
    if (!empty($data['working_hours_start']) && !empty($data['working_hours_end'])) {
        if ($data['working_hours_start'] >= $data['working_hours_end']) {
            $errors[] = 'Čas konce musí být později než čas začátku';
        }
    }
    
    // Validace maximálního počtu slotů
    if (isset($data['max_simultaneous_slots'])) {
        $maxSlots = intval($data['max_simultaneous_slots']);
        if ($maxSlots < 1 || $maxSlots > 100) {
            $errors[] = 'Maximální počet slotů musí být mezi 1 a 100';
        }
    }
    
    return $errors;
}

// Zkontroluj zda existuje sloupec created_by
function hasCreatedByColumn($db) {
    try {
        $stmt = $db->query("SHOW COLUMNS FROM warehouses LIKE 'created_by'");
        return $stmt->rowCount() > 0;
    } catch (Exception $e) {
        return false;
    }
}

$database = new Database();
$db = $database->connect();
$user = authenticate();

// Zkontroluj strukturu tabulky
$hasCreatedBy = hasCreatedByColumn($db);

switch($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        checkViewAccess($user);
        
        try {
            $company_id = $user['user_type'] === 'super_admin' ? null : ($_SESSION['company_id'] ?? null);
            
            // Pokud je požadován konkrétní sklad
            if (isset($_GET['id'])) {
                $warehouse_id = intval($_GET['id']);
                
                $query = "SELECT * FROM warehouses WHERE id = :warehouse_id AND is_active = 1";
                if ($company_id) {
                    $query .= " AND company_id = :company_id";
                }
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(':warehouse_id', $warehouse_id);
                if ($company_id) {
                    $stmt->bindParam(':company_id', $company_id);
                }
                $stmt->execute();
                
                if ($stmt->rowCount() > 0) {
                    $warehouse = $stmt->fetch(PDO::FETCH_ASSOC);
                    echo json_encode([
                        'success' => true,
                        'warehouse' => $warehouse,
                        'timestamp' => date('Y-m-d H:i:s')
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'error' => 'Sklad nenalezen',
                        'code' => 'WAREHOUSE_NOT_FOUND'
                    ]);
                }
                
            } else {
                // Všechny sklady - zjednoduší se dotaz
                $query = "SELECT w.* FROM warehouses w WHERE w.is_active = 1";
                
                if ($company_id) {
                    $query .= " AND w.company_id = :company_id";
                }
                
                $query .= " ORDER BY w.name";
                
                $stmt = $db->prepare($query);
                if ($company_id) {
                    $stmt->bindParam(':company_id', $company_id);
                }
                $stmt->execute();
                
                $warehouses = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'warehouses' => $warehouses,
                    'count' => count($warehouses),
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            }
            
        } catch(Exception $e) {
            error_log('Warehouse GET error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'error' => 'Chyba při načítání skladů',
                'code' => 'DATABASE_ERROR',
                'message' => $e->getMessage()
            ]);
        }
        break;
        
    case 'POST':
        checkCreateDeleteAccess($user);
        
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (!$data) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Neplatná JSON data',
                    'code' => 'INVALID_JSON'
                ]);
                exit;
            }
            
            // Validace
            $errors = validateWarehouseData($data);
            if (!empty($errors)) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Chyby ve validaci',
                    'code' => 'VALIDATION_ERROR',
                    'errors' => $errors
                ]);
                exit;
            }
            
            // Set company_id for non-super-admin users
            $company_id = $user['user_type'] === 'super_admin' ? ($data['company_id'] ?? 1) : ($_SESSION['company_id'] ?? 1);
            
            if ($hasCreatedBy) {
                $query = "INSERT INTO warehouses (
                            company_id, name, address, contact_person, contact_phone, contact_email, 
                            working_hours_start, working_hours_end, max_simultaneous_slots, created_by
                          ) VALUES (
                            :company_id, :name, :address, :contact_person, :contact_phone, :contact_email, 
                            :working_hours_start, :working_hours_end, :max_simultaneous_slots, :created_by
                          )";
            } else {
                $query = "INSERT INTO warehouses (
                            company_id, name, address, contact_person, contact_phone, contact_email, 
                            working_hours_start, working_hours_end, max_simultaneous_slots
                          ) VALUES (
                            :company_id, :name, :address, :contact_person, :contact_phone, :contact_email, 
                            :working_hours_start, :working_hours_end, :max_simultaneous_slots
                          )";
            }
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':company_id', $company_id);
            $stmt->bindParam(':name', trim($data['name']));
            $stmt->bindParam(':address', $data['address'] ?? '');
            $stmt->bindParam(':contact_person', $data['contact_person'] ?? '');
            $stmt->bindParam(':contact_phone', $data['contact_phone'] ?? '');
            $stmt->bindParam(':contact_email', $data['contact_email'] ?? '');
            $stmt->bindParam(':working_hours_start', $data['working_hours_start'] ?? '08:00:00');
            $stmt->bindParam(':working_hours_end', $data['working_hours_end'] ?? '16:00:00');
            $stmt->bindParam(':max_simultaneous_slots', $data['max_simultaneous_slots'] ?? 5);
            
            if ($hasCreatedBy) {
                $stmt->bindParam(':created_by', $user['user_id']);
            }
            
            if ($stmt->execute()) {
                $warehouse_id = $db->lastInsertId();
                
                echo json_encode([
                    'success' => true,
                    'warehouse_id' => $warehouse_id,
                    'message' => 'Sklad byl úspěšně vytvořen',
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Chyba při vytváření skladu',
                    'code' => 'CREATION_FAILED'
                ]);
            }
            
        } catch(Exception $e) {
            error_log('Warehouse POST error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'error' => 'Chyba serveru při vytváření skladu',
                'code' => 'SERVER_ERROR',
                'message' => $e->getMessage()
            ]);
        }
        break;
        
    case 'PUT':
        checkEditAccess($user);
        
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (!$data || !isset($data['warehouse_id'])) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'ID skladu je povinné',
                    'code' => 'MISSING_WAREHOUSE_ID'
                ]);
                exit;
            }
            
            $warehouse_id = intval($data['warehouse_id']);
            
            // Validace
            $errors = validateWarehouseData($data, true);
            if (!empty($errors)) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Chyby ve validaci',
                    'code' => 'VALIDATION_ERROR',
                    'errors' => $errors
                ]);
                exit;
            }
            
            $query = "UPDATE warehouses SET 
                        name = :name, 
                        address = :address, 
                        contact_person = :contact_person, 
                        contact_phone = :contact_phone, 
                        contact_email = :contact_email, 
                        working_hours_start = :working_hours_start, 
                        working_hours_end = :working_hours_end, 
                        max_simultaneous_slots = :max_simultaneous_slots,
                        updated_at = NOW()
                      WHERE id = :warehouse_id";
            
            // Add company restriction for non-super-admin
            if ($user['user_type'] !== 'super_admin' && isset($_SESSION['company_id'])) {
                $query .= " AND company_id = :company_id";
            }
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':warehouse_id', $warehouse_id);
            $stmt->bindParam(':name', trim($data['name']));
            $stmt->bindParam(':address', $data['address'] ?? '');
            $stmt->bindParam(':contact_person', $data['contact_person'] ?? '');
            $stmt->bindParam(':contact_phone', $data['contact_phone'] ?? '');
            $stmt->bindParam(':contact_email', $data['contact_email'] ?? '');
            $stmt->bindParam(':working_hours_start', $data['working_hours_start'] ?? '08:00:00');
            $stmt->bindParam(':working_hours_end', $data['working_hours_end'] ?? '16:00:00');
            $stmt->bindParam(':max_simultaneous_slots', $data['max_simultaneous_slots'] ?? 5);
            
            if ($user['user_type'] !== 'super_admin' && isset($_SESSION['company_id'])) {
                $stmt->bindParam(':company_id', $_SESSION['company_id']);
            }
            
            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Sklad byl úspěšně aktualizován',
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Chyba při aktualizaci skladu',
                    'code' => 'UPDATE_FAILED'
                ]);
            }
            
        } catch(Exception $e) {
            error_log('Warehouse PUT error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'error' => 'Chyba serveru při aktualizaci skladu',
                'code' => 'SERVER_ERROR',
                'message' => $e->getMessage()
            ]);
        }
        break;
        
    case 'DELETE':
        checkCreateDeleteAccess($user);
        
        try {
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (!$data || !isset($data['warehouse_id'])) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'ID skladu je povinné',
                    'code' => 'MISSING_WAREHOUSE_ID'
                ]);
                exit;
            }
            
            $warehouse_id = intval($data['warehouse_id']);
            
            // Soft delete
            $query = "UPDATE warehouses SET is_active = 0, updated_at = NOW() WHERE id = :warehouse_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':warehouse_id', $warehouse_id);
            
            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Sklad byl úspěšně smazán',
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'error' => 'Chyba při mazání skladu',
                    'code' => 'DELETE_FAILED'
                ]);
            }
            
        } catch(Exception $e) {
            error_log('Warehouse DELETE error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'error' => 'Chyba serveru při mazání skladu',
                'code' => 'SERVER_ERROR',
                'message' => $e->getMessage()
            ]);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode([
            'error' => 'Metoda není povolena',
            'code' => 'METHOD_NOT_ALLOWED'
        ]);
        break;
}
?>