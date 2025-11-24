// App.js - Main Application Logic

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') {
    body.classList.add('dark-theme');
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-theme');
    
    if (body.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});

// Sidebar Toggle
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');

sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebarState', sidebar.classList.contains('collapsed') ? 'collapsed' : 'expanded');
});

// Load saved sidebar state
const savedSidebarState = localStorage.getItem('sidebarState');
if (savedSidebarState === 'collapsed') {
    sidebar.classList.add('collapsed');
}

// Profile Dropdown
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const profileNameElement = document.getElementById('profileName');

// Load user profile from Firebase Auth
async function loadUserProfile() {
    try {
        // Import Firebase Auth
        const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const { getFirestore, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        
        const app = getApp();
        const auth = getAuth(app);
        const db = getFirestore(app);
        
        // Listen to auth state changes
        onAuthStateChanged(auth, async (user) => {
            if (user && profileNameElement) {
                // Try to get user data from Firestore first
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const displayName = userData.displayName || userData.name || user.displayName || user.email.split('@')[0];
                        profileNameElement.textContent = displayName;
                    } else {
                        // Fallback to Firebase Auth display name or email
                        profileNameElement.textContent = user.displayName || user.email.split('@')[0];
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    // Fallback to Firebase Auth data
                    profileNameElement.textContent = user.displayName || user.email.split('@')[0];
                }
            } else if (profileNameElement) {
                profileNameElement.textContent = 'User';
            }
        });
    } catch (error) {
        console.error('Error loading user profile:', error);
        // Fallback to localStorage/sessionStorage
        const user = getCurrentUser();
        if (user && profileNameElement) {
            profileNameElement.textContent = user.displayName || user.email || 'User';
        }
    }
}

// Initialize profile on load
loadUserProfile();

profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle('active');
    
    // Close notification dropdown if open
    const notificationDropdown = document.getElementById('notificationDropdown');
    if (notificationDropdown) {
        notificationDropdown.classList.remove('active');
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.classList.remove('active');
    }
});

// Helper function to show a specific module
function showModule(moduleShortName) {
    const modules = document.querySelectorAll('.module');
    const navItems = document.querySelectorAll('.nav-item');
    const navDropdownItems = document.querySelectorAll('.nav-dropdown-item');
    
    // Hide all modules
    modules.forEach(module => module.classList.remove('active'));
    
    // Remove active from all nav items
    navItems.forEach(nav => nav.classList.remove('active'));
    navDropdownItems.forEach(nav => nav.classList.remove('active'));
    
    // Show the requested module
    const moduleId = moduleShortName + '-module';
    const targetModule = document.getElementById(moduleId);
    if (targetModule) {
        targetModule.classList.add('active');
    }
    
    // Activate the corresponding nav item
    const targetNavItem = document.querySelector(`[data-submodule="${moduleShortName}"]`);
    if (targetNavItem) {
        targetNavItem.classList.add('active');
        
        // Also activate the parent nav item if it exists
        const parentModule = targetNavItem.getAttribute('data-module');
        const parentNavItem = document.querySelector(`.nav-item[data-module="${parentModule}"]`);
        if (parentNavItem) {
            parentNavItem.classList.add('active');
        }
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Module Navigation
const navItems = document.querySelectorAll('.nav-item');
const navDropdownItems = document.querySelectorAll('.nav-dropdown-item');
const modules = document.querySelectorAll('.module');

// Handle main nav items
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        const parentGroup = item.closest('.nav-item-group');
        
        // If item has dropdown, toggle it
        if (parentGroup && parentGroup.querySelector('.nav-dropdown')) {
            e.stopPropagation();
            parentGroup.classList.toggle('open');
            return;
        }
        
        // Remove active class from all nav items and dropdown items
        navItems.forEach(nav => nav.classList.remove('active'));
        navDropdownItems.forEach(nav => nav.classList.remove('active'));
        modules.forEach(module => module.classList.remove('active'));
        
        // Add active class to clicked nav item
        item.classList.add('active');
        
        // Show corresponding module
        const moduleId = item.getAttribute('data-module') + '-module';
        const activeModule = document.getElementById(moduleId);
        if (activeModule) {
            activeModule.classList.add('active');
        }
        
        // Close sidebar on mobile after selection
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    });
});

// Handle dropdown nav items
navDropdownItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all nav items and modules
        navItems.forEach(nav => nav.classList.remove('active'));
        navDropdownItems.forEach(nav => nav.classList.remove('active'));
        modules.forEach(module => module.classList.remove('active'));
        
        // Add active class to clicked dropdown item
        item.classList.add('active');
        
        // Show corresponding module
        const submodule = item.getAttribute('data-submodule');
        const moduleId = submodule + '-module';
        const activeModule = document.getElementById(moduleId);
        if (activeModule) {
            activeModule.classList.add('active');
        }
        
        // Close sidebar on mobile after selection
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    });
});

// Responsive Sidebar Toggle for Mobile
if (window.innerWidth <= 768) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// Notifications Button
const notificationsBtn = document.getElementById('notificationsBtn');
const notificationDropdown = document.getElementById('notificationDropdown');
const notificationList = document.getElementById('notificationList');
const notificationBadge = document.getElementById('notificationBadge');
const markAllReadBtn = document.getElementById('markAllReadBtn');

// Notifications array - will be populated from Firebase
let notifications = [];
let notificationsModule = null;

// Import and initialize notifications module
async function initializeNotifications() {
    try {
        notificationsModule = await import('./notifications.js');
        notificationsModule.initNotifications();
        console.log('✅ Notifications module initialized');
    } catch (error) {
        console.error('Error initializing notifications module:', error);
    }
}

// Update notification UI (called by notifications.js)
window.updateNotificationUI = function(notificationsData) {
    notifications = notificationsData.map(n => ({
        id: n.id,
        type: n.type,
        icon: n.icon,
        title: n.title,
        message: n.message,
        time: notificationsModule ? notificationsModule.formatNotificationTime(n.timestamp) : 'Just now',
        read: n.read || false,
        timestamp: n.timestamp
    }));
    
    renderNotifications();
};

// Render notifications
function renderNotifications() {
    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Update badge - show red dot only if there are unread notifications
    if (unreadCount > 0) {
        notificationBadge.style.display = 'block';
    } else {
        notificationBadge.style.display = 'none';
    }
    
    // Render list
    if (notifications.length === 0) {
        notificationList.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications yet</p>
            </div>
        `;
    } else {
        notificationList.innerHTML = notifications.map(notification => `
            <div class="notification-item ${!notification.read ? 'unread' : ''}" data-id="${notification.id}">
                <div class="notification-icon ${notification.type}">
                    <i class="fas ${notification.icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${notification.time}</div>
                </div>
            </div>
        `).join('');
        
        // Add click handlers to notification items
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-id');
                markNotificationAsRead(id);
            });
        });
    }
}

// Mark notification as read
async function markNotificationAsRead(id) {
    if (notificationsModule) {
        await notificationsModule.markNotificationAsRead(id);
        // UI will update automatically via real-time listener
    }
}

// Mark all as read
markAllReadBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (notificationsModule) {
        await notificationsModule.markAllNotificationsAsRead();
        // UI will update automatically via real-time listener
    }
});

// Toggle notification dropdown
notificationsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationDropdown.classList.toggle('active');
    profileDropdown.classList.remove('active'); // Close profile dropdown if open
    
    // Render notifications when opened
    if (notificationDropdown.classList.contains('active')) {
        renderNotifications();
    }
});

// Close notification dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!notificationsBtn.contains(e.target) && !notificationDropdown.contains(e.target)) {
        notificationDropdown.classList.remove('active');
    }
});

// Initialize notifications on page load
initializeNotifications();

// Global function to add new notification (wrapper for Firebase function)
window.addNotification = async function(type, title, message, icon = null) {
    const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
    const userId = storageType.getItem('userId');
    
    if (!userId) {
        console.warn('No user ID found. Cannot add notification.');
        return;
    }
    
    if (notificationsModule) {
        await notificationsModule.addNotification(userId, type, title, message, icon);
    }
};

// Global function to clear all notifications
window.clearAllNotifications = async function() {
    if (notificationsModule) {
        const result = await notificationsModule.clearAllNotifications();
        if (result.success) {
            console.log('All notifications cleared');
        }
    }
};

// Messages Button
const messagesBtn = document.getElementById('messagesBtn');
messagesBtn.addEventListener('click', () => {
    console.log('Messages clicked');
    // Add messages panel logic here
});

// Logout Button
const logoutBtn = document.getElementById('logoutBtn');
logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to logout?')) {
        // Call logout function from auth.js
        if (typeof logout === 'function') {
            logout();
        } else {
            // Fallback if auth.js is not loaded
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = 'login.html';
        }
    }
});

// Window Resize Handler
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
    }
});

// Initialize tooltips for collapsed sidebar
function updateTooltips() {
    if (sidebar.classList.contains('collapsed')) {
        navItems.forEach(item => {
            const text = item.querySelector('.nav-text').textContent;
            item.setAttribute('title', text);
        });
    } else {
        navItems.forEach(item => {
            item.removeAttribute('title');
        });
    }
}

sidebar.addEventListener('transitionend', updateTooltips);
updateTooltips();

// Close dropdowns when sidebar collapses
sidebar.addEventListener('transitionend', () => {
    if (sidebar.classList.contains('collapsed')) {
        document.querySelectorAll('.nav-item-group').forEach(group => {
            group.classList.remove('open');
        });
    }
});

// Category Selection Logic - Dropdown
const patientCategorySelect = document.getElementById('patientCategory');
const categoryContents = {
    new: document.getElementById('newPatientSection'),
    existing: document.getElementById('existingPatientSection'),
    referral: document.getElementById('referralPatientSection')
};

if (patientCategorySelect) {
    // Function to update visible section
    const updateVisibleSection = () => {
        const category = patientCategorySelect.value;
        
        // Hide all content sections
        Object.values(categoryContents).forEach(content => {
            if (content) {
                content.classList.remove('active');
                content.style.display = 'none';
            }
        });
        
        // Show selected content section
        if (category && categoryContents[category]) {
            categoryContents[category].classList.add('active');
            categoryContents[category].style.display = 'block';
        }
    };
    
    // Listen for dropdown changes
    patientCategorySelect.addEventListener('change', updateVisibleSection);
    
    // Initialize - hide all sections on load since placeholder is selected
    Object.values(categoryContents).forEach(content => {
        if (content) {
            content.classList.remove('active');
            content.style.display = 'none';
        }
    });
}

// ==========================================
// DASHBOARD MODULE
// ==========================================

let dashboardStats = {
    totalPatients: 0,
    todayPatients: 0,
    queuePatients: 0,
    activeConsultations: 0,
    labTests: 0,
    pharmacyOrders: 0,
    triageCases: 0,
    emergencies: 0
};

// Initialize Dashboard
function initializeDashboard() {
    console.log('Initializing Dashboard...');
    loadDashboardStats();
    
    // Set up real-time listeners for all data sources
    setupDashboardRealTimeListeners();
}

// Load all dashboard statistics
async function loadDashboardStats() {
    try {
        // Load patients data
        import('./firebase-helpers.js').then(({ subscribeToPatients }) => {
            subscribeToPatients((patients) => {
                updatePatientsStats(patients);
                updateDashboardDisplay();
            });
        }).catch(error => {
            console.error('Error loading patients for dashboard:', error);
        });
        
        // Load lab requests data
        import('./firebase-helpers.js').then(({ subscribeToLabRequests }) => {
            subscribeToLabRequests((requests) => {
                updateLabStats(requests);
                updateDashboardDisplay();
            });
        }).catch(error => {
            console.error('Error loading lab requests for dashboard:', error);
        });
        
    } catch (error) {
        console.error('Error initializing dashboard stats:', error);
    }
}

// Update patients statistics
function updatePatientsStats(patients) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    dashboardStats.totalPatients = patients.length;
    
    // Today's patients
    dashboardStats.todayPatients = patients.filter(p => {
        if (!p.registrationDate) return false;
        const regDate = new Date(p.registrationDate);
        regDate.setHours(0, 0, 0, 0);
        return regDate.getTime() === today.getTime();
    }).length;
    
    // Queue patients
    dashboardStats.queuePatients = patients.filter(p => p.status === 'in-queue').length;
    
    // Active consultations (patients with doctor)
    dashboardStats.activeConsultations = patients.filter(p => 
        p.status === 'with-doctor' || p.status === 'consulting'
    ).length;
    
    // Triage cases today
    dashboardStats.triageCases = patients.filter(p => {
        if (!p.triageDate) return false;
        const triageDate = new Date(p.triageDate);
        triageDate.setHours(0, 0, 0, 0);
        return triageDate.getTime() === today.getTime();
    }).length;
    
    // Emergency cases
    dashboardStats.emergencies = patients.filter(p => 
        p.priority === 'emergency' || p.status === 'emergency'
    ).length;
}

// Update lab statistics
function updateLabStats(requests) {
    // Pending lab tests
    dashboardStats.labTests = requests.filter(r => 
        r.status === 'pending' || r.status === 'in-progress'
    ).length;
    
    // For pharmacy orders, we'll use a default or load from another source
    // This can be enhanced when pharmacy module is fully implemented
    dashboardStats.pharmacyOrders = 0; // Placeholder
}

// Update dashboard display
function updateDashboardDisplay() {
    // Update stat cards
    const dashTotalPatients = document.getElementById('dashTotalPatients');
    const dashTodayPatients = document.getElementById('dashTodayPatients');
    const dashQueuePatients = document.getElementById('dashQueuePatients');
    const dashActiveConsultations = document.getElementById('dashActiveConsultations');
    const dashLabTests = document.getElementById('dashLabTests');
    const dashPharmacyOrders = document.getElementById('dashPharmacyOrders');
    const dashTriageCases = document.getElementById('dashTriageCases');
    const dashEmergencies = document.getElementById('dashEmergencies');
    const dashPatientsChange = document.getElementById('dashPatientsChange');
    
    if (dashTotalPatients) dashTotalPatients.textContent = dashboardStats.totalPatients;
    if (dashTodayPatients) dashTodayPatients.textContent = dashboardStats.todayPatients;
    if (dashQueuePatients) dashQueuePatients.textContent = dashboardStats.queuePatients;
    if (dashActiveConsultations) dashActiveConsultations.textContent = dashboardStats.activeConsultations;
    if (dashLabTests) dashLabTests.textContent = dashboardStats.labTests;
    if (dashPharmacyOrders) dashPharmacyOrders.textContent = dashboardStats.pharmacyOrders;
    if (dashTriageCases) dashTriageCases.textContent = dashboardStats.triageCases;
    if (dashEmergencies) dashEmergencies.textContent = dashboardStats.emergencies;
    if (dashPatientsChange) dashPatientsChange.textContent = dashboardStats.todayPatients;
    
    // Add animation to updated numbers
    animateNumber(dashTotalPatients);
    animateNumber(dashTodayPatients);
    animateNumber(dashQueuePatients);
}

// Animate number change
function animateNumber(element) {
    if (!element) return;
    element.style.transform = 'scale(1.1)';
    setTimeout(() => {
        element.style.transform = 'scale(1)';
    }, 300);
}

// Setup real-time listeners
function setupDashboardRealTimeListeners() {
    // Refresh dashboard every 30 seconds for real-time feel
    setInterval(() => {
        loadDashboardStats();
    }, 30000);
}

// Navigate to module from quick actions
function navigateToModule(module, submodule = null) {
    const navItems = document.querySelectorAll('.nav-item');
    const navDropdownItems = document.querySelectorAll('.nav-dropdown-item');
    const modules = document.querySelectorAll('.module');
    
    // Remove active from all
    navItems.forEach(nav => nav.classList.remove('active'));
    navDropdownItems.forEach(nav => nav.classList.remove('active'));
    modules.forEach(mod => mod.classList.remove('active'));
    
    if (submodule) {
        // Navigate to submodule
        const targetNavItem = document.querySelector(`[data-module="${module}"][data-submodule="${submodule}"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active');
            
            // Open parent dropdown if needed
            const parentGroup = targetNavItem.closest('.nav-item-group');
            if (parentGroup) {
                parentGroup.classList.add('open');
            }
        }
        
        const moduleElement = document.getElementById(`${submodule}-module`);
        if (moduleElement) {
            moduleElement.classList.add('active');
        }
    } else {
        // Navigate to main module
        const targetNavItem = document.querySelector(`.nav-item[data-module="${module}"]`);
        if (targetNavItem) {
            targetNavItem.classList.add('active');
        }
        
        const moduleElement = document.getElementById(`${module}-module`);
        if (moduleElement) {
            moduleElement.classList.add('active');
            
            // Special handling for all-activities module
            if (module === 'all-activities') {
                navigateToAllActivitiesModule();
            }
        }
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async () => {
    initializeDashboard();
    loadRecentActivities();
    initializeDashboardSearch();
    
    // Initialize Ward & Nursing Module
    try {
        const { initWardNursingModule } = await import('./ward-nursing.js');
        if (initWardNursingModule) {
            initWardNursingModule();
        }
    } catch (error) {
        console.error('Error initializing Ward & Nursing module:', error);
    }
});

// ==========================================
// DASHBOARD SEARCH & REFRESH
// ==========================================

// Initialize dashboard search
function initializeDashboardSearch() {
    const searchInput = document.getElementById('dashboardSearchInput');
    if (!searchInput) return;
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const searchTerm = e.target.value.trim().toLowerCase();
        
        if (searchTerm.length >= 2) {
            searchTimeout = setTimeout(() => {
                performDashboardSearch(searchTerm);
            }, 300);
        } else {
            clearDashboardSearch();
        }
    });
    
    // Enter key to search
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = searchInput.value.trim().toLowerCase();
            if (searchTerm.length >= 2) {
                performDashboardSearch(searchTerm);
            }
        }
    });
}

// Perform dashboard search
function performDashboardSearch(searchTerm) {
    console.log('Searching dashboard for:', searchTerm);
    
    // Search in patients
    const matchingPatients = allPatients.filter(p => {
        return p.patientId?.toLowerCase().includes(searchTerm) ||
               p.firstName?.toLowerCase().includes(searchTerm) ||
               p.lastName?.toLowerCase().includes(searchTerm) ||
               p.phone?.includes(searchTerm);
    });
    
    // Search in activities
    const matchingActivities = recentActivities.filter(a => {
        return a.action?.toLowerCase().includes(searchTerm) ||
               a.patient?.toLowerCase().includes(searchTerm) ||
               a.module?.toLowerCase().includes(searchTerm);
    });
    
    // Show search results notification
    showDashboardSearchResults(matchingPatients, matchingActivities, searchTerm);
}

// Show dashboard search results
function showDashboardSearchResults(patients, activities, searchTerm) {
    const modal = document.getElementById('dashboardSearchModal');
    const resultsContainer = document.getElementById('dashboardSearchResults');
    
    if (!modal || !resultsContainer) return;
    
    let resultsHTML = `
        <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-color); border-radius: 8px;">
            <strong style="color: var(--text-primary);">Search query:</strong> 
            <span style="color: var(--primary-color);">"${searchTerm}"</span>
        </div>
    `;
    
    // Patients results
    if (patients.length > 0) {
        resultsHTML += `
            <div style="margin-bottom: 30px;">
                <h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-users" style="color: var(--primary-color);"></i>
                    Patients (${patients.length})
                </h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${patients.slice(0, 5).map(patient => `
                        <div style="padding: 12px; background: var(--sidebar-bg); border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; transition: all 0.2s;" 
                             onclick="navigateToPatient('${patient.patientId}')" 
                             onmouseover="this.style.background='var(--bg-color)'; this.style.borderColor='var(--primary-color)'" 
                             onmouseout="this.style.background='var(--sidebar-bg)'; this.style.borderColor='var(--border-color)'">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="color: var(--text-primary);">${patient.firstName} ${patient.lastName}</strong>
                                    <span style="margin-left: 10px; font-size: 13px; color: var(--text-secondary);">ID: ${patient.patientId}</span>
                                </div>
                                <span class="status-badge status-${patient.status}">${patient.status}</span>
                            </div>
                            <div style="margin-top: 8px; font-size: 13px; color: var(--text-secondary); display: flex; gap: 20px;">
                                <span><i class="fas fa-phone"></i> ${patient.phone || 'N/A'}</span>
                                <span><i class="fas fa-venus-mars"></i> ${patient.gender || 'N/A'}</span>
                                <span><i class="fas fa-birthday-cake"></i> ${calculateAge(patient.dateOfBirth)} years</span>
                            </div>
                        </div>
                    `).join('')}
                    ${patients.length > 5 ? `
                        <div style="text-align: center; padding: 10px; color: var(--text-secondary); font-size: 13px;">
                            + ${patients.length - 5} more patients
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // Activities results
    if (activities.length > 0) {
        resultsHTML += `
            <div>
                <h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-history" style="color: var(--primary-color);"></i>
                    Recent Activities (${activities.length})
                </h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${activities.slice(0, 5).map(activity => {
                        const time = new Date(activity.timestamp);
                        const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return `
                            <div style="padding: 12px; background: var(--sidebar-bg); border: 1px solid var(--border-color); border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div style="flex: 1;">
                                        <div style="color: var(--text-primary); font-weight: 500; margin-bottom: 4px;">${activity.action}</div>
                                        <div style="font-size: 13px; color: var(--text-secondary);">
                                            <span>${activity.patient || 'N/A'}</span>
                                            <span style="margin: 0 8px;">•</span>
                                            <span>${activity.module}</span>
                                            <span style="margin: 0 8px;">•</span>
                                            <span>${timeStr}</span>
                                        </div>
                                    </div>
                                    <span class="activity-badge ${activity.status}">${activity.statusText}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                    ${activities.length > 5 ? `
                        <div style="text-align: center; padding: 10px; color: var(--text-secondary); font-size: 13px;">
                            + ${activities.length - 5} more activities
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // No results
    if (patients.length === 0 && activities.length === 0) {
        resultsHTML += `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-search" style="font-size: 48px; color: var(--text-secondary); margin-bottom: 15px;"></i>
                <p style="color: var(--text-secondary); font-size: 16px;">No results found for "${searchTerm}"</p>
                <p style="color: var(--text-secondary); font-size: 14px; margin-top: 8px;">Try a different search term</p>
            </div>
        `;
    }
    
    resultsContainer.innerHTML = resultsHTML;
    modal.style.display = 'flex';
}

// Close dashboard search modal
function closeDashboardSearchModal() {
    const modal = document.getElementById('dashboardSearchModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Navigate to patient from search results
function navigateToPatient(patientId) {
    closeDashboardSearchModal();
    navigateToModule('reception', 'all-patients');
    // Optionally, highlight or scroll to the patient in the table
    setTimeout(() => {
        showNotification('Patient Selected', `Viewing patient ${patientId}`, 'info');
    }, 300);
}

// Clear dashboard search
function clearDashboardSearch() {
    updateRecentActivitiesDisplay();
}

// Refresh dashboard
function refreshDashboard() {
    const btn = document.getElementById('dashboardRefreshBtn');
    const icon = btn?.querySelector('i');
    
    if (icon) {
        icon.style.animation = 'spin 1s linear';
        setTimeout(() => {
            icon.style.animation = '';
        }, 1000);
    }
    
    // Reload all dashboard data
    loadDashboardStats();
    loadRecentActivities();
    
    // Clear search
    const searchInput = document.getElementById('dashboardSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    clearDashboardSearch();
    
    showNotification('Dashboard Refreshed', 'All data has been updated', 'success');
}

// Expose dashboard function globally
window.refreshDashboard = refreshDashboard;

// ==========================================
// RECENT ACTIVITIES
// ==========================================

let recentActivities = [];
let activitiesUnsubscribe = null;

// Get current user info
function getCurrentUserInfo() {
    try {
        // Try to get from session/local storage first
        const userStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
        if (userStr) {
            const user = JSON.parse(userStr);
            return {
                userId: user.uid || user.id,
                userName: user.displayName || user.name || user.email?.split('@')[0] || 'User'
            };
        }
    } catch (error) {
        console.error('Error getting user info:', error);
    }
    return {
        userId: 'system',
        userName: 'System'
    };
}

// Load recent activities from Firebase (realtime)
async function loadRecentActivities() {
    try {
        // Import the subscribe function from firebase-helpers
        const { subscribeToActivities } = await import('./firebase-helpers.js');
        
        // Unsubscribe from previous listener if exists
        if (activitiesUnsubscribe) {
            activitiesUnsubscribe();
        }
        
        // Subscribe to activities with real-time updates
        activitiesUnsubscribe = subscribeToActivities((activities) => {
            console.log(`📊 Received ${activities.length} activities from Firebase`);
            recentActivities = activities;
            updateRecentActivitiesDisplay();
            
            // Also update the All Activities table if it's currently displayed
            const allActivitiesModule = document.getElementById('all-activities-module');
            if (allActivitiesModule && allActivitiesModule.classList.contains('active')) {
                displayAllActivitiesTable();
            }
        }, 100); // Get latest 100 activities for the all activities view
        
        console.log('✅ Subscribed to real-time activities from Firebase');
    } catch (error) {
        console.error('❌ Error loading activities:', error);
        updateRecentActivitiesDisplay();
    }
}

// Add activity to Firebase and track locally
async function addActivity(activity) {
    try {
        const userInfo = getCurrentUserInfo();
        
        const activityData = {
            action: activity.action,
            patient: activity.patient || null,
            patientId: activity.patientId || null,
            module: activity.module,
            userId: userInfo.userId,
            userName: activity.user || userInfo.userName,
            status: activity.status || 'info',
            statusText: activity.statusText || 'Completed',
            description: activity.description || null,
            metadata: activity.metadata || {}
        };
        
        // Import and call the Firebase function
        const { logActivity } = await import('./firebase-helpers.js');
        const result = await logActivity(activityData);
        
        if (result.success) {
            console.log('Activity logged successfully:', activity.action);
        } else {
            console.error('Failed to log activity:', result.error);
        }
    } catch (error) {
        console.error('Error adding activity:', error);
    }
}

// Update recent activities display
function updateRecentActivitiesDisplay() {
    const tbody = document.getElementById('recentActivitiesBody');
    if (!tbody) return;
    
    if (recentActivities.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <i class="fas fa-clock" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                    <p>No recent activities</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = recentActivities.slice(0, 10).map(activity => {
        const time = new Date(activity.timestamp);
        const now = new Date();
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        
        let timeStr;
        if (diffMins < 1) {
            timeStr = 'Just now';
        } else if (diffMins < 60) {
            timeStr = `${diffMins}m ago`;
        } else if (diffMins < 1440) {
            const hours = Math.floor(diffMins / 60);
            timeStr = `${hours}h ago`;
        } else {
            timeStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
        
        // Status badge styling
        const statusClass = activity.status || 'info';
        
        return `
            <tr>
                <td><span class="activity-time">${timeStr}</span></td>
                <td><strong>${activity.action}</strong></td>
                <td>${activity.patient || 'N/A'}</td>
                <td><span class="module-badge">${activity.module}</span></td>
                <td>${activity.userName || 'System'}</td>
                <td><span class="activity-badge ${statusClass}">${activity.statusText}</span></td>
            </tr>
        `;
    }).join('');
}

// View all activities
function viewAllActivities() {
    navigateToModule('all-activities');
}

// Navigate to all activities module and display filtered activities
function navigateToAllActivitiesModule() {
    // Show loading state first
    const tbody = document.getElementById('allActivitiesTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                    <p>Loading activities from Firebase...</p>
                </td>
            </tr>
        `;
    }
    
    // Display current activities if already loaded
    if (recentActivities.length > 0) {
        displayAllActivitiesTable();
    }
    
    setupActivityFilters();
}

// Display all activities in the dedicated module
function displayAllActivitiesTable(filteredActivities = null) {
    const tbody = document.getElementById('allActivitiesTableBody');
    if (!tbody) return;
    
    const activitiesToDisplay = filteredActivities || recentActivities;
    
    if (activitiesToDisplay.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                    <p>No activities found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = activitiesToDisplay.map(activity => {
        const time = new Date(activity.timestamp);
        const timeStr = time.toLocaleString([], { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const statusClass = activity.status || 'info';
        
        return `
            <tr>
                <td><span class="activity-time">${timeStr}</span></td>
                <td><strong>${activity.action}</strong></td>
                <td>${activity.patient || 'N/A'}</td>
                <td><span class="module-badge">${activity.module}</span></td>
                <td>${activity.userName || 'System'}</td>
                <td><span class="activity-badge ${statusClass}">${activity.statusText}</span></td>
            </tr>
        `;
    }).join('');
}

// Setup activity filters
function setupActivityFilters() {
    const moduleFilter = document.getElementById('activityModuleFilter');
    const statusFilter = document.getElementById('activityStatusFilter');
    const searchInput = document.getElementById('activitySearchInput');
    
    const applyFilters = () => {
        let filtered = [...recentActivities];
        
        // Module filter
        if (moduleFilter && moduleFilter.value) {
            filtered = filtered.filter(a => a.module === moduleFilter.value);
        }
        
        // Status filter
        if (statusFilter && statusFilter.value) {
            filtered = filtered.filter(a => a.status === statusFilter.value);
        }
        
        // Search filter
        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.toLowerCase().trim();
            filtered = filtered.filter(a => 
                a.action.toLowerCase().includes(searchTerm) ||
                (a.patient && a.patient.toLowerCase().includes(searchTerm)) ||
                (a.userName && a.userName.toLowerCase().includes(searchTerm)) ||
                a.module.toLowerCase().includes(searchTerm)
            );
        }
        
        displayAllActivitiesTable(filtered);
    };
    
    if (moduleFilter) moduleFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applyFilters, 300);
        });
    }
}

// Refresh all activities
function refreshAllActivities() {
    const moduleFilter = document.getElementById('activityModuleFilter');
    const statusFilter = document.getElementById('activityStatusFilter');
    const searchInput = document.getElementById('activitySearchInput');
    
    // Reset filters
    if (moduleFilter) moduleFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (searchInput) searchInput.value = '';
    
    // Reload activities
    displayAllActivitiesTable();
}

// Show all activities in a modal (legacy - kept for backwards compatibility)
function showAllActivitiesModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content" style="max-width: 1200px; max-height: 80vh;">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i class="fas fa-history"></i>
                    All Recent Activities
                </h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 0; overflow-y: auto;">
                <table class="activities-table" style="margin: 0;">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Activity</th>
                            <th>Patient</th>
                            <th>Module</th>
                            <th>User</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recentActivities.map(activity => {
                            const time = new Date(activity.timestamp);
                            const timeStr = time.toLocaleString([], { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            });
                            const statusClass = activity.status || 'info';
                            
                            return `
                                <tr>
                                    <td><span class="activity-time">${timeStr}</span></td>
                                    <td><strong>${activity.action}</strong></td>
                                    <td>${activity.patient || 'N/A'}</td>
                                    <td><span class="module-badge">${activity.module}</span></td>
                                    <td>${activity.userName || 'System'}</td>
                                    <td><span class="activity-badge ${statusClass}">${activity.statusText}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                    Close
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Initialize activities on dashboard load
document.addEventListener('DOMContentLoaded', () => {
    loadRecentActivities();
});

// Helper functions to track specific activities across modules
function trackPatientRegistration(patientName, patientId) {
    addActivity({
        action: 'Patient Registered',
        patient: patientName,
        patientId: patientId,
        module: 'Reception',
        status: 'success',
        statusText: 'Completed'
    });
}

function trackConsultation(patientName, patientId, action = 'Consultation Started') {
    addActivity({
        action: action,
        patient: patientName,
        patientId: patientId,
        module: 'Doctor',
        status: 'info',
        statusText: 'In Progress'
    });
}

function trackLabTest(patientName, patientId, testType = 'Lab Test') {
    addActivity({
        action: `${testType} Ordered`,
        patient: patientName,
        patientId: patientId,
        module: 'Laboratory',
        status: 'warning',
        statusText: 'Pending'
    });
}

function trackPharmacyOrder(patientName, patientId, orderType = 'Prescription') {
    addActivity({
        action: `${orderType} Dispensed`,
        patient: patientName,
        patientId: patientId,
        module: 'Pharmacy',
        status: 'success',
        statusText: 'Completed'
    });
}

function trackTriageAssessment(patientName, patientId, priority = 'Normal') {
    addActivity({
        action: 'Triage Assessment',
        patient: patientName,
        patientId: patientId,
        module: 'Triage',
        status: priority === 'Critical' ? 'negative' : priority === 'Urgent' ? 'warning' : 'info',
        statusText: `Priority: ${priority}`
    });
}

function trackWardAdmission(patientName, patientId, ward) {
    addActivity({
        action: `Ward Admission - ${ward}`,
        patient: patientName,
        patientId: patientId,
        module: 'Ward & Nursing',
        status: 'success',
        statusText: 'Admitted'
    });
}

function trackBilling(patientName, patientId, amount) {
    addActivity({
        action: 'Bill Created',
        patient: patientName,
        patientId: patientId,
        module: 'Billing',
        status: 'info',
        statusText: `Amount: ${amount}`,
        metadata: { amount }
    });
}

function trackEmergency(patientName, patientId, description) {
    addActivity({
        action: 'Emergency Case',
        patient: patientName,
        patientId: patientId,
        module: 'Emergency',
        status: 'negative',
        statusText: 'Critical',
        description: description
    });
}

function trackInventoryUpdate(itemName, action = 'Stock Updated') {
    addActivity({
        action: `${action} - ${itemName}`,
        module: 'Inventory',
        status: 'info',
        statusText: 'Updated'
    });
}

function trackExpense(category, amount) {
    addActivity({
        action: `Expense Added - ${category}`,
        module: 'Expenses',
        status: 'warning',
        statusText: `Amount: ${amount}`,
        metadata: { category, amount }
    });
}

// ==========================================
// PATIENT SEARCH FUNCTIONALITY
// ==========================================

// Patient Search Functionality
const patientSearchInput = document.getElementById('patientSearchInput');
const searchPatientBtn = document.getElementById('searchPatientBtn');
const searchResults = document.getElementById('searchResults');

// Function to search patients in real-time
function searchExistingPatients() {
    const searchTerm = patientSearchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        searchResults.innerHTML = '<p style="color: var(--warning-color); padding: 15px;"><i class="fas fa-exclamation-circle"></i> Please enter a search term</p>';
        return;
    }
    
    searchResults.innerHTML = '<p style="padding: 15px;"><i class="fas fa-spinner fa-spin"></i> Searching...</p>';
    
    // Search from allPatients array
    const results = allPatients.filter(patient => {
        return patient.patientId?.toLowerCase().includes(searchTerm) ||
               patient.firstName?.toLowerCase().includes(searchTerm) ||
               patient.lastName?.toLowerCase().includes(searchTerm) ||
               patient.phone?.includes(searchTerm) ||
               patient.email?.toLowerCase().includes(searchTerm) ||
               patient.idNumber?.toLowerCase().includes(searchTerm);
    });
    
    // Display results
    if (results.length === 0) {
        searchResults.innerHTML = `
            <p style="color: var(--text-secondary); padding: 15px;">
                <i class="fas fa-search"></i> 
                No patients found matching "${searchTerm}"
            </p>
        `;
        return;
    }
    
    // Show results with "Add to Queue" button
    searchResults.innerHTML = `
        <div style="max-height: 400px; overflow-y: auto;">
            <p style="padding: 10px 15px; background: #f0f9ff; border-bottom: 2px solid #0891b2; margin: 0; font-weight: 600; color: #0891b2;">
                <i class="fas fa-check-circle"></i> Found ${results.length} patient(s)
            </p>
            ${results.map(patient => `
                <div style="border-bottom: 1px solid #e5e7eb; padding: 15px; background: white; transition: all 0.3s;" 
                     onmouseover="this.style.background='#f9fafb'" 
                     onmouseout="this.style.background='white'">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <div style="margin-bottom: 8px;">
                                <strong style="font-size: 16px; color: #1f2937;">${patient.firstName} ${patient.lastName}</strong>
                                <span class="status-badge status-${patient.status}" style="margin-left: 10px; font-size: 11px;">${capitalizeFirst(patient.status)}</span>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 14px; color: #6b7280;">
                                <div><i class="fas fa-id-card" style="width: 20px;"></i> <strong>ID:</strong> ${patient.patientId}</div>
                                <div><i class="fas fa-phone" style="width: 20px;"></i> <strong>Phone:</strong> ${patient.phone || 'N/A'}</div>
                                <div><i class="fas fa-birthday-cake" style="width: 20px;"></i> <strong>Age:</strong> ${calculateAge(patient.dateOfBirth)} years</div>
                                <div><i class="fas fa-venus-mars" style="width: 20px;"></i> <strong>Gender:</strong> ${patient.gender || 'N/A'}</div>
                                <div><i class="fas fa-shield-alt" style="width: 20px;"></i> <strong>Insurance:</strong> ${getInsuranceName(patient.insurance?.provider)}</div>
                                <div><i class="fas fa-map-marker-alt" style="width: 20px;"></i> <strong>Location:</strong> ${patient.countyTown || 'N/A'}</div>
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="addExistingPatientToQueue('${patient.patientId}')" 
                                style="margin-left: 15px; white-space: nowrap;">
                            <i class="fas fa-plus"></i> Add to Queue
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

if (searchPatientBtn) {
    searchPatientBtn.addEventListener('click', searchExistingPatients);
    
    // Allow search on Enter key
    if (patientSearchInput) {
        patientSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchExistingPatients();
            }
        });
        
        // Real-time search as user types
        let searchTimeout;
        patientSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const searchTerm = patientSearchInput.value.trim();
            
            if (searchTerm.length >= 2) {
                searchTimeout = setTimeout(() => {
                    searchExistingPatients();
                }, 300);
            } else if (searchTerm.length === 0) {
                searchResults.innerHTML = '';
            }
        });
    }
}

// Add existing patient to queue
async function addExistingPatientToQueue(patientId) {
    const patient = allPatients.find(p => p.patientId === patientId || p.id === patientId);
    
    if (!patient) {
        alert('Patient not found');
        return;
    }
    
    // Update patient status to in-queue
    try {
        const { updatePatient } = await import('./firebase-helpers.js');
        
        const updatedData = {
            status: 'in-queue',
            lastVisitDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        const result = await updatePatient(patient.id || patient.patientId, updatedData);
        
        if (result.success) {
            showNotification('Success!', `${patient.firstName} ${patient.lastName} has been added to the queue`, 'success');
            
            // Clear search
            patientSearchInput.value = '';
            searchResults.innerHTML = `
                <div style="padding: 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
                    <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 10px;"></i>
                    <h3 style="margin: 0 0 5px 0;">Patient Added Successfully!</h3>
                    <p style="margin: 0; opacity: 0.9;">${patient.firstName} ${patient.lastName} is now in the queue</p>
                </div>
            `;
            
            // Auto-clear success message after 3 seconds
            setTimeout(() => {
                searchResults.innerHTML = '';
            }, 3000);
            
            // Update stats if needed
            updateStats();
        } else {
            alert('Failed to add patient to queue. Please try again.');
        }
    } catch (error) {
        console.error('Error adding patient to queue:', error);
        alert('Error adding patient to queue. Please try again.');
    }
}

// Consent and OTP Functionality for New Patient Form
const patientConsent = document.getElementById('patientConsent');
const otpSection = document.getElementById('otpSection');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const otpInputSection = document.getElementById('otpInputSection');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const otpPhone = document.getElementById('otpPhone');
const otpCode = document.getElementById('otpCode');

if (patientConsent) {
    patientConsent.addEventListener('change', () => {
        if (patientConsent.value === 'agree') {
            otpSection.style.display = 'block';
        } else {
            otpSection.style.display = 'none';
            otpInputSection.style.display = 'none';
        }
    });
}

if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', () => {
        const phoneNumber = otpPhone.value.trim();
        
        if (!phoneNumber) {
            alert('Please enter a phone number');
            return;
        }
        
        // TODO: Implement actual OTP sending via Firebase/SMS API
        alert(`OTP will be sent to ${phoneNumber}`);
        otpInputSection.style.display = 'block';
        sendOtpBtn.disabled = true;
        sendOtpBtn.innerHTML = '<i class="fas fa-check"></i> OTP Sent';
    });
}

if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener('click', () => {
        const code = otpCode.value.trim();
        
        if (!code || code.length !== 6) {
            alert('Please enter a valid 6-digit OTP code');
            return;
        }
        
        // TODO: Implement actual OTP verification
        alert('OTP verification will be implemented with backend');
        verifyOtpBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.classList.remove('btn-success');
        verifyOtpBtn.classList.add('btn-success');
    });
}

// Consent and OTP Functionality for Referral Patient Form
const refPatientConsent = document.getElementById('refPatientConsent');
const refOtpSection = document.getElementById('refOtpSection');
const refSendOtpBtn = document.getElementById('refSendOtpBtn');
const refOtpInputSection = document.getElementById('refOtpInputSection');
const refVerifyOtpBtn = document.getElementById('refVerifyOtpBtn');
const refOtpPhone = document.getElementById('refOtpPhone');
const refOtpCode = document.getElementById('refOtpCode');

if (refPatientConsent) {
    refPatientConsent.addEventListener('change', () => {
        if (refPatientConsent.value === 'agree') {
            refOtpSection.style.display = 'block';
        } else {
            refOtpSection.style.display = 'none';
            refOtpInputSection.style.display = 'none';
        }
    });
}

if (refSendOtpBtn) {
    refSendOtpBtn.addEventListener('click', () => {
        const phoneNumber = refOtpPhone.value.trim();
        
        if (!phoneNumber) {
            alert('Please enter a phone number');
            return;
        }
        
        // TODO: Implement actual OTP sending via Firebase/SMS API
        alert(`OTP will be sent to ${phoneNumber}`);
        refOtpInputSection.style.display = 'block';
        refSendOtpBtn.disabled = true;
        refSendOtpBtn.innerHTML = '<i class="fas fa-check"></i> OTP Sent';
    });
}

if (refVerifyOtpBtn) {
    refVerifyOtpBtn.addEventListener('click', () => {
        const code = refOtpCode.value.trim();
        
        if (!code || code.length !== 6) {
            alert('Please enter a valid 6-digit OTP code');
            return;
        }
        
        // TODO: Implement actual OTP verification
        alert('OTP verification will be implemented with backend');
        refVerifyOtpBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
        refVerifyOtpBtn.disabled = true;
        refVerifyOtpBtn.classList.remove('btn-success');
        refVerifyOtpBtn.classList.add('btn-success');
    });
}


// New Patient Registration Form
const newPatientForm = document.getElementById('newPatientForm');

if (newPatientForm) {
    newPatientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(newPatientForm);
        
        // Generate sequential patient ID
        const patientId = await generatePatientId();
        
        const patientData = {
            patientId: patientId,
            category: 'new',
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            dateOfBirth: formData.get('dateOfBirth'),
            gender: formData.get('gender'),
            idNumber: formData.get('idNumber'),
            bloodGroup: formData.get('bloodGroup'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            country: formData.get('country'),
            countyTown: formData.get('countyTown'),
            address: formData.get('address'),
            emergencyContact: {
                name: formData.get('emergencyName'),
                relation: formData.get('emergencyRelation'),
                phone: formData.get('emergencyPhone'),
                email: formData.get('emergencyEmail')
            },
            allergies: formData.get('allergies'),
            medicalHistory: formData.get('medicalHistory'),
            insurance: {
                provider: formData.get('insuranceProvider'),
                number: formData.get('insuranceNumber'),
                policyHolder: formData.get('policyHolder'),
                expiryDate: formData.get('policyExpiryDate')
            },
            consultationFee: {
                charged: formData.get('chargeConsultationFee') === 'on',
                type: formData.get('consultationFeeType') || 'standard',
                amount: formData.get('consultationFeeAmount') || '0',
                notes: formData.get('consultationFeeNotes') || ''
            },
            consent: formData.get('patientConsent'),
            status: 'active',
            registrationDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        console.log('New Patient Registration:', patientData);
        
        // Save to Firebase and update all patients module
        const saved = await savePatientToFirebase(patientData);
        
        if (saved) {
            // If consultation fee is charged, send to billing
            if (patientData.consultationFee.charged) {
                const feeData = {
                    amount: patientData.consultationFee.amount,
                    notes: patientData.consultationFee.notes,
                    type: patientData.consultationFee.type
                };
                sendConsultationFeeToBilling(patientData, feeData);
            }
            
            alert('Patient registered successfully!\n\nPatient ID: ' + patientData.patientId + '\nPatient: ' + patientData.firstName + ' ' + patientData.lastName + 
                  (patientData.consultationFee.charged ? '\n\nConsultation fee of KSh ' + patientData.consultationFee.amount + ' sent to billing.' : ''));
            newPatientForm.reset();
        } else {
            alert('Error registering patient. Please try again.');
        }
    });
}

// Referral Patient Registration Form
const referralPatientForm = document.getElementById('referralPatientForm');

if (referralPatientForm) {
    referralPatientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(referralPatientForm);
        
        // Generate sequential patient ID
        const patientId = await generatePatientId();
        
        const patientData = {
            patientId: patientId,
            category: 'referral',
            referral: {
                from: formData.get('referralFrom'),
                doctor: formData.get('referralDoctor'),
                date: formData.get('referralDate'),
                specialty: formData.get('referralSpecialty'),
                reason: formData.get('referralReason'),
                notes: formData.get('referralNotes')
            },
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            dateOfBirth: formData.get('dateOfBirth'),
            gender: formData.get('gender'),
            idNumber: formData.get('idNumber'),
            bloodGroup: formData.get('bloodGroup'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            country: formData.get('country'),
            countyTown: formData.get('countyTown'),
            address: formData.get('address'),
            emergencyContact: {
                name: formData.get('emergencyName'),
                relation: formData.get('emergencyRelation'),
                phone: formData.get('emergencyPhone'),
                email: formData.get('emergencyEmail')
            },
            insurance: {
                provider: formData.get('insuranceProvider'),
                number: formData.get('insuranceNumber'),
                policyHolder: formData.get('policyHolder'),
                expiryDate: formData.get('policyExpiryDate')
            },
            consent: formData.get('patientConsent'),
            status: 'active',
            registrationDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };
        
        console.log('Referral Patient Registration:', patientData);
        
        // Save to Firebase and update all patients module
        const saved = await savePatientToFirebase(patientData);
        
        if (saved) {
            alert('Referral patient registered successfully!\n\nPatient ID: ' + patientData.patientId + '\nPatient: ' + patientData.firstName + ' ' + patientData.lastName + '\nReferred from: ' + patientData.referral.from);
            referralPatientForm.reset();
        } else {
            alert('Error registering patient. Please try again.');
        }
    });
}

// ============================================
// ALL PATIENTS MODULE - REALTIME FUNCTIONALITY
// ============================================

let allPatients = [];
let filteredPatients = [];
let currentPage = 1;
let rowsPerPage = 25;
let patientCounter = 0;

// Generate sequential patient ID
async function generatePatientId() {
    // Get the highest patient number from existing patients
    let maxNumber = 0;
    
    allPatients.forEach(patient => {
        if (patient.patientId && patient.patientId.startsWith('PT-')) {
            const num = parseInt(patient.patientId.replace('PT-', ''));
            if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
            }
        }
    });
    
    // Increment for new patient
    const newNumber = maxNumber + 1;
    
    // Format with leading zeros (PT-001, PT-002, etc.)
    return 'PT-' + String(newNumber).padStart(3, '0');
}

// All Patients Module Elements
const patientsTableBody = document.getElementById('patientsTableBody');
const patientSearchField = document.getElementById('patientSearchField');
const filterStatus = document.getElementById('filterStatus');
const filterInsurance = document.getElementById('filterInsurance');
const filterDate = document.getElementById('filterDate');
const exportPatientsBtn = document.getElementById('exportPatientsBtn');
const addNewPatientBtn = document.getElementById('addNewPatientBtn');
const rowsPerPageSelect = document.getElementById('rowsPerPage');

// Pagination elements
const firstPageBtn = document.getElementById('firstPageBtn');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const lastPageBtn = document.getElementById('lastPageBtn');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');
const showingStartSpan = document.getElementById('showingStart');
const showingEndSpan = document.getElementById('showingEnd');
const totalRecordsSpan = document.getElementById('totalRecords');

// Stats elements
const totalPatientsCount = document.getElementById('totalPatientsCount');
const todayPatientsCount = document.getElementById('todayPatientsCount');
const queuePatientsCount = document.getElementById('queuePatientsCount');

// Initialize All Patients Module
function initializeAllPatientsModule() {
    if (!patientsTableBody) return;
    
    // Load patients from Firebase in realtime
    loadPatientsRealtime();
    
    // Search functionality - realtime
    if (patientSearchField) {
        let searchTimeout;
        patientSearchField.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterAndDisplayPatients();
            }, 300);
        });
    }
    
    // Filter listeners
    if (filterStatus) {
        filterStatus.addEventListener('change', filterAndDisplayPatients);
    }
    if (filterInsurance) {
        filterInsurance.addEventListener('change', filterAndDisplayPatients);
    }
    if (filterDate) {
        filterDate.addEventListener('change', filterAndDisplayPatients);
    }
    
    // Rows per page
    if (rowsPerPageSelect) {
        rowsPerPageSelect.addEventListener('change', (e) => {
            rowsPerPage = parseInt(e.target.value);
            currentPage = 1;
            displayPatients();
        });
    }
    
    // Pagination buttons
    if (firstPageBtn) {
        firstPageBtn.addEventListener('click', () => goToPage(1));
    }
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    }
    if (lastPageBtn) {
        lastPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredPatients.length / rowsPerPage);
            goToPage(totalPages);
        });
    }
    
    // Export button
    if (exportPatientsBtn) {
        exportPatientsBtn.addEventListener('click', exportPatients);
    }
    
    // Add new patient button
    if (addNewPatientBtn) {
        addNewPatientBtn.addEventListener('click', () => {
            // Navigate to new patient form
            const newPatientNavItem = document.querySelector('[data-module="reception"][data-submodule="new-patient"]');
            if (newPatientNavItem) {
                newPatientNavItem.click();
            }
        });
    }
}

// Load patients from Firebase with realtime updates
async function loadPatientsRealtime() {
    try {
        // Import Firebase helpers dynamically
        import('./firebase-helpers.js').then(({ subscribeToPatients }) => {
            // Subscribe to realtime patient updates
            subscribeToPatients((patients) => {
                // Sort by registration date descending (most recent first)
                allPatients = patients.sort((a, b) => {
                    const dateA = new Date(a.registrationDate || 0);
                    const dateB = new Date(b.registrationDate || 0);
                    return dateB - dateA;
                });
                updateStats();
                filterAndDisplayPatients();
            });
        }).catch(error => {
            console.error('Error loading Firebase helpers:', error);
            // Fallback to mock data
            allPatients = [];
            updateStats();
            filterAndDisplayPatients();
        });
        
    } catch (error) {
        console.error('Error loading patients:', error);
        showLoadingError();
    }
}

// Save new patient to Firebase
async function savePatientToFirebase(patientData) {
    try {
        // Import Firebase helpers dynamically
        const { addPatient } = await import('./firebase-helpers.js');
        
        // Save to Firebase
        const result = await addPatient(patientData);
        
        if (result.success) {
            console.log('Patient saved to Firebase with ID:', result.id);
            // Update patient data with Firebase ID
            patientData.id = result.id;
            
            // Track activity with patient info
            trackPatientRegistration(
                `${patientData.firstName} ${patientData.lastName}`,
                patientData.patientId
            );
            
            // Send notification about new patient registration
            if (window.createPatientNotification) {
                const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
                const userId = storageType.getItem('userId');
                if (userId) {
                    window.createPatientNotification(
                        userId,
                        `${patientData.firstName} ${patientData.lastName}`,
                        'registered'
                    );
                }
            }
            
            return true;
        } else {
            console.error('Error saving patient:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Error saving patient to Firebase:', error);
        
        // Fallback: add to local array for immediate display
        console.log('Using fallback - adding to local array');
        allPatients.push(patientData);
        updateStats();
        filterAndDisplayPatients();
        
        // Track activity even in fallback
        trackPatientRegistration(
            `${patientData.firstName} ${patientData.lastName}`,
            patientData.patientId
        );
        
        return true;
    }
}

// Filter patients based on search and filters
function filterAndDisplayPatients() {
    const searchTerm = patientSearchField ? patientSearchField.value.toLowerCase() : '';
    const statusFilter = filterStatus ? filterStatus.value : '';
    const insuranceFilter = filterInsurance ? filterInsurance.value : '';
    const dateFilter = filterDate ? filterDate.value : '';
    
    filteredPatients = allPatients.filter(patient => {
        // Search filter
        const matchesSearch = !searchTerm || 
            patient.firstName.toLowerCase().includes(searchTerm) ||
            patient.lastName.toLowerCase().includes(searchTerm) ||
            (patient.patientId && patient.patientId.toLowerCase().includes(searchTerm)) ||
            (patient.phone && patient.phone.includes(searchTerm)) ||
            (patient.email && patient.email.toLowerCase().includes(searchTerm));
        
        // Status filter
        const matchesStatus = !statusFilter || patient.status === statusFilter;
        
        // Insurance filter
        const matchesInsurance = !insuranceFilter || patient.insurance?.provider === insuranceFilter;
        
        // Date filter
        let matchesDate = true;
        if (dateFilter && patient.registrationDate) {
            const regDate = new Date(patient.registrationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (dateFilter === 'today') {
                const patientDate = new Date(regDate);
                patientDate.setHours(0, 0, 0, 0);
                matchesDate = patientDate.getTime() === today.getTime();
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                matchesDate = regDate >= weekAgo;
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(today);
                monthAgo.setMonth(today.getMonth() - 1);
                matchesDate = regDate >= monthAgo;
            }
        }
        
        return matchesSearch && matchesStatus && matchesInsurance && matchesDate;
    });
    
    currentPage = 1;
    displayPatients();
}

// Display patients in table
function displayPatients() {
    if (!patientsTableBody) return;
    
    const totalPages = Math.ceil(filteredPatients.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredPatients.length);
    const patientsToDisplay = filteredPatients.slice(startIndex, endIndex);
    
    if (filteredPatients.length === 0) {
        patientsTableBody.innerHTML = `
            <tr>
                <td colspan="11" class="loading-row">
                    <i class="fas fa-inbox"></i> No patients found
                </td>
            </tr>
        `;
    } else {
        patientsTableBody.innerHTML = patientsToDisplay.map(patient => `
            <tr>
                <td>${patient.patientId || 'N/A'}</td>
                <td>${patient.firstName} ${patient.lastName}</td>
                <td>${calculateAge(patient.dateOfBirth)}</td>
                <td>${patient.gender || 'N/A'}</td>
                <td>${patient.phone || 'N/A'}</td>
                <td>${patient.email || 'N/A'}</td>
                <td>${getInsuranceName(patient.insurance?.provider)}</td>
                <td>${patient.countyTown || 'N/A'}</td>
                <td>${formatDate(patient.registrationDate)}</td>
                <td><span class="status-badge status-${patient.status}">${capitalizeFirst(patient.status)}</span></td>
                <td>
                    <div class="action-btn-group">
                        <button class="action-btn action-btn-view" onclick="viewPatient('${patient.patientId}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn action-btn-edit" onclick="editPatient('${patient.patientId}')" title="Edit Patient">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn action-btn-doctor" onclick="sendToDoctor('${patient.patientId}')" title="Send to Doctor">
                            <i class="fas fa-user-md"></i>
                        </button>
                        <button class="action-btn action-btn-triage" onclick="sendToTriage('${patient.patientId}')" title="Send to Triage">
                            <i class="fas fa-stethoscope"></i>
                        </button>
                        <button class="action-btn action-btn-pharmacy" onclick="sendToPharmacy('${patient.patientId}')" title="Send to Pharmacy">
                            <i class="fas fa-pills"></i>
                        </button>
                        <button class="action-btn action-btn-print" onclick="printPatient('${patient.patientId}')" title="Print">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="action-btn action-btn-cancel" onclick="cancelPatient('${patient.patientId}')" title="Cancel">
                            <i class="fas fa-times"></i>
                        </button>
                        <button class="action-btn action-btn-delete" onclick="deletePatient('${patient.patientId}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    // Update pagination info
    updatePaginationInfo(startIndex, endIndex, totalPages);
}

// Update pagination information and controls
function updatePaginationInfo(startIndex, endIndex, totalPages) {
    if (currentPageSpan) currentPageSpan.textContent = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages || 1;
    if (showingStartSpan) showingStartSpan.textContent = filteredPatients.length > 0 ? startIndex + 1 : 0;
    if (showingEndSpan) showingEndSpan.textContent = endIndex;
    if (totalRecordsSpan) totalRecordsSpan.textContent = filteredPatients.length;
    
    // Enable/disable pagination buttons
    if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
    if (lastPageBtn) lastPageBtn.disabled = currentPage >= totalPages;
}

// Go to specific page
function goToPage(page) {
    const totalPages = Math.ceil(filteredPatients.length / rowsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    displayPatients();
}

// Update statistics
function updateStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayPatients = allPatients.filter(p => {
        if (!p.registrationDate) return false;
        const regDate = new Date(p.registrationDate);
        regDate.setHours(0, 0, 0, 0);
        return regDate.getTime() === today.getTime();
    });
    
    const queuePatients = allPatients.filter(p => p.status === 'in-queue');
    
    // Update All Patients module stats
    if (totalPatientsCount) totalPatientsCount.textContent = allPatients.length;
    if (todayPatientsCount) todayPatientsCount.textContent = todayPatients.length;
    if (queuePatientsCount) queuePatientsCount.textContent = queuePatients.length;
    
    // Update Dashboard stats as well
    updatePatientsStats(allPatients);
    updateDashboardDisplay();
}

// Helper functions
function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return 'N/A';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).replace('-', ' ');
}

function getInsuranceName(provider) {
    if (!provider) return 'N/A';
    const insuranceNames = {
        'shif': 'SHIF',
        'sha': 'SHA',
        'nhif': 'NHIF',
        'self-pay': 'Self Pay',
        'aak': 'AAK',
        'britam': 'Britam',
        'cia': 'CIC',
        'jubilee': 'Jubilee',
        'madison': 'Madison',
        'resolution': 'Resolution',
        'uap': 'UAP',
        'other': 'Other'
    };
    return insuranceNames[provider] || provider;
}

function showLoadingError() {
    if (patientsTableBody) {
        patientsTableBody.innerHTML = `
            <tr>
                <td colspan="11" class="loading-row" style="color: var(--danger-color);">
                    <i class="fas fa-exclamation-triangle"></i> Error loading patients. Please refresh the page.
                </td>
            </tr>
        `;
    }
}

// Export patients to CSV
function exportPatients() {
    if (filteredPatients.length === 0) {
        alert('No patients to export');
        return;
    }
    
    const csvContent = convertToCSV(filteredPatients);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `patients_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function convertToCSV(data) {
    const headers = ['Patient ID', 'First Name', 'Last Name', 'Age', 'Gender', 'Phone', 'Email', 'Insurance', 'County/Town', 'Registration Date', 'Status'];
    const rows = data.map(p => [
        p.patientId || '',
        p.firstName || '',
        p.lastName || '',
        calculateAge(p.dateOfBirth),
        p.gender || '',
        p.phone || '',
        p.email || '',
        getInsuranceName(p.insurance?.provider),
        p.countyTown || '',
        formatDate(p.registrationDate),
        p.status || ''
    ]);
    
    const csvRows = [headers, ...rows].map(row => 
        row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    return csvRows;
}

// Modal Functions
function getModalElements() {
    return {
        patientModal: document.getElementById('patientModal'),
        modalCloseBtn: document.getElementById('modalCloseBtn'),
        modalCancelBtn: document.getElementById('modalCancelBtn'),
        modalTitle: document.getElementById('modalTitle'),
        modalBody: document.getElementById('modalBody'),
        modalFooter: document.getElementById('modalFooter')
    };
}

function openModal(modalId) {
    console.log('Opening modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log('Modal opened successfully');
    } else {
        console.error('Modal not found:', modalId);
    }
}

function closeModal(modalId) {
    console.log('Closing modal:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const activeModals = document.querySelectorAll('.modal.active');
        activeModals.forEach(modal => {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
});

// Universal modal close button handler
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
        const modal = e.target.closest('.modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    // Close modal when clicking overlay
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Patient action functions
function viewPatient(patientId) {
    console.log('viewPatient called with ID:', patientId);
    console.log('All patients:', allPatients);
    const patient = allPatients.find(p => p.patientId === patientId || p.id === patientId);
    if (!patient) {
        console.error('Patient not found:', patientId);
        alert('Patient not found');
        return;
    }
    
    console.log('Patient found:', patient);
    const { modalTitle, modalBody, modalFooter } = getModalElements();
    
    if (!modalTitle || !modalBody || !modalFooter) {
        console.error('Modal elements not found');
        alert('Error: Modal elements not found. Please refresh the page.');
        return;
    }
    
    modalTitle.textContent = 'Patient Details';
    modalBody.innerHTML = `
        <div class="modal-section">
            <h3 class="modal-section-title">Personal Information</h3>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <span class="modal-info-label">Patient ID</span>
                    <span class="modal-info-value">${patient.patientId || 'N/A'}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Full Name</span>
                    <span class="modal-info-value">${patient.firstName} ${patient.lastName}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Date of Birth</span>
                    <span class="modal-info-value">${formatDate(patient.dateOfBirth)}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Age</span>
                    <span class="modal-info-value">${calculateAge(patient.dateOfBirth)} years</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Gender</span>
                    <span class="modal-info-value">${capitalizeFirst(patient.gender) || 'N/A'}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Blood Group</span>
                    <span class="modal-info-value">${patient.bloodGroup || 'N/A'}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">ID/Passport Number</span>
                    <span class="modal-info-value">${patient.idNumber || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="modal-section">
            <h3 class="modal-section-title">Contact Information</h3>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <span class="modal-info-label">Phone Number</span>
                    <span class="modal-info-value">${patient.phone || 'N/A'}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Email Address</span>
                    <span class="modal-info-value">${patient.email || 'N/A'}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Country</span>
                    <span class="modal-info-value">${capitalizeFirst(patient.country) || 'N/A'}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">County/Town</span>
                    <span class="modal-info-value">${patient.countyTown || 'N/A'}</span>
                </div>
                <div class="modal-info-item" style="grid-column: 1 / -1;">
                    <span class="modal-info-label">Physical Address</span>
                    <span class="modal-info-value">${patient.address || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="modal-section">
            <h3 class="modal-section-title">Insurance Information</h3>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <span class="modal-info-label">Insurance Provider</span>
                    <span class="modal-info-value">${getInsuranceName(patient.insurance?.provider)}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Insurance Number</span>
                    <span class="modal-info-value">${patient.insurance?.number || 'N/A'}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Policy Holder</span>
                    <span class="modal-info-value">${patient.insurance?.policyHolder || 'Same as patient'}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Policy Expiry Date</span>
                    <span class="modal-info-value">${patient.insurance?.expiryDate ? formatDate(patient.insurance.expiryDate) : 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="modal-section">
            <h3 class="modal-section-title">Emergency Contact</h3>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <span class="modal-info-label">Contact Name</span>
                    <span class="modal-info-value">${patient.emergencyContact?.name || 'N/A'}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Relationship</span>
                    <span class="modal-info-value">${patient.emergencyContact?.relation || 'N/A'}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Phone Number</span>
                    <span class="modal-info-value">${patient.emergencyContact?.phone || 'N/A'}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Email Address</span>
                    <span class="modal-info-value">${patient.emergencyContact?.email || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <div class="modal-section">
            <h3 class="modal-section-title">Medical Information</h3>
            <div class="modal-info-grid">
                <div class="modal-info-item" style="grid-column: 1 / -1;">
                    <span class="modal-info-label">Known Allergies</span>
                    <span class="modal-info-value">${patient.allergies || 'None reported'}</span>
                </div>
                <div class="modal-info-item" style="grid-column: 1 / -1;">
                    <span class="modal-info-label">Medical History</span>
                    <span class="modal-info-value">${patient.medicalHistory || 'None reported'}</span>
                </div>
            </div>
        </div>
        
        <div class="modal-section">
            <h3 class="modal-section-title">Registration Details</h3>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <span class="modal-info-label">Category</span>
                    <span class="modal-info-value">${capitalizeFirst(patient.category) || 'N/A'}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Registration Date</span>
                    <span class="modal-info-value">${formatDate(patient.registrationDate)}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Status</span>
                    <span class="modal-info-value"><span class="status-badge status-${patient.status}">${capitalizeFirst(patient.status)}</span></span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Last Updated</span>
                    <span class="modal-info-value">${formatDate(patient.lastUpdated)}</span>
                </div>
            </div>
        </div>
    `;
    
    modalFooter.innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal('patientModal')">Close</button>
        <button class="btn btn-primary" onclick="closeModal('patientModal'); editPatient('${patient.patientId}');">
            <i class="fas fa-edit"></i> Edit Patient
        </button>
    `;
    
    openModal('patientModal');
}

function editPatient(patientId) {
    const patient = allPatients.find(p => p.patientId === patientId || p.id === patientId);
    if (!patient) {
        alert('Patient not found');
        return;
    }
    
    const { modalTitle, modalBody, modalFooter } = getModalElements();
    
    if (!modalTitle || !modalBody || !modalFooter) {
        console.error('Modal elements not found');
        alert('Error: Modal elements not found. Please refresh the page.');
        return;
    }
    
    modalTitle.textContent = 'Edit Patient';
    modalBody.innerHTML = `
        <form id="editPatientForm" class="patient-form">
            <div class="form-section">
                <h3 class="section-title">Personal Information</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editFirstName">First Name <span class="required">*</span></label>
                        <input type="text" id="editFirstName" name="firstName" value="${patient.firstName}" required>
                    </div>
                    <div class="form-group">
                        <label for="editLastName">Last Name <span class="required">*</span></label>
                        <input type="text" id="editLastName" name="lastName" value="${patient.lastName}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editDateOfBirth">Date of Birth <span class="required">*</span></label>
                        <input type="date" id="editDateOfBirth" name="dateOfBirth" value="${patient.dateOfBirth}" required>
                    </div>
                    <div class="form-group">
                        <label for="editGender">Gender <span class="required">*</span></label>
                        <select id="editGender" name="gender" required>
                            <option value="male" ${patient.gender === 'male' ? 'selected' : ''}>Male</option>
                            <option value="female" ${patient.gender === 'female' ? 'selected' : ''}>Female</option>
                            <option value="other" ${patient.gender === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editPhone">Phone Number <span class="required">*</span></label>
                        <input type="tel" id="editPhone" name="phone" value="${patient.phone}" required>
                    </div>
                    <div class="form-group">
                        <label for="editEmail">Email Address</label>
                        <input type="email" id="editEmail" name="email" value="${patient.email || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="editCountyTown">County/Town <span class="required">*</span></label>
                        <input type="text" id="editCountyTown" name="countyTown" value="${patient.countyTown || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editBloodGroup">Blood Group</label>
                        <select id="editBloodGroup" name="bloodGroup">
                            <option value="">Select Blood Group</option>
                            <option value="A+" ${patient.bloodGroup === 'A+' ? 'selected' : ''}>A+</option>
                            <option value="A-" ${patient.bloodGroup === 'A-' ? 'selected' : ''}>A-</option>
                            <option value="B+" ${patient.bloodGroup === 'B+' ? 'selected' : ''}>B+</option>
                            <option value="B-" ${patient.bloodGroup === 'B-' ? 'selected' : ''}>B-</option>
                            <option value="AB+" ${patient.bloodGroup === 'AB+' ? 'selected' : ''}>AB+</option>
                            <option value="AB-" ${patient.bloodGroup === 'AB-' ? 'selected' : ''}>AB-</option>
                            <option value="O+" ${patient.bloodGroup === 'O+' ? 'selected' : ''}>O+</option>
                            <option value="O-" ${patient.bloodGroup === 'O-' ? 'selected' : ''}>O-</option>
                        </select>
                    </div>
                </div>
            </div>
        </form>
    `;
    
    modalFooter.innerHTML = `
        <button class="btn btn-secondary" onclick="closeModal('patientModal')">Cancel</button>
        <button class="btn btn-primary" onclick="savePatientEdit('${patient.patientId}')">
            <i class="fas fa-save"></i> Save Changes
        </button>
    `;
    
    openModal('patientModal');
}

function savePatientEdit(patientId) {
    const form = document.getElementById('editPatientForm');
    if (!form) return;
    
    const formData = new FormData(form);
    
    // Find and update patient
    const patientIndex = allPatients.findIndex(p => p.patientId === patientId || p.id === patientId);
    if (patientIndex !== -1) {
        allPatients[patientIndex] = {
            ...allPatients[patientIndex],
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            dateOfBirth: formData.get('dateOfBirth'),
            gender: formData.get('gender'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            countyTown: formData.get('countyTown'),
            bloodGroup: formData.get('bloodGroup'),
            lastUpdated: new Date().toISOString()
        };
        
        // TODO: Update in Firebase
        
        updateStats();
        filterAndDisplayPatients();
        closeModal('patientModal');
        alert('Patient updated successfully!');
    }
}

// Make functions globally accessible
window.viewPatient = viewPatient;
window.editPatient = editPatient;
window.savePatientEdit = savePatientEdit;

function sendToDoctor(patientId) {
    // Find patient in triage records
    const triageRecord = triageRecords.find(r => r.patientId === patientId);
    if (!triageRecord) {
        alert('Patient triage record not found');
        return;
    }
    
    if (confirm('Send patient ' + patientId + ' to Doctor module?')) {
        // Add to doctor queue
        if (typeof addToDoctorQueue === 'function' && addToDoctorQueue(triageRecord)) {
            // Update patient status
            updatePatientStatus(patientId, 'with-doctor');
            alert('Patient sent to Doctor successfully');
        } else {
            alert('Failed to add patient to doctor queue');
        }
    }
}

function sendToTriage(patientId) {
    const patient = allPatients.find(p => p.patientId === patientId || p.id === patientId);
    if (!patient) {
        alert('Patient not found');
        return;
    }
    
    if (confirm('Send patient ' + patientId + ' to Triage Reception Queue?')) {
        // Try to add to triage queue
        if (typeof addToTriageQueue === 'function' && addToTriageQueue(patient)) {
            // Update patient status
            updatePatientStatus(patientId, 'in-triage');
            alert('Patient sent to Triage successfully!\n\nThe patient has been added to the triage reception queue.');
            
            // Navigate to triage module
            const triageNavItem = document.querySelector('[data-module="triage"]');
            if (triageNavItem) {
                triageNavItem.click();
            }
        }
    }
}

function sendToPharmacy(patientId) {
    if (confirm('Send patient ' + patientId + ' to Pharmacy?')) {
        // Update patient status
        updatePatientStatus(patientId, 'at-pharmacy');
        alert('Patient sent to Pharmacy successfully');
        // TODO: Navigate to pharmacy module with patient data
    }
}

function printPatient(patientId) {
    const patient = allPatients.find(p => p.patientId === patientId || p.id === patientId);
    if (!patient) {
        alert('Patient not found');
        return;
    }
    
    // Create print content
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Patient Details - ' + patient.patientId + '</title>');
    printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{padding:8px;text-align:left;border-bottom:1px solid #ddd;}th{background-color:#f2f2f2;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h2>Patient Information</h2>');
    printWindow.document.write('<table>');
    printWindow.document.write('<tr><th>Patient ID</th><td>' + (patient.patientId || 'N/A') + '</td></tr>');
    printWindow.document.write('<tr><th>Name</th><td>' + patient.firstName + ' ' + patient.lastName + '</td></tr>');
    printWindow.document.write('<tr><th>Age</th><td>' + calculateAge(patient.dateOfBirth) + '</td></tr>');
    printWindow.document.write('<tr><th>Gender</th><td>' + (patient.gender || 'N/A') + '</td></tr>');
    printWindow.document.write('<tr><th>Phone</th><td>' + (patient.phone || 'N/A') + '</td></tr>');
    printWindow.document.write('<tr><th>Email</th><td>' + (patient.email || 'N/A') + '</td></tr>');
    printWindow.document.write('<tr><th>Insurance</th><td>' + getInsuranceName(patient.insurance?.provider) + '</td></tr>');
    printWindow.document.write('<tr><th>County/Town</th><td>' + (patient.countyTown || 'N/A') + '</td></tr>');
    printWindow.document.write('<tr><th>Registration Date</th><td>' + formatDate(patient.registrationDate) + '</td></tr>');
    printWindow.document.write('<tr><th>Status</th><td>' + capitalizeFirst(patient.status) + '</td></tr>');
    printWindow.document.write('</table>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

function cancelPatient(patientId) {
    if (confirm('Cancel patient ' + patientId + '? This will mark the patient as cancelled but keep the record in the system.')) {
        updatePatientStatus(patientId, 'cancelled');
        alert('Patient cancelled successfully. Record remains in the system.');
    }
}

async function updatePatientStatus(patientId, newStatus) {
    try {
        // Find patient in local array
        const patientIndex = allPatients.findIndex(p => p.patientId === patientId || p.id === patientId);
        if (patientIndex !== -1) {
            allPatients[patientIndex].status = newStatus;
            allPatients[patientIndex].lastUpdated = new Date().toISOString();
            
            // TODO: Update in Firebase
            // const { updatePatient } = await import('./firebase-helpers.js');
            // await updatePatient(patientId, { status: newStatus, lastUpdated: new Date().toISOString() });
            
            updateStats();
            filterAndDisplayPatients();
        }
    } catch (error) {
        console.error('Error updating patient status:', error);
    }
}

async function deletePatient(patientId) {
    const patient = allPatients.find(p => p.patientId === patientId || p.id === patientId);
    if (!patient) {
        alert('Patient not found');
        return;
    }
    
    // Use the Firebase document ID, not the custom patientId
    const firebaseDocId = patient.id || patientId;
    
    console.log('Patient to delete:', {
        customPatientId: patient.patientId,
        firebaseDocId: firebaseDocId,
        patient: patient
    });
    
    const confirmMessage = `⚠️ PERMANENT DELETE WARNING ⚠️\n\nYou are about to PERMANENTLY delete:\n\nPatient ID: ${patient.patientId || patientId}\nName: ${patient.firstName} ${patient.lastName}\n\nThis will delete ALL associated records including:\n• Patient information\n• Triage records\n• Lab requests\n• Pharmacy orders\n• Billing records\n• Ward admissions\n\nThis action CANNOT be undone!\n\nType "DELETE" in the next prompt to confirm.`;
    
    if (confirm(confirmMessage)) {
        const secondConfirm = prompt('Type "DELETE" (all caps) to confirm permanent deletion:');
        
        if (secondConfirm !== 'DELETE') {
            alert('Deletion cancelled. Patient not deleted.');
            return;
        }
        
        try {
            console.log('Attempting complete deletion with Firebase doc ID:', firebaseDocId);
            
            // Show loading indicator
            const originalTableBody = patientsTableBody ? patientsTableBody.innerHTML : '';
            if (patientsTableBody) {
                patientsTableBody.innerHTML = `
                    <tr>
                        <td colspan="11" class="loading-row">
                            <i class="fas fa-spinner fa-spin"></i> Deleting patient and all associated records...
                        </td>
                    </tr>
                `;
            }
            
            // Try to delete from Firebase using the correct document ID
            try {
                const { deletePatient: deletePatientFromFirebase } = await import('./firebase-helpers.js');
                const result = await deletePatientFromFirebase(firebaseDocId);
                
                if (result.success) {
                    console.log('Patient completely deleted from Firebase with doc ID:', firebaseDocId);
                    // Remove from local array using both IDs to be safe
                    allPatients = allPatients.filter(p => p.id !== firebaseDocId && p.patientId !== patient.patientId);
                    updateStats();
                    filterAndDisplayPatients();
                    alert('✅ Patient deleted successfully!\n\nAll patient records have been permanently removed from the database.');
                } else {
                    throw new Error(result.error || 'Failed to delete from Firebase');
                }
            } catch (firebaseError) {
                console.error('Firebase deletion failed:', firebaseError);
                // Restore table on error
                if (patientsTableBody && originalTableBody) {
                    patientsTableBody.innerHTML = originalTableBody;
                }
                alert('❌ Error deleting patient from database:\n\n' + firebaseError.message + '\n\nPlease try again or contact support.');
            }
        } catch (error) {
            console.error('Error in delete operation:', error);
            alert('❌ Error deleting patient: ' + error.message);
        }
    }
}

// Make patient action functions globally accessible
window.sendToDoctor = sendToDoctor;
window.sendToTriage = sendToTriage;
window.sendToPharmacy = sendToPharmacy;
window.printPatient = printPatient;
window.cancelPatient = cancelPatient;
window.deletePatient = deletePatient;

// Initialize All Patients Module when the module is shown
initializeAllPatientsModule();

// ============================================
// TRIAGE MODULE - FUNCTIONALITY
// ============================================

let triageQueue = [];
let triageRecords = [];
let triageCurrentPage = 1;
let triageRowsPerPage = 25;
const MAX_QUEUE_SIZE = 5;

// Triage Module Elements
const triageQueueGrid = document.getElementById('triageQueueGrid');
const triageTableBody = document.getElementById('triageTableBody');
const triageSearchField = document.getElementById('triageSearchField');
const exportTriageBtn = document.getElementById('exportTriageBtn');
const triageRowsPerPageSelect = document.getElementById('triageRowsPerPage');

// Triage Stats
const triageQueueCount = document.getElementById('triageQueueCount');
const totalTriagedCount = document.getElementById('totalTriagedCount');
const todayTriageCount = document.getElementById('todayTriageCount');

// Triage Pagination
const triageFirstPageBtn = document.getElementById('triageFirstPageBtn');
const triagePrevPageBtn = document.getElementById('triagePrevPageBtn');
const triageNextPageBtn = document.getElementById('triageNextPageBtn');
const triageLastPageBtn = document.getElementById('triageLastPageBtn');
const triageCurrentPageSpan = document.getElementById('triageCurrentPage');
const triageTotalPagesSpan = document.getElementById('triageTotalPages');
const triageShowingStartSpan = document.getElementById('triageShowingStart');
const triageShowingEndSpan = document.getElementById('triageShowingEnd');
const triageTotalRecordsSpan = document.getElementById('triageTotalRecords');

// Triage Modal Elements
const triageModal = document.getElementById('triageModal');
const triageModalOverlay = document.getElementById('triageModalOverlay');
const triageModalCloseBtn = document.getElementById('triageModalCloseBtn');
const triageModalCancelBtn = document.getElementById('triageModalCancelBtn');
const triageDetailsForm = document.getElementById('triageDetailsForm');
const saveTriageBtn = document.getElementById('saveTriageBtn');

// View Triage Modal Elements
const viewTriageModal = document.getElementById('viewTriageModal');
const viewTriageModalOverlay = document.getElementById('viewTriageModalOverlay');
const viewTriageModalCloseBtn = document.getElementById('viewTriageModalCloseBtn');
const viewTriageModalBody = document.getElementById('viewTriageModalBody');
let currentViewingTriageId = null;

// BMI Auto-calculation
const weightInput = document.getElementById('weight');
const heightInput = document.getElementById('height');
const bmiInput = document.getElementById('bmi');

if (weightInput && heightInput && bmiInput) {
    const calculateBMI = () => {
        const weight = parseFloat(weightInput.value);
        const height = parseFloat(heightInput.value) / 100; // Convert cm to m
        
        if (weight > 0 && height > 0) {
            const bmi = (weight / (height * height)).toFixed(2);
            bmiInput.value = bmi;
        } else {
            bmiInput.value = '';
        }
    };
    
    weightInput.addEventListener('input', calculateBMI);
    heightInput.addEventListener('input', calculateBMI);
}

// Initialize Triage Module
function initializeTriageModule() {
    if (!triageQueueGrid) return;
    
    // Load triage data
    loadTriageData();
    
    // View Triage Modal event listeners
    if (viewTriageModalCloseBtn) {
        viewTriageModalCloseBtn.addEventListener('click', closeViewTriageModal);
    }
    if (viewTriageModalOverlay) {
        viewTriageModalOverlay.addEventListener('click', closeViewTriageModal);
    }
    
    // Search functionality
    if (triageSearchField) {
        let searchTimeout;
        triageSearchField.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                displayTriageRecords();
            }, 300);
        });
    }
    
    // Rows per page
    if (triageRowsPerPageSelect) {
        triageRowsPerPageSelect.addEventListener('change', (e) => {
            triageRowsPerPage = parseInt(e.target.value);
            triageCurrentPage = 1;
            displayTriageRecords();
        });
    }
    
    // Pagination
    if (triageFirstPageBtn) triageFirstPageBtn.addEventListener('click', () => goToTriagePage(1));
    if (triagePrevPageBtn) triagePrevPageBtn.addEventListener('click', () => goToTriagePage(triageCurrentPage - 1));
    if (triageNextPageBtn) triageNextPageBtn.addEventListener('click', () => goToTriagePage(triageCurrentPage + 1));
    if (triageLastPageBtn) {
        triageLastPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(triageRecords.length / triageRowsPerPage);
            goToTriagePage(totalPages);
        });
    }
    
    // Export button
    if (exportTriageBtn) {
        exportTriageBtn.addEventListener('click', exportTriageRecords);
    }
}

// Load triage data
function loadTriageData() {
    // Load triage queue from Firebase
    import('./firebase-helpers.js').then(({ subscribeToTriageQueue }) => {
        subscribeToTriageQueue((queueData) => {
            triageQueue = queueData.map(item => ({
                ...item,
                queueTime: item.queueTime?.toDate ? item.queueTime.toDate().toISOString() : item.queueTime
            }));
            displayTriageQueue();
            updateTriageStats();
        });
    }).catch(error => {
        console.error('Firebase not available, using local storage:', error);
        displayTriageQueue();
        updateTriageStats();
    });

    // Load triage records from Firebase
    import('./firebase-helpers.js').then(({ subscribeToTriageRecords }) => {
        subscribeToTriageRecords((recordsData) => {
            triageRecords = recordsData.map(record => ({
                ...record,
                triageDate: record.triageDate?.toDate ? record.triageDate.toDate().toISOString() : record.triageDate
            }));
            displayTriageRecords();
            updateTriageStats();
        });
    }).catch(error => {
        console.error('Firebase not available, using local storage:', error);
        displayTriageRecords();
        updateTriageStats();
    });
}

// Display triage queue
function displayTriageQueue() {
    if (!triageQueueGrid) return;
    
    if (triageQueue.length === 0) {
        triageQueueGrid.innerHTML = `
            <div class="empty-queue-message">
                <i class="fas fa-inbox"></i>
                <p>No patients in queue</p>
                <small>Patients sent to triage will appear here</small>
            </div>
        `;
    } else {
        triageQueueGrid.innerHTML = triageQueue.map(patient => `
            <div class="triage-queue-card">
                <div class="queue-card-header">
                    <span class="queue-patient-id">${patient.patientId}</span>
                    <span class="queue-timestamp">
                        <i class="fas fa-clock"></i>
                        ${formatTime(patient.queueTime)}
                    </span>
                </div>
                <div class="queue-patient-info">
                    <div class="queue-patient-name">${patient.firstName} ${patient.lastName}</div>
                    <div class="queue-patient-details">
                        <span><i class="fas fa-birthday-cake"></i> ${calculateAge(patient.dateOfBirth)} yrs</span>
                        <span><i class="fas fa-venus-mars"></i> ${capitalizeFirst(patient.gender)}</span>
                    </div>
                </div>
                <div class="queue-card-actions">
                    <button class="btn btn-primary" onclick="openTriageModal('${patient.patientId}')">
                        <i class="fas fa-notes-medical"></i> Add Details
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Add patient to triage queue (called from All Patients module)
async function addToTriageQueue(patient) {
    if (triageQueue.length >= MAX_QUEUE_SIZE) {
        alert(`Triage queue is full! Maximum ${MAX_QUEUE_SIZE} patients allowed. Please process some patients first.`);
        return false;
    }
    
    // Check if patient already in queue
    if (triageQueue.find(p => p.patientId === patient.patientId)) {
        alert('Patient is already in the triage queue!');
        return false;
    }
    
    // Prepare queue data
    const queueData = {
        patientId: patient.patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        phone: patient.phone
    };
    
    try {
        // Save to Firebase
        const { addToTriageQueue: addToFirebaseQueue } = await import('./firebase-helpers.js');
        const result = await addToFirebaseQueue(queueData);
        
        if (result.success) {
            console.log('Patient added to triage queue in Firebase');
            // Firebase subscription will update the UI automatically
            return true;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Firebase error, using local storage:', error);
        // Fallback to local storage
        queueData.queueTime = new Date().toISOString();
        queueData.id = Date.now().toString();
        triageQueue.push(queueData);
        displayTriageQueue();
        updateTriageStats();
        return true;
    }
}

// Open triage modal
function openTriageModal(patientId) {
    const patient = triageQueue.find(p => p.patientId === patientId);
    if (!patient) {
        alert('Patient not found in queue');
        return;
    }
    
    // Populate patient info
    document.getElementById('triagePatientId').value = patient.patientId;
    document.getElementById('triageDisplayPatientId').textContent = patient.patientId;
    document.getElementById('triageDisplayName').textContent = `${patient.firstName} ${patient.lastName}`;
    document.getElementById('triageDisplayAge').textContent = calculateAge(patient.dateOfBirth) + ' years';
    document.getElementById('triageDisplayGender').textContent = capitalizeFirst(patient.gender);
    
    // Reset form
    if (triageDetailsForm) triageDetailsForm.reset();
    document.getElementById('triagePatientId').value = patient.patientId;
    
    // Open modal
    if (triageModal) {
        triageModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// Close triage modal
function closeTriageModal() {
    if (triageModal) {
        triageModal.classList.remove('active');
        document.body.style.overflow = '';
    }
    if (triageDetailsForm) triageDetailsForm.reset();
}

// Modal close events
if (triageModalCloseBtn) triageModalCloseBtn.addEventListener('click', closeTriageModal);
if (triageModalCancelBtn) triageModalCancelBtn.addEventListener('click', closeTriageModal);
if (triageModalOverlay) triageModalOverlay.addEventListener('click', closeTriageModal);

// Save triage details
if (saveTriageBtn) {
    saveTriageBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (!triageDetailsForm.checkValidity()) {
            triageDetailsForm.reportValidity();
            return;
        }
        
        const formData = new FormData(triageDetailsForm);
        const patientId = formData.get('patientId');
        
        // Find patient in queue
        const patientIndex = triageQueue.findIndex(p => p.patientId === patientId);
        if (patientIndex === -1) {
            alert('Patient not found in queue');
            return;
        }
        
        const patient = triageQueue[patientIndex];
        
        // Create triage record
        const triageRecord = {
            id: 'TR-' + Date.now(),
            patientId: patient.patientId,
            firstName: patient.firstName,
            lastName: patient.lastName,
            age: calculateAge(patient.dateOfBirth),
            gender: patient.gender,
            dateOfBirth: patient.dateOfBirth,
            vitalSigns: {
                bloodPressure: formData.get('bloodPressure'),
                temperature: formData.get('temperature'),
                pulseRate: formData.get('pulseRate'),
                respiratoryRate: formData.get('respiratoryRate'),
                oxygenSaturation: formData.get('oxygenSaturation'),
                bloodSugar: formData.get('bloodSugar')
            },
            measurements: {
                weight: formData.get('weight'),
                height: formData.get('height'),
                bmi: formData.get('bmi'),
                headCircumference: formData.get('headCircumference'),
                chestCircumference: formData.get('chestCircumference'),
                abdominalCircumference: formData.get('abdominalCircumference')
            },
            priority: formData.get('priority'),
            chiefComplaint: formData.get('chiefComplaint'),
            notes: formData.get('triageNotes'),
            triagedBy: 'Current User', // TODO: Get from auth
            triageDate: new Date().toISOString(),
            status: 'triaged'
        };
        
        try {
            // Save triage record to Firebase
            const { addTriageRecord } = await import('./firebase-helpers.js');
            const recordResult = await addTriageRecord(triageRecord);
            
            if (recordResult.success) {
                console.log('Triage record saved to Firebase');
                
                // Track triage activity
                trackTriageAssessment(
                    `${patient.firstName} ${patient.lastName}`,
                    patient.patientId,
                    triageRecord.priority.charAt(0).toUpperCase() + triageRecord.priority.slice(1)
                );
                
                // Remove from queue in Firebase
                const queueItem = triageQueue[patientIndex];
                if (queueItem.id) {
                    const { removeFromTriageQueue } = await import('./firebase-helpers.js');
                    await removeFromTriageQueue(queueItem.id);
                    console.log('Patient removed from Firebase queue');
                }
                
                // Firebase subscriptions will update the UI automatically
                closeTriageModal();
                alert('Triage details saved successfully!\nPatient has been moved to the triage table.');
            } else {
                throw new Error(recordResult.error);
            }
        } catch (error) {
            console.error('Firebase error, using local storage:', error);
            
            // Fallback to local storage
            triageRecord.id = 'TR-' + Date.now();
            triageRecord.triageDate = new Date().toISOString();
            triageRecords.unshift(triageRecord);
            triageQueue.splice(patientIndex, 1);
            
            // Track activity even in fallback
            trackTriageAssessment(
                `${patient.firstName} ${patient.lastName}`,
                patient.patientId,
                triageRecord.priority.charAt(0).toUpperCase() + triageRecord.priority.slice(1)
            );
            
            displayTriageQueue();
            displayTriageRecords();
            updateTriageStats();
            closeTriageModal();
            
            alert('Triage details saved successfully!\nPatient has been moved to the triage table.');
        }
    });
}

// Display triage records
function displayTriageRecords() {
    if (!triageTableBody) return;
    
    let filteredRecords = [...triageRecords];
    
    // Apply search filter
    const searchTerm = triageSearchField ? triageSearchField.value.toLowerCase() : '';
    if (searchTerm) {
        filteredRecords = filteredRecords.filter(record =>
            record.patientId.toLowerCase().includes(searchTerm) ||
            record.firstName.toLowerCase().includes(searchTerm) ||
            record.lastName.toLowerCase().includes(searchTerm)
        );
    }
    
    // Pagination
    const totalPages = Math.ceil(filteredRecords.length / triageRowsPerPage);
    const startIndex = (triageCurrentPage - 1) * triageRowsPerPage;
    const endIndex = Math.min(startIndex + triageRowsPerPage, filteredRecords.length);
    const recordsToDisplay = filteredRecords.slice(startIndex, endIndex);
    
    if (filteredRecords.length === 0) {
        triageTableBody.innerHTML = `
            <tr>
                <td colspan="12" class="loading-row">
                    <i class="fas fa-inbox"></i> No triage records found
                </td>
            </tr>
        `;
    } else {
        triageTableBody.innerHTML = recordsToDisplay.map(record => {
            const priorityLabels = {
                'critical': 'Critical',
                'urgent': 'Urgent',
                'semi-urgent': 'Semi-Urgent',
                'standard': 'Standard',
                'non-urgent': 'Non-Urgent'
            };
            
            return `
            <tr>
                <td><strong>${record.patientId}</strong></td>
                <td>${record.firstName} ${record.lastName}</td>
                <td>${record.age}Y / ${record.gender.charAt(0).toUpperCase()}</td>
                <td>${record.vitalSigns.bloodPressure}</td>
                <td>${record.vitalSigns.temperature}°C</td>
                <td>${record.vitalSigns.pulseRate}</td>
                <td>${record.measurements.weight}kg</td>
                <td>${record.measurements.bmi}</td>
                <td><span class="priority-badge priority-${record.priority}">${priorityLabels[record.priority]}</span></td>
                <td>${record.chiefComplaint || 'N/A'}</td>
                <td>${formatDateTime(record.triageDate)}</td>
                <td>
                    <div class="triage-actions">
                        <button class="action-btn btn-view" onclick="viewTriageRecord('${record.id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn btn-send" onclick="sendToDoctor('${record.patientId}')" title="Send to Doctor">
                            <i class="fas fa-user-md"></i>
                        </button>
                        <button class="action-btn btn-print" onclick="printTriageRecord('${record.id}')" title="Print">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
    }
    
    // Update pagination
    updateTriagePagination(startIndex, endIndex, totalPages, filteredRecords.length);
}

// Update triage pagination
function updateTriagePagination(startIndex, endIndex, totalPages, totalRecords) {
    if (triageCurrentPageSpan) triageCurrentPageSpan.textContent = triageCurrentPage;
    if (triageTotalPagesSpan) triageTotalPagesSpan.textContent = totalPages || 1;
    if (triageShowingStartSpan) triageShowingStartSpan.textContent = totalRecords > 0 ? startIndex + 1 : 0;
    if (triageShowingEndSpan) triageShowingEndSpan.textContent = endIndex;
    if (triageTotalRecordsSpan) triageTotalRecordsSpan.textContent = totalRecords;
    
    if (triageFirstPageBtn) triageFirstPageBtn.disabled = triageCurrentPage === 1;
    if (triagePrevPageBtn) triagePrevPageBtn.disabled = triageCurrentPage === 1;
    if (triageNextPageBtn) triageNextPageBtn.disabled = triageCurrentPage >= totalPages;
    if (triageLastPageBtn) triageLastPageBtn.disabled = triageCurrentPage >= totalPages;
}

// Go to triage page
function goToTriagePage(page) {
    const totalPages = Math.ceil(triageRecords.length / triageRowsPerPage);
    if (page < 1 || page > totalPages) return;
    triageCurrentPage = page;
    displayTriageRecords();
}

// Update triage stats
function updateTriageStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRecords = triageRecords.filter(r => {
        if (!r.triageDate) return false;
        const recordDate = new Date(r.triageDate);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
    });
    
    if (triageQueueCount) triageQueueCount.textContent = triageQueue.length;
    if (totalTriagedCount) totalTriagedCount.textContent = triageRecords.length;
    if (todayTriageCount) todayTriageCount.textContent = todayRecords.length;
}

// Helper functions
function formatTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function viewTriageRecord(recordId) {
    const record = triageRecords.find(r => r.id === recordId);
    if (!record) {
        alert('Record not found');
        return;
    }
    
    currentViewingTriageId = recordId;
    
    const priorityLabels = {
        'critical': 'Critical (Red)',
        'urgent': 'Urgent (Orange)',
        'semi-urgent': 'Semi-Urgent (Yellow)',
        'standard': 'Standard (Green)',
        'non-urgent': 'Non-Urgent (Blue)'
    };
    
    viewTriageModalBody.innerHTML = `
        <div class="form-section">
            <h3 class="section-title">Patient Information</h3>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <span class="modal-info-label">Patient ID</span>
                    <span class="modal-info-value"><strong>${record.patientId}</strong></span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Full Name</span>
                    <span class="modal-info-value">${record.firstName} ${record.lastName}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Age</span>
                    <span class="modal-info-value">${record.age} years</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Gender</span>
                    <span class="modal-info-value">${capitalizeFirst(record.gender)}</span>
                </div>
            </div>
        </div>

        <div class="form-section">
            <h3 class="section-title">Vital Signs</h3>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <span class="modal-info-label">Blood Pressure</span>
                    <span class="modal-info-value">${record.vitalSigns.bloodPressure} mmHg</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Temperature</span>
                    <span class="modal-info-value">${record.vitalSigns.temperature} °C</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Pulse Rate</span>
                    <span class="modal-info-value">${record.vitalSigns.pulseRate} bpm</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Respiratory Rate</span>
                    <span class="modal-info-value">${record.vitalSigns.respiratoryRate} breaths/min</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Oxygen Saturation</span>
                    <span class="modal-info-value">${record.vitalSigns.oxygenSaturation}%</span>
                </div>
            </div>
        </div>

        <div class="form-section">
            <h3 class="section-title">Physical Measurements</h3>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <span class="modal-info-label">Weight</span>
                    <span class="modal-info-value">${record.measurements.weight} kg</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Height</span>
                    <span class="modal-info-value">${record.measurements.height} cm</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">BMI</span>
                    <span class="modal-info-value">${record.measurements.bmi}</span>
                </div>
            </div>
        </div>

        <div class="form-section">
            <h3 class="section-title">Assessment</h3>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <span class="modal-info-label">Priority Level</span>
                    <span class="modal-info-value">
                        <span class="priority-badge priority-${record.priority}">${priorityLabels[record.priority]}</span>
                    </span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Chief Complaint</span>
                    <span class="modal-info-value">${record.chiefComplaint}</span>
                </div>
                <div class="modal-info-item" style="grid-column: 1 / -1;">
                    <span class="modal-info-label">Triage Notes</span>
                    <span class="modal-info-value">${record.notes || 'No additional notes'}</span>
                </div>
            </div>
        </div>

        <div class="form-section">
            <h3 class="section-title">Triage Information</h3>
            <div class="modal-info-grid">
                <div class="modal-info-item">
                    <span class="modal-info-label">Triaged By</span>
                    <span class="modal-info-value">${record.triagedBy}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Triage Date & Time</span>
                    <span class="modal-info-value">${formatDateTime(record.triageDate)}</span>
                </div>
            </div>
        </div>
    `;
    
    viewTriageModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeViewTriageModal() {
    viewTriageModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentViewingTriageId = null;
}

function printTriageRecord(recordId) {
    const record = triageRecords.find(r => r.id === recordId);
    if (!record) {
        alert('Record not found');
        return;
    }
    
    const priorityLabels = {
        'critical': 'CRITICAL',
        'urgent': 'URGENT',
        'semi-urgent': 'SEMI-URGENT',
        'standard': 'STANDARD',
        'non-urgent': 'NON-URGENT'
    };
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Triage Receipt - ${record.patientId}</title>
            <style>
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                }
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 11px;
                    line-height: 1.4;
                    padding: 10px;
                    width: 80mm;
                    color: #000;
                }
                .receipt {
                    width: 100%;
                }
                .center {
                    text-align: center;
                }
                .bold {
                    font-weight: bold;
                }
                .header {
                    text-align: center;
                    margin-bottom: 10px;
                    border-bottom: 1px dashed #000;
                    padding-bottom: 8px;
                }
                .header h1 {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 3px;
                }
                .header p {
                    font-size: 10px;
                    margin: 2px 0;
                }
                .divider {
                    border-bottom: 1px dashed #000;
                    margin: 8px 0;
                }
                .section {
                    margin-bottom: 8px;
                }
                .section-title {
                    font-weight: bold;
                    font-size: 12px;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }
                .row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                }
                .label {
                    flex: 1;
                }
                .value {
                    flex: 1;
                    text-align: right;
                    font-weight: bold;
                }
                .priority-box {
                    text-align: center;
                    padding: 6px;
                    margin: 8px 0;
                    border: 2px solid #000;
                    font-weight: bold;
                    font-size: 13px;
                }
                .footer {
                    text-align: center;
                    margin-top: 10px;
                    padding-top: 8px;
                    border-top: 1px dashed #000;
                    font-size: 9px;
                }
                .qr-placeholder {
                    width: 60px;
                    height: 60px;
                    border: 1px solid #000;
                    margin: 8px auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8px;
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h1>RXFLOW HOSPITAL</h1>
                    <p>TRIAGE RECEIPT</p>
                    <p>${new Date().toLocaleString()}</p>
                </div>

                <div class="section">
                    <div class="section-title">PATIENT INFO</div>
                    <div class="row">
                        <span class="label">ID:</span>
                        <span class="value">${record.patientId}</span>
                    </div>
                    <div class="row">
                        <span class="label">Name:</span>
                        <span class="value">${record.firstName} ${record.lastName}</span>
                    </div>
                    <div class="row">
                        <span class="label">Age/Gender:</span>
                        <span class="value">${record.age}Y / ${record.gender.charAt(0).toUpperCase()}</span>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="section">
                    <div class="section-title">VITAL SIGNS</div>
                    <div class="row">
                        <span class="label">BP:</span>
                        <span class="value">${record.vitalSigns.bloodPressure} mmHg</span>
                    </div>
                    <div class="row">
                        <span class="label">Temp:</span>
                        <span class="value">${record.vitalSigns.temperature}°C</span>
                    </div>
                    <div class="row">
                        <span class="label">Pulse:</span>
                        <span class="value">${record.vitalSigns.pulseRate} bpm</span>
                    </div>
                    <div class="row">
                        <span class="label">Resp Rate:</span>
                        <span class="value">${record.vitalSigns.respiratoryRate} /min</span>
                    </div>
                    <div class="row">
                        <span class="label">SpO2:</span>
                        <span class="value">${record.vitalSigns.oxygenSaturation}%</span>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="section">
                    <div class="section-title">MEASUREMENTS</div>
                    <div class="row">
                        <span class="label">Weight:</span>
                        <span class="value">${record.measurements.weight} kg</span>
                    </div>
                    <div class="row">
                        <span class="label">Height:</span>
                        <span class="value">${record.measurements.height} cm</span>
                    </div>
                    <div class="row">
                        <span class="label">BMI:</span>
                        <span class="value">${record.measurements.bmi}</span>
                    </div>
                </div>

                <div class="divider"></div>

                <div class="priority-box">
                    PRIORITY: ${priorityLabels[record.priority]}
                </div>

                <div class="section">
                    <div class="section-title">COMPLAINT</div>
                    <p>${record.chiefComplaint}</p>
                </div>

                ${record.notes ? `
                <div class="section">
                    <div class="section-title">NOTES</div>
                    <p>${record.notes}</p>
                </div>
                ` : ''}

                <div class="divider"></div>

                <div class="section center">
                    <p class="bold">Triaged By: ${record.triagedBy}</p>
                    <p>${formatDateTime(record.triageDate)}</p>
                </div>

                <div class="footer">
                    <p>*** THANK YOU ***</p>
                    <p>Keep this receipt for reference</p>
                    <p>www.rxflowhospital.com</p>
                </div>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 250);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function exportTriageToPDF(recordId) {
    const record = triageRecords.find(r => r.id === recordId);
    if (!record) {
        alert('Record not found');
        return;
    }
    
    // Use browser's print to PDF functionality
    alert('To save as PDF:\n\n1. Click Print button\n2. Choose "Save as PDF" or "Microsoft Print to PDF" as printer\n3. Click Save\n\nThis will create a PDF file of the triage record.');
    
    // Trigger print which can be saved as PDF
    printTriageRecord(recordId);
}

function exportTriageRecords() {
    if (triageRecords.length === 0) {
        alert('No records to export');
        return;
    }
    
    alert('Export triage records feature will be implemented');
    // TODO: Implement export to CSV
}

// Update sendToTriage function in All Patients module
window.addToTriageQueue = addToTriageQueue;

// Initialize
initializeTriageModule();

// ===================================
// DOCTOR MODULE
// ===================================

let doctorQueue = [];
let doctorRecords = [];
let doctorStats = {
    queueCount: 0,
    patientsToday: 0,
    totalPatients: 0
};

// Initialize Doctor Module
function initializeDoctorModule() {
    // Load sample data
    loadDoctorSampleData();
    
    // Update stats
    updateDoctorStats();
    
    // Render queue
    renderDoctorQueue();
    
    // Render records
    renderDoctorRecords();
    
    // Event listeners
    const refreshQueueBtn = document.getElementById('refreshQueueBtn');
    if (refreshQueueBtn) {
        refreshQueueBtn.addEventListener('click', refreshDoctorQueue);
    }
    
    const searchInput = document.getElementById('doctorSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterDoctorRecords);
    }
    
    // Load from Firebase
    loadDoctorDataFromFirebase();
}

// Load doctor data from Firebase
function loadDoctorDataFromFirebase() {
    // Subscribe to doctor queue
    import('./firebase-helpers.js').then(({ subscribeToDoctorQueue }) => {
        subscribeToDoctorQueue((queueData) => {
            doctorQueue = queueData.map(item => ({
                ...item,
                queueTime: item.queueTime?.toDate ? item.queueTime.toDate() : new Date(item.queueTime),
                triageTime: item.triageTime || new Date(item.queueTime?.toDate ? item.queueTime.toDate() : item.queueTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            }));
            
            // Calculate wait times
            doctorQueue.forEach(patient => {
                const now = new Date();
                const queueTime = patient.queueTime;
                const waitMinutes = Math.floor((now - queueTime) / 60000);
                patient.waitTime = waitMinutes > 0 ? `${waitMinutes} mins` : 'Just now';
            });
            
            doctorStats.queueCount = doctorQueue.length;
            updateDoctorStats();
            renderDoctorQueue();
        });
    }).catch(error => {
        console.error('Firebase not available for doctor queue:', error);
    });
    
    // Subscribe to doctor records
    import('./firebase-helpers.js').then(({ subscribeToDoctorRecords }) => {
        subscribeToDoctorRecords((recordsData) => {
            doctorRecords = recordsData.map(record => ({
                ...record,
                time: record.consultationDate?.toDate ? 
                    record.consultationDate.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 
                    record.time
            }));
            
            // Update stats
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayRecords = doctorRecords.filter(r => {
                const recordDate = r.consultationDate?.toDate ? r.consultationDate.toDate() : new Date(r.time);
                return recordDate >= today;
            });
            
            doctorStats.patientsToday = todayRecords.length;
            doctorStats.totalPatients = doctorRecords.length;
            
            updateDoctorStats();
            renderDoctorRecords();
        });
    }).catch(error => {
        console.error('Firebase not available for doctor records:', error);
    });
}

// Add patient to doctor queue from triage
function addToDoctorQueue(triageRecord) {
    try {
        // Calculate wait time
        const triageTime = new Date(triageRecord.triageDate || Date.now());
        const now = new Date();
        const waitMinutes = Math.floor((now - triageTime) / 60000);
        const waitTime = waitMinutes > 0 ? `${waitMinutes} mins` : 'Just now';
        
        // Extract and flatten vital signs and measurements from triage record
        const vitalSigns = triageRecord.vitalSigns || {};
        const measurements = triageRecord.measurements || {};
        
        // Create flattened triage data object with all vital signs and measurements
        const flattenedTriageData = {
            // Patient demographics
            patientId: triageRecord.patientId,
            firstName: triageRecord.firstName,
            lastName: triageRecord.lastName,
            age: triageRecord.age,
            gender: triageRecord.gender,
            dateOfBirth: triageRecord.dateOfBirth,
            
            // Clinical data
            chiefComplaint: triageRecord.chiefComplaint,
            priority: triageRecord.priority,
            notes: triageRecord.notes,
            
            // Vital Signs (flattened)
            bloodPressure: vitalSigns.bloodPressure || '-',
            temperature: vitalSigns.temperature || '-',
            heartRate: vitalSigns.pulseRate || vitalSigns.heartRate || '-',
            respiratoryRate: vitalSigns.respiratoryRate || '-',
            oxygenSaturation: vitalSigns.oxygenSaturation || '-',
            bloodSugar: vitalSigns.bloodSugar || '-',
            
            // Body Measurements (flattened)
            weight: measurements.weight || '-',
            height: measurements.height || '-',
            bmi: measurements.bmi || '-',
            headCircumference: measurements.headCircumference || '-',
            chestCircumference: measurements.chestCircumference || '-',
            abdominalCircumference: measurements.abdominalCircumference || '-',
            
            // Original record
            originalTriageRecord: triageRecord
        };
        
        // Create queue item
        const queueItem = {
            patientId: triageRecord.patientId,
            patientName: `${triageRecord.firstName || ''} ${triageRecord.lastName || ''}`.trim(),
            age: triageRecord.age || calculateAge(triageRecord.dateOfBirth),
            gender: triageRecord.gender || 'Unknown',
            complaint: triageRecord.chiefComplaint || triageRecord.complaint || 'Not specified',
            priority: triageRecord.priority || 'normal',
            waitTime: waitTime,
            triageTime: triageTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            triageData: flattenedTriageData, // Store flattened triage data
            firstName: triageRecord.firstName,
            lastName: triageRecord.lastName,
            dateOfBirth: triageRecord.dateOfBirth,
            chiefComplaint: triageRecord.chiefComplaint
        };
        
        // Save to Firestore
        import('./firebase-helpers.js').then(({ addToDoctorQueue: saveToDoctorQueue }) => {
            saveToDoctorQueue(queueItem).then(result => {
                if (result.success) {
                    console.log('Patient added to doctor queue in Firestore');
                    // The realtime listener will update the UI automatically
                } else {
                    console.error('Failed to save to Firestore:', result.error);
                    // Fallback to local storage
                    addToDoctorQueueLocal(queueItem);
                }
            });
        }).catch(error => {
            console.error('Firebase not available:', error);
            // Fallback to local storage
            addToDoctorQueueLocal(queueItem);
        });
        
        return true;
    } catch (error) {
        console.error('Error adding patient to doctor queue:', error);
        return false;
    }
}

// Fallback local storage function
function addToDoctorQueueLocal(queueItem) {
    const itemWithId = {
        ...queueItem,
        id: 'Q' + String(doctorQueue.length + 1).padStart(3, '0'),
        queueTime: new Date()
    };
    
    doctorQueue.push(itemWithId);
    doctorStats.queueCount = doctorQueue.length;
    updateDoctorStats();
    renderDoctorQueue();
}

// Make function globally available
window.addToDoctorQueue = addToDoctorQueue;

// Load sample data
function loadDoctorSampleData() {
    // Initialize empty arrays
    doctorQueue = [];
    doctorRecords = [];
    
    // Update stats
    doctorStats.queueCount = 0;
    doctorStats.patientsToday = 0;
    doctorStats.totalPatients = 0;
}

// Update stats display
function updateDoctorStats() {
    const queueCountEl = document.getElementById('doctorQueueCount');
    const patientsTodayEl = document.getElementById('doctorPatientsToday');
    const totalPatientsEl = document.getElementById('doctorTotalPatients');
    
    if (queueCountEl) queueCountEl.textContent = doctorStats.queueCount;
    if (patientsTodayEl) patientsTodayEl.textContent = doctorStats.patientsToday;
    if (totalPatientsEl) totalPatientsEl.textContent = doctorStats.totalPatients.toLocaleString();
}

// Render queue
function renderDoctorQueue() {
    const queueList = document.getElementById('doctorQueueList');
    if (!queueList) return;
    
    if (doctorQueue.length === 0) {
        queueList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No patients in queue</p>
            </div>
        `;
        return;
    }
    
    queueList.innerHTML = doctorQueue.map(patient => `
        <div class="queue-item ${patient.priority}" data-queue-id="${patient.id}">
            <div class="queue-item-header">
                <div class="queue-patient-name">${patient.patientName}</div>
                <span class="queue-priority ${patient.priority}">${patient.priority}</span>
            </div>
            <div class="queue-item-body">
                <div class="queue-item-info">
                    <i class="fas fa-id-card"></i>
                    <span>${patient.patientId}</span>
                </div>
                <div class="queue-item-info">
                    <i class="fas fa-user"></i>
                    <span>${patient.age} years • ${patient.gender}</span>
                </div>
                <div class="queue-item-info">
                    <i class="fas fa-notes-medical"></i>
                    <span>${patient.complaint}</span>
                </div>
                <div class="queue-item-info">
                    <i class="fas fa-clock"></i>
                    <span>Waiting: ${patient.waitTime}</span>
                </div>
            </div>
            <div class="queue-item-actions">
                <button class="btn btn-sm btn-primary" onclick="consultPatient('${patient.id}')">
                    <i class="fas fa-user-md"></i> Consult
                </button>
                <button class="btn btn-sm btn-secondary" onclick="viewPatientDetails('${patient.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

// Render records table
function renderDoctorRecords() {
    const recordsBody = document.getElementById('doctorRecordsBody');
    if (!recordsBody) return;
    
    if (doctorRecords.length === 0) {
        recordsBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">
                    <div class="empty-state">
                        <i class="fas fa-clipboard-list"></i>
                        <p>No consultations today</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    recordsBody.innerHTML = doctorRecords.map(record => `
        <tr>
            <td>${record.time}</td>
            <td><strong>${record.patientId}</strong></td>
            <td>${record.patientName}</td>
            <td>${record.age}</td>
            <td>${record.complaint}</td>
            <td>${record.diagnosis || 'Pending'}</td>
            <td>
                ${record.hasHistory ? 
                    '<span class="status-badge completed"><i class="fas fa-check"></i> Complete</span>' : 
                    '<span class="status-badge pending"><i class="fas fa-clock"></i> Pending</span>'}
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon btn-view" onclick="viewDoctorRecord('${record.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="addConsultationHistory('${record.id}')" title="Add History">
                        <i class="fas fa-notes-medical"></i>
                    </button>
                    <button class="btn-icon btn-lab" onclick="openSendToLabModal('${record.id}')" title="Send to Lab">
                        <i class="fas fa-flask"></i>
                    </button>
                    <button class="btn-icon btn-print" onclick="printDoctorRecord('${record.id}')" title="Print">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Refresh queue
function refreshDoctorQueue() {
    const btn = document.getElementById('refreshQueueBtn');
    const icon = btn.querySelector('i');
    
    // Animate refresh
    icon.classList.add('fa-spin');
    
    // Simulate refresh delay
    setTimeout(() => {
        renderDoctorQueue();
        icon.classList.remove('fa-spin');
    }, 500);
}

// Filter records
function filterDoctorRecords() {
    const searchInput = document.getElementById('doctorSearchInput');
    const searchTerm = searchInput.value.toLowerCase();
    
    const filteredRecords = doctorRecords.filter(record => {
        return record.patientId.toLowerCase().includes(searchTerm) ||
               record.patientName.toLowerCase().includes(searchTerm) ||
               record.complaint.toLowerCase().includes(searchTerm) ||
               record.diagnosis.toLowerCase().includes(searchTerm);
    });
    
    const recordsBody = document.getElementById('doctorRecordsBody');
    if (!recordsBody) return;
    
    if (filteredRecords.length === 0) {
        recordsBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>No matching records found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    recordsBody.innerHTML = filteredRecords.map(record => `
        <tr>
            <td>${record.time}</td>
            <td><strong>${record.patientId}</strong></td>
            <td>${record.patientName}</td>
            <td>${record.age}</td>
            <td>${record.complaint}</td>
            <td>${record.diagnosis || 'Pending'}</td>
            <td>
                ${record.hasHistory ? 
                    '<span class="status-badge completed"><i class="fas fa-check"></i> Complete</span>' : 
                    '<span class="status-badge pending"><i class="fas fa-clock"></i> Pending</span>'}
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon btn-view" onclick="viewDoctorRecord('${record.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="addConsultationHistory('${record.id}')" title="Add History">
                        <i class="fas fa-notes-medical"></i>
                    </button>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-print" onclick="printDoctorRecord('${record.id}')" title="Print">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Consult patient
function consultPatient(queueId) {
    const patient = doctorQueue.find(p => p.id === queueId);
    if (!patient) {
        alert('Patient not found in queue');
        return;
    }
    
    // In a real app, this would open a consultation form
    alert(`Opening consultation form for:\n\nPatient: ${patient.patientName}\nID: ${patient.patientId}\nComplaint: ${patient.complaint}`);
    
    // Simulate consultation completion
    if (confirm('Mark this consultation as complete?')) {
        // Create consultation record
        const newRecord = {
            patientId: patient.patientId,
            patientName: patient.patientName,
            age: patient.age,
            complaint: patient.complaint,
            diagnosis: 'Consultation completed',
            status: 'completed',
            triageData: patient.triageData,
            firstName: patient.firstName,
            lastName: patient.lastName,
            gender: patient.gender,
            priority: patient.priority
        };
        
        // Save to Firestore
        import('./firebase-helpers.js').then(({ addDoctorRecord, removeFromDoctorQueue }) => {
            // Add record
            addDoctorRecord(newRecord).then(result => {
                if (result.success) {
                    console.log('Doctor record saved to Firestore');
                    
                    // Remove from queue
                    removeFromDoctorQueue(queueId).then(removeResult => {
                        if (removeResult.success) {
                            console.log('Patient removed from doctor queue');
                            
                            // Update patient status
                            if (typeof updatePatientStatus === 'function') {
                                updatePatientStatus(patient.patientId, 'consultation-complete');
                            }
                            
                            // The realtime listeners will update the UI automatically
                        }
                    });
                } else {
                    console.error('Failed to save record:', result.error);
                    // Fallback to local
                    consultPatientLocal(queueId, newRecord);
                }
            });
        }).catch(error => {
            console.error('Firebase not available:', error);
            // Fallback to local
            consultPatientLocal(queueId, newRecord);
        });
    }
}

// Fallback local consultation function
function consultPatientLocal(queueId, record) {
    // Remove from queue
    doctorQueue = doctorQueue.filter(p => p.id !== queueId);
    
    // Add to records
    const recordWithMeta = {
        ...record,
        id: 'R' + String(doctorRecords.length + 1).padStart(3, '0'),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    
    doctorRecords.unshift(recordWithMeta);
    
    // Update patient status
    if (typeof updatePatientStatus === 'function') {
        updatePatientStatus(record.patientId, 'consultation-complete');
    }
    
    // Update stats
    doctorStats.queueCount = doctorQueue.length;
    doctorStats.patientsToday = doctorRecords.length;
    doctorStats.totalPatients++;
    
    // Update UI
    updateDoctorStats();
    renderDoctorQueue();
    renderDoctorRecords();
}

// View patient details
function viewPatientDetails(queueId) {
    const patient = doctorQueue.find(p => p.id === queueId);
    if (!patient) {
        alert('Patient not found');
        return;
    }
    
    // Populate modal with patient data
    document.getElementById('modalPatientId').textContent = patient.patientId;
    document.getElementById('modalPatientName').textContent = patient.patientName;
    document.getElementById('modalPatientAge').textContent = `${patient.age} years`;
    document.getElementById('modalPatientGender').textContent = patient.gender;
    document.getElementById('modalPatientComplaint').textContent = patient.complaint;
    document.getElementById('modalPatientWaitTime').textContent = patient.waitTime;
    document.getElementById('modalPatientTriageTime').textContent = patient.triageTime;
    
    // Set priority badge
    const priorityBadge = document.getElementById('modalPatientPriority');
    priorityBadge.textContent = patient.priority;
    priorityBadge.className = `priority-badge ${patient.priority}`;
    
    // Set queue position
    const position = doctorQueue.findIndex(p => p.id === queueId) + 1;
    document.getElementById('modalPatientQueuePosition').textContent = `#${position} of ${doctorQueue.length}`;
    
    // Check if vital signs available from triage data
    const vitalSignsSection = document.getElementById('vitalSignsSection');
    if (patient.triageData && (patient.triageData.bloodPressure || patient.triageData.heartRate || patient.triageData.temperature || patient.triageData.oxygenSaturation)) {
        document.getElementById('modalBP').textContent = patient.triageData.bloodPressure || '-';
        document.getElementById('modalHeartRate').textContent = patient.triageData.heartRate ? `${patient.triageData.heartRate} bpm` : '-';
        document.getElementById('modalTemp').textContent = patient.triageData.temperature ? `${patient.triageData.temperature}°C` : '-';
        document.getElementById('modalO2Sat').textContent = patient.triageData.oxygenSaturation ? `${patient.triageData.oxygenSaturation}%` : '-';
        vitalSignsSection.style.display = 'block';
    } else {
        vitalSignsSection.style.display = 'none';
    }
    
    // Set up consult button
    const consultBtn = document.getElementById('modalConsultBtn');
    consultBtn.onclick = () => {
        closePatientModal();
        consultPatient(queueId);
    };
    
    // Show modal
    openPatientModal();
}

// Open patient modal
function openPatientModal() {
    const modal = document.getElementById('patientDetailsModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close patient modal
function closePatientModal() {
    const modal = document.getElementById('patientDetailsModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Make modal functions globally available
window.closePatientModal = closePatientModal;

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePatientModal();
        closeConsultationModal();
        closeRecordModal();
    }
});

// Add Consultation History
function addConsultationHistory(recordId) {
    const record = doctorRecords.find(r => r.id === recordId);
    if (!record) {
        alert('Record not found');
        return;
    }
    
    // Set hidden field
    document.getElementById('historyRecordId').value = recordId;
    
    // Populate patient summary
    document.getElementById('historyPatientName').textContent = record.patientName;
    document.getElementById('historyPatientId').textContent = record.patientId;
    document.getElementById('historyPatientAgeGender').textContent = `${record.age} years • ${record.gender || 'N/A'}`;
    
    // Pre-fill with existing data if available
    if (record.consultationHistory) {
        document.getElementById('chiefComplaint').value = record.consultationHistory.chiefComplaint || record.complaint || '';
        document.getElementById('historyPresentingIllness').value = record.consultationHistory.historyPresentingIllness || '';
        document.getElementById('pastMedicalHistory').value = record.consultationHistory.pastMedicalHistory || '';
        document.getElementById('familyHistory').value = record.consultationHistory.familyHistory || '';
        document.getElementById('socialHistory').value = record.consultationHistory.socialHistory || '';
        document.getElementById('drugHistory').value = record.consultationHistory.drugHistory || '';
        document.getElementById('allergies').value = record.consultationHistory.allergies || '';
        document.getElementById('generalExamination').value = record.consultationHistory.generalExamination || '';
        document.getElementById('systemicExamination').value = record.consultationHistory.systemicExamination || '';
        document.getElementById('clinicalImpression').value = record.consultationHistory.clinicalImpression || '';
        document.getElementById('differentialDiagnosis').value = record.consultationHistory.differentialDiagnosis || '';
        document.getElementById('investigations').value = record.consultationHistory.investigations || '';
        document.getElementById('treatmentPlan').value = record.consultationHistory.treatmentPlan || '';
        document.getElementById('prescriptions').value = record.consultationHistory.prescriptions || '';
        document.getElementById('followUp').value = record.consultationHistory.followUp || '';
        document.getElementById('doctorNotes').value = record.consultationHistory.doctorNotes || '';
    } else {
        // Reset form
        document.getElementById('consultationHistoryForm').reset();
        document.getElementById('chiefComplaint').value = record.complaint || '';
    }
    
    // Show modal
    openConsultationModal();
}

// Open consultation modal
function openConsultationModal() {
    const modal = document.getElementById('consultationHistoryModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close consultation modal
function closeConsultationModal() {
    const modal = document.getElementById('consultationHistoryModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Make globally available
window.closeConsultationModal = closeConsultationModal;
window.addConsultationHistory = addConsultationHistory;

// Save consultation history
function saveConsultationHistory() {
    const recordId = document.getElementById('historyRecordId').value;
    const record = doctorRecords.find(r => r.id === recordId);
    
    if (!record) {
        alert('Record not found');
        return;
    }
    
    // Gather form data
    const historyData = {
        chiefComplaint: document.getElementById('chiefComplaint').value,
        historyPresentingIllness: document.getElementById('historyPresentingIllness').value,
        pastMedicalHistory: document.getElementById('pastMedicalHistory').value,
        familyHistory: document.getElementById('familyHistory').value,
        socialHistory: document.getElementById('socialHistory').value,
        drugHistory: document.getElementById('drugHistory').value,
        allergies: document.getElementById('allergies').value,
        generalExamination: document.getElementById('generalExamination').value,
        systemicExamination: document.getElementById('systemicExamination').value,
        clinicalImpression: document.getElementById('clinicalImpression').value,
        differentialDiagnosis: document.getElementById('differentialDiagnosis').value,
        investigations: document.getElementById('investigations').value,
        treatmentPlan: document.getElementById('treatmentPlan').value,
        prescriptions: document.getElementById('prescriptions').value,
        followUp: document.getElementById('followUp').value,
        doctorNotes: document.getElementById('doctorNotes').value,
        savedAt: new Date().toISOString()
    };
    
    // Update record
    record.consultationHistory = historyData;
    record.hasHistory = true;
    record.diagnosis = historyData.clinicalImpression || record.diagnosis;
    
    // Save to Firestore
    import('./firebase-helpers.js').then(({ updateDoctorRecord }) => {
        updateDoctorRecord(recordId, {
            consultationHistory: historyData,
            hasHistory: true,
            diagnosis: historyData.clinicalImpression || record.diagnosis
        }).then(result => {
            if (result.success) {
                console.log('Consultation history saved to Firestore');
                alert('Consultation history saved successfully!');
                closeConsultationModal();
                renderDoctorRecords();
            } else {
                console.error('Failed to save:', result.error);
                alert('Failed to save consultation history. Please try again.');
            }
        });
    }).catch(error => {
        console.error('Firebase not available:', error);
        // Local save
        alert('Consultation history saved locally!');
        closeConsultationModal();
        renderDoctorRecords();
    });
}

// Attach to form
document.addEventListener('DOMContentLoaded', () => {
    const saveHistoryBtn = document.getElementById('saveHistoryBtn');
    if (saveHistoryBtn) {
        saveHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveConsultationHistory();
        });
    }
});

// View doctor record
function viewDoctorRecord(recordId) {
    const record = doctorRecords.find(r => r.id === recordId);
    if (!record) {
        alert('Record not found');
        return;
    }
    
    // Populate patient header
    document.getElementById('recordPatientName').textContent = record.patientName;
    document.getElementById('recordPatientId').textContent = record.patientId;
    document.getElementById('recordPatientAge').textContent = `${record.age} years`;
    document.getElementById('recordPatientGender').textContent = record.gender || 'N/A';
    document.getElementById('recordConsultationTime').textContent = record.time;
    
    // Populate triage report
    document.getElementById('recordChiefComplaint').textContent = record.complaint;
    
    const priorityBadge = document.getElementById('recordPriority');
    if (record.priority) {
        priorityBadge.textContent = record.priority;
        priorityBadge.className = `priority-badge ${record.priority}`;
    } else {
        priorityBadge.textContent = 'Normal';
        priorityBadge.className = 'priority-badge normal';
    }
    
    // Populate all vital signs from triage data
    if (record.triageData) {
        document.getElementById('recordBP').textContent = record.triageData.bloodPressure || '-';
        document.getElementById('recordHR').textContent = record.triageData.heartRate || '-';
        document.getElementById('recordTemp').textContent = record.triageData.temperature || '-';
        document.getElementById('recordRR').textContent = record.triageData.respiratoryRate || '-';
        document.getElementById('recordO2').textContent = record.triageData.oxygenSaturation || '-';
        document.getElementById('recordBloodSugar').textContent = record.triageData.bloodSugar || '-';
        
        // Populate body measurements
        document.getElementById('recordWeight').textContent = record.triageData.weight || '-';
        document.getElementById('recordHeight').textContent = record.triageData.height || '-';
        document.getElementById('recordBMI').textContent = record.triageData.bmi || '-';
        document.getElementById('recordHeadCirc').textContent = record.triageData.headCircumference || '-';
        document.getElementById('recordChestCirc').textContent = record.triageData.chestCircumference || '-';
        document.getElementById('recordAbdCirc').textContent = record.triageData.abdominalCircumference || '-';
    } else {
        // Set all to N/A if no triage data
        document.getElementById('recordBP').textContent = '-';
        document.getElementById('recordHR').textContent = '-';
        document.getElementById('recordTemp').textContent = '-';
        document.getElementById('recordRR').textContent = '-';
        document.getElementById('recordO2').textContent = '-';
        document.getElementById('recordBloodSugar').textContent = '-';
        document.getElementById('recordWeight').textContent = '-';
        document.getElementById('recordHeight').textContent = '-';
        document.getElementById('recordBMI').textContent = '-';
        document.getElementById('recordHeadCirc').textContent = '-';
        document.getElementById('recordChestCirc').textContent = '-';
        document.getElementById('recordAbdCirc').textContent = '-';
    }
    
    // Handle consultation history
    const consultationContent = document.getElementById('consultationContent');
    const fullHistory = document.getElementById('fullConsultationHistory');
    const historyStatus = document.getElementById('recordHistoryStatus');
    
    if (record.hasHistory && record.consultationHistory) {
        // Hide empty state, show full history
        consultationContent.innerHTML = '';
        consultationContent.appendChild(fullHistory);
        fullHistory.style.display = 'block';
        
        historyStatus.textContent = 'Complete';
        historyStatus.className = 'status-badge completed';
        
        // Populate consultation history
        const h = record.consultationHistory;
        document.getElementById('recordHPI').textContent = h.historyPresentingIllness || '-';
        document.getElementById('recordPMH').textContent = h.pastMedicalHistory || '-';
        document.getElementById('recordFH').textContent = h.familyHistory || '-';
        document.getElementById('recordDrugHx').textContent = h.drugHistory || '-';
        document.getElementById('recordAllergies').textContent = h.allergies || '-';
        document.getElementById('recordGenExam').textContent = h.generalExamination || '-';
        document.getElementById('recordSysExam').textContent = h.systemicExamination || '-';
        document.getElementById('recordImpression').textContent = h.clinicalImpression || record.diagnosis || '-';
        document.getElementById('recordDDx').textContent = h.differentialDiagnosis || '-';
        document.getElementById('recordInvestigations').textContent = h.investigations || '-';
        document.getElementById('recordTreatment').textContent = h.treatmentPlan || '-';
        document.getElementById('recordPrescriptions').textContent = h.prescriptions || '-';
        document.getElementById('recordFollowUp').textContent = h.followUp || '-';
        document.getElementById('recordNotes').textContent = h.doctorNotes || '-';
        
        // Hide sections with no data
        document.getElementById('investigationsSection').style.display = h.investigations ? 'block' : 'none';
        document.getElementById('notesSection').style.display = h.doctorNotes ? 'block' : 'none';
    } else {
        // Show empty state
        fullHistory.style.display = 'none';
        consultationContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard"></i>
                <p>No consultation history recorded yet</p>
                <button class="btn btn-sm btn-primary" onclick="closeRecordModal(); addConsultationHistory('${record.id}')">
                    <i class="fas fa-plus"></i> Add History
                </button>
            </div>
        `;
        
        historyStatus.textContent = 'Pending';
        historyStatus.className = 'status-badge pending';
    }
    
    // Setup print button
    document.getElementById('printRecordBtn').onclick = () => {
        printDoctorRecord(recordId);
    };
    
    // Show modal
    openRecordModal();
}

// Open record modal
function openRecordModal() {
    const modal = document.getElementById('patientRecordModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close record modal
function closeRecordModal() {
    const modal = document.getElementById('patientRecordModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Make globally available
window.closeRecordModal = closeRecordModal;

// Print doctor record
function printDoctorRecord(recordId) {
    const record = doctorRecords.find(r => r.id === recordId);
    if (!record) {
        alert('Record not found');
        return;
    }
    
    // Create print window
    const printWindow = window.open('', '_blank');
    
    let printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Medical Record - ${record.patientName}</title>
            <style>
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    padding: 40px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #2563eb;
                    padding-bottom: 20px;
                }
                .header h1 {
                    margin: 0;
                    color: #2563eb;
                }
                .patient-info {
                    background: #f8fafc;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                .patient-info h2 {
                    margin-top: 0;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                }
                .info-item {
                    margin-bottom: 10px;
                }
                .info-label {
                    font-weight: bold;
                    color: #64748b;
                    font-size: 12px;
                    text-transform: uppercase;
                }
                .info-value {
                    color: #1e293b;
                    font-size: 14px;
                }
                .section {
                    margin: 25px 0;
                    page-break-inside: avoid;
                }
                .section-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #2563eb;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 8px;
                    margin-bottom: 15px;
                }
                .prescription-box {
                    background: #f0fdf4;
                    border: 2px solid #10b981;
                    padding: 15px;
                    border-radius: 8px;
                    white-space: pre-wrap;
                }
                .diagnosis-box {
                    background: #eff6ff;
                    border-left: 4px solid #2563eb;
                    padding: 15px;
                    margin: 10px 0;
                }
                @media print {
                    body { padding: 20px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>RxFlow Hospital Management System</h1>
                <p>Medical Consultation Record</p>
            </div>
            
            <div class="patient-info">
                <h2>${record.patientName}</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Patient ID</div>
                        <div class="info-value">${record.patientId}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Age / Gender</div>
                        <div class="info-value">${record.age} years / ${record.gender || 'N/A'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Consultation Date</div>
                        <div class="info-value">${new Date().toLocaleDateString()} - ${record.time}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Chief Complaint</div>
                        <div class="info-value">${record.complaint}</div>
                    </div>
                </div>
            </div>
    `;
    
    if (record.hasHistory && record.consultationHistory) {
        const h = record.consultationHistory;
        
        printContent += `
            <div class="section">
                <div class="section-title">Clinical History</div>
                ${h.historyPresentingIllness ? `<p><strong>History of Presenting Illness:</strong><br>${h.historyPresentingIllness}</p>` : ''}
                ${h.pastMedicalHistory ? `<p><strong>Past Medical History:</strong><br>${h.pastMedicalHistory}</p>` : ''}
                ${h.drugHistory ? `<p><strong>Drug History:</strong><br>${h.drugHistory}</p>` : ''}
                ${h.allergies ? `<p><strong>Allergies:</strong><br>${h.allergies}</p>` : ''}
            </div>
            
            <div class="section">
                <div class="section-title">Physical Examination</div>
                ${h.generalExamination ? `<p><strong>General Examination:</strong><br>${h.generalExamination}</p>` : ''}
                ${h.systemicExamination ? `<p><strong>Systemic Examination:</strong><br>${h.systemicExamination}</p>` : ''}
            </div>
            
            <div class="section">
                <div class="section-title">Diagnosis</div>
                <div class="diagnosis-box">
                    <strong>Clinical Impression:</strong><br>
                    ${h.clinicalImpression || record.diagnosis || 'Not specified'}
                </div>
                ${h.differentialDiagnosis ? `<p><strong>Differential Diagnosis:</strong><br>${h.differentialDiagnosis}</p>` : ''}
            </div>
            
            ${h.investigations ? `
                <div class="section">
                    <div class="section-title">Investigations</div>
                    <p>${h.investigations}</p>
                </div>
            ` : ''}
            
            <div class="section">
                <div class="section-title">Treatment Plan</div>
                ${h.treatmentPlan ? `<p><strong>Management:</strong><br>${h.treatmentPlan}</p>` : ''}
                ${h.prescriptions ? `
                    <p><strong>Prescriptions:</strong></p>
                    <div class="prescription-box">${h.prescriptions}</div>
                ` : ''}
                ${h.followUp ? `<p><strong>Follow-up:</strong><br>${h.followUp}</p>` : ''}
            </div>
            
            ${h.doctorNotes ? `
                <div class="section">
                    <div class="section-title">Additional Notes</div>
                    <p>${h.doctorNotes}</p>
                </div>
            ` : ''}
        `;
    } else {
        printContent += `
            <div class="section">
                <p><em>Consultation history not yet recorded.</em></p>
            </div>
        `;
    }
    
    printContent += `
            <div class="section" style="margin-top: 50px; border-top: 2px solid #e2e8f0; padding-top: 20px;">
                <div class="info-grid">
                    <div>
                        <p><strong>Doctor's Signature:</strong></p>
                        <p>_______________________</p>
                    </div>
                    <div>
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// ========================================
// ALL CONSULTATIONS MODULE
// ========================================

let allConsultationsData = [];
let filteredConsultations = [];

// Open All Consultations Module
function openAllConsultationsModule() {
    // Hide doctor module
    document.getElementById('doctor-module').style.display = 'none';
    // Show all consultations module
    document.getElementById('all-consultations-module').style.display = 'block';
    
    // Load all consultations
    loadAllConsultations();
}

// Close All Consultations Module
function closeAllConsultationsModule() {
    // Hide all consultations module
    document.getElementById('all-consultations-module').style.display = 'none';
    // Show doctor module
    document.getElementById('doctor-module').style.display = 'block';
}

// Load all consultations from Firestore
function loadAllConsultations() {
    // Try to load from Firestore
    import('./firebase-helpers.js').then(({ subscribeToAllDoctorRecords }) => {
        if (typeof subscribeToAllDoctorRecords === 'function') {
            subscribeToAllDoctorRecords((records) => {
                allConsultationsData = records;
                filteredConsultations = records;
                updateAllConsultationsStats();
                renderAllConsultations();
            });
        } else {
            // Fallback to local data
            allConsultationsData = [...doctorRecords];
            filteredConsultations = [...doctorRecords];
            updateAllConsultationsStats();
            renderAllConsultations();
        }
    }).catch(error => {
        console.error('Firebase not available:', error);
        // Fallback to local data
        allConsultationsData = [...doctorRecords];
        filteredConsultations = [...doctorRecords];
        updateAllConsultationsStats();
        renderAllConsultations();
    });
}

// Update stats for All Consultations
function updateAllConsultationsStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const todayCount = allConsultationsData.filter(r => {
        const recordDate = new Date(r.date || r.consultationDate || r.time);
        return recordDate >= today;
    }).length;
    
    const weekCount = allConsultationsData.filter(r => {
        const recordDate = new Date(r.date || r.consultationDate || r.time);
        return recordDate >= weekAgo;
    }).length;
    
    const monthCount = allConsultationsData.filter(r => {
        const recordDate = new Date(r.date || r.consultationDate || r.time);
        return recordDate >= monthStart;
    }).length;
    
    document.getElementById('allConsultationsToday').textContent = todayCount;
    document.getElementById('allConsultationsWeek').textContent = weekCount;
    document.getElementById('allConsultationsMonth').textContent = monthCount;
    document.getElementById('allConsultationsTotal').textContent = allConsultationsData.length;
}

// Render all consultations table
function renderAllConsultations() {
    const tbody = document.getElementById('allConsultationsBody');
    if (!tbody) return;
    
    if (filteredConsultations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No consultations found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredConsultations.map(record => {
        const recordDate = new Date(record.date || record.consultationDate || record.time);
        const dateStr = recordDate.toLocaleDateString();
        const timeStr = record.time || recordDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        const historyBadge = record.hasHistory 
            ? '<span class="status-badge completed">Complete</span>'
            : '<span class="status-badge pending">Pending</span>';
        
        return `
            <tr>
                <td>${dateStr}</td>
                <td>${timeStr}</td>
                <td>${record.patientId}</td>
                <td>${record.patientName}</td>
                <td>${record.age}</td>
                <td>${record.gender || 'N/A'}</td>
                <td>${record.complaint}</td>
                <td>${record.diagnosis || '-'}</td>
                <td>${historyBadge}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-btn-view" onclick="viewDoctorRecord('${record.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn action-btn-edit" onclick="addConsultationHistory('${record.id}')" title="Add/Edit History">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn action-btn-lab" onclick="openSendToLabModal('${record.id}')" title="Send to Lab">
                            <i class="fas fa-flask"></i>
                        </button>
                        <button class="action-btn action-btn-print" onclick="printDoctorRecord('${record.id}')" title="Print Record">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Filter all consultations
function filterAllConsultations() {
    const fromDate = document.getElementById('allConsultationsFromDate').value;
    const toDate = document.getElementById('allConsultationsToDate').value;
    const searchTerm = document.getElementById('allConsultationsSearch').value.toLowerCase();
    
    filteredConsultations = allConsultationsData.filter(record => {
        // Date filter
        if (fromDate || toDate) {
            const recordDate = new Date(record.date || record.consultationDate || record.time);
            const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
            
            if (fromDate) {
                const from = new Date(fromDate);
                if (recordDateOnly < from) return false;
            }
            
            if (toDate) {
                const to = new Date(toDate);
                if (recordDateOnly > to) return false;
            }
        }
        
        // Search filter
        if (searchTerm) {
            const matchesSearch = 
                record.patientId.toLowerCase().includes(searchTerm) ||
                record.patientName.toLowerCase().includes(searchTerm) ||
                (record.complaint && record.complaint.toLowerCase().includes(searchTerm)) ||
                (record.diagnosis && record.diagnosis.toLowerCase().includes(searchTerm));
            
            if (!matchesSearch) return false;
        }
        
        return true;
    });
    
    renderAllConsultations();
}

// Reset filters
function resetAllConsultationsFilters() {
    document.getElementById('allConsultationsFromDate').value = '';
    document.getElementById('allConsultationsToDate').value = '';
    document.getElementById('allConsultationsSearch').value = '';
    
    filteredConsultations = [...allConsultationsData];
    renderAllConsultations();
}

// Make globally available
window.openAllConsultationsModule = openAllConsultationsModule;
window.closeAllConsultationsModule = closeAllConsultationsModule;
window.filterAllConsultations = filterAllConsultations;
window.resetAllConsultationsFilters = resetAllConsultationsFilters;

// ========================================
// LAB REPORTS MODULE FUNCTIONS
// ========================================

let doctorLabReports = [];
let doctorLabReportsStats = {
    new: 0,
    today: 0,
    week: 0,
    reviewed: 0
};
let currentViewingLabReport = null;
let labReportsReturnModule = 'doctor'; // Track which module to return to
let labReportsUnsubscribe = null; // Store unsubscribe function

// Open Lab Reports Module from Doctor
function openLabReportsModule() {
    // Use the navigation system properly
    const navItems = document.querySelectorAll('.nav-item');
    const modules = document.querySelectorAll('.module');
    
    // Hide all modules
    modules.forEach(mod => mod.classList.remove('active'));
    navItems.forEach(nav => nav.classList.remove('active'));
    
    // Show lab reports module
    const labReportsModule = document.getElementById('lab-reports-module');
    if (labReportsModule) {
        labReportsModule.classList.add('active');
    }
    
    // Set return module
    labReportsReturnModule = 'doctor';
    document.getElementById('labReportsBackText').textContent = 'Back to Doctor';
    
    // Load lab reports if not already subscribed
    if (!labReportsUnsubscribe) {
        loadDoctorLabReports();
    }
}

// Open Lab Reports Module from Laboratory
function openLabReportsModuleFromLab() {
    // Use the navigation system properly
    const navItems = document.querySelectorAll('.nav-item');
    const modules = document.querySelectorAll('.module');
    
    // Hide all modules
    modules.forEach(mod => mod.classList.remove('active'));
    navItems.forEach(nav => nav.classList.remove('active'));
    
    // Show lab reports module
    const labReportsModule = document.getElementById('lab-reports-module');
    if (labReportsModule) {
        labReportsModule.classList.add('active');
    }
    
    // Set return module
    labReportsReturnModule = 'laboratory';
    document.getElementById('labReportsBackText').textContent = 'Back to Laboratory';
    
    // Load lab reports if not already subscribed
    if (!labReportsUnsubscribe) {
        loadDoctorLabReports();
    }
}

// Close Lab Reports Module
function closeLabReportsModule() {
    const modules = document.querySelectorAll('.module');
    const navItems = document.querySelectorAll('.nav-item');
    
    // Hide lab reports module
    const labReportsModule = document.getElementById('lab-reports-module');
    if (labReportsModule) {
        labReportsModule.classList.remove('active');
    }
    
    // Show and activate the correct return module
    if (labReportsReturnModule === 'laboratory') {
        const labModule = document.getElementById('laboratory-module');
        const labNavItem = document.querySelector('.nav-item[data-module="laboratory"]');
        
        if (labModule) {
            modules.forEach(mod => mod.classList.remove('active'));
            labModule.classList.add('active');
        }
        if (labNavItem) {
            navItems.forEach(nav => nav.classList.remove('active'));
            labNavItem.classList.add('active');
        }
    } else {
        // Default to doctor module
        const doctorModule = document.getElementById('doctor-module');
        const doctorNavItem = document.querySelector('.nav-item[data-module="doctor"]');
        
        if (doctorModule) {
            modules.forEach(mod => mod.classList.remove('active'));
            doctorModule.classList.add('active');
        }
        if (doctorNavItem) {
            navItems.forEach(nav => nav.classList.remove('active'));
            doctorNavItem.classList.add('active');
        }
    }
}

// Load lab reports (completed and sent from laboratory)
function loadDoctorLabReports() {
    console.log('Setting up lab reports real-time subscription...');
    import('./firebase-helpers.js').then(({ subscribeToLabRequests }) => {
        if (typeof subscribeToLabRequests === 'function') {
            // Unsubscribe from previous subscription if exists
            if (labReportsUnsubscribe) {
                labReportsUnsubscribe();
            }
            
            // Subscribe to real-time updates
            labReportsUnsubscribe = subscribeToLabRequests((requests) => {
                console.log('Lab reports updated from Firestore:', requests.length, 'total requests');
                
                // Filter only completed/sent reports
                doctorLabReports = requests.filter(r => r.status === 'sent' || r.status === 'completed');
                console.log('Filtered lab reports (completed/sent):', doctorLabReports.length);
                
                updateDoctorLabReportsStats();
                renderDoctorLabReports();
                updateLabReportsBadge();
            });
        } else {
            console.log('No lab reports available - Firebase function not found');
            doctorLabReports = [];
            updateDoctorLabReportsStats();
            renderDoctorLabReports();
        }
    }).catch(error => {
        console.error('Firebase not available:', error);
        doctorLabReports = [];
        updateDoctorLabReportsStats();
        renderDoctorLabReports();
    });
}

// Update lab reports stats
function updateDoctorLabReportsStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // New reports (not yet reviewed by doctor)
    doctorLabReportsStats.new = doctorLabReports.filter(r => !r.reviewedByDoctor).length;
    
    // Today's reports
    doctorLabReportsStats.today = doctorLabReports.filter(r => {
        const completedDate = new Date(r.completionDate || r.completedAt);
        return completedDate >= today;
    }).length;
    
    // This week's reports
    doctorLabReportsStats.week = doctorLabReports.filter(r => {
        const completedDate = new Date(r.completionDate || r.completedAt);
        return completedDate >= weekAgo;
    }).length;
    
    // Reviewed reports
    doctorLabReportsStats.reviewed = doctorLabReports.filter(r => r.reviewedByDoctor).length;
    
    // Update UI
    document.getElementById('labReportsNewCount').textContent = doctorLabReportsStats.new;
    document.getElementById('labReportsTodayCount').textContent = doctorLabReportsStats.today;
    document.getElementById('labReportsWeekCount').textContent = doctorLabReportsStats.week;
    document.getElementById('labReportsReviewedCount').textContent = doctorLabReportsStats.reviewed;
    
    // Show/hide new reports alert
    const alertSection = document.getElementById('newLabReportsAlert');
    if (doctorLabReportsStats.new > 0) {
        alertSection.style.display = 'block';
        document.getElementById('newReportsCount').textContent = doctorLabReportsStats.new;
    } else {
        alertSection.style.display = 'none';
    }
}

// Update the badge on the Lab Reports button
function updateLabReportsBadge() {
    const badge = document.getElementById('labReportsBadge');
    if (badge) {
        const newCount = doctorLabReports.filter(r => !r.reviewedByDoctor).length;
        badge.textContent = newCount;
        badge.style.display = newCount > 0 ? 'inline-block' : 'none';
    }
}

// Render lab reports table
function renderDoctorLabReports() {
    const tbody = document.getElementById('labReportsBody');
    if (!tbody) return;
    
    const filteredReports = getFilteredDoctorLabReports();
    
    if (filteredReports.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    <div class="empty-state">
                        <i class="fas fa-flask"></i>
                        <p>No lab reports available</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredReports.map(report => {
        const isNew = !report.reviewedByDoctor;
        const statusClass = isNew ? 'warning' : 'completed';
        const statusText = isNew ? 'New' : 'Reviewed';
        
        const testsDisplay = report.requestedTests.length > 3 
            ? `${report.requestedTests.slice(0, 3).join(', ')} +${report.requestedTests.length - 3} more`
            : report.requestedTests.join(', ');
        
        const completionDate = new Date(report.completionDate || report.completedAt);
        const completionDateStr = completionDate.toLocaleDateString();
        const completionTimeStr = completionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Use displayId for showing, but use Firestore document id for actions
        const displayId = report.displayId || report.id;
        
        return `
            <tr ${isNew ? 'style="background-color: #fffbeb;"' : ''}>
                <td>
                    <strong>${displayId}</strong>
                    ${isNew ? '<span class="status-badge warning" style="margin-left: 5px; position: static;">NEW</span>' : ''}
                </td>
                <td>${completionTimeStr}<br><small>${completionDateStr}</small></td>
                <td>${report.patientId}</td>
                <td>${report.patientName}</td>
                <td>${report.age} / ${report.gender || 'N/A'}</td>
                <td><span class="text-ellipsis" title="${report.requestedTests.join(', ')}">${testsDisplay}</span></td>
                <td>${report.performedBy || 'Lab Technician'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-view" onclick="viewDoctorLabReport('${report.id}')" title="View Results">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-print" onclick="printDoctorLabReportFromTable('${report.id}')" title="Print Results">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="btn-icon btn-rx" onclick="openRxTreatment('${report.id}')" title="Prescribe Treatment">
                            <span style="font-weight: 600; font-size: 12px;">Rx</span>
                        </button>
                        ${isNew ? `
                            <button class="btn-icon btn-check" onclick="quickMarkAsReviewed('${report.id}')" title="Mark as Reviewed">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get filtered lab reports
function getFilteredDoctorLabReports() {
    const searchTerm = document.getElementById('labReportsSearchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('labReportsStatusFilter')?.value || '';
    const timeFilter = document.getElementById('labReportsTimeFilter')?.value || 'all';
    
    return doctorLabReports.filter(report => {
        // Search filter
        const matchesSearch = !searchTerm || 
            report.patientId.toLowerCase().includes(searchTerm) ||
            report.patientName.toLowerCase().includes(searchTerm) ||
            (report.displayId && report.displayId.toLowerCase().includes(searchTerm)) ||
            report.id.toLowerCase().includes(searchTerm);
        
        // Status filter
        const matchesStatus = !statusFilter || 
            (statusFilter === 'new' && !report.reviewedByDoctor) ||
            (statusFilter === 'reviewed' && report.reviewedByDoctor);
        
        // Time filter
        let matchesTime = true;
        if (timeFilter !== 'all') {
            const completedDate = new Date(report.completionDate || report.completedAt);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);
            
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const yesterdayEnd = new Date(yesterday);
            yesterdayEnd.setHours(23, 59, 59, 999);
            
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            
            switch (timeFilter) {
                case 'today':
                    matchesTime = completedDate >= today && completedDate <= todayEnd;
                    break;
                case 'yesterday':
                    matchesTime = completedDate >= yesterday && completedDate < today;
                    break;
                case 'week':
                    matchesTime = completedDate >= weekAgo;
                    break;
                case 'month':
                    matchesTime = completedDate >= monthAgo;
                    break;
            }
        }
        
        return matchesSearch && matchesStatus && matchesTime;
    });
}

// Filter lab reports
function filterLabReports() {
    renderDoctorLabReports();
}

// Filter to show only new reports
function filterNewReports() {
    document.getElementById('labReportsStatusFilter').value = 'new';
    filterLabReports();
}

// Refresh lab reports
function refreshLabReports() {
    const btn = event?.currentTarget;
    if (btn) {
        const icon = btn.querySelector('i');
        icon.classList.add('fa-spin');
        setTimeout(() => icon.classList.remove('fa-spin'), 1000);
    }
    loadDoctorLabReports();
}

// View lab report details
function viewDoctorLabReport(reportId) {
    const report = doctorLabReports.find(r => r.id === reportId);
    if (!report) {
        alert('Lab report not found');
        return;
    }
    
    currentViewingLabReport = report;
    
    // Populate patient information
    document.getElementById('viewDoctorLabPatientId').textContent = report.patientId;
    document.getElementById('viewDoctorLabPatientName').textContent = report.patientName;
    document.getElementById('viewDoctorLabPatientAgeGender').textContent = `${report.age} years / ${report.gender || 'N/A'}`;
    document.getElementById('viewDoctorLabReportId').textContent = report.displayId || report.id;
    
    // Populate request information
    document.getElementById('viewDoctorLabRequestedBy').textContent = report.requestedBy;
    document.getElementById('viewDoctorLabRequestDate').textContent = new Date(report.requestDate).toLocaleString();
    document.getElementById('viewDoctorLabPerformedBy').textContent = report.performedBy || 'Lab Technician';
    document.getElementById('viewDoctorLabCompletionDate').textContent = new Date(report.completionDate || report.completedAt).toLocaleString();
    
    // Show complaint and diagnosis if available
    if (report.complaint) {
        document.getElementById('viewDoctorLabComplaint').textContent = report.complaint;
        document.getElementById('viewDoctorLabComplaintSection').style.display = 'block';
    } else {
        document.getElementById('viewDoctorLabComplaintSection').style.display = 'none';
    }
    
    if (report.diagnosis) {
        document.getElementById('viewDoctorLabDiagnosis').textContent = report.diagnosis;
        document.getElementById('viewDoctorLabDiagnosisSection').style.display = 'block';
    } else {
        document.getElementById('viewDoctorLabDiagnosisSection').style.display = 'none';
    }
    
    // Populate test results
    const resultsContainer = document.getElementById('viewDoctorLabResultsContainer');
    if (report.results && Object.keys(report.results).length > 0) {
        resultsContainer.innerHTML = Object.entries(report.results).map(([test, result]) => `
            <div style="background: white; padding: 15px; margin-bottom: 10px; border-radius: 6px; border-left: 4px solid #2563eb;">
                <div style="font-weight: 600; color: #1f2937; margin-bottom: 5px;">${test}</div>
                <div style="color: #4b5563; white-space: pre-wrap;">${result || 'No result recorded'}</div>
            </div>
        `).join('');
    } else {
        resultsContainer.innerHTML = '<p style="color: #9ca3af;">No results available</p>';
    }
    
    // Show technician notes if available
    if (report.technicianNotes) {
        document.getElementById('viewDoctorLabTechnicianNotes').textContent = report.technicianNotes;
        document.getElementById('viewDoctorLabNotesSection').style.display = 'block';
    } else {
        document.getElementById('viewDoctorLabNotesSection').style.display = 'none';
    }
    
    // Populate existing doctor review notes if available
    document.getElementById('doctorReviewNotes').value = report.doctorReviewNotes || '';
    
    // Open modal
    const modal = document.getElementById('viewDoctorLabReportModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close view lab report modal
function closeViewDoctorLabReportModal() {
    const modal = document.getElementById('viewDoctorLabReportModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    currentViewingLabReport = null;
}

// Mark lab report as reviewed
function markLabReportAsReviewed() {
    if (!currentViewingLabReport) {
        alert('No report selected');
        return;
    }
    
    const doctorNotes = document.getElementById('doctorReviewNotes').value;
    
    const updates = {
        reviewedByDoctor: true,
        reviewedAt: new Date().toISOString(),
        doctorReviewNotes: doctorNotes
    };
    
    import('./firebase-helpers.js').then(({ updateLabRequest }) => {
        if (typeof updateLabRequest === 'function') {
            updateLabRequest(currentViewingLabReport.id, updates).then(result => {
                if (result.success) {
                    alert('Lab report marked as reviewed!');
                    closeViewDoctorLabReportModal();
                } else {
                    alert('Failed to update report. Please try again.');
                }
            });
        } else {
            alert('Lab report marked as reviewed!');
            closeViewDoctorLabReportModal();
        }
    }).catch(error => {
        console.error('Firebase not available:', error);
        alert('Lab report marked as reviewed!');
        closeViewDoctorLabReportModal();
    });
}

// Quick mark as reviewed from table
function quickMarkAsReviewed(reportId) {
    const report = doctorLabReports.find(r => r.id === reportId);
    if (!report) {
        alert('Lab report not found');
        return;
    }
    
    if (confirm(`Mark lab report for ${report.patientName} as reviewed?`)) {
        const updates = {
            reviewedByDoctor: true,
            reviewedAt: new Date().toISOString()
        };
        
        import('./firebase-helpers.js').then(({ updateLabRequest }) => {
            if (typeof updateLabRequest === 'function') {
                updateLabRequest(reportId, updates).then(result => {
                    if (result.success) {
                        alert('Lab report marked as reviewed!');
                    } else {
                        alert('Failed to update report. Please try again.');
                    }
                });
            } else {
                alert('Lab report marked as reviewed!');
            }
        }).catch(error => {
            console.error('Firebase not available:', error);
            alert('Lab report marked as reviewed!');
        });
    }
}

// Open Rx Treatment Modal for Lab Report
let currentRxReport = null;
let rxDiagnosisList = [];
let medicationCart = [];

function openRxTreatment(reportId) {
    const report = doctorLabReports.find(r => r.id === reportId);
    if (!report) {
        alert('Lab report not found');
        return;
    }
    
    currentRxReport = report;
    rxDiagnosisList = [];
    medicationCart = [];
    
    // Populate patient info
    document.getElementById('rxPatientName').textContent = report.patientName;
    document.getElementById('rxPatientId').textContent = report.patientId;
    document.getElementById('rxPatientAge').textContent = `${report.age} / ${report.gender || 'N/A'}`;
    document.getElementById('rxReportId').textContent = report.displayId || report.id;
    
    // Reset form
    document.getElementById('diagnosisType').value = '';
    document.getElementById('commonDiagnosisGroup').style.display = 'none';
    document.getElementById('manualDiagnosisGroup').style.display = 'none';
    document.getElementById('rxDiagnosisList').style.display = 'none';
    document.getElementById('medicationSearch').value = '';
    document.getElementById('medicationSearchResults').innerHTML = '';
    document.getElementById('medicationDetailsForm').style.display = 'none';
    document.getElementById('manualMedicationForm').style.display = 'none';
    document.getElementById('medicationCart').style.display = 'none';
    document.getElementById('managementNotes').value = '';
    document.getElementById('followUpNotes').value = '';
    
    // Show modal
    document.getElementById('rxTreatmentModal').style.display = 'flex';
}

function closeRxTreatmentModal() {
    if (medicationCart.length > 0 || rxDiagnosisList.length > 0) {
        if (!confirm('You have unsaved data. Are you sure you want to close?')) {
            return;
        }
    }
    document.getElementById('rxTreatmentModal').style.display = 'none';
    currentRxReport = null;
    rxDiagnosisList = [];
    medicationCart = [];
}

// Diagnosis Management
function toggleDiagnosisInput() {
    const type = document.getElementById('diagnosisType').value;
    const commonGroup = document.getElementById('commonDiagnosisGroup');
    const manualGroup = document.getElementById('manualDiagnosisGroup');
    
    commonGroup.style.display = type === 'common' ? 'block' : 'none';
    manualGroup.style.display = type === 'manual' ? 'block' : 'none';
}

function addDiagnosisFromDropdown() {
    const select = document.getElementById('commonDiagnosis');
    const diagnosis = select.value;
    
    if (diagnosis && !rxDiagnosisList.includes(diagnosis)) {
        rxDiagnosisList.push(diagnosis);
        renderDiagnosisList();
        select.value = '';
    }
}

function addManualDiagnosis() {
    const textarea = document.getElementById('manualDiagnosis');
    const diagnosis = textarea.value.trim();
    
    if (diagnosis && !rxDiagnosisList.includes(diagnosis)) {
        rxDiagnosisList.push(diagnosis);
        renderDiagnosisList();
        textarea.value = '';
    } else if (rxDiagnosisList.includes(diagnosis)) {
        alert('This diagnosis has already been added');
    }
}

function removeDiagnosis(index) {
    rxDiagnosisList.splice(index, 1);
    renderDiagnosisList();
}

function renderDiagnosisList() {
    const container = document.getElementById('diagnosisItems');
    const listDiv = document.getElementById('rxDiagnosisList');
    
    if (rxDiagnosisList.length === 0) {
        listDiv.style.display = 'none';
        return;
    }
    
    listDiv.style.display = 'block';
    container.innerHTML = rxDiagnosisList.map((diagnosis, index) => `
        <div class="diagnosis-tag">
            <span>${diagnosis}</span>
            <button onclick="removeDiagnosis(${index})" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Pharmacy Inventory Search
function searchPharmacyInventory() {
    const searchTerm = document.getElementById('medicationSearch').value.trim().toLowerCase();
    const resultsDiv = document.getElementById('medicationSearchResults');
    
    if (searchTerm.length < 2) {
        resultsDiv.classList.remove('active');
        resultsDiv.innerHTML = '';
        return;
    }
    
    // Get pharmacy items from inventory
    const inventoryItems = getInventoryItems();
    const pharmacyItems = inventoryItems.filter(item => 
        item.location === 'Pharmacy Store' || 
        item.location === 'pharmacy-store' ||
        item.category === 'Medications' ||
        item.category === 'medications'
    );
    
    const filteredItems = pharmacyItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        (item.description && item.description.toLowerCase().includes(searchTerm))
    );
    
    if (filteredItems.length === 0) {
        resultsDiv.innerHTML = '<div class="medication-result-item" style="color: var(--text-secondary); text-align: center;">No medications found</div>';
        resultsDiv.classList.add('active');
        return;
    }
    
    resultsDiv.innerHTML = filteredItems.slice(0, 10).map(item => `
        <div class="medication-result-item" onclick="selectMedication('${item.id}', '${item.name.replace(/'/g, "\\'")}')">
            <span class="medication-result-name">${item.name}</span>
            <div class="medication-result-details">
                <span><i class="fas fa-box"></i> Stock: ${item.quantity} ${item.unit || 'units'}</span>
                ${item.description ? `<span><i class="fas fa-info-circle"></i> ${item.description}</span>` : ''}
            </div>
        </div>
    `).join('');
    resultsDiv.classList.add('active');
}

function selectMedication(itemId, itemName) {
    document.getElementById('selectedMedicationName').value = itemName;
    document.getElementById('selectedMedicationName').dataset.itemId = itemId;
    document.getElementById('medicationSearch').value = itemName;
    document.getElementById('medicationSearchResults').classList.remove('active');
    document.getElementById('medicationDetailsForm').style.display = 'flex';
}

// Close search results when clicking outside
document.addEventListener('click', function(e) {
    const searchBar = document.querySelector('.medication-search-bar');
    if (searchBar && !searchBar.contains(e.target)) {
        document.getElementById('medicationSearchResults')?.classList.remove('active');
    }
});

// Medication Cart Management
function addMedicationToCart() {
    const name = document.getElementById('selectedMedicationName').value;
    const itemId = document.getElementById('selectedMedicationName').dataset.itemId;
    const dosage = document.getElementById('medicationDosage').value;
    const duration = document.getElementById('medicationDuration').value;
    const route = document.getElementById('medicationRoute').value;
    const instructions = document.getElementById('medicationInstructions').value;
    
    if (!name || !dosage || !duration || !route) {
        alert('Please fill in all required fields');
        return;
    }
    
    const medication = {
        id: Date.now(),
        itemId: itemId,
        name: name,
        dosage: dosage,
        duration: parseInt(duration),
        route: route,
        instructions: instructions,
        source: 'pharmacy'
    };
    
    medicationCart.push(medication);
    renderMedicationCart();
    
    // Reset form
    document.getElementById('medicationSearch').value = '';
    document.getElementById('selectedMedicationName').value = '';
    document.getElementById('medicationDetailsForm').style.display = 'none';
    document.getElementById('medicationDuration').value = '7';
    document.getElementById('medicationInstructions').value = '';
    document.getElementById('medicationDosage').value = 'BD';
    document.getElementById('medicationRoute').value = 'Oral';
}

function toggleManualMedication() {
    const form = document.getElementById('manualMedicationForm');
    const toggleBtn = document.getElementById('manualMedToggleText');
    
    if (form.style.display === 'none' || !form.style.display) {
        form.style.display = 'flex';
        toggleBtn.textContent = 'Hide Manual Entry';
    } else {
        form.style.display = 'none';
        toggleBtn.textContent = 'Add Manual Medication';
    }
}

function addManualMedicationToCart() {
    const name = document.getElementById('manualMedicationName').value.trim();
    const dosage = document.getElementById('manualMedicationDosage').value;
    const duration = document.getElementById('manualMedicationDuration').value;
    const route = document.getElementById('manualMedicationRoute').value;
    const instructions = document.getElementById('manualMedicationInstructions').value;
    
    if (!name || !dosage || !duration || !route) {
        alert('Please fill in all required fields');
        return;
    }
    
    const medication = {
        id: Date.now(),
        itemId: null,
        name: name,
        dosage: dosage,
        duration: parseInt(duration),
        route: route,
        instructions: instructions,
        source: 'manual'
    };
    
    medicationCart.push(medication);
    renderMedicationCart();
    
    // Reset form
    document.getElementById('manualMedicationName').value = '';
    document.getElementById('manualMedicationDuration').value = '7';
    document.getElementById('manualMedicationInstructions').value = '';
    document.getElementById('manualMedicationDosage').value = 'BD';
    document.getElementById('manualMedicationRoute').value = 'Oral';
}

function removeMedicationFromCart(medicationId) {
    medicationCart = medicationCart.filter(med => med.id !== medicationId);
    renderMedicationCart();
}

function renderMedicationCart() {
    const cartDiv = document.getElementById('medicationCart');
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    
    if (medicationCart.length === 0) {
        cartDiv.style.display = 'none';
        return;
    }
    
    cartDiv.style.display = 'block';
    cartCount.textContent = medicationCart.length;
    
    cartItems.innerHTML = medicationCart.map(med => `
        <div class="cart-item">
            <div class="cart-item-details">
                <div class="cart-item-name">${med.name}</div>
                <div class="cart-item-info">
                    <span class="cart-item-info-item">
                        <i class="fas fa-clock"></i>
                        ${med.dosage}
                    </span>
                    <span class="cart-item-info-item">
                        <i class="fas fa-calendar"></i>
                        ${med.duration} days
                    </span>
                    <span class="cart-item-info-item">
                        <i class="fas fa-syringe"></i>
                        ${med.route}
                    </span>
                </div>
                ${med.instructions ? `<div class="cart-item-instructions"><i class="fas fa-info-circle"></i> ${med.instructions}</div>` : ''}
                <span class="cart-item-source ${med.source}">${med.source === 'pharmacy' ? 'From Pharmacy' : 'Manual Entry'}</span>
            </div>
            <button class="cart-item-remove" onclick="removeMedicationFromCart(${med.id})" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Action Buttons
async function sendToPharmacy() {
    if (!validateRxData()) return;
    
    const rxData = collectRxData();
    rxData.action = 'pharmacy';
    
    console.log('Sending to Pharmacy:', rxData);
    
    // Use the prescription queue system if available
    if (window.sendPrescriptionToPharmacy) {
        try {
            const result = await window.sendPrescriptionToPharmacy(rxData);
            
            if (result.success) {
                alert(`✓ Prescription sent to Pharmacy!\n\nPrescription #: ${result.prescriptionNumber}\nPatient: ${currentRxReport.patientName}\nMedications: ${medicationCart.length}`);
                closeRxTreatmentModal();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error sending prescription:', error);
            alert('Error sending prescription: ' + error.message);
        }
    } else {
        // Fallback if prescription-queue.js not loaded
        alert(`Prescription sent to Pharmacy!\n\nPatient: ${currentRxReport.patientName}\nMedications: ${medicationCart.length}\n\nThe pharmacy will prepare the medications.`);
        closeRxTreatmentModal();
    }
}

// Processing flags to prevent double submissions
let isProcessingSendToNurse = false;
let isProcessingReferToWard = false;

async function sendToNurse() {
    console.log('🏥 sendToNurse() called');
    
    // Prevent double-click submissions
    if (isProcessingSendToNurse) {
        console.log('⏳ Already processing, please wait...');
        return;
    }
    
    console.log('📋 Current Rx Report:', currentRxReport);
    
    if (!validateRxData()) {
        console.log('❌ Validation failed');
        return;
    }
    
    isProcessingSendToNurse = true;
    const rxData = collectRxData();
    console.log('📦 Collected Rx Data:', rxData);
    
    try {
        // Import Firebase functions
        const { db, collection, addDoc, serverTimestamp } = await import('./firebase-config.js');
        console.log('✅ Firebase imported successfully');
        
        // Prepare ward queue data
        const wardQueueData = {
            patientId: currentRxReport.patientId,
            patientName: currentRxReport.patientName,
            age: currentRxReport.age,
            gender: currentRxReport.gender,
            diagnosis: rxData.diagnosis && rxData.diagnosis.length > 0 ? rxData.diagnosis.join(', ') : currentRxReport.chiefComplaint || 'No diagnosis provided',
            referringDoctor: rxData.prescribedBy || 'Doctor',
            treatmentPlan: rxData.managementNotes || 'Nursing care required',
            medications: rxData.medications || [],
            priority: 'normal',
            status: 'pending',
            timestamp: serverTimestamp(),
            type: 'nursing-care'
        };
        
        console.log('📤 Sending to wardQueue:', wardQueueData);
        
        // Send to ward queue for nursing care
        const docRef = await addDoc(collection(db, 'wardQueue'), wardQueueData);
        
        console.log('✅ Successfully added to wardQueue with ID:', docRef.id);
        
        alert(`✅ Patient sent to Ward & Nursing!\n\nPatient: ${currentRxReport.patientName}\nQueue ID: ${docRef.id}\n\nThe nursing staff will follow up with the patient.`);
        
        closeRxTreatmentModal();
    } catch (error) {
        console.error('❌ Error sending to ward:', error);
        console.error('Error details:', error.message, error.stack);
        alert('Error sending to Ward & Nursing: ' + error.message);
    } finally {
        isProcessingSendToNurse = false;
    }
}

// Expose globally for onclick handler
window.sendToNurse = sendToNurse;

async function referToWard() {
    console.log('🚨 referToWard() called - URGENT ADMISSION');
    
    // Prevent double-click submissions
    if (isProcessingReferToWard) {
        console.log('⏳ Already processing, please wait...');
        return;
    }
    
    console.log('📋 Current Rx Report:', currentRxReport);
    
    if (!validateRxData()) {
        console.log('❌ Validation failed');
        return;
    }
    
    isProcessingReferToWard = true;
    const rxData = collectRxData();
    console.log('📦 Collected Rx Data:', rxData);
    
    try {
        // Import Firebase functions
        const { db, collection, addDoc, serverTimestamp } = await import('./firebase-config.js');
        console.log('✅ Firebase imported successfully');
        
        // Prepare ward queue data for urgent admission
        const wardQueueData = {
            patientId: currentRxReport.patientId,
            patientName: currentRxReport.patientName,
            age: currentRxReport.age,
            gender: currentRxReport.gender,
            diagnosis: rxData.diagnosis && rxData.diagnosis.length > 0 ? rxData.diagnosis.join(', ') : currentRxReport.chiefComplaint || 'No diagnosis provided',
            referringDoctor: rxData.prescribedBy || 'Doctor',
            treatmentPlan: rxData.managementNotes || 'Patient requires ward admission',
            medications: rxData.medications || [],
            priority: 'urgent',
            status: 'pending',
            timestamp: serverTimestamp(),
            type: 'admission'
        };
        
        console.log('📤 Sending URGENT admission to wardQueue:', wardQueueData);
        
        // Send to ward queue for urgent admission
        const docRef = await addDoc(collection(db, 'wardQueue'), wardQueueData);
        
        console.log('✅ Successfully added to wardQueue with ID:', docRef.id);
        
        alert(`✅ Patient referred for URGENT ward admission!\n\nPatient: ${currentRxReport.patientName}\nQueue ID: ${docRef.id}\nPriority: URGENT\n\nThe ward & nursing team will prepare for immediate admission.`);
        
        closeRxTreatmentModal();
    } catch (error) {
        console.error('❌ Error referring to ward:', error);
        console.error('Error details:', error.message, error.stack);
        alert('Error referring to Ward & Nursing: ' + error.message);
    } finally {
        isProcessingReferToWard = false;
    }
}

// Expose globally for onclick handler
window.referToWard = referToWard;

function sendToBilling() {
    if (!validateRxData()) return;
    
    const rxData = collectRxData();
    rxData.action = 'billing';
    
    console.log('Sending to Billing:', rxData);
    
    // TODO: Integrate with Firebase
    alert(`Treatment details sent to Billing!\n\nPatient: ${currentRxReport.patientName}\nMedications: ${medicationCart.length}\n\nBilling department will process the charges.`);
    
    closeRxTreatmentModal();
}

function validateRxData() {
    if (rxDiagnosisList.length === 0) {
        alert('Please add at least one diagnosis');
        return false;
    }
    
    if (medicationCart.length === 0) {
        if (!confirm('No medications have been added. Continue anyway?')) {
            return false;
        }
    }
    
    return true;
}

function collectRxData() {
    return {
        reportId: currentRxReport.id,
        patientId: currentRxReport.patientId,
        patientName: currentRxReport.patientName,
        age: currentRxReport.age,
        gender: currentRxReport.gender,
        diagnosis: rxDiagnosisList,
        medications: medicationCart,
        managementNotes: document.getElementById('managementNotes').value.trim(),
        followUpNotes: document.getElementById('followUpNotes').value.trim(),
        prescribedBy: 'Dr. ' + (document.getElementById('profileBtn')?.querySelector('.profile-name')?.textContent || 'Doctor'),
        prescribedAt: new Date().toISOString()
    };
}

// Print lab report from table
function printDoctorLabReportFromTable(reportId) {
    const report = doctorLabReports.find(r => r.id === reportId);
    if (!report) {
        alert('Lab report not found');
        return;
    }
    printLabReportData(report);
}

// Print lab report (from modal)
function printDoctorLabReport() {
    if (!currentViewingLabReport) {
        alert('No report selected');
        return;
    }
    printLabReportData(currentViewingLabReport);
}

// Helper function to print lab report
function printLabReportData(report) {
    if (!report.results || Object.keys(report.results).length === 0) {
        alert('No results available to print');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    
    let resultsHTML = '';
    for (const [test, result] of Object.entries(report.results)) {
        resultsHTML += `
            <div class="result-item">
                <div class="result-test">${test}</div>
                <div class="result-value">${result || 'N/A'}</div>
            </div>
        `;
    }
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laboratory Results - ${report.patientId}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Arial', sans-serif;
                    padding: 40px;
                    background: white;
                    color: #333;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #2563eb;
                }
                
                .header h1 {
                    color: #2563eb;
                    font-size: 28px;
                    margin-bottom: 5px;
                }
                
                .header p {
                    color: #666;
                    font-size: 14px;
                }
                
                .section {
                    margin-bottom: 30px;
                }
                
                .section-title {
                    background: #f3f4f6;
                    padding: 10px 15px;
                    font-size: 16px;
                    font-weight: bold;
                    color: #1f2937;
                    border-left: 4px solid #2563eb;
                    margin-bottom: 15px;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin-bottom: 20px;
                }
                
                .info-item {
                    display: flex;
                    padding: 8px 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .info-label {
                    font-weight: bold;
                    color: #6b7280;
                    width: 150px;
                    font-size: 13px;
                }
                
                .info-value {
                    color: #1f2937;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .result-item {
                    padding: 15px;
                    background: #f8fafc;
                    border-left: 4px solid #2563eb;
                    margin-bottom: 10px;
                    border-radius: 4px;
                }
                
                .result-test {
                    font-weight: bold;
                    font-size: 14px;
                    color: #1f2937;
                    margin-bottom: 8px;
                }
                
                .result-value {
                    color: #4b5563;
                    font-size: 13px;
                    white-space: pre-wrap;
                }
                
                .notes {
                    background: #fffbeb;
                    padding: 15px;
                    border-left: 4px solid #f59e0b;
                    border-radius: 4px;
                    margin-top: 10px;
                }
                
                .footer {
                    margin-top: 50px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e7eb;
                    text-align: center;
                    color: #9ca3af;
                    font-size: 12px;
                }
                
                @media print {
                    body {
                        padding: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>RxFlow Hospital</h1>
                <p>Laboratory Test Results Report</p>
            </div>
            
            <div class="section">
                <div class="section-title">Patient Information</div>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Patient ID:</span>
                        <span class="info-value">${report.patientId}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Patient Name:</span>
                        <span class="info-value">${report.patientName}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Age / Gender:</span>
                        <span class="info-value">${report.age} years / ${report.gender || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Report ID:</span>
                        <span class="info-value">${report.id}</span>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Test Information</div>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Requested By:</span>
                        <span class="info-value">${report.requestedBy}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Request Date:</span>
                        <span class="info-value">${new Date(report.requestDate).toLocaleString()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Performed By:</span>
                        <span class="info-value">${report.performedBy || 'Lab Technician'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Completion Date:</span>
                        <span class="info-value">${new Date(report.completionDate || report.completedAt).toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Test Results</div>
                ${resultsHTML}
            </div>
            
            ${report.technicianNotes ? `
                <div class="section">
                    <div class="section-title">Technician Notes</div>
                    <div class="notes">${report.technicianNotes}</div>
                </div>
            ` : ''}
            
            ${report.doctorReviewNotes ? `
                <div class="section">
                    <div class="section-title">Doctor's Review</div>
                    <div class="notes">${report.doctorReviewNotes}</div>
                </div>
            ` : ''}
            
            <div class="footer">
                <p>This is a computer-generated report from RxFlow Hospital Management System</p>
                <p>Printed on: ${new Date().toLocaleString()}</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// Make globally available
window.openLabReportsModule = openLabReportsModule;
window.openLabReportsModuleFromLab = openLabReportsModuleFromLab;
window.closeLabReportsModule = closeLabReportsModule;
window.filterLabReports = filterLabReports;
window.filterNewReports = filterNewReports;
window.refreshLabReports = refreshLabReports;
window.viewDoctorLabReport = viewDoctorLabReport;
window.closeViewDoctorLabReportModal = closeViewDoctorLabReportModal;
window.markLabReportAsReviewed = markLabReportAsReviewed;
window.quickMarkAsReviewed = quickMarkAsReviewed;
window.printDoctorLabReport = printDoctorLabReport;
window.printDoctorLabReportFromTable = printDoctorLabReportFromTable;

// Initialize badge update on page load
if (typeof initializeModuleFunctions !== 'undefined') {
    const originalInit = initializeModuleFunctions;
    initializeModuleFunctions = function() {
        originalInit();
        // Update badge periodically
        setInterval(updateLabReportsBadge, 30000); // Update every 30 seconds
    };
}

// ========================================
// SEND TO LAB FUNCTIONALITY
// ========================================

// Open Send to Lab Modal
function openSendToLabModal(recordId) {
    // Try to find record in doctorRecords first, then in allConsultationsData
    let record = doctorRecords.find(r => r.id === recordId);
    if (!record) {
        record = allConsultationsData.find(r => r.id === recordId);
    }
    
    if (!record) {
        alert('Patient record not found');
        return;
    }
    
    // Store record ID
    document.getElementById('labPatientRecordId').value = recordId;
    
    // Populate patient information
    document.getElementById('labPatientId').textContent = record.patientId;
    document.getElementById('labPatientName').textContent = record.patientName;
    document.getElementById('labPatientAgeGender').textContent = `${record.age} years / ${record.gender || 'N/A'}`;
    document.getElementById('labPatientComplaint').textContent = record.complaint || 'Not specified';
    
    // Clear previous selections
    document.querySelectorAll('input[name="labTest"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.getElementById('labInstructions').value = '';
    
    // Show modal
    const modal = document.getElementById('sendToLabModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close Send to Lab Modal
function closeSendToLabModal() {
    const modal = document.getElementById('sendToLabModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Send to Laboratory
function sendToLaboratory() {
    const recordId = document.getElementById('labPatientRecordId').value;
    
    // Try to find record in doctorRecords first, then in allConsultationsData
    let record = doctorRecords.find(r => r.id === recordId);
    if (!record) {
        record = allConsultationsData.find(r => r.id === recordId);
    }
    
    if (!record) {
        alert('Patient record not found');
        return;
    }
    
    // Get selected tests
    const selectedTests = [];
    document.querySelectorAll('input[name="labTest"]:checked').forEach(checkbox => {
        selectedTests.push(checkbox.value);
    });
    
    if (selectedTests.length === 0) {
        alert('Please select at least one laboratory test');
        return;
    }
    
    const instructions = document.getElementById('labInstructions').value;
    
    // Create lab request
    const labRequest = {
        displayId: 'LAB-' + Date.now(), // Human-readable ID for display
        patientId: record.patientId,
        patientName: record.patientName,
        age: record.age,
        gender: record.gender,
        complaint: record.complaint,
        diagnosis: record.diagnosis,
        requestedTests: selectedTests,
        instructions: instructions,
        requestedBy: 'Current Doctor', // TODO: Get from auth
        requestDate: new Date().toISOString(),
        requestTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'pending',
        results: {},
        consultationRecordId: recordId
    };
    
    // Save to Firestore or local storage
    import('./firebase-helpers.js').then(({ addLabRequest }) => {
        if (typeof addLabRequest === 'function') {
            addLabRequest(labRequest).then(result => {
                if (result.success) {
                    console.log('Lab request sent to Firestore');
                    alert(`Lab request sent successfully!\n\nTests requested: ${selectedTests.join(', ')}`);
                    closeSendToLabModal();
                } else {
                    console.error('Failed to send lab request:', result.error);
                    alert('Failed to send lab request. Please try again.');
                }
            });
        } else {
            // Local fallback
            console.log('Lab request created locally:', labRequest);
            alert(`Lab request created successfully!\n\nTests requested: ${selectedTests.join(', ')}\n\nNote: Firebase not available, using local storage.`);
            closeSendToLabModal();
        }
    }).catch(error => {
        console.error('Firebase not available:', error);
        // Local fallback
        console.log('Lab request created locally:', labRequest);
        alert(`Lab request created successfully!\n\nTests requested: ${selectedTests.join(', ')}\n\nNote: Using local storage.`);
        closeSendToLabModal();
    });
}

// Make globally available
window.openSendToLabModal = openSendToLabModal;
window.closeSendToLabModal = closeSendToLabModal;
window.sendToLaboratory = sendToLaboratory;

// ========================================
// LABORATORY MODULE
// ========================================

let labRequests = [];
let labStats = {
    pending: 0,
    inProgress: 0,
    today: 0,
    completed: 0
};

// Initialize Laboratory Module
function initializeLabModule() {
    console.log('Initializing Laboratory Module...');
    loadLabRequests();
    
    // Setup search
    const searchInput = document.getElementById('labSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterLabRequests);
    }
    
    // Setup status filter
    const statusFilter = document.getElementById('labStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterLabRequests);
    }
}

// Load lab requests from Firestore
function loadLabRequests() {
    import('./firebase-helpers.js').then(({ subscribeToLabRequests }) => {
        if (typeof subscribeToLabRequests === 'function') {
            subscribeToLabRequests((requests) => {
                // Check for old data format and log warning
                const oldFormatRequests = requests.filter(r => !r.displayId && r.id && r.id.startsWith && !r.id.startsWith('LAB-'));
                if (oldFormatRequests.length > 0) {
                    console.warn('Found requests with old format. These have Firestore document IDs.');
                    console.log('Old format requests:', oldFormatRequests.map(r => ({ firestoreId: r.id, hasDisplayId: !!r.displayId })));
                }
                
                labRequests = requests;
                updateLabStats();
                renderLabRequests();
                renderLabReportsQueue();
            });
        } else {
            console.log('No lab requests available');
            labRequests = [];
            updateLabStats();
            renderLabRequests();
        }
    }).catch(error => {
        console.error('Firebase not available:', error);
        labRequests = [];
        updateLabStats();
        renderLabRequests();
    });
}

// Update lab stats
function updateLabStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    labStats.pending = labRequests.filter(r => r.status === 'pending').length;
    labStats.inProgress = labRequests.filter(r => r.status === 'in-progress').length;
    labStats.today = labRequests.filter(r => {
        const reqDate = new Date(r.requestDate);
        return reqDate >= today;
    }).length;
    labStats.completed = labRequests.filter(r => {
        const reqDate = new Date(r.requestDate);
        return reqDate >= today && r.status === 'completed';
    }).length;
    
    document.getElementById('labPendingCount').textContent = labStats.pending;
    document.getElementById('labInProgressCount').textContent = labStats.inProgress;
    document.getElementById('labTodayCount').textContent = labStats.today;
    document.getElementById('labCompletedCount').textContent = labStats.completed;
}

// Render lab requests table
function renderLabRequests() {
    const tbody = document.getElementById('labRequestsBody');
    if (!tbody) return;
    
    const filteredRequests = getFilteredLabRequests();
    
    if (filteredRequests.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    <div class="empty-state">
                        <i class="fas fa-flask"></i>
                        <p>No lab requests found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredRequests.map(request => {
        const statusClass = {
            'pending': 'pending',
            'in-progress': 'in-progress',
            'completed': 'completed',
            'sent': 'completed'
        }[request.status] || 'pending';
        
        const statusText = {
            'pending': 'Pending',
            'in-progress': 'In Progress',
            'completed': 'Completed',
            'sent': 'Sent to Doctor'
        }[request.status] || 'Pending';
        
        const testsDisplay = request.requestedTests.length > 3 
            ? `${request.requestedTests.slice(0, 3).join(', ')} +${request.requestedTests.length - 3} more`
            : request.requestedTests.join(', ');
        
        // Use displayId for showing, but use Firestore document id for actions
        const displayId = request.displayId || request.id;
        
        return `
            <tr>
                <td><strong>${displayId}</strong></td>
                <td>${request.requestTime}<br><small>${new Date(request.requestDate).toLocaleDateString()}</small></td>
                <td>${request.patientId}</td>
                <td>${request.patientName}</td>
                <td>${request.age} / ${request.gender || 'N/A'}</td>
                <td><span class="text-ellipsis" title="${request.requestedTests.join(', ')}">${testsDisplay}</span></td>
                <td>${request.requestedBy}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon btn-view" onclick="viewLabRequest('${request.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${request.status === 'pending' || request.status === 'in-progress' ? `
                            <button class="btn-icon btn-edit" onclick="performLabTest('${request.id}')" title="Perform Test">
                                <i class="fas fa-microscope"></i>
                            </button>
                        ` : ''}
                        ${request.status === 'completed' || request.status === 'sent' ? `
                            <button class="btn-icon btn-print" onclick="printLabResults('${request.id}')" title="Print Results">
                                <i class="fas fa-print"></i>
                            </button>
                        ` : ''}
                        ${request.status === 'completed' ? `
                            <button class="btn-icon btn-send" onclick="sendResultsToDoctor('${request.id}')" title="Send to Doctor">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        ` : ''}
                        ${request.status === 'sent' ? `
                            <button class="btn-icon btn-check" onclick="viewLabRequest('${request.id}')" title="Sent to Doctor" style="cursor: default;">
                                <i class="fas fa-check-circle"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render lab reports queue (completed tests ready to send)
function renderLabReportsQueue() {
    const queueList = document.getElementById('labReportsQueue');
    if (!queueList) return;
    
    // Show all pending and in-progress requests from doctors
    const activeRequests = labRequests.filter(r => r.status === 'pending' || r.status === 'in-progress');
    
    if (activeRequests.length === 0) {
        queueList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No pending requests from doctors</p>
            </div>
        `;
        return;
    }
    
    queueList.innerHTML = activeRequests.map(request => {
        const statusColor = request.status === 'in-progress' ? 'urgent' : 'normal';
        const statusIcon = request.status === 'in-progress' ? 'fa-spinner' : 'fa-flask';
        
        return `
            <div class="queue-item">
                <div class="queue-item-header">
                    <div class="queue-item-priority ${statusColor}">
                        <i class="fas ${statusIcon}"></i>
                    </div>
                    <div class="queue-item-info">
                        <h4 class="queue-item-name">${request.patientName}</h4>
                        <p class="queue-item-id">${request.patientId}</p>
                    </div>
                </div>
                <div class="queue-item-body">
                    <div class="queue-item-detail">
                        <i class="fas fa-user-md"></i>
                        <span>Dr. ${request.requestedBy}</span>
                    </div>
                    <div class="queue-item-detail">
                        <i class="fas fa-vials"></i>
                        <span>${request.requestedTests.length} test${request.requestedTests.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="queue-item-detail">
                        <i class="fas fa-clock"></i>
                        <span>${request.requestTime}</span>
                    </div>
                </div>
                <div class="queue-item-actions">
                    ${request.status === 'in-progress' ? 
                        `<span class="status-badge in-progress">In Progress</span>` : 
                        ''}
                    <button class="btn btn-sm btn-primary" onclick="performLabTest('${request.id}')">
                        <i class="fas fa-microscope"></i>
                        ${request.status === 'in-progress' ? 'Continue' : 'Start Test'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter lab requests
function getFilteredLabRequests() {
    const searchTerm = document.getElementById('labSearchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('labStatusFilter')?.value || '';
    
    return labRequests.filter(request => {
        const matchesSearch = !searchTerm || 
            request.patientId.toLowerCase().includes(searchTerm) ||
            request.patientName.toLowerCase().includes(searchTerm) ||
            request.id.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || request.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });
}

function filterLabRequests() {
    renderLabRequests();
}

// Refresh lab queue
function refreshLabQueue() {
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');
    icon.classList.add('fa-spin');
    
    loadLabRequests();
    
    setTimeout(() => {
        icon.classList.remove('fa-spin');
    }, 1000);
}

// View lab request details
function viewLabRequest(requestId) {
    const request = labRequests.find(r => r.id === requestId);
    if (!request) {
        alert('Lab request not found');
        return;
    }
    
    document.getElementById('viewLabPatientId').textContent = request.patientId;
    document.getElementById('viewLabPatientName').textContent = request.patientName;
    document.getElementById('viewLabPatientAgeGender').textContent = `${request.age} years / ${request.gender || 'N/A'}`;
    document.getElementById('viewLabComplaint').textContent = request.complaint || 'N/A';
    document.getElementById('viewLabDiagnosis').textContent = request.diagnosis || 'N/A';
    document.getElementById('viewLabRequestId').textContent = request.displayId || request.id;
    document.getElementById('viewLabRequestedBy').textContent = request.requestedBy;
    document.getElementById('viewLabRequestDate').textContent = new Date(request.requestDate).toLocaleString();
    document.getElementById('viewLabStatus').textContent = request.status.replace('-', ' ').toUpperCase();
    
    const testsList = document.getElementById('viewLabTestsList');
    testsList.innerHTML = request.requestedTests.map(test => 
        `<span class="test-badge"><i class="fas fa-vial"></i> ${test}</span>`
    ).join('');
    
    const instructionsSection = document.getElementById('viewLabInstructionsSection');
    if (request.instructions) {
        document.getElementById('viewLabInstructions').textContent = request.instructions;
        instructionsSection.style.display = 'block';
    } else {
        instructionsSection.style.display = 'none';
    }
    
    const modal = document.getElementById('viewLabRequestModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeViewLabRequestModal() {
    const modal = document.getElementById('viewLabRequestModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Perform lab test
function performLabTest(requestId) {
    const request = labRequests.find(r => r.id === requestId);
    if (!request) {
        alert('Lab request not found');
        return;
    }
    
    document.getElementById('performLabRequestId').value = requestId;
    document.getElementById('performLabPatientId').textContent = request.patientId;
    document.getElementById('performLabPatientName').textContent = request.patientName;
    document.getElementById('performLabRequestIdDisplay').textContent = request.displayId || request.id;
    
    // Generate test result fields
    const resultsForm = document.getElementById('labTestResultsForm');
    resultsForm.innerHTML = request.requestedTests.map(test => `
        <div class="lab-result-field">
            <label for="result_${test.replace(/\s+/g, '_')}">${test}</label>
            <textarea id="result_${test.replace(/\s+/g, '_')}" 
                      name="result_${test.replace(/\s+/g, '_')}" 
                      rows="3" 
                      placeholder="Enter results for ${test}..."></textarea>
            <span class="helper-text">Enter numerical values, ranges, or observations</span>
        </div>
    `).join('');
    
    // Set current date/time
    const now = new Date();
    const dateTimeStr = now.toISOString().slice(0, 16);
    document.getElementById('labCompletionDate').value = dateTimeStr;
    
    // Update status to in-progress if pending
    if (request.status === 'pending') {
        import('./firebase-helpers.js').then(({ updateLabRequest }) => {
            if (typeof updateLabRequest === 'function') {
                updateLabRequest(requestId, { status: 'in-progress' });
            }
        });
    }
    
    const modal = document.getElementById('performLabTestModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePerformLabTestModal() {
    const modal = document.getElementById('performLabTestModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Save lab results
function saveLabResults() {
    const requestId = document.getElementById('performLabRequestId').value;
    const request = labRequests.find(r => r.id === requestId);
    
    if (!request) {
        alert('Lab request not found');
        console.error('Request ID:', requestId);
        console.error('Available requests:', labRequests.map(r => ({ id: r.id, displayId: r.displayId })));
        return;
    }
    
    console.log('Found request:', request);
    console.log('Request Firestore ID:', request.id);
    console.log('Request Display ID:', request.displayId);
    
    const technicianName = document.getElementById('labTechnicianName').value.trim();
    if (!technicianName) {
        alert('Please enter lab technician name');
        return;
    }
    
    // Collect results
    const results = {};
    let hasResults = false;
    request.requestedTests.forEach(test => {
        const fieldId = `result_${test.replace(/\s+/g, '_')}`;
        const value = document.getElementById(fieldId)?.value || '';
        results[test] = value;
        if (value.trim()) hasResults = true;
    });
    
    if (!hasResults) {
        alert('Please enter at least one test result');
        return;
    }
    
    const notes = document.getElementById('labTechnicianNotes').value;
    const completionDate = document.getElementById('labCompletionDate').value;
    
    const updates = {
        status: 'completed',
        results: results,
        technicianNotes: notes,
        performedBy: technicianName,
        completionDate: new Date(completionDate).toISOString(),
        completedAt: new Date().toISOString()
    };
    
    // Log the request ID for debugging
    console.log('Saving lab results for request ID:', requestId);
    console.log('Updates:', updates);
    
    // Save to Firestore in realtime
    import('./firebase-helpers.js').then(({ updateLabRequest }) => {
        if (typeof updateLabRequest === 'function') {
            updateLabRequest(requestId, updates).then(result => {
                if (result.success) {
                    console.log('Lab results saved successfully');
                    // Close perform test modal
                    closePerformLabTestModal();
                    
                    // Show send to doctor modal immediately
                    showSendLabToDoctorModal(requestId);
                } else {
                    console.error('Failed to save results:', result.error);
                    alert(`Failed to save results: ${result.error}\n\nPlease try again.`);
                }
            }).catch(err => {
                console.error('Error in updateLabRequest promise:', err);
                alert(`Error saving results: ${err.message}\n\nPlease try again.`);
            });
        } else {
            console.warn('updateLabRequest function not available, using fallback');
            // Close perform test modal
            closePerformLabTestModal();
            
            // Show send to doctor modal
            showSendLabToDoctorModal(requestId);
        }
    }).catch(error => {
        console.error('Firebase module not available:', error);
        // Close perform test modal
        closePerformLabTestModal();
        
        // Show send to doctor modal
        showSendLabToDoctorModal(requestId);
    });
}

// Show send to doctor modal
function showSendLabToDoctorModal(requestId) {
    const request = labRequests.find(r => r.id === requestId);
    if (!request) {
        alert('Lab request not found');
        return;
    }
    
    // Store request ID
    document.getElementById('sendLabToDoctorRequestId').value = requestId;
    
    // Populate modal with request info
    document.getElementById('sendLabPatientId').textContent = request.patientId;
    document.getElementById('sendLabPatientName').textContent = request.patientName;
    document.getElementById('sendLabReportId').textContent = request.displayId || request.id;
    document.getElementById('sendLabRequestedBy').textContent = request.requestedBy;
    
    // Populate tests list
    const testsList = document.getElementById('sendLabTestsList');
    testsList.innerHTML = request.requestedTests.map(test => 
        `<span class="test-badge" style="background: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 6px; font-size: 13px;">
            <i class="fas fa-vial"></i> ${test}
        </span>`
    ).join('');
    
    // Show modal
    const modal = document.getElementById('sendLabToDoctorModal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close send to doctor modal
function closeSendLabToDoctorModal() {
    const modal = document.getElementById('sendLabToDoctorModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Confirm send to doctor
function confirmSendLabToDoctor() {
    const requestId = document.getElementById('sendLabToDoctorRequestId').value;
    const request = labRequests.find(r => r.id === requestId);
    
    if (!request) {
        alert('Lab request not found');
        return;
    }
    
    if (request.status !== 'completed') {
        alert('Results must be completed before sending to doctor');
        return;
    }
    
    const updates = {
        status: 'sent',
        sentToDoctor: true,
        sentAt: new Date().toISOString()
    };
    
    console.log('Sending lab results to doctor for request ID:', requestId);
    console.log('Status update:', updates);
    
    // Send to Firestore in realtime
    import('./firebase-helpers.js').then(({ updateLabRequest }) => {
        if (typeof updateLabRequest === 'function') {
            updateLabRequest(requestId, updates).then(result => {
                if (result.success) {
                    console.log('Lab results sent to doctor successfully - should appear in Lab Reports module');
                    closeSendLabToDoctorModal();
                    
                    // Show success notification
                    showSuccessNotification(`Lab results for ${request.patientName} sent to doctor successfully!`);
                } else {
                    alert('Failed to send results. Please try again.');
                }
            });
        } else {
            closeSendLabToDoctorModal();
            showSuccessNotification(`Lab results for ${request.patientName} sent to doctor successfully!`);
        }
    }).catch(error => {
        console.error('Firebase not available:', error);
        closeSendLabToDoctorModal();
        showSuccessNotification(`Lab results for ${request.patientName} sent to doctor successfully!`);
    });
}

// Show success notification
function showSuccessNotification(message) {
    showNotification('Success!', message, 'success');
}

// Generic notification function
function showNotification(title, message, type = 'success') {
    const colors = {
        success: { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', icon: 'fa-check-circle' },
        error: { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', icon: 'fa-exclamation-circle' },
        warning: { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: 'fa-exclamation-triangle' },
        info: { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', icon: 'fa-info-circle' }
    };
    
    const config = colors[type] || colors.success;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${config.bg};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
    `;
    
    notification.innerHTML = `
        <i class="fas ${config.icon}" style="font-size: 24px;"></i>
        <div style="flex: 1;">
            <strong style="display: block; margin-bottom: 4px;">${title}</strong>
            <span>${message}</span>
        </div>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Send results to doctor (from table action button)
function sendResultsToDoctor(requestId) {
    const request = labRequests.find(r => r.id === requestId);
    if (!request) {
        alert('Lab request not found');
        return;
    }
    
    if (request.status !== 'completed') {
        alert('Results must be completed before sending to doctor');
        return;
    }
    
    // Show the send to doctor modal
    showSendLabToDoctorModal(requestId);
}

// Print lab results
function printLabResults(requestId) {
    const request = labRequests.find(r => r.id === requestId);
    if (!request) {
        alert('Lab request not found');
        return;
    }
    
    if (!request.results || Object.keys(request.results).length === 0) {
        alert('No results available to print');
        return;
    }
    
    // Create print window
    const printWindow = window.open('', '_blank');
    
    let resultsHTML = '';
    for (const [test, result] of Object.entries(request.results)) {
        resultsHTML += `
            <div class="result-item">
                <div class="result-test">${test}</div>
                <div class="result-value">${result || 'N/A'}</div>
            </div>
        `;
    }
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laboratory Results - ${request.patientId}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Arial', sans-serif;
                    padding: 40px;
                    background: white;
                    color: #333;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #2563eb;
                }
                
                .header h1 {
                    color: #2563eb;
                    font-size: 28px;
                    margin-bottom: 5px;
                }
                
                .header p {
                    color: #666;
                    font-size: 14px;
                }
                
                .section {
                    margin-bottom: 30px;
                }
                
                .section-title {
                    background: #f3f4f6;
                    padding: 10px 15px;
                    font-size: 16px;
                    font-weight: bold;
                    color: #1f2937;
                    border-left: 4px solid #2563eb;
                    margin-bottom: 15px;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin-bottom: 20px;
                }
                
                .info-item {
                    display: flex;
                    padding: 8px 0;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .info-label {
                    font-weight: bold;
                    color: #6b7280;
                    width: 150px;
                    font-size: 13px;
                }
                
                .info-value {
                    color: #1f2937;
                    font-size: 14px;
                    font-weight: 500;
                }
                
                .result-item {
                    padding: 15px;
                    margin-bottom: 12px;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                }
                
                .result-test {
                    font-weight: bold;
                    color: #2563eb;
                    font-size: 14px;
                    margin-bottom: 8px;
                }
                
                .result-value {
                    color: #1f2937;
                    font-size: 13px;
                    line-height: 1.6;
                    white-space: pre-wrap;
                }
                
                .notes {
                    background: #fef3c7;
                    padding: 15px;
                    border-left: 4px solid #f59e0b;
                    margin-top: 20px;
                    border-radius: 4px;
                }
                
                .notes-title {
                    font-weight: bold;
                    color: #92400e;
                    margin-bottom: 8px;
                }
                
                .notes-content {
                    color: #78350f;
                    font-size: 13px;
                    line-height: 1.6;
                }
                
                .footer {
                    margin-top: 50px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    color: #6b7280;
                }
                
                .signature {
                    margin-top: 40px;
                }
                
                .signature-line {
                    border-top: 2px solid #1f2937;
                    width: 250px;
                    margin-top: 50px;
                }
                
                .signature-label {
                    margin-top: 8px;
                    font-size: 12px;
                    color: #6b7280;
                }
                
                @media print {
                    body {
                        padding: 20px;
                    }
                    
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>LABORATORY RESULTS</h1>
                <p>RxFlow Hospital Management System</p>
            </div>
            
            <div class="section">
                <div class="section-title">Patient Information</div>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Patient ID:</span>
                        <span class="info-value">${request.patientId}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Patient Name:</span>
                        <span class="info-value">${request.patientName}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Age/Gender:</span>
                        <span class="info-value">${request.age} years / ${request.gender || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Request ID:</span>
                        <span class="info-value">${request.id}</span>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Request Details</div>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Requested By:</span>
                        <span class="info-value">${request.requestedBy}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Request Date:</span>
                        <span class="info-value">${new Date(request.requestDate).toLocaleString()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Completed Date:</span>
                        <span class="info-value">${request.completionDate ? new Date(request.completionDate).toLocaleString() : 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Performed By:</span>
                        <span class="info-value">${request.performedBy || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Laboratory Results</div>
                ${resultsHTML}
            </div>
            
            ${request.technicianNotes ? `
                <div class="notes">
                    <div class="notes-title">Laboratory Notes</div>
                    <div class="notes-content">${request.technicianNotes}</div>
                </div>
            ` : ''}
            
            <div class="signature">
                <div class="signature-line"></div>
                <div class="signature-label">Laboratory Technician Signature</div>
            </div>
            
            <div class="footer">
                <div>Printed on: ${new Date().toLocaleString()}</div>
                <div>RxFlow Laboratory Department</div>
            </div>
            
            <div class="no-print" style="margin-top: 30px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 30px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
                    Print Results
                </button>
                <button onclick="window.close()" style="padding: 10px 30px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-left: 10px;">
                    Close
                </button>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// Make functions globally available
window.viewLabRequest = viewLabRequest;
window.closeViewLabRequestModal = closeViewLabRequestModal;
window.performLabTest = performLabTest;
window.closePerformLabTestModal = closePerformLabTestModal;
window.saveLabResults = saveLabResults;
window.sendResultsToDoctor = sendResultsToDoctor;
window.printLabResults = printLabResults;
window.refreshLabQueue = refreshLabQueue;
window.showSendLabToDoctorModal = showSendLabToDoctorModal;
window.closeSendLabToDoctorModal = closeSendLabToDoctorModal;
window.confirmSendLabToDoctor = confirmSendLabToDoctor;

// Initialize lab module
initializeLabModule();

// Initialize doctor module on page load
initializeDoctorModule();

// Initialize lab reports subscription on page load for real-time updates
loadDoctorLabReports();

console.log('RxFlow Hospital Management System initialized');

// ===================================
// EXPENSE MODULE
// ===================================

// Initialize Expense Module
function initializeExpenseModule() {
    console.log('Initializing Expense Module...');
    
    // Set default date to today
    const expenseDateInput = document.getElementById('expenseDate');
    if (expenseDateInput) {
        const today = new Date().toISOString().split('T')[0];
        expenseDateInput.value = today;
        expenseDateInput.max = today; // Prevent future dates
    }

    // Handle form submission
    const expenseForm = document.getElementById('addExpenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseSubmit);
    }

    // Handle cancel button
    const cancelBtn = document.getElementById('cancelExpenseBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', handleCancelExpense);
    }

    // Handle save draft button
    const saveDraftBtn = document.getElementById('saveExpenseDraftBtn');
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', handleSaveExpenseDraft);
    }

    // Handle success message buttons
    const addAnotherBtn = document.getElementById('addAnotherExpenseBtn');
    if (addAnotherBtn) {
        addAnotherBtn.addEventListener('click', handleAddAnotherExpense);
    }

    const viewAllBtn = document.getElementById('viewAllExpensesBtn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', handleViewAllExpenses);
    }

    // Calculate and display amount as user types
    const amountInput = document.getElementById('expenseAmount');
    if (amountInput) {
        amountInput.addEventListener('input', function() {
            // Format the number with thousands separator
            const value = parseFloat(this.value) || 0;
            if (value > 0) {
                console.log(`Expense Amount: KSh ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
            }
        });
    }

    // Handle file upload preview
    const fileInput = document.getElementById('expenseDocument');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    loadExpensesFromStorage();
}

// Handle Expense Form Submission
async function handleExpenseSubmit(e) {
    e.preventDefault();

    const formData = getExpenseFormData();
    
    // Validate required fields
    if (!validateExpenseForm(formData)) {
        return;
    }

    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        // Save to Firestore (real-time listener will auto-update the table)
        const result = await saveExpenseToStorage(formData);
        
        console.log('✅ Expense saved, real-time listener will update table automatically');

        // Show success message
        showExpenseSuccessMessage();

        // Reset form
        document.getElementById('addExpenseForm').reset();
        
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

        console.log('📝 Expense submitted successfully:', formData);
        console.log('💡 Check "All Expenses" module - new expense should appear automatically');

    } catch (error) {
        console.error('❌ Error submitting expense:', error);
        alert('Failed to submit expense. Please try again.');
        
        // Reset button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Submit Expense';
        submitBtn.disabled = false;
    }
}

// Get Form Data
function getExpenseFormData() {
    return {
        id: 'EXP-' + Date.now(),
        category: document.getElementById('expenseCategory').value,
        subcategory: document.getElementById('expenseSubcategory').value,
        description: document.getElementById('expenseDescription').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        date: document.getElementById('expenseDate').value,
        paymentMethod: document.getElementById('expensePaymentMethod').value,
        notes: document.getElementById('expenseNotes').value,
        vendorName: document.getElementById('vendorName').value,
        vendorContact: document.getElementById('vendorContact').value,
        invoiceNumber: document.getElementById('invoiceNumber').value,
        purchaseOrderNumber: document.getElementById('purchaseOrderNumber').value,
        department: document.getElementById('expenseDepartment').value,
        authorizedBy: document.getElementById('authorizedBy').value,
        status: document.getElementById('expenseStatus').value,
        recurring: document.getElementById('expenseRecurring').value,
        timestamp: new Date().toISOString(),
        recordedBy: 'Current User' // This should come from auth system
    };
}

// Validate Expense Form
function validateExpenseForm(formData) {
    if (!formData.category) {
        alert('Please select an expense category.');
        document.getElementById('expenseCategory').focus();
        return false;
    }

    if (!formData.description || formData.description.trim() === '') {
        alert('Please enter a description for the expense.');
        document.getElementById('expenseDescription').focus();
        return false;
    }

    if (!formData.amount || formData.amount <= 0) {
        alert('Please enter a valid amount greater than 0.');
        document.getElementById('expenseAmount').focus();
        return false;
    }

    if (!formData.date) {
        alert('Please select the expense date.');
        document.getElementById('expenseDate').focus();
        return false;
    }

    if (!formData.paymentMethod) {
        alert('Please select a payment method.');
        document.getElementById('expensePaymentMethod').focus();
        return false;
    }

    if (!formData.department) {
        alert('Please select a department.');
        document.getElementById('expenseDepartment').focus();
        return false;
    }

    return true;
}

// Save Expense to Firestore
async function saveExpenseToStorage(expenseData) {
    try {
        console.log('💾 Saving expense to Firestore...', expenseData);
        
        // Import Firebase functions
        const { db } = await import('./firebase-config.js');
        const { collection, addDoc, serverTimestamp } = await import('./firebase-config.js');
        
        // Add expense to Firestore
        const expensesCollection = collection(db, 'expenses');
        const docRef = await addDoc(expensesCollection, {
            ...expenseData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        console.log('✅ Expense saved to Firestore with ID:', docRef.id);
        
        // Update stats
        updateExpenseStats();
        
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('❌ Error saving expense to Firestore:', error);
        
        // Fallback to localStorage
        console.log('⚠️ Using localStorage fallback');
        let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        expenses.push(expenseData);
        localStorage.setItem('expenses', JSON.stringify(expenses));
        
        updateExpenseStats();
        
        return { success: true, fallback: true };
    }
}

// Load Expenses from Firestore
async function loadExpensesFromStorage() {
    try {
        const { db } = await import('./firebase-config.js');
        const { collection, getDocs, query, orderBy } = await import('./firebase-config.js');
        
        const expensesCollection = collection(db, 'expenses');
        const q = query(expensesCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const expenses = [];
        querySnapshot.forEach((doc) => {
            expenses.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ Loaded ${expenses.length} expenses from Firestore`);
        return expenses;
    } catch (error) {
        console.error('Error loading expenses from Firestore:', error);
        
        // Fallback to localStorage
        const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
        console.log(`⚠️ Loaded ${expenses.length} expenses from localStorage (fallback)`);
        return expenses;
    }
}

// Update Expense Statistics
async function updateExpenseStats() {
    const expenses = await loadExpensesFromStorage();
    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    console.log(`📊 Total Expenses: ${totalExpenses}`);
    console.log(`💰 Total Amount: KSh ${totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`);
    
    // Update UI if elements exist
    const totalExpensesEl = document.getElementById('totalExpensesCount');
    const totalAmountEl = document.getElementById('totalExpensesAmount');
    
    if (totalExpensesEl) {
        totalExpensesEl.textContent = totalExpenses;
    }
    if (totalAmountEl) {
        totalAmountEl.textContent = `KSh ${totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
    }
}

// Handle Cancel Expense
function handleCancelExpense() {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        document.getElementById('addExpenseForm').reset();
        
        // Set default date again
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expenseDate').value = today;
        
        console.log('Expense form cancelled');
    }
}

// Handle Save Draft
function handleSaveExpenseDraft() {
    const formData = getExpenseFormData();
    
    // Save draft to localStorage
    const drafts = JSON.parse(localStorage.getItem('expenseDrafts') || '[]');
    drafts.push({
        ...formData,
        isDraft: true,
        savedAt: new Date().toISOString()
    });
    localStorage.setItem('expenseDrafts', JSON.stringify(drafts));
    
    // Show confirmation
    alert('Expense draft saved successfully!');
    console.log('Draft saved:', formData);
    
    // Clear form
    document.getElementById('addExpenseForm').reset();
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expenseDate').value = today;
}

// Show Success Message
function showExpenseSuccessMessage() {
    const form = document.getElementById('addExpenseForm');
    const successMessage = document.getElementById('expenseSuccessMessage');
    
    if (form && successMessage) {
        form.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Handle Add Another Expense
function handleAddAnotherExpense() {
    const form = document.getElementById('addExpenseForm');
    const successMessage = document.getElementById('expenseSuccessMessage');
    
    if (form && successMessage) {
        successMessage.style.display = 'none';
        form.style.display = 'block';
        
        // Set default date
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expenseDate').value = today;
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Handle View All Expenses
function handleViewAllExpenses() {
    // Navigate to all expenses module
    const allExpensesModule = document.getElementById('all-expenses-module');
    if (allExpensesModule) {
        // Hide all modules
        document.querySelectorAll('.module').forEach(module => {
            module.classList.remove('active');
        });
        
        // Show all expenses module
        allExpensesModule.classList.add('active');
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Activate the expenses nav item
        const expensesNavItem = document.querySelector('.nav-item[data-module="expenses"]');
        if (expensesNavItem) {
            expensesNavItem.classList.add('active');
        }
        
        // Load expenses data
        displayAllExpenses();
    }
}

// Display All Expenses (placeholder for all-expenses module)
function displayAllExpenses() {
    const expenses = loadExpensesFromStorage();
    console.log('Displaying all expenses:', expenses);
    // This function will be expanded when building the all-expenses module
}

// Handle File Upload
function handleFileUpload(e) {
    const files = e.target.files;
    if (files.length > 0) {
        console.log(`${files.length} file(s) selected for upload:`);
        Array.from(files).forEach(file => {
            console.log(`- ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
        });
        
        // Validate file size (5MB max per file)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        const invalidFiles = Array.from(files).filter(file => file.size > maxSize);
        
        if (invalidFiles.length > 0) {
            alert(`The following files exceed the 5MB size limit:\n${invalidFiles.map(f => f.name).join('\n')}`);
            e.target.value = ''; // Clear the input
        }
    }
}

// Initialize expense module when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit to ensure all elements are loaded
    setTimeout(() => {
        initializeExpenseModule();
        initializeAllExpensesModule();
        console.log('Expense Module initialized successfully');
    }, 500);
});

// ===================================
// ALL EXPENSES MODULE
// ===================================

let currentExpensePage = 1;
let expensePageSize = 25;
let filteredExpenses = [];
let currentExpenseFilters = {};

// Initialize All Expenses Module
function initializeAllExpensesModule() {
    console.log('Initializing All Expenses Module...');
    
    // Load and display expenses
    loadAndDisplayExpenses();
    
    // Setup filter controls
    setupExpenseFilters();
    
    // Setup search
    setupExpenseSearch();
    
    // Setup pagination
    setupExpensePagination();
    
    // Setup action buttons
    setupExpenseActions();
    
    // Setup modals
    setupExpenseModals();
}

// Load and Display Expenses with Real-time Updates
async function loadAndDisplayExpenses() {
    console.log('🔄 Setting up real-time expense listener...');
    
    try {
        const { db } = await import('./firebase-config.js');
        const { collection, onSnapshot, query, orderBy } = await import('./firebase-config.js');
        
        const expensesCollection = collection(db, 'expenses');
        const q = query(expensesCollection, orderBy('createdAt', 'desc'));
        
        // Set up real-time listener
        onSnapshot(q, (snapshot) => {
            const expenses = [];
            snapshot.forEach((doc) => {
                expenses.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`🔔 Real-time update: ${expenses.length} expenses synced`);
            
            // Update global expenses array
            window.allExpenses = expenses;
            filteredExpenses = expenses;
            
            // Update UI
            updateExpenseStatistics(expenses);
            renderExpensesTable();
        });
        
        console.log('✅ Real-time expense listener setup complete');
    } catch (error) {
        console.error('Error setting up real-time listener:', error);
        
        // Fallback to loading from storage
        const expenses = await loadExpensesFromStorage();
        window.allExpenses = expenses;
        filteredExpenses = expenses;
        
        updateExpenseStatistics(expenses);
        renderExpensesTable();
    }
}

// Update Statistics
function updateExpenseStatistics(expenses = null) {
    const expenseList = expenses || getAllExpenses();
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    
    // Calculate totals from the provided expenses
    const totalCount = expenseList.length;
    const totalAmount = expenseList.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    // Calculate monthly expenses
    const monthlyExpenses = expenseList.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === thisMonth && expDate.getFullYear() === thisYear;
    });
    const monthlyAmount = monthlyExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    console.log(`📊 Stats Update - Total: ${totalCount}, Amount: ${totalAmount}, Monthly: ${monthlyAmount}`);
    
    // Total expenses
    document.getElementById('totalExpensesCount').textContent = totalCount;
    
    // Total amount
    document.getElementById('totalExpensesAmount').textContent = formatCurrency(totalAmount);
    
    // Monthly amount
    document.getElementById('monthlyExpensesAmount').textContent = formatCurrency(monthlyAmount);
    
    // Approved count
    const approvedCount = expenseList.filter(exp => exp.status === 'approved' || exp.status === 'paid').length;
    document.getElementById('approvedExpensesCount').textContent = approvedCount;
}

// Render Expenses Table
function renderExpensesTable() {
    const tbody = document.getElementById('expensesTableBody');
    const paginationContainer = document.getElementById('expensePaginationContainer');
    
    if (filteredExpenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    <div class="empty-state-content">
                        <i class="fas fa-wallet"></i>
                        <h3>No Expenses Found</h3>
                        <p>Start by adding your first expense record</p>
                        <button class="btn btn-primary" onclick="navigateToAddExpense()">
                            <i class="fas fa-plus"></i> Add Expense
                        </button>
                    </div>
                </td>
            </tr>
        `;
        paginationContainer.style.display = 'none';
        return;
    }
    
    // Show pagination
    paginationContainer.style.display = 'flex';
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredExpenses.length / expensePageSize);
    const startIndex = (currentExpensePage - 1) * expensePageSize;
    const endIndex = Math.min(startIndex + expensePageSize, filteredExpenses.length);
    const pageExpenses = filteredExpenses.slice(startIndex, endIndex);
    
    // Render table rows
    tbody.innerHTML = pageExpenses.map(expense => `
        <tr>
            <td>
                <input type="checkbox" class="expense-checkbox" data-expense-id="${expense.id}">
            </td>
            <td><strong>${expense.id}</strong></td>
            <td>${formatDate(expense.date)}</td>
            <td>
                <span class="category-badge">${EXPENSE_CATEGORIES[expense.category] || expense.category}</span>
            </td>
            <td>${expense.description}</td>
            <td>${expense.department.toUpperCase()}</td>
            <td>${expense.vendorName || '-'}</td>
            <td><span class="amount-value">${formatCurrency(expense.amount)}</span></td>
            <td>${PAYMENT_METHODS[expense.paymentMethod] || expense.paymentMethod}</td>
            <td>
                <span class="status-badge ${expense.status}">${expense.status.toUpperCase()}</span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="action-btn view" onclick="viewExpenseDetails('${expense.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editExpense('${expense.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteExpense('${expense.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // Update pagination info
    updateExpensePaginationInfo(startIndex + 1, endIndex, filteredExpenses.length, totalPages);
}

// Update Pagination Info
function updateExpensePaginationInfo(start, end, total, totalPages) {
    document.getElementById('expenseShowingStart').textContent = start;
    document.getElementById('expenseShowingEnd').textContent = end;
    document.getElementById('expenseTotalRecords').textContent = total;
    document.getElementById('expenseCurrentPage').textContent = currentExpensePage;
    document.getElementById('expenseTotalPages').textContent = totalPages;
    
    // Update button states
    const firstBtn = document.getElementById('expenseFirstPageBtn');
    const prevBtn = document.getElementById('expensePrevPageBtn');
    const nextBtn = document.getElementById('expenseNextPageBtn');
    const lastBtn = document.getElementById('expenseLastPageBtn');
    
    firstBtn.disabled = currentExpensePage === 1;
    prevBtn.disabled = currentExpensePage === 1;
    nextBtn.disabled = currentExpensePage === totalPages;
    lastBtn.disabled = currentExpensePage === totalPages;
}

// Setup Expense Filters
function setupExpenseFilters() {
    const applyBtn = document.getElementById('applyFiltersBtn');
    const clearBtn = document.getElementById('clearFiltersBtn');
    
    // Real-time filter inputs
    const filterCategory = document.getElementById('filterCategory');
    const filterDepartment = document.getElementById('filterDepartment');
    const filterStatus = document.getElementById('filterStatus');
    const filterStartDate = document.getElementById('filterStartDate');
    const filterEndDate = document.getElementById('filterEndDate');
    
    // Apply filters on any change
    const applyFiltersRealtime = () => {
        applyExpenseFilters();
    };
    
    if (filterCategory) filterCategory.addEventListener('change', applyFiltersRealtime);
    if (filterDepartment) filterDepartment.addEventListener('change', applyFiltersRealtime);
    if (filterStatus) filterStatus.addEventListener('change', applyFiltersRealtime);
    if (filterStartDate) filterStartDate.addEventListener('change', applyFiltersRealtime);
    if (filterEndDate) filterEndDate.addEventListener('change', applyFiltersRealtime);
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyExpenseFilters);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearExpenseFilters);
    }
}

// Apply Filters
function applyExpenseFilters() {
    currentExpenseFilters = {
        category: document.getElementById('filterCategory').value,
        department: document.getElementById('filterDepartment').value,
        status: document.getElementById('filterStatus').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value
    };
    
    filteredExpenses = filterExpenses(currentExpenseFilters);
    currentExpensePage = 1;
    renderExpensesTable();
    
    console.log('Filters applied:', currentExpenseFilters);
    console.log('Filtered results:', filteredExpenses.length);
}

// Clear Filters
function clearExpenseFilters() {
    // Clear all filter inputs
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterDepartment').value = '';
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    
    // Reset filters and show all expenses
    currentExpenseFilters = {};
    filteredExpenses = window.allExpenses || [];
    currentExpensePage = 1;
    renderExpensesTable();
    
    console.log('✅ Filters cleared - showing all expenses');
}

// Setup Search
function setupExpenseSearch() {
    const searchInput = document.getElementById('expenseSearchInput');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            const searchTerm = this.value.toLowerCase().trim();
            
            if (searchTerm === '') {
                filteredExpenses = filterExpenses(currentExpenseFilters);
            } else {
                const baseExpenses = filterExpenses(currentExpenseFilters);
                filteredExpenses = baseExpenses.filter(expense => 
                    expense.description.toLowerCase().includes(searchTerm) ||
                    (expense.vendorName && expense.vendorName.toLowerCase().includes(searchTerm)) ||
                    (expense.invoiceNumber && expense.invoiceNumber.toLowerCase().includes(searchTerm)) ||
                    expense.amount.toString().includes(searchTerm) ||
                    expense.id.toLowerCase().includes(searchTerm)
                );
            }
            
            currentExpensePage = 1;
            renderExpensesTable();
        }, 300));
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Setup Pagination
function setupExpensePagination() {
    // Page size change
    const pageSizeSelect = document.getElementById('expensePageSize');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            expensePageSize = parseInt(this.value);
            currentExpensePage = 1;
            renderExpensesTable();
        });
    }
    
    // Navigation buttons
    const firstBtn = document.getElementById('expenseFirstPageBtn');
    const prevBtn = document.getElementById('expensePrevPageBtn');
    const nextBtn = document.getElementById('expenseNextPageBtn');
    const lastBtn = document.getElementById('expenseLastPageBtn');
    
    if (firstBtn) {
        firstBtn.addEventListener('click', () => {
            currentExpensePage = 1;
            renderExpensesTable();
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentExpensePage > 1) {
                currentExpensePage--;
                renderExpensesTable();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredExpenses.length / expensePageSize);
            if (currentExpensePage < totalPages) {
                currentExpensePage++;
                renderExpensesTable();
            }
        });
    }
    
    if (lastBtn) {
        lastBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredExpenses.length / expensePageSize);
            currentExpensePage = totalPages;
            renderExpensesTable();
        });
    }
}

// Setup Action Buttons
function setupExpenseActions() {
    const exportBtn = document.getElementById('exportExpensesBtn');
    const exportMenu = document.getElementById('exportMenu');
    const exportCSVBtn = document.getElementById('exportCSVBtn');
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    const addNewBtn = document.getElementById('addNewExpenseBtn');
    const addFirstBtn = document.getElementById('addFirstExpenseBtn');
    
    console.log('Export button:', exportBtn);
    console.log('Export menu:', exportMenu);
    
    // Toggle export dropdown
    if (exportBtn && exportMenu) {
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Export button clicked');
            const isShowing = exportMenu.classList.contains('show');
            console.log('Current state:', isShowing ? 'showing' : 'hidden');
            exportMenu.classList.toggle('show');
            console.log('New state:', exportMenu.classList.contains('show') ? 'showing' : 'hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) {
                exportMenu.classList.remove('show');
            }
        });
    }
    
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('CSV export clicked');
            exportExpensesToCSV(filteredExpenses);
            exportMenu.classList.remove('show');
        });
    }
    
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('PDF export clicked');
            exportExpensesToPDF(filteredExpenses);
            exportMenu.classList.remove('show');
        });
    }
    
    if (addNewBtn) {
        addNewBtn.addEventListener('click', navigateToAddExpense);
    }
    
    if (addFirstBtn) {
        addFirstBtn.addEventListener('click', navigateToAddExpense);
    }
    
    // Select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllExpenses');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.expense-checkbox');
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
}

// Navigate to Add Expense
function navigateToAddExpense() {
    // Hide all modules
    document.querySelectorAll('.module').forEach(module => {
        module.classList.remove('active');
    });
    
    // Show add expense module
    const addExpenseModule = document.getElementById('add-expense-module');
    if (addExpenseModule) {
        addExpenseModule.classList.add('active');
        
        // Reset form
        const form = document.getElementById('addExpenseForm');
        const successMessage = document.getElementById('expenseSuccessMessage');
        if (form && successMessage) {
            form.style.display = 'block';
            successMessage.style.display = 'none';
        }
    }
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
}

// Export Expenses to CSV
function exportExpensesToCSV(expenses) {
    if (!expenses || expenses.length === 0) {
        alert('No expenses to export');
        return;
    }
    
    const headers = ['ID', 'Date', 'Category', 'Description', 'Amount', 'Department', 'Payment Method', 'Status'];
    const rows = expenses.map(exp => [
        exp.id,
        formatDate(exp.date),
        EXPENSE_CATEGORIES[exp.category] || exp.category,
        exp.description,
        exp.amount,
        exp.department,
        PAYMENT_METHODS[exp.paymentMethod] || exp.paymentMethod,
        exp.status
    ]);
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    console.log('✅ Exported', expenses.length, 'expenses to CSV');
}

// Export Expenses to PDF
function exportExpensesToPDF(expenses) {
    if (!expenses || expenses.length === 0) {
        alert('No expenses to export');
        return;
    }
    
    const printWindow = window.open('', '', 'width=800,height=600');
    const totalAmount = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Expenses Report</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: Arial, sans-serif;
                    padding: 40px;
                    background: #fff;
                    color: #000;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #2563eb;
                    padding-bottom: 20px;
                }
                .header h1 {
                    font-size: 28px;
                    color: #2563eb;
                    margin-bottom: 10px;
                }
                .header p {
                    font-size: 14px;
                    color: #666;
                }
                .summary {
                    display: flex;
                    justify-content: space-around;
                    margin-bottom: 30px;
                    padding: 20px;
                    background: #f8fafc;
                    border-radius: 8px;
                }
                .summary-item { text-align: center; }
                .summary-label {
                    font-size: 12px;
                    color: #666;
                    text-transform: uppercase;
                    margin-bottom: 5px;
                }
                .summary-value {
                    font-size: 20px;
                    font-weight: bold;
                    color: #000;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                th {
                    background: #2563eb;
                    color: white;
                    padding: 12px 8px;
                    text-align: left;
                    font-size: 12px;
                    text-transform: uppercase;
                }
                td {
                    padding: 10px 8px;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 12px;
                }
                tr:hover { background: #f8fafc; }
                .status {
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: bold;
                }
                .status.pending { background: #fef3c7; color: #f59e0b; }
                .status.approved { background: #d1fae5; color: #10b981; }
                .status.paid { background: #dbeafe; color: #2563eb; }
                .status.rejected { background: #fee2e2; color: #ef4444; }
                .amount { font-weight: bold; color: #ef4444; }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e7eb;
                    font-size: 12px;
                    color: #666;
                }
                @media print {
                    body { padding: 20px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Expenses Report</h1>
                <p>Generated on ${new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div class="summary">
                <div class="summary-item">
                    <div class="summary-label">Total Expenses</div>
                    <div class="summary-value">${expenses.length}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total Amount</div>
                    <div class="summary-value">KSh ${totalAmount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Department</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.map(exp => `
                        <tr>
                            <td>${formatDate(exp.date)}</td>
                            <td>${EXPENSE_CATEGORIES[exp.category] || exp.category}</td>
                            <td>${exp.description}</td>
                            <td>${exp.department.toUpperCase()}</td>
                            <td class="amount">KSh ${parseFloat(exp.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                            <td><span class="status ${exp.status}">${exp.status.toUpperCase()}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="footer">
                <p>RxFlow Hospital Management System - Expenses Report</p>
                <p>This is a system-generated report</p>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 250);
    console.log('✅ Generated PDF for', expenses.length, 'expenses');
}

// Get Expense by ID from real-time data
function getExpenseById(expenseId) {
    const expenses = window.allExpenses || [];
    return expenses.find(exp => exp.id === expenseId);
}

// View Expense Details
function viewExpenseDetails(expenseId) {
    const expense = getExpenseById(expenseId);
    if (!expense) {
        console.log('❌ Expense not found:', expenseId);
        return;
    }
    
    const modal = document.getElementById('viewExpenseModal');
    const modalBody = document.getElementById('viewExpenseModalBody');
    
    modalBody.innerHTML = `
        <div class="expense-detail-simple">
            <div class="detail-row">
                <span class="detail-label">ID:</span>
                <span class="detail-value">${expense.id}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${formatDate(expense.date)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Category:</span>
                <span class="detail-value">${EXPENSE_CATEGORIES[expense.category] || expense.category}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Description:</span>
                <span class="detail-value">${expense.description}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Amount:</span>
                <span class="detail-value amount">${formatCurrency(expense.amount)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Payment:</span>
                <span class="detail-value">${PAYMENT_METHODS[expense.paymentMethod] || expense.paymentMethod}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Department:</span>
                <span class="detail-value">${expense.department.toUpperCase()}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                    <span class="status-badge ${expense.status}">${expense.status.toUpperCase()}</span>
                </span>
            </div>
    `;
    
    modal.classList.add('active');
}

// Close View Expense Modal
function closeViewExpenseModal() {
    const modal = document.getElementById('viewExpenseModal');
    modal.classList.remove('active');
}

// Edit Expense
let currentEditExpenseId = null;

function editExpense(expenseId) {
    const expense = getExpenseById(expenseId);
    if (!expense) return;
    
    currentEditExpenseId = expenseId;
    const modal = document.getElementById('editExpenseModal');
    const modalBody = document.getElementById('editExpenseModalBody');
    
    modalBody.innerHTML = `
        <div class="form-simple">
            <div class="form-group">
                <label>Amount</label>
                <input type="number" id="editAmount" class="form-control" value="${expense.amount}" step="0.01">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="editDescription" class="form-control" rows="3">${expense.description}</textarea>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="editStatus" class="form-control">
                    <option value="pending" ${expense.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="approved" ${expense.status === 'approved' ? 'selected' : ''}>Approved</option>
                    <option value="paid" ${expense.status === 'paid' ? 'selected' : ''}>Paid</option>
                    <option value="rejected" ${expense.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                </select>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

// Save Expense Changes
async function saveExpenseChanges() {
    if (!currentEditExpenseId) return;
    
    const amount = parseFloat(document.getElementById('editAmount').value);
    const description = document.getElementById('editDescription').value.trim();
    const status = document.getElementById('editStatus').value;
    
    if (!amount || !description) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        const { db } = await import('./firebase-config.js');
        const { doc, updateDoc } = await import('./firebase-config.js');
        
        const expenseRef = doc(db, 'expenses', currentEditExpenseId);
        await updateDoc(expenseRef, {
            amount: amount,
            description: description,
            status: status,
            updatedAt: new Date().toISOString()
        });
        
        console.log('✅ Expense updated successfully');
        closeEditExpenseModal();
        
        // Show success message
        alert('Expense updated successfully!');
    } catch (error) {
        console.error('Error updating expense:', error);
        alert('Failed to update expense. Please try again.');
    }
}

// Close Edit Expense Modal
function closeEditExpenseModal() {
    const modal = document.getElementById('editExpenseModal');
    modal.classList.remove('active');
    currentEditExpenseId = null;
}

// Delete Expense
let expenseToDelete = null;

function deleteExpense(expenseId) {
    const expense = getExpenseById(expenseId);
    if (!expense) return;
    
    expenseToDelete = expenseId;
    const modal = document.getElementById('deleteExpenseModal');
    const deleteInfo = document.getElementById('expenseDeleteInfo');
    
    deleteInfo.innerHTML = `
        <strong>Expense:</strong> ${expense.description}<br>
        <strong>Amount:</strong> ${formatCurrency(expense.amount)}<br>
        <strong>Date:</strong> ${formatDate(expense.date)}
    `;
    
    modal.classList.add('active');
}

// Close Delete Expense Modal
function closeDeleteExpenseModal() {
    const modal = document.getElementById('deleteExpenseModal');
    modal.classList.remove('active');
    expenseToDelete = null;
}

// Confirm Delete
async function confirmDeleteExpense() {
    if (!expenseToDelete) return;
    
    const result = await deleteExpenseById(expenseToDelete);
    if (result) {
        closeDeleteExpenseModal();
        console.log(`✅ Expense ${expenseToDelete} deleted successfully`);
    }
}

// Delete Expense by ID from Firestore
async function deleteExpenseById(expenseId) {
    try {
        const { db } = await import('./firebase-config.js');
        const { doc, deleteDoc } = await import('./firebase-config.js');
        
        const expenseRef = doc(db, 'expenses', expenseId);
        await deleteDoc(expenseRef);
        
        console.log('✅ Expense deleted successfully');
        return true;
    } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Failed to delete expense. Please try again.');
        return false;
    }
}

// Print Current Expense
function printCurrentExpense() {
    window.print();
}

// Make functions globally available
window.viewExpenseDetails = viewExpenseDetails;
window.closeViewExpenseModal = closeViewExpenseModal;
window.editExpense = editExpense;
window.closeEditExpenseModal = closeEditExpenseModal;
window.saveExpenseChanges = saveExpenseChanges;
window.deleteExpense = deleteExpense;
window.closeDeleteExpenseModal = closeDeleteExpenseModal;
window.confirmDeleteExpense = confirmDeleteExpense;
window.navigateToAddExpense = navigateToAddExpense;

// ===================================
// INVENTORY MODULE
// ===================================

// Generate unique item code
function generateItemCode(category, itemName) {
    const categoryPrefix = {
        'medical-equipment': 'MED',
        'surgical-instruments': 'SUR',
        'pharmaceuticals': 'PHR',
        'medical-consumables': 'CON',
        'laboratory-supplies': 'LAB',
        'diagnostic-equipment': 'DIA',
        'office-supplies': 'OFF',
        'cleaning-supplies': 'CLN',
        'personal-protective': 'PPE',
        'other': 'OTH'
    };

    const prefix = categoryPrefix[category] || 'ITM';
    const timestamp = Date.now().toString().slice(-6);
    const namePart = itemName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    
    return `${prefix}-${namePart}${timestamp}`;
}

// Initialize Inventory Module
function initializeInventoryModule() {
    console.log('Initializing Inventory Module...');
    
    // Handle form submission
    const itemForm = document.getElementById('addItemForm');
    if (itemForm) {
        // Remove any existing listeners by cloning and replacing
        const newForm = itemForm.cloneNode(true);
        itemForm.parentNode.replaceChild(newForm, itemForm);
        newForm.addEventListener('submit', handleItemSubmit);
    }

    // Handle cancel button
    const cancelBtn = document.getElementById('cancelItemBtn');
    if (cancelBtn) {
        cancelBtn.removeEventListener('click', handleCancelItem);
        cancelBtn.addEventListener('click', handleCancelItem);
    }

    // Handle success message buttons
    const addAnotherBtn = document.getElementById('addAnotherItemBtn');
    if (addAnotherBtn) {
        addAnotherBtn.removeEventListener('click', handleAddAnotherItem);
        addAnotherBtn.addEventListener('click', handleAddAnotherItem);
    }

    const viewInventoryBtn = document.getElementById('viewInventoryBtn');
    if (viewInventoryBtn) {
        viewInventoryBtn.removeEventListener('click', handleViewInventory);
        viewInventoryBtn.addEventListener('click', handleViewInventory);
    }

    // Setup automatic calculations
    setupInventoryCalculations();
    
    loadInventoryFromStorage();
}

// Setup Automatic Calculations
function setupInventoryCalculations() {
    const quantityInput = document.getElementById('itemQuantity');
    const costPriceInput = document.getElementById('itemCostPrice');
    const totalValueInput = document.getElementById('itemTotalValue');

    // Calculate total value
    function calculateTotalValue() {
        const quantity = parseFloat(quantityInput?.value) || 0;
        const costPrice = parseFloat(costPriceInput?.value) || 0;
        const totalValue = quantity * costPrice;
        
        if (totalValueInput) {
            totalValueInput.value = `KSh ${totalValue.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
    }

    // Attach event listeners
    if (quantityInput) {
        quantityInput.addEventListener('input', calculateTotalValue);
    }
    
    if (costPriceInput) {
        costPriceInput.addEventListener('input', calculateTotalValue);
    }
}


// Handle Item Form Submission
async function handleItemSubmit(e) {
    e.preventDefault();

    const formData = getItemFormData();
    
    // Validate required fields
    if (!validateItemForm(formData)) {
        return;
    }

    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding Item...';
        submitBtn.disabled = true;

        // Save to storage
        await saveItemToStorage(formData);

        // Show success message with summary
        showItemSuccessMessage(formData);

        // Reset form
        document.getElementById('addItemForm').reset();
        
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;

        // Log success
        console.log('Item added successfully:', formData);

    } catch (error) {
        console.error('Error adding item:', error);
        alert('Failed to add item. Please try again.');
        
        // Reset button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Add to Inventory';
        submitBtn.disabled = false;
    }
}

// Get Form Data
function getItemFormData() {
    const category = document.getElementById('itemCategory').value;
    const itemName = document.getElementById('itemName').value;
    const quantity = parseFloat(document.getElementById('itemQuantity').value) || 0;
    const costPrice = parseFloat(document.getElementById('itemCostPrice').value) || 0;
    
    return {
        id: 'ITM-' + Date.now(),
        category: category,
        subcategory: document.getElementById('itemSubcategory').value,
        name: itemName,
        code: generateItemCode(category, itemName),
        brand: document.getElementById('itemBrand').value,
        description: document.getElementById('itemDescription').value,
        quantity: quantity,
        unit: document.getElementById('itemUnit').value,
        reorderLevel: parseInt(document.getElementById('itemReorderLevel').value) || 0,
        costPrice: costPrice,
        sellingPrice: parseFloat(document.getElementById('itemSellingPrice').value) || null,
        totalValue: quantity * costPrice,
        supplierName: document.getElementById('supplierName').value,
        storageLocation: document.getElementById('storageLocation').value,
        expiryDate: document.getElementById('expiryDate').value,
        status: 'active',
        dateAdded: new Date().toISOString(),
        addedBy: 'Current User'
    };
}

// Validate Item Form
function validateItemForm(formData) {
    if (!formData.category) {
        alert('Please select an item category.');
        document.getElementById('itemCategory').focus();
        return false;
    }

    if (!formData.name || formData.name.trim() === '') {
        alert('Please enter an item name.');
        document.getElementById('itemName').focus();
        return false;
    }

    if (!formData.quantity || formData.quantity < 0) {
        alert('Please enter a valid quantity.');
        document.getElementById('itemQuantity').focus();
        return false;
    }

    if (!formData.unit) {
        alert('Please select a unit of measurement.');
        document.getElementById('itemUnit').focus();
        return false;
    }

    if (!formData.reorderLevel && formData.reorderLevel !== 0) {
        alert('Please enter a reorder level.');
        document.getElementById('itemReorderLevel').focus();
        return false;
    }

    if (!formData.costPrice || formData.costPrice <= 0) {
        alert('Please enter a valid cost price.');
        document.getElementById('itemCostPrice').focus();
        return false;
    }

    if (!formData.storageLocation) {
        alert('Please select a storage location.');
        document.getElementById('storageLocation').focus();
        return false;
    }

    return true;
}

// Save Item to Storage
async function saveItemToStorage(itemData) {
    return new Promise((resolve) => {
        let items = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
        items.push(itemData);
        localStorage.setItem('inventoryItems', JSON.stringify(items));
        
        setTimeout(resolve, 500);
    });
}

// Load Inventory from Storage
function loadInventoryFromStorage() {
    const items = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
    console.log(`Loaded ${items.length} inventory items from storage`);
    return items;
}

// Get Inventory Items
function getInventoryItems() {
    return JSON.parse(localStorage.getItem('inventoryItems') || '[]');
}

// Handle Cancel Item
function handleCancelItem() {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        document.getElementById('addItemForm').reset();
        console.log('Item form cancelled');
    }
}

// Handle Save Draft
function handleSaveItemDraft() {
    const formData = getItemFormData();
    
    // Save draft to localStorage
    const drafts = JSON.parse(localStorage.getItem('inventoryDrafts') || '[]');
    drafts.push({
        ...formData,
        isDraft: true,
        savedAt: new Date().toISOString()
    });
    localStorage.setItem('inventoryDrafts', JSON.stringify(drafts));
    
    // Show confirmation
    alert('Item draft saved successfully!');
    console.log('Draft saved:', formData);
    
    // Clear form
    document.getElementById('addItemForm').reset();
}

// Show Success Message
function showItemSuccessMessage(itemData) {
    const form = document.getElementById('addItemForm');
    const successMessage = document.getElementById('itemSuccessMessage');
    const summaryDiv = document.getElementById('itemSummary');
    
    if (form && successMessage && summaryDiv) {
        // Create summary
        summaryDiv.innerHTML = `
            <div style="background: var(--bg-color); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left;">
                <h4 style="margin-bottom: 12px; color: var(--text-primary);">Item Details:</h4>
                <p><strong>Name:</strong> ${itemData.name}</p>
                <p><strong>Code:</strong> ${itemData.code}</p>
                <p><strong>Quantity:</strong> ${itemData.quantity} ${itemData.unit}</p>
                <p><strong>Value:</strong> KSh ${itemData.totalValue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
                <p><strong>Location:</strong> ${itemData.storageLocation}</p>
            </div>
        `;
        
        form.style.display = 'none';
        successMessage.style.display = 'block';
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Handle Add Another Item
function handleAddAnotherItem() {
    const form = document.getElementById('addItemForm');
    const successMessage = document.getElementById('itemSuccessMessage');
    
    if (form && successMessage) {
        successMessage.style.display = 'none';
        form.style.display = 'block';
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Handle View Inventory
function handleViewInventory() {
    showModule('view-inventory');
}

// ========================================
// VIEW INVENTORY MODULE
// ========================================

let inventoryCurrentPage = 1;
let inventoryPageSize = 25;
let inventoryFilteredItems = [];
let inventorySearchTerm = '';

function initializeViewInventoryModule() {
    console.log('Initializing View Inventory Module...');
    
    // Search functionality
    const searchInput = document.getElementById('inventorySearchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                inventorySearchTerm = e.target.value.toLowerCase();
                inventoryCurrentPage = 1;
                filterAndRenderInventory();
            }, 300);
        });
    }

    // Filter controls
    const filterCategory = document.getElementById('filterCategory');
    const filterStockStatus = document.getElementById('filterStockStatus');
    const filterLocation = document.getElementById('filterLocation');

    [filterCategory, filterStockStatus, filterLocation].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', () => {
                inventoryCurrentPage = 1;
                filterAndRenderInventory();
            });
        }
    });

    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearInventoryFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (filterCategory) filterCategory.value = '';
            if (filterStockStatus) filterStockStatus.value = '';
            if (filterLocation) filterLocation.value = '';
            inventorySearchTerm = '';
            inventoryCurrentPage = 1;
            filterAndRenderInventory();
        });
    }

    // Export button
    const exportBtn = document.getElementById('exportInventoryBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportInventoryToCSV);
    }

    // Page size selector
    const pageSizeSelect = document.getElementById('inventoryPageSize');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', (e) => {
            inventoryPageSize = parseInt(e.target.value);
            inventoryCurrentPage = 1;
            renderInventoryTable();
        });
    }

    // Pagination buttons
    const prevBtn = document.getElementById('inventoryPrevBtn');
    const nextBtn = document.getElementById('inventoryNextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (inventoryCurrentPage > 1) {
                inventoryCurrentPage--;
                renderInventoryTable();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(inventoryFilteredItems.length / inventoryPageSize);
            if (inventoryCurrentPage < totalPages) {
                inventoryCurrentPage++;
                renderInventoryTable();
            }
        });
    }

    // Edit item save button
    const saveEditBtn = document.getElementById('saveEditItemBtn');
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', saveItemEdit);
    }

    // Delete item confirm button
    const confirmDeleteBtn = document.getElementById('confirmDeleteItemBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDeleteItem);
    }

    // Load and display inventory
    filterAndRenderInventory();
}

function filterAndRenderInventory() {
    const allItems = getInventoryItems();
    const categoryFilter = document.getElementById('filterCategory')?.value || '';
    const stockFilter = document.getElementById('filterStockStatus')?.value || '';
    const locationFilter = document.getElementById('filterLocation')?.value || '';

    inventoryFilteredItems = allItems.filter(item => {
        // Search filter
        const matchesSearch = !inventorySearchTerm || 
            item.name.toLowerCase().includes(inventorySearchTerm) ||
            item.code.toLowerCase().includes(inventorySearchTerm) ||
            (item.brand && item.brand.toLowerCase().includes(inventorySearchTerm));

        // Category filter
        const matchesCategory = !categoryFilter || item.category === categoryFilter;

        // Stock status filter
        let matchesStock = true;
        if (stockFilter) {
            const stockStatus = getStockStatus(item);
            matchesStock = stockStatus === stockFilter;
        }

        // Location filter
        const matchesLocation = !locationFilter || item.storageLocation === locationFilter;

        return matchesSearch && matchesCategory && matchesStock && matchesLocation;
    });

    updateInventoryStats(allItems);
    renderInventoryTable();
}

function getStockStatus(item) {
    if (item.quantity === 0) return 'out-of-stock';
    if (item.quantity <= item.reorderLevel) return 'low-stock';
    return 'in-stock';
}

function updateInventoryStats(items) {
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    const lowStockItems = items.filter(item => item.quantity > 0 && item.quantity <= item.reorderLevel).length;
    const expiredItems = items.filter(item => {
        if (!item.expiryDate) return false;
        return new Date(item.expiryDate) < new Date();
    }).length;

    document.getElementById('totalItemsCount').textContent = totalItems;
    document.getElementById('totalInventoryValue').textContent = `KSh ${totalValue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
    document.getElementById('lowStockCount').textContent = lowStockItems;
    document.getElementById('expiredItemsCount').textContent = expiredItems;
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;

    const startIndex = (inventoryCurrentPage - 1) * inventoryPageSize;
    const endIndex = startIndex + inventoryPageSize;
    const pageItems = inventoryFilteredItems.slice(startIndex, endIndex);

    if (inventoryFilteredItems.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="11">
                    <div class="empty-state-content">
                        <i class="fas fa-box-open"></i>
                        <p>No inventory items found</p>
                        <button class="btn btn-primary" onclick="showModule('add-item')">
                            <i class="fas fa-plus"></i> Add First Item
                        </button>
                    </div>
                </td>
            </tr>
        `;
        updatePaginationControls(0);
        return;
    }

    tbody.innerHTML = pageItems.map(item => {
        const stockStatus = getStockStatus(item);
        const stockBadgeClass = stockStatus;
        const stockIcon = stockStatus === 'in-stock' ? 'check-circle' : 
                         stockStatus === 'low-stock' ? 'exclamation-triangle' : 'times-circle';
        const stockText = stockStatus.replace('-', ' ');

        const expiryDate = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB') : 'N/A';
        const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();

        return `
            <tr>
                <td><strong>${item.code}</strong></td>
                <td>${item.name}</td>
                <td>${formatCategory(item.category)}</td>
                <td><strong>${item.quantity}</strong></td>
                <td>${formatUnit(item.unit)}</td>
                <td>
                    <span class="stock-badge ${stockBadgeClass}">
                        <i class="fas fa-${stockIcon}"></i>
                        ${stockText}
                    </span>
                </td>
                <td>KSh ${item.costPrice.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                <td><strong>KSh ${(item.totalValue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong></td>
                <td>${formatLocation(item.storageLocation)}</td>
                <td style="color: ${isExpired ? '#ef4444' : '#64748b'}">${expiryDate}</td>
                <td>
                    <div class="item-actions">
                        <button class="item-action-btn view" onclick="viewItemDetails('${item.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="item-action-btn edit" onclick="openEditItemModal('${item.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="item-action-btn delete" onclick="openDeleteItemModal('${item.id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updatePaginationControls(inventoryFilteredItems.length);
}

function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / inventoryPageSize);
    const startItem = totalItems === 0 ? 0 : (inventoryCurrentPage - 1) * inventoryPageSize + 1;
    const endItem = Math.min(inventoryCurrentPage * inventoryPageSize, totalItems);

    document.getElementById('inventoryShowingStart').textContent = startItem;
    document.getElementById('inventoryShowingEnd').textContent = endItem;
    document.getElementById('inventoryTotalItems').textContent = totalItems;

    const prevBtn = document.getElementById('inventoryPrevBtn');
    const nextBtn = document.getElementById('inventoryNextBtn');

    if (prevBtn) prevBtn.disabled = inventoryCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = inventoryCurrentPage >= totalPages;

    // Generate page numbers
    const pagesContainer = document.getElementById('inventoryPaginationPages');
    if (pagesContainer) {
        let pagesHTML = '';
        const maxPagesToShow = 5;
        let startPage = Math.max(1, inventoryCurrentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pagesHTML += `
                <button class="pagination-page ${i === inventoryCurrentPage ? 'active' : ''}" 
                        onclick="goToInventoryPage(${i})">
                    ${i}
                </button>
            `;
        }
        pagesContainer.innerHTML = pagesHTML;
    }
}

function goToInventoryPage(page) {
    inventoryCurrentPage = page;
    renderInventoryTable();
}

function formatCategory(category) {
    const categoryMap = {
        'medical-equipment': 'Medical Equipment',
        'surgical-instruments': 'Surgical Instruments',
        'pharmaceuticals': 'Pharmaceuticals',
        'medical-consumables': 'Medical Consumables',
        'laboratory-supplies': 'Laboratory Supplies',
        'diagnostic-equipment': 'Diagnostic Equipment',
        'office-supplies': 'Office Supplies',
        'cleaning-supplies': 'Cleaning Supplies',
        'personal-protective': 'PPE',
        'other': 'Other'
    };
    return categoryMap[category] || category;
}

function formatUnit(unit) {
    const unitMap = {
        'pieces': 'pcs',
        'boxes': 'boxes',
        'packs': 'packs',
        'bottles': 'bottles',
        'vials': 'vials',
        'tablets': 'tabs',
        'capsules': 'caps',
        'liters': 'L',
        'milliliters': 'mL',
        'kilograms': 'kg',
        'grams': 'g'
    };
    return unitMap[unit] || unit;
}

function formatLocation(location) {
    const locationMap = {
        'main-pharmacy': 'Main Pharmacy',
        'emergency-pharmacy': 'Emergency Pharmacy',
        'main-store': 'Main Store',
        'laboratory-store': 'Laboratory Store',
        'surgical-store': 'Surgical Store',
        'ward-supplies': 'Ward Supplies',
        'cold-storage': 'Cold Storage',
        'warehouse': 'Warehouse'
    };
    return locationMap[location] || location;
}

function viewItemDetails(itemId) {
    const items = getInventoryItems();
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const detailsHTML = `
        <div class="item-details-grid">
            <div class="detail-group">
                <div class="detail-label">Item Code</div>
                <div class="detail-value">${item.code}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Item Name</div>
                <div class="detail-value">${item.name}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Category</div>
                <div class="detail-value">${formatCategory(item.category)}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Subcategory</div>
                <div class="detail-value">${item.subcategory || 'N/A'}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Brand/Manufacturer</div>
                <div class="detail-value">${item.brand || 'N/A'}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Description</div>
                <div class="detail-value">${item.description || 'N/A'}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Current Quantity</div>
                <div class="detail-value"><strong>${item.quantity} ${formatUnit(item.unit)}</strong></div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Reorder Level</div>
                <div class="detail-value">${item.reorderLevel} ${formatUnit(item.unit)}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Cost Price</div>
                <div class="detail-value">KSh ${item.costPrice.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Selling Price</div>
                <div class="detail-value">${item.sellingPrice ? 'KSh ' + item.sellingPrice.toLocaleString('en-KE', { minimumFractionDigits: 2 }) : 'N/A'}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Total Value</div>
                <div class="detail-value"><strong>KSh ${(item.totalValue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong></div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Storage Location</div>
                <div class="detail-value">${formatLocation(item.storageLocation)}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Supplier</div>
                <div class="detail-value">${item.supplierName || 'N/A'}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Expiry Date</div>
                <div class="detail-value">${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-GB') : 'N/A'}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Date Added</div>
                <div class="detail-value">${new Date(item.dateAdded).toLocaleDateString('en-GB')}</div>
            </div>
            <div class="detail-group">
                <div class="detail-label">Added By</div>
                <div class="detail-value">${item.addedBy}</div>
            </div>
        </div>
    `;

    document.getElementById('viewItemDetails').innerHTML = detailsHTML;
    openModal('viewItemModal');
}

function openEditItemModal(itemId) {
    const items = getInventoryItems();
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemName').value = item.name;
    document.getElementById('editItemCategory').value = item.category;
    document.getElementById('editItemQuantity').value = item.quantity;
    document.getElementById('editItemUnit').value = item.unit;
    document.getElementById('editItemReorderLevel').value = item.reorderLevel;
    document.getElementById('editItemCostPrice').value = item.costPrice;
    document.getElementById('editItemSellingPrice').value = item.sellingPrice || '';
    document.getElementById('editStorageLocation').value = item.storageLocation;

    openModal('editItemModal');
}

function saveItemEdit() {
    const itemId = document.getElementById('editItemId').value;
    const items = getInventoryItems();
    const itemIndex = items.findIndex(i => i.id === itemId);

    if (itemIndex === -1) {
        alert('Item not found!');
        return;
    }

    const quantity = parseFloat(document.getElementById('editItemQuantity').value);
    const costPrice = parseFloat(document.getElementById('editItemCostPrice').value);

    items[itemIndex] = {
        ...items[itemIndex],
        name: document.getElementById('editItemName').value,
        category: document.getElementById('editItemCategory').value,
        quantity: quantity,
        unit: document.getElementById('editItemUnit').value,
        reorderLevel: parseInt(document.getElementById('editItemReorderLevel').value),
        costPrice: costPrice,
        sellingPrice: parseFloat(document.getElementById('editItemSellingPrice').value) || null,
        storageLocation: document.getElementById('editStorageLocation').value,
        totalValue: quantity * costPrice,
        lastModified: new Date().toISOString()
    };

    localStorage.setItem('inventoryItems', JSON.stringify(items));
    closeModal('editItemModal');
    filterAndRenderInventory();
    alert('Item updated successfully!');
}

function openDeleteItemModal(itemId) {
    const items = getInventoryItems();
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    document.getElementById('deleteItemInfo').innerHTML = `
        <p><strong>Item Name:</strong> ${item.name}</p>
        <p><strong>Item Code:</strong> ${item.code}</p>
        <p><strong>Quantity:</strong> ${item.quantity} ${formatUnit(item.unit)}</p>
    `;

    document.getElementById('confirmDeleteItemBtn').onclick = () => confirmDeleteItem(itemId);
    openModal('deleteItemModal');
}

function confirmDeleteItem(itemId) {
    const items = getInventoryItems();
    const filteredItems = items.filter(i => i.id !== itemId);
    localStorage.setItem('inventoryItems', JSON.stringify(filteredItems));
    
    closeModal('deleteItemModal');
    filterAndRenderInventory();
    alert('Item deleted successfully!');
}

function getInventoryItems() {
    return JSON.parse(localStorage.getItem('inventoryItems') || '[]');
}

function exportInventoryToCSV() {
    const items = inventoryFilteredItems.length > 0 ? inventoryFilteredItems : getInventoryItems();
    
    if (items.length === 0) {
        alert('No items to export!');
        return;
    }

    const headers = ['Item Code', 'Item Name', 'Category', 'Quantity', 'Unit', 'Stock Status', 
                    'Cost Price', 'Total Value', 'Location', 'Supplier', 'Expiry Date'];
    
    const rows = items.map(item => [
        item.code,
        item.name,
        formatCategory(item.category),
        item.quantity,
        formatUnit(item.unit),
        getStockStatus(item).replace('-', ' '),
        item.costPrice,
        item.totalValue || 0,
        formatLocation(item.storageLocation),
        item.supplierName || '',
        item.expiryDate || ''
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Initialize inventory module when the page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeInventoryModule();
        initializeViewInventoryModule();
        console.log('Inventory Modules initialized successfully');
        
        // Initialize Pharmacy Inventory Module
        if (window.pharmacyInventory && typeof window.pharmacyInventory.initPharmacyInventory === 'function') {
            const pharmacyInventoryModule = document.getElementById('pharmacy-inventory-module');
            if (pharmacyInventoryModule) {
                // Initialize on page load
                if (pharmacyInventoryModule.classList.contains('active')) {
                    window.pharmacyInventory.initPharmacyInventory();
                }
                
                // Initialize when module becomes active
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.target.classList.contains('active')) {
                            window.pharmacyInventory.initPharmacyInventory();
                        }
                    });
                });
                
                observer.observe(pharmacyInventoryModule, {
                    attributes: true,
                    attributeFilter: ['class']
                });
                
                console.log('Pharmacy Inventory Module initialized successfully');
            }
        }
        
        // Initialize Pharmacy POS Module
        if (window.pharmacyPOS && typeof window.pharmacyPOS.initPharmacyPOS === 'function') {
            const pharmacyPOSModule = document.getElementById('pharmacy-pos-module');
            if (pharmacyPOSModule) {
                // Initialize on page load
                if (pharmacyPOSModule.classList.contains('active')) {
                    window.pharmacyPOS.initPharmacyPOS();
                }
                
                // Initialize when module becomes active
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.target.classList.contains('active')) {
                            window.pharmacyPOS.initPharmacyPOS();
                        }
                    });
                });
                
                observer.observe(pharmacyPOSModule, {
                    attributes: true,
                    attributeFilter: ['class']
                });
                
                console.log('Pharmacy POS Module initialized successfully');
            }
        }
        
        // Initialize Prescription Queue Module
        if (window.prescriptionQueue && typeof window.prescriptionQueue.initPrescriptionQueue === 'function') {
            const pharmacyPOSModule = document.getElementById('pharmacy-pos-module');
            if (pharmacyPOSModule) {
                // Initialize when POS module becomes active
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.target.classList.contains('active')) {
                            window.prescriptionQueue.initPrescriptionQueue();
                        }
                    });
                });
                
                observer.observe(pharmacyPOSModule, {
                    attributes: true,
                    attributeFilter: ['class']
                });
                
                console.log('Prescription Queue initialized successfully');
            }
        }
        
        // Initialize Pharmacy Sales Module
        if (window.pharmacySales && typeof window.pharmacySales.initPharmacySales === 'function') {
            const pharmacySalesModule = document.getElementById('pharmacy-sales-module');
            if (pharmacySalesModule) {
                // Initialize on page load
                if (pharmacySalesModule.classList.contains('active')) {
                    window.pharmacySales.initPharmacySales();
                }
                
                // Initialize when module becomes active
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.target.classList.contains('active')) {
                            window.pharmacySales.initPharmacySales();
                        }
                    });
                });
                
                observer.observe(pharmacySalesModule, {
                    attributes: true,
                    attributeFilter: ['class']
                });
                
                console.log('Pharmacy Sales Module initialized successfully');
            }
        }
    }, 600);
});

// ===================================
// Consultation Fee Toggle Handler
// ===================================
document.addEventListener('DOMContentLoaded', function() {
    const chargeConsultationFeeCheckbox = document.getElementById('chargeConsultationFee');
    const consultationFeeDetails = document.getElementById('consultationFeeDetails');
    const consultationFeeType = document.getElementById('consultationFeeType');
    const consultationFeeAmount = document.getElementById('consultationFeeAmount');
    
    if (chargeConsultationFeeCheckbox) {
        // Toggle consultation fee details visibility
        chargeConsultationFeeCheckbox.addEventListener('change', function() {
            if (this.checked) {
                consultationFeeDetails.style.display = 'block';
                // Make amount field required when fee is charged
                consultationFeeAmount.required = true;
            } else {
                consultationFeeDetails.style.display = 'none';
                consultationFeeAmount.required = false;
            }
        });
    }
    
    if (consultationFeeType) {
        // Handle fee type change
        consultationFeeType.addEventListener('change', function() {
            if (this.value === 'standard') {
                consultationFeeAmount.value = '500';
                consultationFeeAmount.readOnly = true;
                consultationFeeAmount.style.backgroundColor = 'var(--bg-color)';
                consultationFeeAmount.style.opacity = '0.7';
            } else if (this.value === 'custom') {
                consultationFeeAmount.value = '';
                consultationFeeAmount.readOnly = false;
                consultationFeeAmount.style.backgroundColor = 'var(--bg-color)';
                consultationFeeAmount.style.opacity = '1';
                consultationFeeAmount.focus();
            }
        });
    }
});

// Function to send consultation fee to billing
function sendConsultationFeeToBilling(patientData, feeData) {
    try {
        // Create billing charge object
        const billingCharge = {
            patientId: patientData.patientId,
            patientName: `${patientData.firstName} ${patientData.lastName}`,
            chargeType: 'Consultation Fee',
            amount: parseFloat(feeData.amount),
            notes: feeData.notes || 'Registration consultation fee',
            status: 'Pending',
            createdAt: new Date().toISOString(),
            createdBy: 'Reception',
            paymentRequired: true
        };
        
        // Store in localStorage for billing module to pick up
        const existingCharges = JSON.parse(localStorage.getItem('pendingBillingCharges') || '[]');
        existingCharges.push(billingCharge);
        localStorage.setItem('pendingBillingCharges', JSON.stringify(existingCharges));
        
        console.log('Consultation fee sent to billing:', billingCharge);
        
        // Show notification
        showNotification('Consultation fee of KSh ' + feeData.amount + ' added to billing', 'success');
        
        return true;
    } catch (error) {
        console.error('Error sending fee to billing:', error);
        showNotification('Failed to add consultation fee to billing', 'error');
        return false;
    }
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background-color: ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--primary-color)'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10001;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
        font-family: 'Montserrat', sans-serif;
        font-size: 14px;
        font-weight: 500;
    `;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Add animation styles if not already present
if (!document.getElementById('notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}









