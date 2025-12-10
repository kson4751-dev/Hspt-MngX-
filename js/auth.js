// Authentication and Role-Based Access Control with Real-time Permissions & Audit Trail
// RxFlow Hospital Management System - Enhanced Security Module

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

// Audit Trail Action Types
const AUDIT_ACTIONS = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    SESSION_START: 'session_start',
    SESSION_END: 'session_end',
    MODULE_ACCESS: 'module_access',
    ACCESS_DENIED: 'access_denied',
    PERMISSION_CHANGE: 'permission_change',
    DATA_VIEW: 'data_view',
    DATA_CREATE: 'data_create',
    DATA_UPDATE: 'data_update',
    DATA_DELETE: 'data_delete',
    REPORT_GENERATE: 'report_generate',
    EXPORT_DATA: 'export_data',
    PRINT_ACTION: 'print_action',
    SETTINGS_CHANGE: 'settings_change',
    PASSWORD_CHANGE: 'password_change',
    PROFILE_UPDATE: 'profile_update'
};

// Current user and session data
let currentUser = null;
let userSession = null;
let activityMonitor = null;
let inactivityTimeout = null;
let lastActivityTime = Date.now();
let permissionListener = null;
let previousPermissions = [];

// Inactivity timeout duration (30 minutes in milliseconds)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// ==================== REAL-TIME PERMISSION LISTENER ====================

// Start listening to user permissions in real-time
async function startRealtimePermissionListener() {
    try {
        const { getFirestore, doc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        
        const app = getApp();
        const db = getFirestore(app);
        const user = getCurrentUser();
        
        if (!user || !user.uid) {
            console.warn('⚠️ Cannot start permission listener: No user found');
            return;
        }
        
        // Unsubscribe from previous listener if exists
        if (permissionListener) {
            permissionListener();
            permissionListener = null;
        }
        
        // Store current permissions for comparison
        previousPermissions = [...(user.permissions || [])];
        
        console.log('🔄 Starting real-time permission listener for user:', user.uid);
        
        // Listen to user document changes in real-time
        permissionListener = onSnapshot(doc(db, 'users', user.uid), async (docSnapshot) => {
            if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                
                // Check if user is still active
                if (userData.active === false) {
                    console.warn('⚠️ User account has been deactivated');
                    showPermissionChangeNotification('deactivated');
                    await logAuditTrail(AUDIT_ACTIONS.LOGOUT, 'Account Deactivated', 'User account was deactivated by administrator', { reason: 'account_deactivated' });
                    setTimeout(() => logout('account_deactivated'), 3000);
                    return;
                }
                
                // Get new permissions
                const newPermissions = userData.permissions || [];
                const newRole = userData.role;
                
                // Check if permissions changed
                const permissionsChanged = !arraysEqual(previousPermissions, newPermissions);
                const roleChanged = user.role !== newRole;
                
                if (permissionsChanged || roleChanged) {
                    console.log('🔄 Permissions updated in real-time!');
                    console.log('Previous permissions:', previousPermissions);
                    console.log('New permissions:', newPermissions);
                    
                    // Calculate added and removed permissions
                    const addedPermissions = newPermissions.filter(p => !previousPermissions.includes(p));
                    const removedPermissions = previousPermissions.filter(p => !newPermissions.includes(p));
                    
                    // Update stored permissions
                    const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
                    storageType.setItem('userPermissions', JSON.stringify(newPermissions));
                    storageType.setItem('userRole', newRole);
                    
                    // Update current user object
                    if (currentUser) {
                        currentUser.permissions = newPermissions;
                        currentUser.role = newRole;
                        storageType.setItem('currentUser', JSON.stringify(currentUser));
                    }
                    
                    // Update previous permissions for next comparison
                    previousPermissions = [...newPermissions];
                    
                    // Log permission change in audit trail
                    await logAuditTrail(AUDIT_ACTIONS.PERMISSION_CHANGE, 'Permissions Updated', 
                        `User permissions were updated in real-time`, {
                            addedPermissions,
                            removedPermissions,
                            newRole,
                            previousRole: user.role
                        });
                    
                    // Re-filter sidebar with new permissions
                    filterModulesByPermissions();
                    
                    // Check if currently viewing a module that was removed
                    const activeModule = document.querySelector('.module.active');
                    if (activeModule) {
                        const moduleId = activeModule.id.replace('-module', '');
                        if (removedPermissions.includes(moduleId) && moduleId !== 'dashboard') {
                            // Redirect to dashboard if current module access was revoked
                            showPermissionChangeNotification('revoked', moduleId);
                            navigateToDashboard();
                        } else if (addedPermissions.length > 0 || removedPermissions.length > 0) {
                            // Show notification about permission changes
                            showPermissionChangeNotification('updated', null, addedPermissions, removedPermissions);
                        }
                    } else {
                        showPermissionChangeNotification('updated', null, addedPermissions, removedPermissions);
                    }
                }
                
                // Update other user data if changed
                if (userData.displayName !== user.displayName) {
                    const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
                    storageType.setItem('userName', userData.displayName);
                    if (currentUser) {
                        currentUser.displayName = userData.displayName;
                    }
                    const profileNameEl = document.getElementById('profileName');
                    if (profileNameEl) {
                        profileNameEl.textContent = userData.displayName;
                    }
                }
                
                if (userData.department !== user.department) {
                    const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
                    storageType.setItem('userDepartment', userData.department);
                    if (currentUser) {
                        currentUser.department = userData.department;
                    }
                }
                
            } else {
                // User document was deleted
                console.error('❌ User document no longer exists');
                showPermissionChangeNotification('deleted');
                await logAuditTrail(AUDIT_ACTIONS.LOGOUT, 'Account Deleted', 'User account was deleted', { reason: 'account_deleted' });
                setTimeout(() => logout('account_deleted'), 3000);
            }
        }, (error) => {
            console.error('❌ Error listening to permission changes:', error);
        });
        
        console.log('✅ Real-time permission listener active');
        
    } catch (error) {
        console.error('❌ Error starting permission listener:', error);
    }
}

// Stop real-time permission listener
function stopRealtimePermissionListener() {
    if (permissionListener) {
        permissionListener();
        permissionListener = null;
        console.log('🛑 Real-time permission listener stopped');
    }
}

// Helper function to compare arrays
function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
}

// Navigate to dashboard
function navigateToDashboard() {
    const modules = document.querySelectorAll('.module');
    const navItems = document.querySelectorAll('.nav-item');
    
    modules.forEach(m => m.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    
    const dashboardModule = document.getElementById('dashboard-module');
    const dashboardNav = document.querySelector('.nav-item[data-module="dashboard"]');
    
    if (dashboardModule) dashboardModule.classList.add('active');
    if (dashboardNav) dashboardNav.classList.add('active');
}

// Show permission change notification
function showPermissionChangeNotification(type, moduleName = null, added = [], removed = []) {
    // Remove existing notification if any
    const existingNotif = document.getElementById('permission-change-notification');
    if (existingNotif) existingNotif.remove();
    
    let title, message, icon, bgColor;
    
    switch (type) {
        case 'deactivated':
            title = 'Account Deactivated';
            message = 'Your account has been deactivated by an administrator. You will be logged out.';
            icon = 'fa-user-slash';
            bgColor = '#dc2626';
            break;
        case 'deleted':
            title = 'Account Removed';
            message = 'Your account has been removed from the system. You will be logged out.';
            icon = 'fa-user-times';
            bgColor = '#dc2626';
            break;
        case 'revoked':
            title = 'Access Revoked';
            message = `Your access to the ${moduleName} module has been revoked. Redirecting to dashboard...`;
            icon = 'fa-lock';
            bgColor = '#f59e0b';
            break;
        case 'updated':
            title = 'Permissions Updated';
            let details = [];
            if (added.length > 0) details.push(`Added: ${added.join(', ')}`);
            if (removed.length > 0) details.push(`Removed: ${removed.join(', ')}`);
            message = `Your permissions have been updated by an administrator. ${details.join('. ')}`;
            icon = 'fa-shield-alt';
            bgColor = '#3b82f6';
            break;
        default:
            return;
    }
    
    const notification = document.createElement('div');
    notification.id = 'permission-change-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 99999;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
        font-family: 'Montserrat', sans-serif;
    `;
    
    notification.innerHTML = `
        <style>
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        </style>
        <div style="display: flex; align-items: flex-start; gap: 12px;">
            <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <i class="fas ${icon}" style="font-size: 18px;"></i>
            </div>
            <div style="flex: 1;">
                <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600;">${title}</h4>
                <p style="margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.4;">${message}</p>
            </div>
            <button onclick="this.closest('#permission-change-notification').remove()" style="background: none; border: none; color: white; cursor: pointer; padding: 4px; opacity: 0.7; font-size: 16px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 10 seconds (unless account deactivated/deleted)
    if (type !== 'deactivated' && type !== 'deleted') {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideInRight 0.3s ease reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 10000);
    }
}

// ==================== COMPREHENSIVE AUDIT TRAIL ====================

// Log activity to audit trail with enhanced metadata
async function logAuditTrail(actionType, action, description, metadata = {}) {
    try {
        const { getFirestore, collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        
        const app = getApp();
        const db = getFirestore(app);
        const user = getCurrentUser();
        
        // Get browser and device info
        const deviceInfo = getDeviceInfo();
        
        const auditEntry = {
            // Action details
            actionType: actionType,
            action: action,
            description: description,
            
            // User details
            userId: user?.uid || 'unknown',
            userName: user?.displayName || 'Unknown User',
            userEmail: user?.email || 'unknown',
            userRole: user?.role || 'unknown',
            department: user?.department || 'N/A',
            
            // Session details
            sessionId: user?.sessionId || userSession || 'no_session',
            
            // Timing
            timestamp: serverTimestamp(),
            clientTimestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            
            // Location & Device
            ipAddress: await getClientIP(),
            userAgent: navigator.userAgent,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            device: deviceInfo.device,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            
            // Page context
            currentPage: window.location.pathname,
            currentModule: getCurrentActiveModule(),
            referrer: document.referrer || 'direct',
            
            // Additional metadata
            metadata: {
                ...metadata,
                pageTitle: document.title,
                windowSize: `${window.innerWidth}x${window.innerHeight}`
            }
        };
        
        await addDoc(collection(db, 'audit_trail'), auditEntry);
        
        // Also add to activity_logs for backward compatibility
        await addDoc(collection(db, 'activity_logs'), {
            type: actionType,
            action: action,
            description: description,
            userId: user?.uid,
            userName: user?.displayName,
            userEmail: user?.email,
            userRole: user?.role,
            department: user?.department || 'N/A',
            sessionId: user?.sessionId || '',
            metadata: metadata,
            timestamp: serverTimestamp(),
            ipAddress: auditEntry.ipAddress,
            userAgent: navigator.userAgent
        });
        
        console.log(`📝 Audit Trail: ${actionType} - ${action}`);
        
    } catch (error) {
        console.error('❌ Error logging to audit trail:', error);
    }
}

// Get current active module
function getCurrentActiveModule() {
    const activeModule = document.querySelector('.module.active');
    if (activeModule) {
        return activeModule.id.replace('-module', '');
    }
    return 'dashboard';
}

// Get device information
function getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';
    
    // Detect browser
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    else if (ua.includes('Opera')) browser = 'Opera';
    
    // Detect OS
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    
    // Detect device type
    if (ua.includes('Mobile') || ua.includes('Android')) device = 'Mobile';
    else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';
    
    return { browser, os, device };
}

// Get client IP address
async function getClientIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json', { timeout: 3000 });
        const data = await response.json();
        return data.ip;
    } catch {
        return 'Unknown';
    }
}

// ==================== MODULE ACCESS TRACKING ====================

// Track module access with audit trail
async function trackModuleAccess(moduleName, granted = true) {
    await logAuditTrail(
        granted ? AUDIT_ACTIONS.MODULE_ACCESS : AUDIT_ACTIONS.ACCESS_DENIED,
        granted ? `Accessed ${moduleName}` : `Access Denied: ${moduleName}`,
        granted 
            ? `User successfully accessed the ${moduleName} module`
            : `User attempted to access ${moduleName} module without permission`,
        { 
            moduleName, 
            granted,
            userPermissions: getCurrentUser()?.permissions || []
        }
    );
}

// Track data operations
async function trackDataOperation(operation, entityType, entityId, details = {}) {
    const actionMap = {
        'view': AUDIT_ACTIONS.DATA_VIEW,
        'create': AUDIT_ACTIONS.DATA_CREATE,
        'update': AUDIT_ACTIONS.DATA_UPDATE,
        'delete': AUDIT_ACTIONS.DATA_DELETE
    };
    
    await logAuditTrail(
        actionMap[operation] || 'data_operation',
        `${operation.charAt(0).toUpperCase() + operation.slice(1)} ${entityType}`,
        `User ${operation}ed ${entityType} record`,
        {
            operation,
            entityType,
            entityId,
            ...details
        }
    );
}

// ==================== CORE AUTH FUNCTIONS ====================

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

// Check if user has access to a module based on their EXPLICIT permissions
// Users can ONLY access modules listed in their permissions array
function hasAccess(moduleName) {
    const user = getCurrentUser();
    if (!user) {
        return false;
    }
    
    // Dashboard is always accessible to everyone
    if (moduleName === 'dashboard') {
        return true;
    }
    
    // Admin has access to everything
    if (user.role === 'admin') {
        return true;
    }
    
    // STRICT CHECK: User must have explicit permission for this module
    const userPermissions = user.permissions || [];
    return userPermissions.includes(moduleName);
}

// Check if user has permission for specific module
function checkModulePermission(moduleName) {
    // Dashboard is always allowed
    if (moduleName === 'dashboard') {
        trackModuleAccess(moduleName, true);
        return true;
    }
    
    if (!hasAccess(moduleName)) {
        showAccessDeniedMessage(moduleName);
        trackModuleAccess(moduleName, false);
        return false;
    }
    trackModuleAccess(moduleName, true);
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
}

// ==================== SESSION MANAGEMENT ====================

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
        
        const deviceInfo = getDeviceInfo();
        const ipAddress = await getClientIP();
        
        // Create session document
        await setDoc(doc(db, 'user_sessions', sessionId), {
            userId: user.uid,
            userName: user.displayName,
            userEmail: user.email,
            userRole: user.role,
            department: user.department || 'N/A',
            permissions: user.permissions || [],
            sessionId: sessionId,
            loginTime: serverTimestamp(),
            lastActivity: serverTimestamp(),
            ipAddress: ipAddress,
            userAgent: navigator.userAgent,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            device: deviceInfo.device,
            status: 'active'
        });
        
        // Log session start in audit trail
        await logAuditTrail(AUDIT_ACTIONS.SESSION_START, 'Session Started', 
            `${user.displayName} started a new session`, {
                sessionId: sessionId,
                ipAddress: ipAddress,
                device: deviceInfo.device,
                browser: deviceInfo.browser
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
async function endSession(reason = 'manual') {
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
            status: 'ended',
            endReason: reason
        });
        
        // Log session end in audit trail
        await logAuditTrail(AUDIT_ACTIONS.SESSION_END, 'Session Ended', 
            `${user.displayName}'s session ended`, {
                sessionId: user.sessionId,
                reason: reason
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
    // Stop permission listener
    stopRealtimePermissionListener();
    
    // Log logout before ending session
    const user = getCurrentUser();
    if (user) {
        await logAuditTrail(AUDIT_ACTIONS.LOGOUT, 'User Logout', 
            `${user.displayName} logged out`, {
                reason: reason,
                sessionId: user.sessionId
            });
    }
    
    // End session
    await endSession(reason);
    
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
    previousPermissions = [];
    
    // Store logout reason for display on login page
    if (reason === 'inactivity') {
        sessionStorage.setItem('logoutReason', 'Session expired due to inactivity');
    } else if (reason === 'account_deactivated') {
        sessionStorage.setItem('logoutReason', 'Your account has been deactivated');
    } else if (reason === 'account_deleted') {
        sessionStorage.setItem('logoutReason', 'Your account has been removed');
    } else if (reason === 'permission_revoked') {
        sessionStorage.setItem('logoutReason', 'Your permissions have been revoked');
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
    inactivityTimeout = setTimeout(async () => {
        console.warn('⏱️ Session expired due to inactivity');
        await logAuditTrail(AUDIT_ACTIONS.LOGOUT, 'Inactivity Logout', 
            'User was logged out due to 30 minutes of inactivity', {
                inactivityDuration: '30 minutes'
            });
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

// Filter modules in sidebar based on STRICT permissions
// Users only see modules they explicitly have permission for
function filterModulesByPermissions() {
    const user = getCurrentUser();
    if (!user) return;
    
    console.log('🔒 Filtering modules based on STRICT permissions...');
    console.log('📋 User permissions:', user.permissions);
    console.log('🎭 User role:', user.role);
    
    const userPermissions = user.permissions || [];
    const isAdmin = user.role === 'admin';
    
    // Dashboard is always visible
    const alwaysAllowed = ['dashboard'];
    
    let hiddenCount = 0;
    let visibleCount = 0;
    
    // Get all navigation items
    const navItems = document.querySelectorAll('.nav-item');
    const navDropdownItems = document.querySelectorAll('.nav-dropdown-item');
    const navGroups = document.querySelectorAll('.nav-item-group');
    
    // First, hide ALL nav items (except dashboard)
    navItems.forEach(item => {
        const module = item.getAttribute('data-module');
        if (module && !alwaysAllowed.includes(module)) {
            item.style.display = 'none';
            item.classList.add('permission-hidden');
        }
    });
    
    // Hide ALL dropdown items
    navDropdownItems.forEach(item => {
        item.style.display = 'none';
        item.classList.add('permission-hidden');
    });
    
    // Hide ALL nav groups initially
    navGroups.forEach(group => {
        group.style.display = 'none';
        group.classList.add('permission-hidden');
    });
    
    // Now show ONLY what user has explicit permission for
    if (isAdmin) {
        // Admin sees everything
        navItems.forEach(item => {
            item.style.display = '';
            item.classList.remove('permission-hidden');
            visibleCount++;
        });
        navDropdownItems.forEach(item => {
            item.style.display = '';
            item.classList.remove('permission-hidden');
        });
        navGroups.forEach(group => {
            group.style.display = '';
            group.classList.remove('permission-hidden');
        });
        console.log('👑 Admin user - all modules visible');
    } else {
        // Non-admin: Only show explicitly permitted modules
        userPermissions.forEach(permission => {
            // Show main nav item if it matches permission
            const mainNavItem = document.querySelector(`.nav-item[data-module="${permission}"]:not(.nav-item-group .nav-item)`);
            if (mainNavItem) {
                mainNavItem.style.display = '';
                mainNavItem.classList.remove('permission-hidden');
                visibleCount++;
            }
            
            // Show nav group parent if permission matches
            const groupNavItem = document.querySelector(`.nav-item-group .nav-item[data-module="${permission}"]`);
            if (groupNavItem) {
                const parentGroup = groupNavItem.closest('.nav-item-group');
                if (parentGroup) {
                    parentGroup.style.display = '';
                    parentGroup.classList.remove('permission-hidden');
                    groupNavItem.style.display = '';
                    groupNavItem.classList.remove('permission-hidden');
                    visibleCount++;
                }
            }
            
            // Show dropdown items that match permission
            const dropdownItems = document.querySelectorAll(`.nav-dropdown-item[data-submodule="${permission}"]`);
            dropdownItems.forEach(item => {
                item.style.display = '';
                item.classList.remove('permission-hidden');
                
                // Also show the parent group
                const parentGroup = item.closest('.nav-item-group');
                if (parentGroup) {
                    parentGroup.style.display = '';
                    parentGroup.classList.remove('permission-hidden');
                    const parentNav = parentGroup.querySelector('.nav-item');
                    if (parentNav) {
                        parentNav.style.display = '';
                        parentNav.classList.remove('permission-hidden');
                    }
                }
            });
            
            // Also check if permission matches a parent module with dropdowns
            const parentNavWithDropdown = document.querySelector(`.nav-item-group .nav-item[data-module="${permission}"]`);
            if (parentNavWithDropdown) {
                const parentGroup = parentNavWithDropdown.closest('.nav-item-group');
                if (parentGroup) {
                    parentGroup.style.display = '';
                    parentGroup.classList.remove('permission-hidden');
                    parentNavWithDropdown.style.display = '';
                    parentNavWithDropdown.classList.remove('permission-hidden');
                    
                    // Show all dropdown items under this parent
                    const dropdownItemsInGroup = parentGroup.querySelectorAll('.nav-dropdown-item');
                    dropdownItemsInGroup.forEach(item => {
                        item.style.display = '';
                        item.classList.remove('permission-hidden');
                    });
                }
            }
        });
        
        // Count hidden items
        navItems.forEach(item => {
            if (item.classList.contains('permission-hidden')) hiddenCount++;
        });
    }
    
    // Hide module content elements for unauthorized modules
    document.querySelectorAll('.module').forEach(moduleElement => {
        const moduleId = moduleElement.id;
        const moduleName = moduleId.replace('-module', '');
        
        if (moduleName && !alwaysAllowed.includes(moduleName)) {
            if (isAdmin || userPermissions.includes(moduleName)) {
                moduleElement.style.display = '';
                moduleElement.removeAttribute('data-restricted');
                moduleElement.classList.remove('permission-restricted');
            } else {
                moduleElement.style.display = 'none';
                moduleElement.setAttribute('data-restricted', 'true');
                moduleElement.classList.add('permission-restricted');
            }
        }
    });
    
    console.log(`✅ Strict filtering complete: ${visibleCount} modules visible, ${hiddenCount} modules hidden`);
    console.log(`📋 Allowed modules: ${['dashboard', ...userPermissions].join(', ')}`);
    
    // Mark sidebar as permissions-ready to show filtered items
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.add('permissions-ready');
        console.log('✅ Sidebar marked as permissions-ready - seamless transition complete');
    }
}

// ==================== INITIALIZATION ====================

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', async () => {
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
            await startSession();
            
            // Start real-time permission listener
            await startRealtimePermissionListener();
            
            // Setup inactivity timeout
            setupActivityListeners();
            
            // Update profile name
            const profileNameEl = document.getElementById('profileName');
            if (profileNameEl) {
                profileNameEl.textContent = user.displayName;
            }
            
            // Log page view
            await logAuditTrail(AUDIT_ACTIONS.MODULE_ACCESS, 'Application Loaded', 
                'User accessed the main application', {
                    initialModule: 'dashboard'
                });
            
            // Show role indicator
            console.log(`✅ Access Control Active - ${user.permissions.length} modules accessible`);
            console.log('✅ Real-time permission sync enabled');
            console.log('✅ Comprehensive audit trail active');
        } else {
            console.error('❌ No user found, redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        // Setup logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    await logout('manual');
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
    // Core auth functions
    getCurrentUser,
    hasAccess,
    checkModulePermission,
    logout,
    isAuthenticated,
    getRoleDisplayName,
    
    // Audit trail functions
    logAuditTrail,
    trackDataOperation,
    trackModuleAccess,
    AUDIT_ACTIONS,
    
    // Permission management
    filterModulesByPermissions,
    startRealtimePermissionListener,
    stopRealtimePermissionListener
};

// Also expose audit trail for other modules
window.auditTrail = {
    log: logAuditTrail,
    trackData: trackDataOperation,
    trackModule: trackModuleAccess,
    ACTIONS: AUDIT_ACTIONS
};

console.log('✅ Authentication system with real-time permissions & audit trail loaded');
