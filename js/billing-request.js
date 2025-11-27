// ===================================
// BILLING REQUEST MODULE - RxFlow HMS
// Real-time Department Billing Requests
// Firebase Firestore + Realtime Database Integration
// ===================================

import { 
    db, 
    realtimeDb,
    collection, 
    addDoc, 
    getDocs, 
    updateDoc,
    deleteDoc,
    doc, 
    query, 
    orderBy, 
    where, 
    onSnapshot, 
    serverTimestamp,
    limit,
    dbRef,
    set,
    get,
    onValue,
    push,
    remove
} from './firebase-config.js';
import { logActivity } from './firebase-helpers.js';

// ===================================
// MODULE STATE
// ===================================
const BillingRequestState = {
    allRequests: [],
    filteredRequests: [],
    processedRequests: [],
    currentFilter: 'all',
    searchTerm: '',
    currentPage: 1,
    pageSize: 25,
    initialized: false,
    unsubscribeRequests: null,
    listenersAttached: false
};

// ===================================
// UTILITIES
// ===================================
const $ = (id) => document.getElementById(id);

const formatMoney = (amount) => {
    const num = parseFloat(amount) || 0;
    return `KSh ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
};

const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

const notify = (message, type = 'info') => {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    }
};

const getUserContext = () => {
    if (typeof window === 'undefined') return {};
    const storage = window.localStorage?.getItem('userId') ? window.localStorage : window.sessionStorage;
    if (!storage) return {};
    return {
        userId: storage.getItem('userId') || '',
        userName: storage.getItem('userName') || 'System',
        userRole: storage.getItem('userRole') || 'Staff'
    };
};

// ===================================
// INITIALIZATION
// ===================================
export async function initBillingRequestModule() {
    if (BillingRequestState.initialized) {
        console.log('BillingRequest: Already initialized');
        renderRequestQueue();
        renderProcessedTable();
        return;
    }
    
    console.log('BillingRequest: Initializing...');
    
    try {
        attachEventListeners();
        startRealtimeListener();
        updateStats();
        
        BillingRequestState.initialized = true;
        console.log('BillingRequest: Ready ✓');
    } catch (err) {
        console.error('BillingRequest: Init failed', err);
        notify('Failed to initialize billing requests', 'error');
    }
}

// ===================================
// EVENT LISTENERS
// ===================================
function attachEventListeners() {
    if (BillingRequestState.listenersAttached) return;
    
    // Search input
    const searchInput = $('requestQueueSearch');
    if (searchInput) {
        let searchTimer;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            BillingRequestState.searchTerm = e.target.value.toLowerCase().trim();
            searchTimer = setTimeout(() => {
                filterAndRenderQueue();
            }, 300);
        });
    }
    
    BillingRequestState.listenersAttached = true;
    console.log('BillingRequest: Event listeners attached');
}

// ===================================
// REALTIME LISTENER - FIRESTORE + RTDB
// ===================================
function startRealtimeListener() {
    if (BillingRequestState.unsubscribeRequests) {
        console.log('BillingRequest: Listener already active');
        return;
    }
    
    try {
        // PRIMARY: Firestore real-time listener
        const q = query(
            collection(db, 'billing_requests'),
            orderBy('createdAt', 'desc')
        );
        
        BillingRequestState.unsubscribeRequests = onSnapshot(q, 
            (snapshot) => {
                console.log(`BillingRequest: Firestore received ${snapshot.docs.length} requests`);
                
                const requests = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                BillingRequestState.allRequests = requests;
                
                // Sync to Realtime Database for backup and cross-platform access
                syncToRealtimeDatabase(requests);
                
                updateStats();
                filterAndRenderQueue();
                updateBadgeCount();
                
                // Show notification for new requests
                checkForNewRequests(requests);
            },
            (error) => {
                console.error('BillingRequest: Firestore listener error', error);
                notify('Failed to load billing requests', 'error');
                
                // Fallback to Realtime Database
                startRealtimeDatabaseListener();
            }
        );
        
        console.log('BillingRequest: Firestore real-time listener started');
        
    } catch (err) {
        console.error('BillingRequest: Failed to start Firestore listener', err);
        // Fallback to Realtime Database
        startRealtimeDatabaseListener();
    }
}

// ===================================
// REALTIME DATABASE LISTENER (FALLBACK)
// ===================================
function startRealtimeDatabaseListener() {
    try {
        const requestsRef = dbRef(realtimeDb, 'billing_requests');
        
        onValue(requestsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const requests = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                
                // Sort by createdAt descending
                requests.sort((a, b) => {
                    const dateA = new Date(a.dateTime || a.createdAt || 0);
                    const dateB = new Date(b.dateTime || b.createdAt || 0);
                    return dateB - dateA;
                });
                
                console.log(`BillingRequest: Realtime DB received ${requests.length} requests`);
                BillingRequestState.allRequests = requests;
                
                updateStats();
                filterAndRenderQueue();
                updateBadgeCount();
            }
        }, (error) => {
            console.error('BillingRequest: Realtime DB listener error', error);
        });
        
        console.log('BillingRequest: Realtime Database listener started (fallback mode)');
        
    } catch (err) {
        console.error('BillingRequest: Failed to start Realtime DB listener', err);
    }
}

// ===================================
// SYNC TO REALTIME DATABASE
// ===================================
async function syncToRealtimeDatabase(requests) {
    try {
        const requestsRef = dbRef(realtimeDb, 'billing_requests');
        const requestsObj = {};
        
        requests.forEach(request => {
            requestsObj[request.id] = {
                ...request,
                // Convert Firestore Timestamps to ISO strings
                createdAt: request.createdAt?.toDate?.() 
                    ? request.createdAt.toDate().toISOString() 
                    : request.createdAt,
                processedAt: request.processedAt?.toDate?.() 
                    ? request.processedAt.toDate().toISOString() 
                    : request.processedAt,
                pendingAt: request.pendingAt?.toDate?.() 
                    ? request.pendingAt.toDate().toISOString() 
                    : request.pendingAt
            };
            delete requestsObj[request.id].id; // Remove duplicate id field
        });
        
        await set(requestsRef, requestsObj);
        console.log('BillingRequest: Synced to Realtime Database');
        
    } catch (err) {
        console.warn('BillingRequest: Failed to sync to Realtime DB', err);
    }
}

// ===================================
// CHECK FOR NEW REQUESTS (NOTIFICATIONS)
// ===================================
let lastNewRequestCount = 0;

function checkForNewRequests(requests) {
    const newCount = requests.filter(r => r.status === 'new').length;
    
    // If new requests increased, show notification
    if (newCount > lastNewRequestCount && lastNewRequestCount > 0) {
        const diff = newCount - lastNewRequestCount;
        notify(`${diff} new billing request${diff > 1 ? 's' : ''} received!`, 'info');
        
        // Play notification sound if available
        if (typeof window.playNotificationSound === 'function') {
            window.playNotificationSound();
        }
    }
    
    lastNewRequestCount = newCount;
}

// ===================================
// STATS UPDATE
// ===================================
function updateStats() {
    const newCount = BillingRequestState.allRequests.filter(r => r.status === 'new').length;
    const pendingCount = BillingRequestState.allRequests.filter(r => r.status === 'pending').length;
    
    // Count processed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const processedToday = BillingRequestState.allRequests.filter(r => {
        if (r.status !== 'processed') return false;
        const processedDate = r.processedAt ? new Date(r.processedAt) : null;
        return processedDate && processedDate >= today;
    }).length;
    
    const newEl = $('newRequestsCount');
    const pendingEl = $('pendingRequestsCount');
    const processedEl = $('processedRequestsCount');
    
    if (newEl) newEl.textContent = newCount;
    if (pendingEl) pendingEl.textContent = pendingCount;
    if (processedEl) processedEl.textContent = processedToday;
}

// ===================================
// BADGE UPDATE
// ===================================
function updateBadgeCount() {
    const badge = $('billingRequestBadge');
    if (!badge) return;
    
    const newCount = BillingRequestState.allRequests.filter(r => r.status === 'new').length;
    
    if (newCount > 0) {
        badge.textContent = newCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// ===================================
// FILTER QUEUE
// ===================================
function filterAndRenderQueue() {
    let filtered = [...BillingRequestState.allRequests];
    
    // Filter by status
    if (BillingRequestState.currentFilter !== 'all') {
        filtered = filtered.filter(r => r.status === BillingRequestState.currentFilter);
    } else {
        // For 'all', exclude processed to keep queue clean
        filtered = filtered.filter(r => r.status !== 'processed');
    }
    
    // Search filter
    if (BillingRequestState.searchTerm) {
        filtered = filtered.filter(r => {
            const term = BillingRequestState.searchTerm;
            return (
                (r.patientNumber || '').toLowerCase().includes(term) ||
                (r.patientName || '').toLowerCase().includes(term) ||
                (r.department || '').toLowerCase().includes(term) ||
                (r.serviceType || '').toLowerCase().includes(term)
            );
        });
    }
    
    BillingRequestState.filteredRequests = filtered;
    renderRequestQueue();
}

// ===================================
// RENDER REQUEST QUEUE
// ===================================
function renderRequestQueue() {
    const container = $('requestQueueContainer');
    if (!container) return;
    
    const requests = BillingRequestState.filteredRequests;
    
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state-content">
                <i class="fas fa-inbox"></i>
                <p>No ${BillingRequestState.currentFilter !== 'all' ? BillingRequestState.currentFilter : ''} requests found</p>
            </div>
        `;
        return;
    }
    
    const cards = requests.map(request => createRequestCard(request)).join('');
    container.innerHTML = cards;
}

// ===================================
// CREATE REQUEST CARD
// ===================================
function createRequestCard(request) {
    const deptClass = (request.department || '').toLowerCase().replace(/\s+/g, '-');
    const statusClass = request.status || 'new';
    const statusIcon = {
        'new': 'clock',
        'pending': 'hourglass-half',
        'processed': 'check-circle'
    }[statusClass] || 'clock';
    
    const timeAgo = getTimeAgo(request.createdAt);
    
    return `
        <div class="request-card status-${statusClass}" data-id="${request.id}">
            <div class="request-card-header">
                <span class="request-id">#${request.requestId || request.id.slice(-6)}</span>
                <span class="request-status-badge status-${statusClass}">
                    <i class="fas fa-${statusIcon}"></i>
                    ${statusClass}
                </span>
            </div>
            
            <div class="request-card-body">
                <div class="request-patient-info">
                    <div class="request-patient-name">${request.patientName || 'Unknown Patient'}</div>
                    <div class="request-patient-number">Patient #: ${request.patientNumber || 'N/A'}</div>
                </div>
                
                <div class="request-info-grid">
                    <div class="request-info-item">
                        <div class="request-info-label">Department</div>
                        <div class="request-info-value">
                            <span class="request-department-badge dept-${deptClass}">
                                <i class="fas fa-${getDepartmentIcon(request.department)}"></i>
                                ${request.department || 'N/A'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="request-info-item">
                        <div class="request-info-label">Service</div>
                        <div class="request-info-value">${request.serviceType || 'N/A'}</div>
                    </div>
                </div>
                
                <div class="request-amount-section">
                    <div class="request-amount-label">Amount to Bill</div>
                    ${(request.department === 'Laboratory' || request.department === 'Imaging' || request.department === 'Ward') && (request.amount === 0 || !request.amount) ? `
                        <div class="request-amount-editable">
                            <input type="number" 
                                   id="amount-${request.id}" 
                                   class="request-amount-input" 
                                   placeholder="Enter amount" 
                                   value="${request.amount || ''}"
                                   min="0"
                                   step="0.01"
                                   onchange="updateRequestAmount('${request.id}', this.value)">
                            <button class="btn-save-amount" onclick="saveRequestAmount('${request.id}')" title="Save Amount">
                                <i class="fas fa-check"></i>
                            </button>
                        </div>
                    ` : `
                        <div class="request-amount">${formatMoney(request.amount)}</div>
                    `}
                </div>
                
                <div class="request-meta">
                    <div class="request-time">
                        <i class="fas fa-clock"></i>
                        <span>${timeAgo}</span>
                    </div>
                    <div class="request-requester">
                        <i class="fas fa-user"></i>
                        <span>${request.requestedBy || 'Staff'}</span>
                    </div>
                </div>
            </div>
            
            <div class="request-card-footer">
                ${statusClass !== 'processed' ? `
                    <button class="btn btn-primary" onclick="processBillingRequest('${request.id}')">
                        <i class="fas fa-receipt"></i> Process Bill
                    </button>
                    <button class="btn btn-secondary" onclick="viewRequestDetails('${request.id}')">
                        <i class="fas fa-eye"></i> Details
                    </button>
                ` : `
                    <button class="btn btn-secondary" onclick="viewRequestDetails('${request.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                `}
            </div>
        </div>
    `;
}

// ===================================
// DEPARTMENT ICON HELPER
// ===================================
function getDepartmentIcon(department) {
    const icons = {
        'Reception': 'user-check',
        'Laboratory': 'flask',
        'Imaging': 'x-ray',
        'Pharmacy': 'pills',
        'Ward': 'bed'
    };
    return icons[department] || 'building';
}

// ===================================
// GLOBAL FUNCTIONS (Exposed to Window)
// ===================================

// Update request amount (stores temporarily)
window.updateRequestAmount = function(requestId, amount) {
    const request = BillingRequestState.allRequests.find(r => r.id === requestId);
    if (request) {
        request.tempAmount = parseFloat(amount) || 0;
    }
};

// Save request amount to Firebase
window.saveRequestAmount = async function(requestId) {
    const request = BillingRequestState.allRequests.find(r => r.id === requestId);
    if (!request) {
        notify('Request not found', 'error');
        return;
    }
    
    const amountInput = $(`amount-${requestId}`);
    const amount = parseFloat(amountInput?.value) || 0;
    
    if (amount <= 0) {
        notify('Please enter a valid amount greater than 0', 'error');
        amountInput?.focus();
        return;
    }
    
    try {
        // Update in Firestore
        const requestRef = doc(db, 'billing_requests', requestId);
        await updateDoc(requestRef, {
            amount: amount,
            amountUpdatedAt: new Date().toISOString(),
            amountUpdatedBy: getUserContext().userName || 'Biller'
        });
        
        // Update in Realtime Database
        const rtdbRef = dbRef(realtimeDb, `billing_requests/${requestId}`);
        await set(rtdbRef, {
            ...request,
            amount: amount,
            amountUpdatedAt: new Date().toISOString(),
            amountUpdatedBy: getUserContext().userName || 'Biller'
        });
        
        // Update local state
        request.amount = amount;
        
        notify(`Amount updated to ${formatMoney(amount)}`, 'success');
        
        // Re-render the card
        filterAndRenderQueue();
        
    } catch (err) {
        console.error('Failed to update amount:', err);
        notify('Failed to update amount. Please try again.', 'error');
    }
};

// Filter Queue
window.filterRequestQueue = function(status) {
    BillingRequestState.currentFilter = status;
    
    // Update active button
    ['queueFilterAll', 'queueFilterNew', 'queueFilterPending', 'queueFilterProcessed'].forEach(id => {
        const btn = $(id);
        if (btn) {
            btn.classList.toggle('active', id === `queueFilter${status.charAt(0).toUpperCase() + status.slice(1)}` || (status === 'all' && id === 'queueFilterAll'));
        }
    });
    
    filterAndRenderQueue();
};

// Refresh Requests
window.refreshBillingRequests = async function() {
    notify('Refreshing billing requests...', 'info');
    
    try {
        const snapshot = await getDocs(query(
            collection(db, 'billing_requests'),
            orderBy('createdAt', 'desc')
        ));
        
        BillingRequestState.allRequests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        updateStats();
        filterAndRenderQueue();
        updateBadgeCount();
        
        notify('Requests refreshed', 'success');
    } catch (err) {
        console.error('BillingRequest: Refresh failed', err);
        notify('Failed to refresh requests', 'error');
    }
};

// Process Billing Request
window.processBillingRequest = async function(requestId) {
    const request = BillingRequestState.allRequests.find(r => r.id === requestId);
    if (!request) {
        notify('Request not found', 'error');
        return;
    }
    
    // Remove request from queue (delete from Firebase)
    try {
        // Delete from Firestore
        await deleteDoc(doc(db, 'billing_requests', requestId));
        
        // Delete from Realtime Database
        try {
            const rtdbRef = dbRef(realtimeDb, `billing_requests/${requestId}`);
            await remove(rtdbRef);
        } catch (rtdbErr) {
            console.warn('BillingRequest: Failed to delete from RTDB', rtdbErr);
        }
        
        notify('Request removed from queue. Opening billing module...', 'success');
        
        // Pre-fill billing form with request data
        if (typeof window.prefillBillingForm === 'function') {
            window.prefillBillingForm(request);
        }
        
        // Navigate to billing module
        if (typeof window.showModule === 'function') {
            window.showModule('billing');
        }
        
    } catch (err) {
        console.error('BillingRequest: Failed to process', err);
        notify('Failed to process request', 'error');
    }
};

// View Request Details
window.viewRequestDetails = function(requestId) {
    const request = BillingRequestState.allRequests.find(r => r.id === requestId);
    if (!request) {
        notify('Request not found', 'error');
        return;
    }
    
    // Populate modal with request details
    const modal = document.getElementById('billingRequestDetailsModal');
    
    // Request ID and Status
    document.getElementById('detailRequestId').textContent = request.requestId || request.id;
    const statusBadge = document.getElementById('detailStatusBadge');
    statusBadge.textContent = request.status.toUpperCase();
    statusBadge.className = `status-badge status-${request.status}`;
    
    // Patient Information
    document.getElementById('detailPatientNumber').textContent = request.patientNumber || '-';
    document.getElementById('detailPatientName').textContent = request.patientName || '-';
    document.getElementById('detailPatientAge').textContent = request.patientAge || '-';
    document.getElementById('detailPatientGender').textContent = request.patientGender || '-';
    document.getElementById('detailPatientContact').textContent = request.patientContact || '-';
    
    // Service Information
    const deptBadge = document.getElementById('detailDepartment');
    deptBadge.textContent = request.department;
    deptBadge.className = `department-badge dept-${request.department.toLowerCase()}`;
    
    document.getElementById('detailServiceType').textContent = request.serviceType || '-';
    document.getElementById('detailAmount').textContent = formatMoney(request.amount);
    
    // Prescription Number (only for Pharmacy)
    const rxContainer = document.getElementById('detailRxNumberContainer');
    if (request.prescriptionNumber) {
        rxContainer.style.display = 'block';
        document.getElementById('detailRxNumber').textContent = request.prescriptionNumber;
    } else {
        rxContainer.style.display = 'none';
    }
    
    // Notes
    const notesContainer = document.getElementById('detailNotesContainer');
    if (request.notes) {
        notesContainer.style.display = 'block';
        document.getElementById('detailNotes').textContent = request.notes;
    } else {
        notesContainer.style.display = 'none';
    }
    
    // Request Information
    document.getElementById('detailRequestedBy').textContent = request.requestedBy || '-';
    document.getElementById('detailRequestedAt').textContent = formatDateTime(request.createdAt);
    
    // Processed Information (only for processed requests)
    const processedByContainer = document.getElementById('detailProcessedByContainer');
    const processedAtContainer = document.getElementById('detailProcessedAtContainer');
    const receiptNumberContainer = document.getElementById('detailReceiptNumberContainer');
    
    if (request.status === 'processed') {
        processedByContainer.style.display = 'block';
        processedAtContainer.style.display = 'block';
        document.getElementById('detailProcessedBy').textContent = request.processedBy || '-';
        document.getElementById('detailProcessedAt').textContent = formatDateTime(request.processedAt);
        
        if (request.receiptNumber) {
            receiptNumberContainer.style.display = 'block';
            document.getElementById('detailReceiptNumber').textContent = request.receiptNumber;
        } else {
            receiptNumberContainer.style.display = 'none';
        }
    } else {
        processedByContainer.style.display = 'none';
        processedAtContainer.style.display = 'none';
        receiptNumberContainer.style.display = 'none';
    }
    
    // Show the modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Store current request for printing
    window._currentRequestDetails = request;
};

// Close Billing Request Details Modal
window.closeBillingRequestDetails = function() {
    const modal = document.getElementById('billingRequestDetailsModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        window._currentRequestDetails = null;
    }, 300);
};

// Print Billing Request Details
window.printBillingRequestDetails = function() {
    const request = window._currentRequestDetails;
    if (!request) {
        notify('No request data available', 'error');
        return;
    }
    
    const printWindow = window.open('', '', 'height=400,width=300');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - ${request.requestId || request.id}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    padding: 20px;
                    width: 80mm;
                    margin: 0 auto;
                }
                .receipt {
                    border: 1px solid #000;
                    padding: 15px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 15px;
                    border-bottom: 1px dashed #000;
                    padding-bottom: 10px;
                }
                .header h2 {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 3px;
                }
                .header p {
                    font-size: 10px;
                }
                .section {
                    margin: 10px 0;
                    padding: 8px 0;
                    border-bottom: 1px dashed #000;
                }
                .section:last-of-type {
                    border-bottom: none;
                }
                .row {
                    display: flex;
                    justify-content: space-between;
                    margin: 3px 0;
                }
                .label {
                    font-weight: bold;
                }
                .value {
                    text-align: right;
                }
                .total {
                    margin-top: 10px;
                    padding-top: 8px;
                    border-top: 2px solid #000;
                    font-size: 14px;
                    font-weight: bold;
                }
                .footer {
                    text-align: center;
                    margin-top: 15px;
                    font-size: 10px;
                    padding-top: 10px;
                    border-top: 1px dashed #000;
                }
                .payment-status {
                    text-align: center;
                    margin: 15px 0;
                    padding: 10px;
                    border: 2px solid #000;
                    font-size: 16px;
                    font-weight: bold;
                    letter-spacing: 2px;
                }
                @media print {
                    body { padding: 0; }
                    .receipt { border: none; }
                }
            </style>
        </head>
        <body>
            <div class="receipt">
                <div class="header">
                    <h2>BILLING REQUEST</h2>
                    <p>Hospital Management System</p>
                    <p>${new Date().toLocaleString()}</p>
                </div>
                
                <div class="section">
                    <div class="row">
                        <span class="label">Request ID:</span>
                        <span class="value">${request.requestId || request.id}</span>
                    </div>
                </div>
                
                <div class="section">
                    <div class="row">
                        <span class="label">Patient:</span>
                        <span class="value">${request.patientName || '-'}</span>
                    </div>
                    <div class="row">
                        <span class="label">Patient #:</span>
                        <span class="value">${request.patientNumber || '-'}</span>
                    </div>
                    <div class="row">
                        <span class="label">Age/Gender:</span>
                        <span class="value">${request.patientAge || '-'} / ${request.patientGender || '-'}</span>
                    </div>
                </div>
                
                <div class="section">
                    <div class="row">
                        <span class="label">Department:</span>
                        <span class="value">${request.department}</span>
                    </div>
                    <div class="row">
                        <span class="label">Service:</span>
                        <span class="value">${request.serviceType || '-'}</span>
                    </div>
                    ${request.prescriptionNumber ? `
                    <div class="row">
                        <span class="label">Rx Number:</span>
                        <span class="value">${request.prescriptionNumber}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="section">
                    <div class="row total">
                        <span>AMOUNT:</span>
                        <span>${formatMoney(request.amount)}</span>
                    </div>
                </div>
                
                <div class="payment-status">
                    *** NOT PAID ***
                </div>
                
                <div class="section">
                    <div class="row">
                        <span class="label">Requested By:</span>
                        <span class="value">${request.requestedBy || '-'}</span>
                    </div>
                    <div class="row">
                        <span class="label">Time:</span>
                        <span class="value">${formatDateTime(request.createdAt)}</span>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Thank you!</p>
                    <p>Please proceed to billing</p>
                </div>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
};

// ===================================
// CREATE NEW BILLING REQUEST (For other modules)
// ===================================
export async function createBillingRequest(requestData) {
    try {
        const { userName } = getUserContext();
        
        const requestId = `BR${Date.now()}`;
        const timestamp = new Date().toISOString();
        
        const request = {
            requestId,
            patientNumber: requestData.patientNumber || '',
            patientName: requestData.patientName || '',
            patientId: requestData.patientId || '',
            department: requestData.department || '',
            serviceType: requestData.serviceType || '',
            amount: parseFloat(requestData.amount) || 0,
            notes: requestData.notes || '',
            status: 'new',
            requestedBy: requestData.requestedBy || userName,
            createdAt: serverTimestamp(),
            dateTime: timestamp
        };
        
        // Save to Firestore (Primary)
        const docRef = await addDoc(collection(db, 'billing_requests'), request);
        console.log('BillingRequest: Created in Firestore', docRef.id);
        
        // Save to Realtime Database (Backup/Sync)
        try {
            const rtdbRequest = {
                ...request,
                createdAt: timestamp, // Use ISO string for RTDB
                id: docRef.id
            };
            
            const rtdbRef = dbRef(realtimeDb, `billing_requests/${docRef.id}`);
            await set(rtdbRef, rtdbRequest);
            console.log('BillingRequest: Synced to Realtime Database');
        } catch (rtdbErr) {
            console.warn('BillingRequest: Failed to sync to RTDB', rtdbErr);
            // Continue even if RTDB sync fails
        }
        
        // Log activity
        await logActivity({
            module: 'Billing Request',
            type: 'billing_request',
            action: 'Request Created',
            patient: request.patientName,
            patientId: request.patientId,
            status: 'success',
            statusText: 'Created',
            description: `Billing request created for ${formatMoney(request.amount)} from ${request.department}`,
            metadata: {
                requestId: request.requestId,
                department: request.department,
                serviceType: request.serviceType,
                amount: request.amount
            }
        });
        
        // Send notification to billing staff
        try {
            if (typeof window.createNotification === 'function') {
                await window.createNotification(
                    'billing-staff', // Target billing role
                    'info',
                    'New Billing Request',
                    `${request.patientName} - ${request.department}: ${formatMoney(request.amount)}`,
                    'fa-file-invoice',
                    {
                        requestId: request.requestId,
                        amount: request.amount,
                        department: request.department
                    }
                );
            }
        } catch (notifErr) {
            console.warn('BillingRequest: Failed to send notification', notifErr);
        }
        
        return { success: true, id: docRef.id, requestId };
        
    } catch (err) {
        console.error('BillingRequest: Failed to create', err);
        throw err;
    }
}

// ===================================
// MARK REQUEST AS PROCESSED
// ===================================
export async function markRequestProcessed(requestId, receiptNumber, receiptId) {
    try {
        const { userName } = getUserContext();
        const timestamp = new Date().toISOString();
        
        const updateData = {
            status: 'processed',
            processedAt: serverTimestamp(),
            processedBy: userName,
            receiptNumber: receiptNumber || '',
            receiptId: receiptId || '',
            processedDateTime: timestamp
        };
        
        // Update Firestore (Primary)
        await updateDoc(doc(db, 'billing_requests', requestId), updateData);
        console.log('BillingRequest: Marked as processed in Firestore', requestId);
        
        // Update Realtime Database (Backup/Sync)
        try {
            const rtdbUpdateData = {
                ...updateData,
                processedAt: timestamp // Use ISO string for RTDB
            };
            
            const rtdbRef = dbRef(realtimeDb, `billing_requests/${requestId}`);
            const snapshot = await get(rtdbRef);
            
            if (snapshot.exists()) {
                await set(rtdbRef, {
                    ...snapshot.val(),
                    ...rtdbUpdateData
                });
                console.log('BillingRequest: Updated in Realtime Database');
            }
        } catch (rtdbErr) {
            console.warn('BillingRequest: Failed to update RTDB', rtdbErr);
            // Continue even if RTDB update fails
        }
        
        // Log activity
        await logActivity({
            module: 'Billing Request',
            type: 'billing_request',
            action: 'Request Processed',
            status: 'success',
            statusText: 'Processed',
            description: `Billing request ${requestId} processed. Receipt: ${receiptNumber}`,
            metadata: {
                requestId,
                receiptNumber,
                receiptId,
                processedBy: userName
            }
        });
        
        return { success: true };
        
    } catch (err) {
        console.error('BillingRequest: Failed to mark processed', err);
        throw err;
    }
}

// ===================================
// EXPOSE TO WINDOW FOR GLOBAL ACCESS
// ===================================
window.createBillingRequest = createBillingRequest;
window.markRequestProcessed = markRequestProcessed;

// Export for integration
export { initBillingRequestModule as default };
