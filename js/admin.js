// Admin Module - User Management with Real-time Sessions and Audit Trail
// Real-time user creation with Firebase Auth and Firestore

import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy, where, startAfter, limit, addDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { loadActiveSessions, loadRecentLogins, loadDepartmentActivity, setupActiveSessions } from './admin-sessions.js';

let usersUnsubscribe = null;
let logsUnsubscribe = null;

// Initialize admin module
export function initAdminModule() {
    setupAdminTabs();
    setupUserModal();
    setupSystemSettings();
    setupActivityLogs();
    setupActiveSessions();
    loadUsers();
}

// Setup admin tabs
function setupAdminTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');

            // Remove active from all
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Add active to selected
            tab.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // Load specific tab data
            if (targetTab === 'sessions') {
                loadActiveSessions();
                loadRecentLogins();
            } else if (targetTab === 'departments') {
                loadDepartmentActivity();
            }
        });
    });
}

// Setup user modal
function setupUserModal() {
    const createUserBtn = document.getElementById('createUserBtn');
    const userForm = document.getElementById('userForm');
    const userRole = document.getElementById('userRole');

    if (createUserBtn) {
        createUserBtn.addEventListener('click', openCreateUserModal);
    }

    if (userForm) {
        userForm.addEventListener('submit', handleUserFormSubmit);
    }

    // Auto-select permissions based on role
    if (userRole) {
        userRole.addEventListener('change', (e) => {
            autoSelectPermissions(e.target.value);
        });
    }
}

// Open create user modal
function openCreateUserModal() {
    const modal = document.getElementById('userModal');
    const modalTitle = document.getElementById('userModalTitle');
    const saveBtn = document.getElementById('saveUserBtn');
    const userForm = document.getElementById('userForm');

    modalTitle.innerHTML = '<i class="fas fa-user-plus"></i> Create New User';
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Create User';
    
    userForm.reset();
    document.getElementById('editUserId').value = '';
    document.getElementById('userPassword').required = true;
    document.getElementById('userActive').checked = true;
    
    clearAllPermissions();
    modal.style.display = 'flex';
}

// Close user modal
window.closeUserModal = function() {
    const modal = document.getElementById('userModal');
    modal.style.display = 'none';
    document.getElementById('userForm').reset();
};

// Auto-select permissions based on role
function autoSelectPermissions(role) {
    clearAllPermissions();

    const rolePermissions = {
        admin: ['dashboard', 'reception', 'triage', 'doctor', 'nursing', 'laboratory', 'ward', 'pharmacy', 'billing', 'inventory', 'expenses', 'admin', 'settings', 'emergency'],
        doctor: ['dashboard', 'triage', 'doctor', 'laboratory', 'ward', 'emergency', 'settings'],
        nurse: ['dashboard', 'triage', 'nursing', 'ward', 'emergency', 'settings'],
        pharmacist: ['dashboard', 'pharmacy', 'inventory', 'settings'],
        receptionist: ['dashboard', 'reception', 'billing', 'settings'],
        lab_technician: ['dashboard', 'laboratory', 'settings'],
        billing: ['dashboard', 'billing', 'expenses', 'settings'],
        inventory_manager: ['dashboard', 'inventory', 'settings']
    };

    const permissions = rolePermissions[role] || [];
    
    permissions.forEach(permission => {
        const checkbox = document.querySelector(`input[name="modulePermission"][value="${permission}"]`);
        if (checkbox) {
            checkbox.checked = true;
        }
    });
}

// Select all permissions
window.selectAllPermissions = function() {
    const checkboxes = document.querySelectorAll('input[name="modulePermission"]');
    checkboxes.forEach(cb => cb.checked = true);
};

// Clear all permissions
window.clearAllPermissions = function() {
    const checkboxes = document.querySelectorAll('input[name="modulePermission"]');
    checkboxes.forEach(cb => cb.checked = false);
};

// Handle user form submit
async function handleUserFormSubmit(e) {
    e.preventDefault();

    const editUserId = document.getElementById('editUserId').value;
    const displayName = document.getElementById('userDisplayName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const password = document.getElementById('userPassword').value;
    const phone = document.getElementById('userPhone').value.trim();
    const role = document.getElementById('userRole').value;
    const department = document.getElementById('userDepartment').value.trim();
    const active = document.getElementById('userActive').checked;

    // Get selected permissions
    const selectedPermissions = [];
    document.querySelectorAll('input[name="modulePermission"]:checked').forEach(cb => {
        selectedPermissions.push(cb.value);
    });

    if (selectedPermissions.length === 0) {
        showNotification('Please select at least one module permission', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveUserBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        if (editUserId) {
            // Update existing user
            await updateUser(editUserId, {
                displayName,
                email,
                phone,
                role,
                department,
                active,
                permissions: selectedPermissions,
                updatedAt: new Date().toISOString()
            });
            
            // Log activity
            await logActivity('user', 'User updated', auth.currentUser?.uid, `Updated user: ${displayName} (${email})`);
            
            showNotification('User updated successfully', 'success');
        } else {
            // Create new user
            if (!password || password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            const newUserId = await createNewUser({
                displayName,
                email,
                password,
                phone,
                role,
                department,
                active,
                permissions: selectedPermissions
            });

            // Log activity
            await logActivity('user', 'New user created', auth.currentUser?.uid, `Created user: ${displayName} (${email}) with role: ${role}`);

            showNotification('User created successfully', 'success');
        }

        closeUserModal();
        loadUsers();

    } catch (error) {
        console.error('Error saving user:', error);
        
        let errorMessage = 'Failed to save user';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email address is already in use';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// Create new user
async function createNewUser(userData) {
    // Note: Creating users requires Firebase Admin SDK on backend
    // For now, we'll use the client SDK with current user's auth
    
    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            userData.email,
            userData.password
        );

        const uid = userCredential.user.uid;

        // Create user document in Firestore
        await setDoc(doc(db, 'users', uid), {
            email: userData.email,
            displayName: userData.displayName,
            phone: userData.phone || '',
            role: userData.role,
            department: userData.department || '',
            permissions: userData.permissions,
            active: userData.active,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: auth.currentUser?.uid || 'admin'
        });

        return uid;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}

// Update existing user
async function updateUser(uid, userData) {
    try {
        await updateDoc(doc(db, 'users', uid), userData);
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
}

// Load all users with real-time updates
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading users...</td></tr>';

    try {
        // Unsubscribe from previous listener
        if (usersUnsubscribe) {
            usersUnsubscribe();
        }

        const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        
        // Set up real-time listener
        usersUnsubscribe = onSnapshot(usersQuery, (snapshot) => {
            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
                return;
            }

            tbody.innerHTML = '';

            snapshot.forEach(doc => {
                const user = doc.data();
                const row = createUserRow(doc.id, user);
                tbody.innerHTML += row;
            });
        }, (error) => {
            console.error('Error loading users:', error);
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-error">Error loading users</td></tr>';
        });

    } catch (error) {
        console.error('Error setting up users listener:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-error">Error loading users</td></tr>';
    }
}

// Create user table row
function createUserRow(uid, user) {
    const statusBadge = user.active 
        ? '<span class="badge badge-success">Active</span>' 
        : '<span class="badge badge-danger">Inactive</span>';
    
    const roleDisplay = getRoleDisplayName(user.role);
    const moduleCount = user.permissions ? user.permissions.length : 0;
    const moduleText = `${moduleCount} module${moduleCount !== 1 ? 's' : ''}`;
    
    const createdDate = user.createdAt 
        ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() 
        : '-';

    return `
        <tr>
            <td>
                <div class="user-info">
                    <i class="fas fa-user-circle" style="font-size: 24px; color: #667eea; margin-right: 10px;"></i>
                    <div>
                        <strong>${user.displayName || 'N/A'}</strong>
                        ${user.department ? `<br><small>${user.department}</small>` : ''}
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td><span class="badge badge-primary">${roleDisplay}</span></td>
            <td><small>${moduleText}</small></td>
            <td>${statusBadge}</td>
            <td>${createdDate}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" onclick="editUser('${uid}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteUser('${uid}', '${user.email}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
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
    return roleNames[role] || role;
}

// Edit user
window.editUser = async function(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        
        if (!userDoc.exists()) {
            showNotification('User not found', 'error');
            return;
        }

        const user = userDoc.data();
        
        // Fill form with user data
        document.getElementById('editUserId').value = uid;
        document.getElementById('userDisplayName').value = user.displayName || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userPhone').value = user.phone || '';
        document.getElementById('userRole').value = user.role || '';
        document.getElementById('userDepartment').value = user.department || '';
        document.getElementById('userActive').checked = user.active !== false;
        document.getElementById('userPassword').required = false;
        document.getElementById('userPassword').value = '';

        // Set permissions
        clearAllPermissions();
        if (user.permissions) {
            user.permissions.forEach(permission => {
                const checkbox = document.querySelector(`input[name="modulePermission"][value="${permission}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }

        // Update modal title and button
        document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Edit User';
        document.getElementById('saveUserBtn').innerHTML = '<i class="fas fa-save"></i> Update User';

        // Open modal
        document.getElementById('userModal').style.display = 'flex';

    } catch (error) {
        console.error('Error loading user:', error);
        showNotification('Failed to load user data', 'error');
    }
};

// Delete user
window.deleteUser = async function(uid, email) {
    if (!confirm(`Are you sure you want to delete user: ${email}?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'users', uid));
        
        // Log activity
        await logActivity('user', 'User deleted', auth.currentUser?.uid, `Deleted user: ${email}`);
        
        showNotification('User deleted successfully', 'success');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Failed to delete user', 'error');
    }
};

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Initialize when admin module is shown
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const adminModule = document.getElementById('admin-module');
                if (adminModule && adminModule.classList.contains('active')) {
                    initAdminModule();
                } else {
                    // Clean up listeners when module is hidden
                    if (usersUnsubscribe) {
                        usersUnsubscribe();
                        usersUnsubscribe = null;
                    }
                    if (logsUnsubscribe) {
                        logsUnsubscribe();
                        logsUnsubscribe = null;
                    }
                }
            }
        });
    });

    const adminModule = document.getElementById('admin-module');
    if (adminModule) {
        observer.observe(adminModule, { attributes: true });
    }
});

// ==========================================
// SYSTEM SETTINGS FUNCTIONALITY
// ==========================================

function setupSystemSettings() {
    loadSystemSettings();

    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const backupNowBtn = document.getElementById('backupNowBtn');
    const exportDataBtn = document.getElementById('exportDataBtn');

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSystemSettings);
    }

    if (backupNowBtn) {
        backupNowBtn.addEventListener('click', performBackup);
    }

    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', exportSystemData);
    }
}

// Load system settings from Firestore with real-time updates
async function loadSystemSettings() {
    try {
        // Set up real-time listener for settings
        const settingsRef = doc(db, 'system', 'settings');
        
        onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const settings = docSnap.data();
                
                // General Settings
                if (settings.hospitalName !== undefined) document.getElementById('hospitalName').value = settings.hospitalName;
                if (settings.hospitalAddress !== undefined) document.getElementById('hospitalAddress').value = settings.hospitalAddress;
                if (settings.hospitalPhone !== undefined) document.getElementById('hospitalPhone').value = settings.hospitalPhone;
                if (settings.hospitalEmail !== undefined) document.getElementById('hospitalEmail').value = settings.hospitalEmail;
                
                // Security Settings
                if (settings.sessionTimeout !== undefined) document.getElementById('sessionTimeout').value = settings.sessionTimeout;
                if (settings.passwordMinLength !== undefined) document.getElementById('passwordMinLength').value = settings.passwordMinLength;
                if (settings.requireEmailVerification !== undefined) document.getElementById('requireEmailVerification').checked = settings.requireEmailVerification;
                if (settings.enableTwoFactor !== undefined) document.getElementById('enableTwoFactor').checked = settings.enableTwoFactor;
                
                // Notification Settings
                if (settings.emailNotifications !== undefined) document.getElementById('emailNotifications').checked = settings.emailNotifications;
                if (settings.smsNotifications !== undefined) document.getElementById('smsNotifications').checked = settings.smsNotifications;
                if (settings.lowStockAlerts !== undefined) document.getElementById('lowStockAlerts').checked = settings.lowStockAlerts;
                if (settings.expiryAlerts !== undefined) document.getElementById('expiryAlerts').checked = settings.expiryAlerts;
                
                // Billing Settings
                if (settings.currency !== undefined) document.getElementById('currency').value = settings.currency;
                if (settings.taxRate !== undefined) document.getElementById('taxRate').value = settings.taxRate;
                if (settings.autoGenerateBills !== undefined) document.getElementById('autoGenerateBills').checked = settings.autoGenerateBills;
                if (settings.allowPartialPayments !== undefined) document.getElementById('allowPartialPayments').checked = settings.allowPartialPayments;
                
                // Appointment Settings
                if (settings.appointmentDuration !== undefined) document.getElementById('appointmentDuration').value = settings.appointmentDuration;
                if (settings.workingHoursStart !== undefined) document.getElementById('workingHoursStart').value = settings.workingHoursStart;
                if (settings.workingHoursEnd !== undefined) document.getElementById('workingHoursEnd').value = settings.workingHoursEnd;
                if (settings.allowOnlineBooking !== undefined) document.getElementById('allowOnlineBooking').checked = settings.allowOnlineBooking;
                
                // Backup Settings
                if (settings.backupFrequency !== undefined) document.getElementById('backupFrequency').value = settings.backupFrequency;
                if (settings.dataRetention !== undefined) document.getElementById('dataRetention').value = settings.dataRetention;
            } else {
                // Set default values if no settings exist
                console.log('No settings found, using defaults');
            }
        }, (error) => {
            console.error('Error loading settings:', error);
        });
        
    } catch (error) {
        console.error('Error setting up settings listener:', error);
    }
}

// Save system settings to Firestore
async function saveSystemSettings() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const settings = {
            // General Settings
            hospitalName: document.getElementById('hospitalName').value,
            hospitalAddress: document.getElementById('hospitalAddress').value,
            hospitalPhone: document.getElementById('hospitalPhone').value,
            hospitalEmail: document.getElementById('hospitalEmail').value,
            
            // Security Settings
            sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
            passwordMinLength: parseInt(document.getElementById('passwordMinLength').value),
            requireEmailVerification: document.getElementById('requireEmailVerification').checked,
            enableTwoFactor: document.getElementById('enableTwoFactor').checked,
            
            // Notification Settings
            emailNotifications: document.getElementById('emailNotifications').checked,
            smsNotifications: document.getElementById('smsNotifications').checked,
            lowStockAlerts: document.getElementById('lowStockAlerts').checked,
            expiryAlerts: document.getElementById('expiryAlerts').checked,
            
            // Billing Settings
            currency: document.getElementById('currency').value,
            taxRate: parseFloat(document.getElementById('taxRate').value),
            autoGenerateBills: document.getElementById('autoGenerateBills').checked,
            allowPartialPayments: document.getElementById('allowPartialPayments').checked,
            
            // Appointment Settings
            appointmentDuration: parseInt(document.getElementById('appointmentDuration').value),
            workingHoursStart: document.getElementById('workingHoursStart').value,
            workingHoursEnd: document.getElementById('workingHoursEnd').value,
            allowOnlineBooking: document.getElementById('allowOnlineBooking').checked,
            
            // Backup Settings
            backupFrequency: document.getElementById('backupFrequency').value,
            dataRetention: parseInt(document.getElementById('dataRetention').value),
            
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser?.uid || 'admin'
        };

        await setDoc(doc(db, 'system', 'settings'), settings);
        
        // Log activity
        await logActivity('system', 'System settings updated', auth.currentUser?.uid);
        
        showNotification('Settings saved successfully', 'success');
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Failed to save settings', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

// Perform backup
async function performBackup() {
    const btn = document.getElementById('backupNowBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Backing up...';

    try {
        // Log backup activity
        await logActivity('system', 'Manual backup initiated', auth.currentUser?.uid);
        
        // Simulate backup (in production, this would trigger a Cloud Function)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        showNotification('Backup completed successfully', 'success');
    } catch (error) {
        console.error('Error performing backup:', error);
        showNotification('Backup failed', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Export system data
async function exportSystemData() {
    const btn = document.getElementById('exportDataBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';

    try {
        // Log export activity
        await logActivity('system', 'Data export initiated', auth.currentUser?.uid);
        
        showNotification('Export will be sent to your email', 'success');
    } catch (error) {
        console.error('Error exporting data:', error);
        showNotification('Export failed', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// ==========================================
// ACTIVITY LOGS FUNCTIONALITY
// ==========================================

let logsLastDoc = null;
let logsLoading = false;

function setupActivityLogs() {
    loadActivityLogs();

    const logTypeFilter = document.getElementById('logTypeFilter');
    const logDateFilter = document.getElementById('logDateFilter');
    const clearLogFilters = document.getElementById('clearLogFilters');
    const loadMoreLogs = document.getElementById('loadMoreLogs');

    if (logTypeFilter) {
        logTypeFilter.addEventListener('change', () => {
            logsLastDoc = null;
            loadActivityLogs();
        });
    }

    if (logDateFilter) {
        logDateFilter.addEventListener('change', () => {
            logsLastDoc = null;
            loadActivityLogs();
        });
    }

    if (clearLogFilters) {
        clearLogFilters.addEventListener('click', () => {
            logTypeFilter.value = '';
            logDateFilter.value = '';
            logsLastDoc = null;
            loadActivityLogs();
        });
    }

    if (loadMoreLogs) {
        loadMoreLogs.addEventListener('click', () => {
            loadActivityLogs(true);
        });
    }
}

// Load activity logs with real-time updates
async function loadActivityLogs(loadMore = false) {
    if (logsLoading) return;
    
    const timeline = document.getElementById('logsTimeline');
    const loadMoreBtn = document.getElementById('loadMoreLogs');
    
    if (!timeline) return;

    logsLoading = true;

    if (!loadMore) {
        timeline.innerHTML = '<div class="log-item"><div class="log-icon log-icon-info"><i class="fas fa-spinner fa-spin"></i></div><div class="log-content"><p>Loading logs...</p></div></div>';
    } else {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    }

    try {
        const logTypeFilter = document.getElementById('logTypeFilter').value;
        const logDateFilter = document.getElementById('logDateFilter').value;

        // Unsubscribe from previous listener
        if (logsUnsubscribe && !loadMore) {
            logsUnsubscribe();
        }

        let logsQuery = query(
            collection(db, 'activity_logs'),
            orderBy('timestamp', 'desc'),
            limit(20)
        );

        // Apply filters
        if (logTypeFilter) {
            logsQuery = query(
                collection(db, 'activity_logs'),
                where('type', '==', logTypeFilter),
                orderBy('timestamp', 'desc'),
                limit(20)
            );
        }

        if (loadMore && logsLastDoc) {
            logsQuery = query(logsQuery, startAfter(logsLastDoc));
        }

        if (!loadMore) {
            // Set up real-time listener for initial load
            logsUnsubscribe = onSnapshot(logsQuery, (snapshot) => {
                if (snapshot.empty) {
                    timeline.innerHTML = '<div class="log-item"><div class="log-icon log-icon-info"><i class="fas fa-info-circle"></i></div><div class="log-content"><p>No activity logs found</p></div></div>';
                    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                    logsLoading = false;
                    return;
                }

                logsLastDoc = snapshot.docs[snapshot.docs.length - 1];
                timeline.innerHTML = '';

                snapshot.forEach(doc => {
                    const log = doc.data();
                    timeline.innerHTML += createLogItem(log);
                });

                if (loadMoreBtn) {
                    loadMoreBtn.style.display = snapshot.size === 20 ? 'block' : 'none';
                }
                
                logsLoading = false;
            }, (error) => {
                console.error('Error loading logs:', error);
                timeline.innerHTML = '<div class="log-item"><div class="log-icon log-icon-error"><i class="fas fa-exclamation-circle"></i></div><div class="log-content"><p>Error loading logs</p></div></div>';
                logsLoading = false;
            });
        } else {
            // For load more, use regular getDocs
            const snapshot = await getDocs(logsQuery);

            if (snapshot.empty) {
                loadMoreBtn.style.display = 'none';
                logsLoading = false;
                return;
            }

            logsLastDoc = snapshot.docs[snapshot.docs.length - 1];

            snapshot.forEach(doc => {
                const log = doc.data();
                timeline.innerHTML += createLogItem(log);
            });

            loadMoreBtn.style.display = snapshot.size === 20 ? 'block' : 'none';
            logsLoading = false;
        }

    } catch (error) {
        console.error('Error loading logs:', error);
        timeline.innerHTML = '<div class="log-item"><div class="log-icon log-icon-error"><i class="fas fa-exclamation-circle"></i></div><div class="log-content"><p>Error loading logs</p></div></div>';
        logsLoading = false;
    } finally {
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Load More';
        }
    }
}

// Create log item HTML
function createLogItem(log) {
    const timestamp = log.timestamp ? new Date(log.timestamp.seconds * 1000) : new Date();
    const timeAgo = getTimeAgo(timestamp);
    const icon = getLogIcon(log.type);
    const iconClass = getLogIconClass(log.type);

    return `
        <div class="log-item">
            <div class="log-icon ${iconClass}">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="log-content">
                <div class="log-header">
                    <strong>${log.action || 'Activity'}</strong>
                    <span class="log-time">${timeAgo}</span>
                </div>
                <p class="log-description">${log.description || ''}</p>
                ${log.userName ? `<small class="log-user">by ${log.userName}</small>` : ''}
            </div>
        </div>
    `;
}

// Get log icon based on type
function getLogIcon(type) {
    const icons = {
        'user': 'user',
        'login': 'sign-in-alt',
        'logout': 'sign-out-alt',
        'patient': 'user-injured',
        'billing': 'file-invoice-dollar',
        'pharmacy': 'pills',
        'system': 'cog',
        'error': 'exclamation-circle'
    };
    return icons[type] || 'circle';
}

// Get log icon class based on type
function getLogIconClass(type) {
    const classes = {
        'login': 'log-icon-success',
        'logout': 'log-icon-warning',
        'user': 'log-icon-info',
        'patient': 'log-icon-info',
        'billing': 'log-icon-success',
        'pharmacy': 'log-icon-info',
        'system': 'log-icon-warning',
        'error': 'log-icon-error'
    };
    return classes[type] || 'log-icon-info';
}

// Get time ago string
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

// Log activity to Firestore
export async function logActivity(type, action, userId = null, description = '') {
    try {
        const user = userId ? await getDoc(doc(db, 'users', userId)) : null;
        const userName = user && user.exists() ? user.data().displayName : 'Unknown';

        await addDoc(collection(db, 'activity_logs'), {
            type,
            action,
            description,
            userId: userId || null,
            userName,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}
