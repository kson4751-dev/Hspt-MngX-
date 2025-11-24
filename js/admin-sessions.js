// Admin Sessions and Department Monitoring Module
// Real-time active sessions and department activity tracking

import { db } from './firebase-config.js';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let sessionsUnsubscribe = null;

// Setup Active Sessions monitoring
export function setupActiveSessions() {
    const refreshBtn = document.getElementById('refreshSessionsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadActiveSessions();
            loadRecentLogins();
        });
    }
}

// Load active user sessions with real-time updates
export async function loadActiveSessions() {
    const sessionsGrid = document.getElementById('activeSessionsGrid');
    const sessionCountBadge = document.getElementById('activeSessionCount');
    
    if (!sessionsGrid) return;
    
    try {
        // Unsubscribe from previous listener
        if (sessionsUnsubscribe) {
            sessionsUnsubscribe();
        }
        
        // Query active sessions
        const sessionsQuery = query(
            collection(db, 'user_sessions'),
            where('status', '==', 'active'),
            orderBy('loginTime', 'desc')
        );
        
        sessionsUnsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
            if (snapshot.empty) {
                sessionsGrid.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--text-secondary); grid-column: 1/-1;">
                        <i class="fas fa-user-slash" style="font-size: 48px; opacity: 0.3;"></i>
                        <p style="margin-top: 16px;">No active sessions</p>
                    </div>
                `;
                if (sessionCountBadge) sessionCountBadge.textContent = '0';
                return;
            }
            
            sessionsGrid.innerHTML = '';
            if (sessionCountBadge) sessionCountBadge.textContent = snapshot.size;
            
            snapshot.forEach((doc) => {
                const session = doc.data();
                const sessionCard = createSessionCard(session);
                sessionsGrid.innerHTML += sessionCard;
            });
        });
        
    } catch (error) {
        console.error('Error loading active sessions:', error);
        sessionsGrid.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--danger-color); grid-column: 1/-1;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px;"></i>
                <p style="margin-top: 16px;">Error loading sessions</p>
            </div>
        `;
    }
}

// Create session card HTML
function createSessionCard(session) {
    const loginTime = session.loginTime?.toDate ? session.loginTime.toDate() : new Date();
    const lastActivity = session.lastActivity?.toDate ? session.lastActivity.toDate() : new Date();
    const duration = getSessionDuration(loginTime);
    const initials = session.userName ? session.userName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
    
    return `
        <div class="session-item">
            <div class="session-info">
                <div class="session-avatar">${initials}</div>
                <div class="session-details">
                    <h4>${session.userName || 'Unknown User'}</h4>
                    <p><i class="fas fa-envelope"></i> ${session.userEmail || 'N/A'}</p>
                    <p><i class="fas fa-user-tag"></i> ${session.userRole || 'N/A'} - ${session.department || 'N/A'}</p>
                    <p><i class="fas fa-clock"></i> Logged in ${getTimeAgo(loginTime)}</p>
                </div>
            </div>
            <div class="session-status">
                <div class="status-indicator"></div>
                <div class="session-duration">${duration}</div>
            </div>
        </div>
    `;
}

// Get session duration
function getSessionDuration(startTime) {
    const now = new Date();
    const diff = now - startTime;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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

// Load recent login activity
export async function loadRecentLogins() {
    const timeline = document.getElementById('recentLoginsTimeline');
    if (!timeline) return;
    
    try {
        const logsQuery = query(
            collection(db, 'activity_logs'),
            where('type', 'in', ['login', 'logout', 'access_denied']),
            orderBy('timestamp', 'desc'),
            limit(15)
        );
        
        const snapshot = await getDocs(logsQuery);
        
        if (snapshot.empty) {
            timeline.innerHTML = `
                <div class="log-item">
                    <div class="log-icon log-icon-info">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="log-content">
                        <p>No recent login activity</p>
                    </div>
                </div>
            `;
            return;
        }
        
        timeline.innerHTML = '';
        snapshot.forEach((doc) => {
            const log = doc.data();
            timeline.innerHTML += createLogItem(log);
        });
        
    } catch (error) {
        console.error('Error loading recent logins:', error);
        timeline.innerHTML = `
            <div class="log-item">
                <div class="log-icon log-icon-error">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="log-content">
                    <p style="color: var(--danger-color);">Error loading login activity</p>
                </div>
            </div>
        `;
    }
}

// Create log item HTML
function createLogItem(log) {
    const timestamp = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
    const timeAgo = getTimeAgo(timestamp);
    const iconClass = getLogIconClass(log.type);
    const icon = getLogIcon(log.type);
    
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
        'login': 'sign-in-alt',
        'logout': 'sign-out-alt',
        'access_denied': 'ban',
        'access_granted': 'check-circle'
    };
    return icons[type] || 'circle';
}

// Get log icon class based on type
function getLogIconClass(type) {
    const classes = {
        'login': 'log-icon-success',
        'logout': 'log-icon-warning',
        'access_denied': 'log-icon-error',
        'access_granted': 'log-icon-success'
    };
    return classes[type] || 'log-icon-info';
}

// Load department activity
export async function loadDepartmentActivity() {
    const grid = document.getElementById('departmentActivityGrid');
    if (!grid) return;
    
    try {
        // Get all active sessions
        const sessionsQuery = query(
            collection(db, 'user_sessions'),
            where('status', '==', 'active')
        );
        
        const snapshot = await getDocs(sessionsQuery);
        
        // Group by department
        const departments = {};
        snapshot.forEach((doc) => {
            const session = doc.data();
            const dept = session.department || 'Unassigned';
            
            if (!departments[dept]) {
                departments[dept] = {
                    name: dept,
                    activeUsers: 0,
                    users: []
                };
            }
            
            departments[dept].activeUsers++;
            departments[dept].users.push({
                name: session.userName,
                role: session.userRole,
                loginTime: session.loginTime?.toDate ? session.loginTime.toDate() : new Date()
            });
        });
        
        // Render department cards
        if (Object.keys(departments).length === 0) {
            grid.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary); grid-column: 1/-1;">
                    <i class="fas fa-building" style="font-size: 48px; opacity: 0.3;"></i>
                    <p style="margin-top: 16px;">No active department activity</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = '';
        Object.values(departments).forEach(dept => {
            grid.innerHTML += createDepartmentCard(dept);
        });
        
    } catch (error) {
        console.error('Error loading department activity:', error);
        grid.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--danger-color); grid-column: 1/-1;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px;"></i>
                <p style="margin-top: 16px;">Error loading department activity</p>
            </div>
        `;
    }
}

// Create department card HTML
function createDepartmentCard(dept) {
    const recentUser = dept.users[0];
    const lastActivity = recentUser ? getTimeAgo(recentUser.loginTime) : 'N/A';
    
    return `
        <div class="department-item">
            <div class="department-header">
                <h4 class="department-name"><i class="fas fa-building"></i> ${dept.name}</h4>
                <span class="active-users-count">
                    <i class="fas fa-users"></i> ${dept.activeUsers}
                </span>
            </div>
            <div class="department-stats">
                <div>
                    <i class="fas fa-clock"></i>
                    <span>Last activity ${lastActivity}</span>
                </div>
            </div>
        </div>
    `;
}

console.log('✅ Admin sessions monitoring loaded');
