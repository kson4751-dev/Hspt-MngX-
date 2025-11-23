// Admin Module - User Management
// Real-time user creation with Firebase Auth and Firestore

import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Initialize admin module
export function initAdminModule() {
    setupAdminTabs();
    setupUserModal();
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
            
            showNotification('User updated successfully', 'success');
        } else {
            // Create new user
            if (!password || password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            await createNewUser({
                displayName,
                email,
                password,
                phone,
                role,
                department,
                active,
                permissions: selectedPermissions
            });

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

// Load all users
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading users...</td></tr>';

    try {
        const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(usersQuery);

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

    } catch (error) {
        console.error('Error loading users:', error);
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
                }
            }
        });
    });

    const adminModule = document.getElementById('admin-module');
    if (adminModule) {
        observer.observe(adminModule, { attributes: true });
    }
});
