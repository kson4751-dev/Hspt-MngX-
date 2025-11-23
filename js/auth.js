// Authentication and Role-Based Access Control

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

// Module Access Permissions
const MODULE_PERMISSIONS = {
    dashboard: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'billing', 'inventory_manager'],
    reception: ['admin', 'receptionist'],
    triage: ['admin', 'nurse', 'doctor'],
    doctor: ['admin', 'doctor'],
    nursing: ['admin', 'nurse'],
    laboratory: ['admin', 'lab_technician', 'doctor'],
    ward: ['admin', 'nurse', 'doctor'],
    pharmacy: ['admin', 'pharmacist'],
    'pharmacy-inventory': ['admin', 'pharmacist'],
    'pharmacy-pos': ['admin', 'pharmacist'],
    'pharmacy-sales': ['admin', 'pharmacist'],
    'prescription-queue': ['admin', 'pharmacist', 'doctor'],
    billing: ['admin', 'billing', 'receptionist'],
    inventory: ['admin', 'inventory_manager', 'pharmacist'],
    expenses: ['admin', 'billing'],
    admin: ['admin'],
    settings: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'billing', 'inventory_manager'],
    emergency: ['admin', 'doctor', 'nurse']
};

// Current user
let currentUser = null;

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
            permissions: JSON.parse(storageType.getItem('userPermissions') || '[]')
        };
    }

    return currentUser;
}

// Check if user has access to a module
function hasAccess(moduleName) {
    const user = getCurrentUser();
    if (!user || !user.role) {
        return false;
    }
    
    const allowedRoles = MODULE_PERMISSIONS[moduleName];
    return allowedRoles && allowedRoles.includes(user.role);
}

// Redirect to login if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Logout function
async function logout() {
    const currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    const currentUserName = localStorage.getItem('userName') || sessionStorage.getItem('userName');
    
    // Log logout activity before clearing data
    if (currentUserId) {
        try {
            // Import Firestore functions dynamically
            const { getFirestore, collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
            const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
            
            const app = getApp();
            const db = getFirestore(app);
            
            await addDoc(collection(db, 'activity_logs'), {
                type: 'logout',
                action: 'User logged out',
                description: `${currentUserName || 'User'} logged out`,
                userId: currentUserId,
                userName: currentUserName || 'User',
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('Error logging logout activity:', error);
        }
    }
    
    // Clear all stored user data
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userPermissions');
    
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userPermissions');
    
    currentUser = null;
    
    // Redirect to login
    window.location.href = 'login.html';
}

// Make logout function globally accessible
window.logout = logout;

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the login page
    const isLoginPage = window.location.pathname.includes('login.html');
    
    if (!isLoginPage) {
        // Require authentication for all other pages
        if (!requireAuth()) {
            return;
        }
        
        // Update UI with user info
        const user = getCurrentUser();
        if (user) {
            // Update profile name
            const profileNameEl = document.querySelector('.profile-name');
            if (profileNameEl) {
                profileNameEl.textContent = user.displayName;
            }
            
            // Filter sidebar modules based on permissions
            filterModulesByPermissions(user.role);
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

// Filter modules based on user permissions
function filterModulesByPermissions(userRole) {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const module = item.getAttribute('data-module');
        
        if (module && !hasAccess(module)) {
            item.style.display = 'none';
        }
    });
}

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
