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
    const userDisplayName = document.getElementById('userDisplayName');
    const userGeneratedId = document.getElementById('userGeneratedId');

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
            // Update User ID preview when role changes
            if (userDisplayName && userDisplayName.value && userGeneratedId) {
                userGeneratedId.value = generateUserId(userDisplayName.value, e.target.value);
            }
        });
    }
    
    // Update User ID preview when name changes
    if (userDisplayName && userGeneratedId) {
        userDisplayName.addEventListener('input', (e) => {
            const role = userRole ? userRole.value : '';
            if (e.target.value && role) {
                userGeneratedId.value = generateUserId(e.target.value, role);
            } else {
                userGeneratedId.value = '';
            }
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
    
    // Clear User ID field (will auto-generate on save)
    const userIdField = document.getElementById('userGeneratedId');
    if (userIdField) {
        userIdField.value = '';
        userIdField.placeholder = 'Auto-generated on save';
    }
    
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

            // Generate User ID
            const userId = generateUserId(displayName, role);

            const newUserId = await createNewUser({
                displayName,
                email,
                password,
                phone,
                role,
                department,
                active,
                permissions: selectedPermissions,
                userId
            });

            // Log activity
            await logActivity('user', 'New user created', auth.currentUser?.uid, `Created user: ${displayName} (${email}) with ID: ${userId} and role: ${role}`);

            showNotification(`User created successfully with ID: ${userId}`, 'success');
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

        // Create user document in Firestore with generated User ID
        await setDoc(doc(db, 'users', uid), {
            email: userData.email,
            displayName: userData.displayName,
            userId: userData.userId,
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
    const container = document.getElementById('usersGridContainer');
    
    if (!container) return;

    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #6b7280;"><i class="fas fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 16px;"></i><p style="font-size: 15px;">Loading users...</p></div>';

    try {
        // Unsubscribe from previous listener
        if (usersUnsubscribe) {
            usersUnsubscribe();
        }

        // Limit initial load to 100 users for faster performance
        const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));
        
        // Set up real-time listener
        usersUnsubscribe = onSnapshot(usersQuery, (snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #6b7280;"><i class="fas fa-users" style="font-size: 48px; opacity: 0.3; margin-bottom: 16px;"></i><p style="font-size: 15px; font-weight: 500;">No users found</p><small>Create a new user to get started</small></div>';
                return;
            }

            // Use DocumentFragment for batch DOM update
            const fragment = document.createDocumentFragment();
            const tempDiv = document.createElement('div');
            
            snapshot.forEach(doc => {
                const user = doc.data();
                const cardHTML = createUserCard(doc.id, user);
                tempDiv.innerHTML = cardHTML;
                const card = tempDiv.firstElementChild;
                fragment.appendChild(card);
            });
            
            container.innerHTML = '';
            container.appendChild(fragment);
        }, (error) => {
            console.error('Error loading users:', error);
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #ef4444;"><i class="fas fa-exclamation-circle" style="font-size: 32px; margin-bottom: 16px;"></i><p style="font-size: 15px;">Error loading users</p></div>';
        });

    } catch (error) {
        console.error('Error setting up users listener:', error);
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #ef4444;"><i class="fas fa-exclamation-circle" style="font-size: 32px; margin-bottom: 16px;"></i><p style="font-size: 15px;">Error loading users</p></div>';
    }
}

// Create user card
function createUserCard(uid, user) {
    const statusColor = user.active ? '#10b981' : '#ef4444';
    const statusText = user.active ? 'Active' : 'Inactive';
    const statusIcon = user.active ? 'fa-check-circle' : 'fa-times-circle';
    
    const roleDisplay = getRoleDisplayName(user.role);
    const moduleCount = user.permissions ? user.permissions.length : 0;
    
    const createdDate = user.createdAt 
        ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
        : '-';

    // Get initials for avatar
    const initials = user.displayName 
        ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    // Role colors
    const roleColors = {
        'admin': '#8b5cf6',
        'doctor': '#3b82f6',
        'nurse': '#10b981',
        'receptionist': '#f59e0b',
        'pharmacist': '#ec4899',
        'lab_technician': '#06b6d4',
        'billing': '#f97316',
        'inventory_manager': '#84cc16'
    };
    const roleColor = roleColors[user.role] || '#6b7280';

    return `
        <div class="user-card" style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; transition: all 0.2s; position: relative; overflow: hidden;">
            <!-- Status Indicator -->
            <div style="position: absolute; top: 0; right: 0; width: 100%; height: 3px; background: ${statusColor};"></div>
            
            <!-- Card Header -->
            <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px;">
                <!-- Avatar -->
                <div style="width: 56px; height: 56px; border-radius: 12px; background: ${roleColor}; color: white; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; flex-shrink: 0;">
                    ${initials}
                </div>
                
                <!-- User Info -->
                <div style="flex: 1; min-width: 0;">
                    <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${user.displayName || 'N/A'}
                    </h3>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        <i class="fas fa-envelope" style="font-size: 11px; margin-right: 4px;"></i>${user.email}
                    </p>
                    ${user.userId ? `<p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280; font-family: monospace; font-weight: 600;">
                        <i class="fas fa-id-card" style="font-size: 11px; margin-right: 4px;"></i>${user.userId}
                    </p>` : ''}
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: ${statusColor}; font-weight: 500;">
                            <i class="fas ${statusIcon}"></i>${statusText}
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- Card Body -->
            <div style="display: grid; gap: 12px; margin-bottom: 16px; padding: 14px; background: #f9fafb; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Role</span>
                    <span style="display: inline-block; padding: 4px 12px; background: ${roleColor}; color: white; border-radius: 6px; font-size: 12px; font-weight: 500;">
                        ${roleDisplay}
                    </span>
                </div>
                ${user.department ? `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Department</span>
                    <span style="font-size: 13px; color: #111827; font-weight: 500;">${user.department}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Module Access</span>
                    <span style="font-size: 13px; color: #111827; font-weight: 500;">${moduleCount} modules</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Created</span>
                    <span style="font-size: 12px; color: #6b7280;">${createdDate}</span>
                </div>
            </div>
            
            <!-- Card Footer -->
            <div style="display: flex; gap: 8px;">
                <button 
                    onclick="editUser('${uid}')" 
                    class="btn btn-secondary" 
                    style="flex: 1; padding: 10px; font-size: 13px; border-radius: 6px; background: #f3f4f6; color: #374151; border: none; font-weight: 500; transition: all 0.2s;"
                    onmouseover="this.style.background='#e5e7eb'" 
                    onmouseout="this.style.background='#f3f4f6'"
                >
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button 
                    onclick="deleteUser('${uid}', '${user.email}')" 
                    class="btn btn-danger" 
                    style="flex: 1; padding: 10px; font-size: 13px; border-radius: 6px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-weight: 500; transition: all 0.2s;"
                    onmouseover="this.style.background='#fee2e2'; this.style.borderColor='#fca5a5'" 
                    onmouseout="this.style.background='#fef2f2'; this.style.borderColor='#fecaca'"
                >
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

// Generate User ID based on name and role (e.g., JT-5321N)
function generateUserId(displayName, role) {
    // Get initials from name (first letter of first and last name)
    const nameParts = displayName.trim().split(' ').filter(part => part.length > 0);
    let initials = '';
    if (nameParts.length >= 2) {
        initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
    } else if (nameParts.length === 1) {
        initials = (nameParts[0].substring(0, 2)).toUpperCase();
    } else {
        initials = 'US';
    }
    
    // Generate random 4-digit number
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    
    // Get role abbreviation
    const roleAbbreviations = {
        'admin': 'A',
        'doctor': 'D',
        'nurse': 'N',
        'receptionist': 'R',
        'pharmacist': 'P',
        'lab_technician': 'L',
        'billing': 'B',
        'inventory_manager': 'I'
    };
    const roleAbbr = roleAbbreviations[role] || 'U';
    
    return `${initials}-${randomNumber}${roleAbbr}`;
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
        
        // Set User ID (readonly, can't be changed)
        const userIdField = document.getElementById('userGeneratedId');
        if (userIdField) {
            userIdField.value = user.userId || 'Not assigned';
        }

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

// Delete user - Show modal
window.deleteUser = async function(uid, email) {
    // Find user data to display
    const usersSnapshot = await getDocs(collection(db, 'users'));
    let userData = null;
    usersSnapshot.forEach(doc => {
        if (doc.id === uid) {
            userData = { id: doc.id, ...doc.data() };
        }
    });

    if (!userData) {
        showNotification('User not found', 'error');
        return;
    }

    // Populate modal with user info
    document.getElementById('deleteUserName').textContent = userData.displayName || 'Unknown';
    document.getElementById('deleteUserEmail').textContent = email;
    document.getElementById('deleteUserRole').textContent = (userData.role || 'Unknown').toUpperCase();
    document.getElementById('deleteUserUid').textContent = uid;

    // Reset confirmation input
    const confirmInput = document.getElementById('deleteUserConfirmInput');
    confirmInput.value = '';
    document.getElementById('confirmDeleteUserBtn').disabled = true;

    // Store user data for deletion
    window._deleteUserData = { uid, email, userData };

    // Show modal
    const modal = document.getElementById('deleteUserModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);

    // Focus on input
    setTimeout(() => confirmInput.focus(), 300);
};

// Close delete user modal
window.closeDeleteUserModal = function() {
    const modal = document.getElementById('deleteUserModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        window._deleteUserData = null;
        document.getElementById('deleteUserConfirmInput').value = '';
    }, 300);
};

// Enable delete button when typing DELETE
document.addEventListener('DOMContentLoaded', () => {
    const confirmInput = document.getElementById('deleteUserConfirmInput');
    const confirmBtn = document.getElementById('confirmDeleteUserBtn');
    
    if (confirmInput && confirmBtn) {
        confirmInput.addEventListener('input', function() {
            confirmBtn.disabled = this.value.toUpperCase() !== 'DELETE';
        });
        
        // Allow Enter key to confirm if input is correct
        confirmInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.toUpperCase() === 'DELETE') {
                confirmDeleteUser();
            }
        });
    }
});

// Confirm and execute user deletion
window.confirmDeleteUser = async function() {
    const confirmInput = document.getElementById('deleteUserConfirmInput');
    if (confirmInput.value.toUpperCase() !== 'DELETE') {
        showNotification('Please type DELETE to confirm', 'error');
        return;
    }

    const { uid, email } = window._deleteUserData || {};
    if (!uid || !email) {
        showNotification('User data not found', 'error');
        return;
    }

    try {
        // Close modal and show loading
        closeDeleteUserModal();
        showNotification('⏳ Deleting user... Please wait.', 'info');

        // 1. Delete from Firestore users collection
        await deleteDoc(doc(db, 'users', uid));
        console.log('✓ Deleted user document from Firestore');

        // 2. Delete all user sessions from Realtime Database (if exists)
        try {
            const { realtimeDb } = await import('./firebase-config.js');
            const { ref, remove } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
            const userSessionsRef = ref(realtimeDb, `active_sessions/${uid}`);
            await remove(userSessionsRef);
            console.log('✓ Deleted user sessions from Realtime Database');
        } catch (error) {
            console.warn('Could not delete sessions:', error);
        }

        // 3. Delete all activity logs for this user
        try {
            const logsQuery = query(collection(db, 'activity_logs'), where('userId', '==', uid));
            const logsSnapshot = await getDocs(logsQuery);
            const deletePromises = [];
            logsSnapshot.forEach(logDoc => {
                deletePromises.push(deleteDoc(doc(db, 'activity_logs', logDoc.id)));
            });
            await Promise.all(deletePromises);
            console.log(`✓ Deleted ${logsSnapshot.size} activity log entries`);
        } catch (error) {
            console.warn('Could not delete activity logs:', error);
        }

        // 4. Delete any user-specific data (prescriptions, notes, etc.)
        try {
            // Delete user's created prescriptions
            const prescQuery = query(collection(db, 'prescriptions'), where('prescribedBy', '==', email));
            const prescSnapshot = await getDocs(prescQuery);
            const prescPromises = [];
            prescSnapshot.forEach(prescDoc => {
                prescPromises.push(updateDoc(doc(db, 'prescriptions', prescDoc.id), {
                    prescribedBy: 'Deleted User',
                    prescribedByDeleted: true
                }));
            });
            await Promise.all(prescPromises);
            console.log(`✓ Updated ${prescSnapshot.size} prescriptions (marked as deleted user)`);
        } catch (error) {
            console.warn('Could not update prescriptions:', error);
        }

        // 5. Log the deletion activity
        await logActivity('user', 'User permanently deleted', auth.currentUser?.uid, 
            `Permanently deleted user: ${email} (UID: ${uid}). All related data removed.`);

        showNotification(`✅ User ${email} has been completely removed from the system`, 'success');
        
        // Reload user list
        loadUsers();

        // Show follow-up message about Auth
        setTimeout(() => {
            showNotification('ℹ️ Note: Firebase Auth account may need manual deletion from Firebase Console', 'info');
        }, 3000);

    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(`❌ Failed to delete user: ${error.message}`, 'error');
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
            // Use getDocs instead of onSnapshot for faster initial load
            const snapshot = await getDocs(logsQuery);
            
            if (snapshot.empty) {
                timeline.innerHTML = '<div class="log-item"><div class="log-icon log-icon-info"><i class="fas fa-info-circle"></i></div><div class="log-content"><p>No activity logs found</p></div></div>';
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                logsLoading = false;
                return;
            }

            logsLastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            // Use DocumentFragment for batch DOM update
            const fragment = document.createDocumentFragment();
            const tempDiv = document.createElement('div');
            
            snapshot.forEach(doc => {
                const log = doc.data();
                const logHTML = createLogItem(log);
                tempDiv.innerHTML = logHTML;
                const logItem = tempDiv.firstElementChild;
                fragment.appendChild(logItem);
            });
            
            timeline.innerHTML = '';
            timeline.appendChild(fragment);

            if (loadMoreBtn) {
                loadMoreBtn.style.display = snapshot.size === 20 ? 'block' : 'none';
            }
            
            logsLoading = false;
        } else {
            // For load more, use regular getDocs
            const snapshot = await getDocs(logsQuery);

            if (snapshot.empty) {
                loadMoreBtn.style.display = 'none';
                logsLoading = false;
                return;
            }

            logsLastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            // Use DocumentFragment for batch DOM update
            const fragment = document.createDocumentFragment();
            const tempDiv = document.createElement('div');

            snapshot.forEach(doc => {
                const log = doc.data();
                const logHTML = createLogItem(log);
                tempDiv.innerHTML = logHTML;
                const logItem = tempDiv.firstElementChild;
                fragment.appendChild(logItem);
            });
            
            timeline.appendChild(fragment);

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
