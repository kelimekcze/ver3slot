// js/auth.js - Authentication and Registration (KOMPLETNÍ OPRAVENO)
class AuthManager {
    constructor() {
        this.apiBase = this.getApiBasePath();
        console.log('AuthManager: Initializing with API base:', this.apiBase);
        this.setupEventListeners();
    }

    // Automatické určení správné cesty k API
    getApiBasePath() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/js/') || currentPath.includes('/css/')) {
            return '../api'; // Pokud jsme v podsložce
        }
        return 'api'; // Pokud jsme v root
    }

    setupEventListeners() {
        console.log('AuthManager: Setting up event listeners...');
        
        // Počkáme na DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.attachEventListeners();
            });
        } else {
            this.attachEventListeners();
        }
    }

    attachEventListeners() {
        console.log('AuthManager: Attaching event listeners...');
        
        // Login form - KRITICKÉ!
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            console.log('AuthManager: ✅ Login form found, attaching listener');
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
            
            // Ověříme že se listener připojil
            console.log('AuthManager: Event listeners on login form:', loginForm);
        } else {
            console.error('AuthManager: ❌ Login form NOT found!');
        }
        
        // Register form  
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            console.log('AuthManager: ✅ Register form found');
            registerForm.addEventListener('submit', this.handleRegister.bind(this));
        }
        
        // Show/hide registration
        const showRegister = document.getElementById('showRegister');
        if (showRegister) {
            showRegister.addEventListener('click', this.showRegisterForm.bind(this));
        }
        
        const showLogin = document.getElementById('showLogin');
        if (showLogin) {
            showLogin.addEventListener('click', this.showLoginForm.bind(this));
        }
        
        // User type change for registration
        const userTypeSelect = document.getElementById('reg_user_type');
        if (userTypeSelect) {
            userTypeSelect.addEventListener('change', this.toggleDriverFields.bind(this));
        }
    }

    async handleLogin(e) {
        e.preventDefault(); // KRITICKÉ - zabrání submitnutí formuláře jako GET!
        
        console.log('🔐 AuthManager: Login form submitted!');
        console.log('AuthManager: Event object:', e);
        
        const formData = new FormData(e.target);
        const data = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        console.log('AuthManager: Login data:', data);
        console.log('AuthManager: Attempting login with:', this.apiBase + '/login.php');

        try {
            const response = await fetch(this.apiBase + '/login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(data)
            });

            console.log('AuthManager: Response status:', response.status);
            console.log('AuthManager: Response URL:', response.url);

            // Kontrola, zda response není prázdný
            const text = await response.text();
            console.log('AuthManager: Response text:', text.substring(0, 200) + '...');

            if (!text) {
                throw new Error('Server vrátil prázdnou odpověď');
            }

            let result;
            try {
                result = JSON.parse(text);
                console.log('AuthManager: Parsed result:', result);
            } catch (jsonError) {
                console.error('AuthManager: JSON parse error:', jsonError);
                console.error('AuthManager: Raw response was:', text);
                throw new Error('Server vrátil neplatný JSON: ' + text.substring(0, 100));
            }

            if (response.ok && result.success) {
                console.log('🎉 AuthManager: Login successful!', result.user);
                
                if (window.crmApp) {
                    window.crmApp.currentUser = result.user;
                    window.crmApp.showNotification('Úspěšně přihlášen!', 'success');
                    window.crmApp.showMainContent();
                    await window.crmApp.loadDashboardData();
                } else {
                    console.error('AuthManager: CrmApp instance not found');
                    alert('Aplikace není správně načtena. Obnovte stránku.');
                }
            } else {
                throw new Error(result.error || 'Přihlášení selhalo');
            }
            
        } catch (error) {
            console.error('❌ AuthManager: Login error:', error);
            const message = error.message || 'Neznámá chyba při přihlašování';
            
            if (window.crmApp && window.crmApp.showNotification) {
                window.crmApp.showNotification('Chyba při přihlašování: ' + message, 'error');
            } else {
                alert('Chyba při přihlašování: ' + message);
            }
        }
    }

    async handleRegister(e) {
        e.preventDefault(); // KRITICKÉ!
        
        console.log('📝 AuthManager: Register form submitted');
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        console.log('AuthManager: Register data:', data);

        // Basic validation
        if (data.password.length < 6) {
            this.showError('Heslo musí mít alespoň 6 znaků');
            return;
        }

        if (!this.isValidEmail(data.email)) {
            this.showError('Neplatný formát emailu');
            return;
        }

        try {
            const response = await fetch(this.apiBase + '/register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const text = await response.text();
            console.log('AuthManager: Register response:', text);
            
            if (!text) {
                throw new Error('Server vrátil prázdnou odpověď');
            }

            const result = JSON.parse(text);

            if (response.ok && result.success) {
                this.showSuccess('Registrace úspěšná! Můžete se přihlásit.');
                this.showLoginForm();
                document.getElementById('registerForm').reset();
                
                // Pre-fill login form with registered email
                document.getElementById('email').value = data.email;
            } else {
                throw new Error(result.error || 'Registrace selhala');
            }
        } catch (error) {
            console.error('AuthManager: Registration error:', error);
            this.showError('Chyba při registraci: ' + error.message);
        }
    }

    showRegisterForm(e) {
        e.preventDefault();
        console.log('AuthManager: Showing register form');
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('registerContainer').style.display = 'flex';
    }

    showLoginForm(e) {
        if (e) e.preventDefault();
        console.log('AuthManager: Showing login form');
        document.getElementById('registerContainer').style.display = 'none';
        document.getElementById('loginContainer').style.display = 'flex';
    }

    toggleDriverFields() {
        const userType = document.getElementById('reg_user_type').value;
        const driverFields = document.getElementById('driverFields');
        
        console.log('AuthManager: Toggle driver fields, userType:', userType);
        
        if (userType === 'driver') {
            driverFields.style.display = 'block';
            // Make driver fields required
            const driverInputs = driverFields.querySelectorAll('input');
            driverInputs.forEach(input => {
                if (input.name === 'truck_license_plate' || input.name === 'driver_license') {
                    input.required = true;
                }
            });
        } else {
            driverFields.style.display = 'none';
            // Remove required from driver fields
            const driverInputs = driverFields.querySelectorAll('input');
            driverInputs.forEach(input => {
                input.required = false;
            });
        }
    }

    async logout() {
        if (!confirm('Opravdu se chcete odhlásit?')) return;
        
        console.log('AuthManager: Logging out...');
        
        try {
            await fetch(this.apiBase + '/logout.php', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (window.crmApp) {
                window.crmApp.currentUser = null;
                
                if (window.crmApp.refreshInterval) {
                    clearInterval(window.crmApp.refreshInterval);
                }
                
                window.crmApp.showLoginScreen();
                window.crmApp.showNotification('Úspěšně odhlášen', 'success');
            }
        } catch (error) {
            console.error('AuthManager: Logout error:', error);
            this.showError('Chyba při odhlašování');
        }
    }

    // Helper methods
    showError(message) {
        console.error('AuthManager: Error -', message);
        if (window.crmApp && window.crmApp.showNotification) {
            window.crmApp.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }

    showSuccess(message) {
        console.log('AuthManager: Success -', message);
        if (window.crmApp && window.crmApp.showNotification) {
            window.crmApp.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Password strength checker
    checkPasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        const score = Object.values(checks).filter(Boolean).length;
        
        return {
            score,
            checks,
            strength: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong'
        };
    }

    // Session management
    async checkSession() {
        try {
            const response = await fetch(this.apiBase + '/session.php', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const text = await response.text();
                if (text) {
                    const data = JSON.parse(text);
                    return data.success && data.user ? data.user : null;
                }
            }
            
            return null;
        } catch (error) {
            console.error('AuthManager: Session check failed:', error);
            return null;
        }
    }

    // Auto-logout on session expiry
    setupSessionCheck() {
        console.log('AuthManager: Setting up session check (every 5 minutes)');
        setInterval(async () => {
            if (window.crmApp && window.crmApp.currentUser) {
                const user = await this.checkSession();
                if (!user) {
                    console.log('AuthManager: Session expired, logging out');
                    this.showError('Relace vypršela, prosím přihlaste se znovu');
                    this.logout();
                }
            }
        }, 300000); // Check every 5 minutes
    }

    // Handle authentication errors
    handleAuthError(error) {
        console.error('AuthManager: Auth error:', error);
        if (error.status === 401) {
            this.showError('Relace vypršela, prosím přihlaste se znovu');
            if (window.crmApp) {
                window.crmApp.showLoginScreen();
            }
        } else if (error.status === 403) {
            this.showError('Nemáte oprávnění k této akci');
        } else {
            this.showError(error.message || 'Chyba autentifikace');
        }
    }

    // Test connection to API
    async testConnection() {
        console.log('AuthManager: Testing API connection...');
        
        try {
            // Test session endpoint
            const sessionResponse = await fetch(this.apiBase + '/session.php', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log('AuthManager: Session test - Status:', sessionResponse.status);
            const sessionText = await sessionResponse.text();
            console.log('AuthManager: Session test - Response:', sessionText.substring(0, 100) + '...');
            
            return {
                success: sessionResponse.status < 500,
                sessionResponse: sessionText
            };
            
        } catch (error) {
            console.error('AuthManager: API connection test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Initialize auth manager when DOM is ready
console.log('🚀 AuthManager: Starting initialization...');

let authManager = null;

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('AuthManager: DOM ready, creating instance');
        authManager = new AuthManager();
        window.authManager = authManager;
        authManager.setupSessionCheck();
    });
} else {
    console.log('AuthManager: DOM already ready, creating instance immediately');
    authManager = new AuthManager();
    window.authManager = authManager;
    authManager.setupSessionCheck();
}

// Make sure it's globally available
window.authManager = authManager;

console.log('✅ AuthManager: Module loaded successfully');