// Authentication and Role-Based Access Control with Real-time Audit Trail

// User Roles
const USER_ROLES = {
    ADMIN: 'admin',
    DOCTOR: 'doctor',
    NURSE: 'nurse',
    RECEPTIONIST: 'receptionist',
    PHARMACIST: 'pharmacist',
    LAB_TECHNICIAN: 'lab_technician',
    BILLING: 'billing',
    INVENTORY_MANAGER: 'inventory_manager'
};

// Department to Module Mapping
const DEPARTMENT_MODULES = {
    'Emergency': ['dashboard', 'emergency', 'triage', 'settings'],
    'Pharmacy': ['dashboard', 'pharmacy', 'pharmacy-inventory', 'pharmacy-pos', 'pharmacy-sales', 'prescription-queue', 'inventory', 'settings'],
    'Laboratory': ['dashboard', 'laboratory', 'settings'],
    'Reception': ['dashboard', 'reception', 'billing', 'settings'],
    'Billing': ['dashboard', 'billing', 'expenses', 'settings'],
    'Ward': ['dashboard', 'ward-nursing', 'settings'],
    'Inventory': ['dashboard', 'inventory', 'expenses', 'settings'],
    'Medical': ['dashboard', 'doctor', 'triage', 'laboratory', 'ward-nursing', 'emergency', 'prescription-queue', 'settings']
};

// Current user and session data
let currentUser = null;
let userSession = null;
let activityMonitor = null;
let inactivityTimeout = null;
let lastActivityTime = Date.now();

// Inactivity timeout duration (30 minutes in milliseconds)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Check if user is authenticated
function isAuthenticated() {
    const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    return !!(userId && userRole);
}

// Get current user data
function getCurrentUser() {
    if (!isAuthenticated()) {
        return null;
    }

    if (!currentUser) {
        const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
        currentUser = {
            uid: storageType.getItem('userId'),
            email: storageType.getItem('userEmail'),
            displayName: storageType.getItem('userName') || 'User',
            role: storageType.getItem('userRole'),
            department: storageType.getItem('userDepartment') || '',
            permissions: JSON.parse(storageType.getItem('userPermissions') || '[]'),
            sessionId: storageType.getItem('sessionId')
        };
        
        // Store as JSON for easy retrieval by other modules
        try {
            storageType.setItem('currentUser', JSON.stringify(currentUser));
        } catch (e) {
            console.error('Error storing currentUser JSON:', e);
        }
    }

    return currentUser;
}

// Check if user has access to a module based on their permissions
function hasAccess(moduleName) {
    const user = getCurrentUser();
    if (!user) {
        return false;
    }
    
    // Admin has access to everything
    if (user.role === 'admin') {
        return true;
    }
    
    // Check user's specific permissions
    if (user.permissions && user.permissions.length > 0) {
        return user.permissions.includes(moduleName);
    }
    
    return false;
}

// Check if user has permission for specific module
function checkModulePermission(moduleName) {
    if (!hasAccess(moduleName)) {
        showAccessDeniedMessage(moduleName);
        return false;
    }
    return true;
}

// Show access denied message
function showAccessDeniedMessage(moduleName) {
    const message = `Access Denied: You don't have permission to access the ${moduleName} module. Please contact your administrator.`;
    
    // Create modal for access denied
    const modal = document.createElement('div');
    modal.className = 'access-denied-modal';
    modal.innerHTML = `
        <div class="access-denied-content">
            <div class="access-denied-icon">
                <i class="fas fa-lock"></i>
            </div>
            <h2>Access Denied</h2>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="this.closest('.access-denied-modal').remove()">
                <i class="fas fa-check"></i> Understood
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Log access attempt
    logAccessAttempt(moduleName, false);
}

// Log user activity to Firebase
async function logActivity(type, action, description, metadata = {}) {
    try {
        const { getFirestore, collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        
        const app = getApp();
        const db = getFirestore(app);
        const user = getCurrentUser();
        
        if (!user) return;
        
        await addDoc(collection(db, 'activity_logs'), {
            type: type,
            action: action,
            description: description,
            userId: user.uid,
            userName: user.displayName,
            userEmail: user.email,
            userRole: user.role,
            department: user.department || 'N/A',
            sessionId: user.sessionId || '',
            metadata: metadata,
            timestamp: serverTimestamp(),
            ipAddress: await getClientIP(),
            userAgent: navigator.userAgent
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// Log access attempt (authorized or unauthorized)
async function logAccessAttempt(moduleName, granted) {
    const user = getCurrentUser();
    await logActivity(
        granted ? 'access_granted' : 'access_denied',
        `Module Access: ${moduleName}`,
        granted 
            ? `User accessed ${moduleName} module` 
            : `User attempted to access ${moduleName} module without permission`,
        { moduleName, granted }
    );
}

// Get client IP address (simplified - would need backend API for real IP)
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'Unknown';
    }
}

// Start user session tracking
async function startSession() {
    try {
        const { getFirestore, collection, doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        
        const app = getApp();
        const db = getFirestore(app);
        const user = getCurrentUser();
        
        if (!user) return;
        
        const sessionId = `session_${user.uid}_${Date.now()}`;
        const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
        storageType.setItem('sessionId', sessionId);
        
        if (currentUser) {
            currentUser.sessionId = sessionId;
        }
        
        // Create session document
        await setDoc(doc(db, 'user_sessions', sessionId), {
            userId: user.uid,
            userName: user.displayName,
            userEmail: user.email,
            userRole: user.role,
            department: user.department || 'N/A',
            sessionId: sessionId,
            loginTime: serverTimestamp(),
            lastActivity: serverTimestamp(),
            ipAddress: await getClientIP(),
            userAgent: navigator.userAgent,
            status: 'active'
        });
        
        // Log login activity
        await logActivity('login', 'User Login', `${user.displayName} logged in successfully`, {
            sessionId: sessionId
        });
        
        // Start activity monitoring
        startActivityMonitoring(sessionId);
        
        userSession = sessionId;
        return sessionId;
        
    } catch (error) {
        console.error('Error starting session:', error);
    }
}

// Update session activity
async function updateSessionActivity() {
    try {
        const { getFirestore, doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        
        const user = getCurrentUser();
        if (!user || !user.sessionId) return;
        
        const app = getApp();
        const db = getFirestore(app);
        
        await updateDoc(doc(db, 'user_sessions', user.sessionId), {
            lastActivity: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating session activity:', error);
    }
}

// Start monitoring user activity
function startActivityMonitoring(sessionId) {
    // Update activity every 2 minutes
    activityMonitor = setInterval(() => {
        updateSessionActivity();
    }, 120000);
    
    // Track user interactions
    const events = ['click', 'keydown', 'mousemove', 'scroll'];
    events.forEach(event => {
        document.addEventListener(event, throttle(() => {
            updateSessionActivity();
        }, 60000), { passive: true });
    });
}

// Throttle function to limit execution
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// End user session
async function endSession() {
    try {
        const { getFirestore, doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        
        const user = getCurrentUser();
        if (!user || !user.sessionId) return;
        
        const app = getApp();
        const db = getFirestore(app);
        
        // Update session document
        await updateDoc(doc(db, 'user_sessions', user.sessionId), {
            logoutTime: serverTimestamp(),
            status: 'ended'
        });
        
        // Log logout activity
        await logActivity('logout', 'User Logout', `${user.displayName} logged out`, {
            sessionId: user.sessionId
        });
        
        // Clear activity monitor
        if (activityMonitor) {
            clearInterval(activityMonitor);
            activityMonitor = null;
        }
        
    } catch (error) {
        console.error('Error ending session:', error);
    }
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Logout function with session cleanup
async function logout(reason = 'manual') {
    // End session before logging out
    await endSession();
    
    const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    const currentUserName = localStorage.getItem('userName') || sessionStorage.getItem('userName');
    
    // Clear inactivity timers
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
    }
    
    // Clear all stored user data
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userPermissions');
    localStorage.removeItem('userDepartment');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('currentUser');
    
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userPermissions');
    sessionStorage.removeItem('userDepartment');
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('currentUser');
    
    currentUser = null;
    userSession = null;
    
    // Store logout reason for display on login page
    if (reason === 'inactivity') {
        sessionStorage.setItem('logoutReason', 'Session expired due to inactivity');
    }
    
    // Redirect to login
    window.location.href = 'login.html';
}

// Reset inactivity timer
function resetInactivityTimer() {
    lastActivityTime = Date.now();
    
    // Clear existing timeout
    if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
    }
    
    // Set new timeout
    inactivityTimeout = setTimeout(() => {
        console.warn('⏱️ Session expired due to inactivity');
        alert('Your session has expired due to 30 minutes of inactivity. You will be logged out.');
        logout('inactivity');
    }, INACTIVITY_TIMEOUT);
}

// Setup activity listeners to detect user activity
function setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
        document.addEventListener(event, () => {
            // Only reset if more than 1 second has passed since last activity
            // This prevents excessive timer resets
            if (Date.now() - lastActivityTime > 1000) {
                resetInactivityTimer();
            }
        }, true);
    });
    
    // Initialize the timer
    resetInactivityTimer();
    console.log('⏱️ Inactivity timeout set to 30 minutes');
}

// Make logout function globally accessible
window.logout = logout;

// Filter modules in sidebar based on permissions
function filterModulesByPermissions() {
    const user = getCurrentUser();
    if (!user) return;
    
    console.log('🔒 Filtering modules based on permissions...');
    
    const navItems = document.querySelectorAll('.nav-item');
    const navDropdownItems = document.querySelectorAll('.nav-dropdown-item');
    
    let hiddenCount = 0;
    let visibleCount = 0;
    
    // Hide unauthorized main nav items
    navItems.forEach(item => {
        const module = item.getAttribute('data-module');
        if (module && module !== 'dashboard') {
            if (!hasAccess(module)) {
                item.style.display = 'none';
                hiddenCount++;
            } else {
                item.style.display = '';
                visibleCount++;
            }
        }
    });
    
    // Hide unauthorized dropdown items
    navDropdownItems.forEach(item => {
        const submodule = item.getAttribute('data-submodule');
        if (submodule) {
            if (!hasAccess(submodule)) {
                item.style.display = 'none';
                hiddenCount++;
            } else {
                item.style.display = '';
                visibleCount++;
            }
        }
    });
    
    // Hide empty nav groups
    document.querySelectorAll('.nav-item-group').forEach(group => {
        const visibleItems = group.querySelectorAll('.nav-dropdown-item:not([style*="display: none"])');
        if (visibleItems.length === 0) {
            const parentNav = group.querySelector('.nav-item');
            if (parentNav) {
                parentNav.style.display = 'none';
            }
        }
    });
    
    // Also hide the module content elements for unauthorized modules
    document.querySelectorAll('.module').forEach(moduleElement => {
        const moduleId = moduleElement.id;
        // Extract module name from id (e.g., "billing-module" -> "billing")
        const moduleName = moduleId.replace('-module', '');
        
        if (moduleName && moduleName !== 'dashboard' && !hasAccess(moduleName)) {
            // Hide the entire module element
            moduleElement.style.display = 'none';
            moduleElement.setAttribute('data-restricted', 'true');
        }
    });
    
    console.log(`✅ Sidebar filtered: ${visibleCount} modules visible, ${hiddenCount} modules hidden`);
}

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the login page
    const isLoginPage = window.location.pathname.includes('login.html');
    
    if (!isLoginPage) {
        // Require authentication for all other pages
        if (!requireAuth()) {
            return;
        }
        
        // Get user first
        const user = getCurrentUser();
        
        if (user) {
            console.log('🔐 Auth System Initialized');
            console.log('👤 User:', user.displayName);
            console.log('🎭 Role:', user.role);
            console.log('🏢 Department:', user.department || 'N/A');
            console.log('📋 Permissions:', user.permissions);
            
            // Filter sidebar IMMEDIATELY before anything else
            filterModulesByPermissions();
            
            // Start user session
            startSession();
            
            // Setup inactivity timeout
            setupActivityListeners();
            
            // Update profile name
            const profileNameEl = document.getElementById('profileName');
            if (profileNameEl) {
                profileNameEl.textContent = user.displayName;
            }
            
            // Show role indicator
            console.log(`✅ Access Control Active - ${user.permissions.length} modules accessible`);
        } else {
            console.error('❌ No user found, redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        // Setup logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    logout();
                }
            });
        }
    }
});

// Get role display name
function getRoleDisplayName(role) {
    const roleNames = {
        'admin': 'Administrator',
        'doctor': 'Doctor',
        'nurse': 'Nurse',
        'receptionist': 'Receptionist',
        'pharmacist': 'Pharmacist',
        'lab_technician': 'Lab Technician',
        'billing': 'Billing Officer',
        'inventory_manager': 'Inventory Manager'
    };
    
    return roleNames[role] || 'User';
}

// Export functions for global use
window.authSystem = {
    getCurrentUser,
    hasAccess,
    checkModulePermission,
    logActivity,
    logout,
    getRoleDisplayName,
    isAuthenticated
};

console.log('✅ Authentication system with audit trail loaded');
        console.log('Login attempt:', email);
        
        // Mock successful login
        currentUser = {
            uid: 'user123',
            email: email,
            displayName: 'John Doe',
            role: 'admin',
            profileImage: 'https://via.placeholder.com/40'
        };
        
        updateUserProfile();
        filterNavigationByRole();
        
        return { success: true, user: currentUser };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    }
}

// Logout function
async function logout() {
    try {
        // TODO: Implement Firebase sign out
        console.log('Logout');
        
        currentUser = null;
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = 'login.html';
        
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}

// Get current user role
function getCurrentUserRole() {
    return currentUser ? currentUser.role : null;
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    // TODO: Check if user is authenticated with Firebase
    
    // For development, use mock user
    if (currentUser) {
        updateUserProfile();
        filterNavigationByRole();
    } else {
        // Redirect to login if not authenticated
        // window.location.href = 'login.html';
    }
});

// Logout button handler
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const result = await logout();
        if (result.success) {
            console.log('Logged out successfully');
        }
    });
}

// Export functions for use in other modules
window.rxFlowAuth = {
    login,
    logout,
    hasAccess,
    getCurrentUserRole,
    currentUser
};

console.log('Authentication module loaded');
