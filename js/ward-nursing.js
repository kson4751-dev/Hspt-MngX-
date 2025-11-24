// Ward & Nursing Module - Complete Rebuild with Realtime Firebase
// Receives patients from Rx/Doctor module and manages ward operations

import { 
    subscribeToWardQueue, 
    subscribeToWardPatients, 
    admitPatientToWard, 
    updateWardQueueStatus,
    getPatient
} from './firebase-helpers.js';

// Global state
let wardQueue = [];
let wardPatients = [];
let queueUnsubscribe = null;
let patientsUnsubscribe = null;
let isInitialized = false;

// Initialize Ward & Nursing Module
export function initWardNursingModule() {
    // Prevent double initialization
    if (isInitialized) {
        console.log('ℹ️ Ward module already initialized, skipping...');
        return;
    }
    
    console.log('🏥 Initializing Ward & Nursing Module...');
    console.log('📍 Current URL:', window.location.href);
    console.log('🔍 Checking for wardQueueContainer element...');
    
    const container = document.getElementById('wardQueueContainer');
    if (container) {
        console.log('✅ wardQueueContainer found!');
    } else {
        console.warn('⚠️ wardQueueContainer NOT FOUND - may not be in DOM yet');
    }
    
    // Setup realtime listeners
    setupQueueListener();
    setupPatientsListener();
    
    // Setup UI handlers
    setupSearchAndFilters();
    
    isInitialized = true;
    console.log('✅ Ward & Nursing Module initialized successfully');
}

// ==================== REALTIME QUEUE LISTENER ====================
function setupQueueListener() {
    console.log('🔧 Setting up ward queue listener...');
    
    // Unsubscribe previous listener if exists
    if (queueUnsubscribe) {
        queueUnsubscribe();
    }
    
    // Subscribe to ward queue
    queueUnsubscribe = subscribeToWardQueue((queue) => {
        console.log('📥 Ward queue updated:', queue.length, 'patients');
        console.log('📋 Queue data:', queue);
        wardQueue = queue;
        renderQueue(queue);
        updateStats();
    });
    
    console.log('✅ Ward queue listener active and waiting for data...');
}

// Render queue cards
function renderQueue(queue) {
    console.log('🎨 Rendering queue with', queue.length, 'patients');
    
    const container = document.getElementById('wardQueueContainer');
    const badge = document.getElementById('queueBadge');
    
    if (!container) {
        console.error('❌ wardQueueContainer not found in DOM!');
        return;
    }
    
    console.log('✅ wardQueueContainer found:', container);
    
    // Deduplicate queue based on patientId (keep most recent)
    const uniqueQueue = [];
    const seenPatientIds = new Set();
    
    for (const patient of queue) {
        if (patient.patientId && !seenPatientIds.has(patient.patientId)) {
            seenPatientIds.add(patient.patientId);
            uniqueQueue.push(patient);
        } else if (!patient.patientId) {
            // Include patients without patientId (shouldn't happen, but safety)
            uniqueQueue.push(patient);
        } else {
            console.warn('⚠️ Duplicate patient found and skipped:', patient.patientId, patient.id);
        }
    }
    
    const displayCount = uniqueQueue.length;
    console.log('📊 After deduplication:', displayCount, 'unique patients (removed', queue.length - displayCount, 'duplicates)');
    
    // Update badge
    if (badge) {
        badge.textContent = displayCount;
        badge.style.display = displayCount > 0 ? 'inline-block' : 'none';
        console.log('✅ Queue badge updated:', displayCount);
    } else {
        console.warn('⚠️ queueBadge element not found');
    }
    
    // Show empty state if no queue
    if (displayCount === 0) {
        console.log('📭 Queue is empty, showing empty state');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No pending admissions from doctors</p>
                <small>Patients sent from Rx module will appear here</small>
            </div>
        `;
        return;
    }
    
    // Render queue cards
    console.log('✅ Rendering', displayCount, 'queue cards');
    container.innerHTML = uniqueQueue.map(patient => createQueueCard(patient)).join('');
    console.log('✅ Queue cards rendered successfully');
}

// Create queue card HTML
function createQueueCard(patient) {
    const isUrgent = patient.priority === 'urgent' || patient.priority === 'emergency';
    const urgentClass = isUrgent ? 'urgent-card' : '';
    
    return `
        <div class="ward-queue-card ${urgentClass}">
            <div class="card-header">
                <div class="patient-name">${patient.patientName || 'Unknown Patient'}</div>
                ${isUrgent ? '<span class="urgent-badge"><i class="fas fa-exclamation-triangle"></i> URGENT</span>' : ''}
            </div>
            
            <div class="card-body">
                <div class="info-row">
                    <i class="fas fa-id-card"></i>
                    <span><strong>ID:</strong> ${patient.patientId || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-user"></i>
                    <span><strong>Age:</strong> ${patient.age || 'N/A'} yrs</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-venus-mars"></i>
                    <span><strong>Gender:</strong> ${patient.gender || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-user-md"></i>
                    <span><strong>Referred by:</strong> Dr. ${patient.referringDoctor || 'Unknown'}</span>
                </div>
                <div class="info-row diagnosis">
                    <i class="fas fa-stethoscope"></i>
                    <span><strong>Diagnosis:</strong> ${patient.diagnosis || 'N/A'}</span>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="btn btn-sm btn-info" onclick="viewQueuePatient('${patient.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-sm btn-success" onclick="admitPatient('${patient.id}')">
                    <i class="fas fa-hospital-user"></i> Admit
                </button>
            </div>
        </div>
    `;
}

// ==================== REALTIME PATIENTS LISTENER ====================
function setupPatientsListener() {
    console.log('Setting up ward patients listener...');
    
    // Unsubscribe previous listener if exists
    if (patientsUnsubscribe) {
        patientsUnsubscribe();
    }
    
    // Subscribe to ward patients
    patientsUnsubscribe = subscribeToWardPatients((patients) => {
        console.log('📥 Ward patients updated:', patients.length, 'patients');
        wardPatients = patients;
        renderPatientsTable(patients);
        updateStats();
    });
}

// Render patients table
function renderPatientsTable(patients) {
    const tbody = document.getElementById('wardPatientsTableBody');
    
    if (!tbody) return;
    
    // Show empty state if no patients
    if (patients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-row">
                    <div class="empty-state">
                        <i class="fas fa-bed"></i>
                        <p>No patients in ward</p>
                        <small>Admitted patients will appear here</small>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Render patient rows
    tbody.innerHTML = patients.map(patient => createPatientRow(patient)).join('');
}

// Create patient table row
function createPatientRow(patient) {
    const statusClass = getStatusClass(patient.status);
    const admissionDate = formatDate(patient.admissionDate);
    
    return `
        <tr>
            <td><strong>${patient.patientId || 'N/A'}</strong></td>
            <td>${patient.patientName || 'Unknown'}</td>
            <td>${patient.age || 'N/A'}</td>
            <td>${patient.gender || 'N/A'}</td>
            <td><span class="bed-badge">${patient.bedNumber || 'Unassigned'}</span></td>
            <td>${admissionDate}</td>
            <td>${patient.diagnosis || 'N/A'}</td>
            <td><span class="status-badge ${statusClass}">${formatStatus(patient.status)}</span></td>
            <td>
                <div class="action-btn-group">
                    <button class="action-btn action-btn-view" onclick="viewWardPatient('${patient.id}')" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn action-btn-edit" onclick="editWardPatient('${patient.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn action-btn-print" onclick="printWardPatient('${patient.id}')" title="Print">
                        <i class="fas fa-print"></i>
                    </button>
                    <button class="action-btn action-btn-success" onclick="managePatient('${patient.id}')" title="Manage Patient">
                        <i class="fas fa-tasks"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// ==================== UPDATE STATISTICS ====================
function updateStats() {
    console.log('📊 Updating ward statistics...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Queue count (pending admissions)
    const queueCount = wardQueue.length;
    console.log('  Queue Count:', queueCount);
    
    // Total admitted (exclude discharged)
    const totalAdmitted = wardPatients.filter(p => p.status !== 'discharged').length;
    console.log('  Total Admitted (active):', totalAdmitted);
    
    // Admitted today
    const admittedToday = wardPatients.filter(p => {
        if (!p.admissionDate) return false;
        const admitDate = parseDate(p.admissionDate);
        admitDate.setHours(0, 0, 0, 0);
        return admitDate.getTime() === today.getTime();
    }).length;
    console.log('  Admitted Today:', admittedToday);
    
    // Occupied beds
    const occupiedBeds = wardPatients.filter(p => p.bedNumber && p.status !== 'discharged').length;
    console.log('  Occupied Beds:', occupiedBeds);
    
    // Update UI elements
    const updated = {
        wardQueueCount: updateElement('wardQueueCount', queueCount),
        wardTotalPatients: updateElement('wardTotalPatients', totalAdmitted),
        wardAdmittedToday: updateElement('wardAdmittedToday', admittedToday),
        wardOccupiedBeds: updateElement('wardOccupiedBeds', occupiedBeds)
    };
    
    console.log('✅ Statistics updated:', updated);
}

// ==================== SEARCH AND FILTERS ====================
function setupSearchAndFilters() {
    const searchInput = document.getElementById('wardSearchInput');
    const statusFilter = document.getElementById('wardStatusFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
}

function applyFilters() {
    const searchTerm = document.getElementById('wardSearchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('wardStatusFilter')?.value || '';
    
    const tbody = document.getElementById('wardPatientsTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        if (row.querySelector('.empty-row')) return;
        
        const text = row.textContent.toLowerCase();
        const statusBadge = row.querySelector('.status-badge');
        const status = statusBadge ? statusBadge.textContent.toLowerCase() : '';
        
        const matchesSearch = !searchTerm || text.includes(searchTerm);
        const matchesStatus = !statusFilter || status.includes(statusFilter.toLowerCase());
        
        row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
    });
}

// ==================== PATIENT ACTIONS ====================

// View queue patient details
window.viewQueuePatient = async function(queueId) {
    const patient = wardQueue.find(p => p.id === queueId);
    if (!patient) {
        alert('Patient not found in queue');
        return;
    }
    
    // Create modal with patient details
    alert(`Patient Details:\n\nID: ${patient.patientId}\nName: ${patient.patientName}\nAge: ${patient.age}\nGender: ${patient.gender}\nDiagnosis: ${patient.diagnosis || 'N/A'}\nReferred by: Dr. ${patient.referringDoctor || 'Unknown'}`);
};

// Admit patient from queue to ward
window.admitPatient = async function(queueId) {
    console.log('🏥 Admitting patient from queue:', queueId);
    
    const patient = wardQueue.find(p => p.id === queueId);
    if (!patient) {
        alert('Patient not found in queue');
        console.error('❌ Patient not found in queue:', queueId);
        return;
    }
    
    console.log('✅ Patient found:', patient);
    
    // Prompt for bed number
    const bedNumber = prompt(`Admit ${patient.patientName} to ward.\n\nEnter bed number:`);
    
    if (!bedNumber || bedNumber.trim() === '') {
        console.log('❌ Bed number not provided, admission cancelled');
        return;
    }
    
    const trimmedBedNumber = bedNumber.trim();
    console.log('🛏️ Bed number provided:', trimmedBedNumber);
    
    try {
        // Prepare admission data
        const admissionData = {
            patientId: patient.patientId,
            patientName: patient.patientName,
            age: patient.age,
            gender: patient.gender,
            diagnosis: patient.diagnosis,
            bedNumber: trimmedBedNumber,
            referringDoctor: patient.referringDoctor,
            priority: patient.priority || 'normal',
            status: 'admitted'
        };
        
        console.log('📝 Admission data prepared:', admissionData);
        
        // Add to ward admissions first
        console.log('➕ Adding to ward_admissions collection...');
        const result = await admitPatientToWard(admissionData);
        
        if (result.success) {
            console.log('✅ Patient added to ward_admissions with ID:', result.id);
            
            // Update queue status to remove from pending queue
            console.log('🔄 Updating queue status to "admitted"...');
            const updateResult = await updateWardQueueStatus(queueId, 'admitted');
            
            if (updateResult.success) {
                console.log('✅ Queue status updated successfully');
                console.log('🎉 Patient will now disappear from queue (status no longer "pending")');
                alert(`✅ ${patient.patientName} has been admitted to bed ${trimmedBedNumber}!`);
            } else {
                console.error('❌ Failed to update queue status:', updateResult.error);
                alert(`⚠️ Patient admitted but queue status update failed: ${updateResult.error}`);
            }
        } else {
            console.error('❌ Failed to admit patient:', result.error);
            alert('❌ Error admitting patient: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error during admission process:', error);
        alert('❌ Error admitting patient: ' + error.message);
    }
};

// View ward patient details
window.viewWardPatient = function(patientId) {
    const patient = wardPatients.find(p => p.id === patientId);
    if (!patient) {
        alert('Patient not found');
        return;
    }
    
    alert(`Patient: ${patient.patientName}\nID: ${patient.patientId}\nBed: ${patient.bedNumber}\nDiagnosis: ${patient.diagnosis || 'N/A'}\nStatus: ${patient.status || 'N/A'}`);
};

// Edit ward patient
window.editWardPatient = function(patientId) {
    const patient = wardPatients.find(p => p.id === patientId);
    if (!patient) {
        alert('Patient not found');
        return;
    }
    
    alert('Edit ward patient - Feature ready for implementation');
};

// Print ward patient
window.printWardPatient = function(patientId) {
    const patient = wardPatients.find(p => p.id === patientId);
    if (!patient) {
        alert('Patient not found');
        return;
    }
    
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Ward Patient - ' + patient.patientId + '</title>');
    printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h2>Ward Patient Record</h2>');
    printWindow.document.write('<p><strong>Patient ID:</strong> ' + patient.patientId + '</p>');
    printWindow.document.write('<p><strong>Name:</strong> ' + patient.patientName + '</p>');
    printWindow.document.write('<p><strong>Bed:</strong> ' + (patient.bedNumber || 'N/A') + '</p>');
    printWindow.document.write('<p><strong>Diagnosis:</strong> ' + (patient.diagnosis || 'N/A') + '</p>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
};

// Manage patient (full management interface)
window.managePatient = function(patientId) {
    const patient = wardPatients.find(p => p.id === patientId);
    if (!patient) {
        alert('Patient not found');
        return;
    }
    
    alert('Manage Patient - Opens full patient management interface with vitals, medications, reports, etc.');
};

// Refresh functions
window.refreshWardQueue = function() {
    console.log('Refreshing ward queue...');
    setupQueueListener();
    showNotification('Ward queue refreshed', 'success');
};

window.refreshWardPatients = function() {
    console.log('Refreshing ward patients...');
    setupPatientsListener();
    showNotification('Ward patients refreshed', 'success');
};

// ==================== HELPER FUNCTIONS ====================

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
        return { id, value, updated: true };
    } else {
        console.warn(`⚠️ Element not found: ${id}`);
        return { id, value, updated: false };
    }
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = parseDate(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function parseDate(timestamp) {
    if (timestamp && timestamp.toDate) {
        return timestamp.toDate();
    }
    return new Date(timestamp);
}

function formatStatus(status) {
    if (!status) return 'Admitted';
    return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusClass(status) {
    const statusMap = {
        'admitted': 'status-active',
        'stable': 'status-active',
        'critical': 'status-critical',
        'discharged': 'status-completed'
    };
    return statusMap[status] || 'status-active';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Cleanup function
export function cleanupWardNursingModule() {
    console.log('Cleaning up Ward & Nursing Module...');
    
    if (queueUnsubscribe) {
        queueUnsubscribe();
        queueUnsubscribe = null;
    }
    
    if (patientsUnsubscribe) {
        patientsUnsubscribe();
        patientsUnsubscribe = null;
    }
}

console.log('✅ Ward & Nursing module loaded');
