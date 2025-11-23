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
    pharmacy: ['admin', 'pharmacist', 'doctor'],
    billing: ['admin', 'billing', 'receptionist'],
    inventory: ['admin', 'inventory_manager', 'pharmacist'],
    expenses: ['admin', 'billing'],
    admin: ['admin'],
    settings: ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'billing', 'inventory_manager'],
    emergency: ['admin', 'doctor', 'nurse']
};

// Current user (mock data for development)
let currentUser = {
    uid: 'user123',
    email: 'john.doe@rxflow.com',
    displayName: 'John Doe',
    role: 'admin', // Change this to test different roles
    profileImage: 'https://via.placeholder.com/40'
};

// Check if user has access to a module
function hasAccess(moduleName) {
    if (!currentUser || !currentUser.role) {
        return false;
    }
    
    const allowedRoles = MODULE_PERMISSIONS[moduleName];
    return allowedRoles && allowedRoles.includes(currentUser.role);
}

// Filter navigation based on user role
function filterNavigationByRole() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const module = item.getAttribute('data-module');
        
        if (!hasAccess(module)) {
            item.style.display = 'none';
        } else {
            item.style.display = 'flex';
        }
    });
}

// Update user profile display
function updateUserProfile() {
    if (currentUser) {
        const profileName = document.querySelector('.profile-name');
        const profileImg = document.querySelector('.profile-img');
        
        if (profileName) {
            profileName.textContent = currentUser.displayName;
        }
        
        if (profileImg && currentUser.profileImage) {
            profileImg.src = currentUser.profileImage;
        }
    }
}

// Login function (mock implementation)
async function login(email, password) {
    try {
        // TODO: Implement Firebase authentication
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
