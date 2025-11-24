// Ward & Nursing Module - Complete Rebuild with Realtime Firebase
// Receives patients from Rx/Doctor module and manages ward operations

import { 
    subscribeToWardQueue, 
    subscribeToWardPatients, 
    admitPatientToWard, 
    updateWardQueueStatus,
    updateWardPatient,
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
            
            // Track ward admission activity
            if (window.trackWardAdmission) {
                window.trackWardAdmission(
                    patient.patientName,
                    patient.patientId,
                    admissionData.bedNumber
                );
            }
            
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
    console.log('👁️ Opening view modal for patient:', patientId);
    
    const patient = wardPatients.find(p => p.id === patientId);
    if (!patient) {
        alert('Patient not found');
        console.error('❌ Patient not found:', patientId);
        return;
    }
    
    console.log('✅ Patient data:', patient);
    
    // Populate modal fields
    document.getElementById('viewWardPatientId').textContent = patient.patientId || 'N/A';
    document.getElementById('viewWardPatientName').textContent = patient.patientName || 'N/A';
    document.getElementById('viewWardPatientAge').textContent = patient.age ? `${patient.age} years` : 'N/A';
    document.getElementById('viewWardPatientGender').textContent = patient.gender || 'N/A';
    document.getElementById('viewWardBedNumber').textContent = patient.bedNumber || 'Unassigned';
    document.getElementById('viewWardAdmissionDate').textContent = patient.admissionDate ? formatDate(patient.admissionDate) : 'N/A';
    document.getElementById('viewWardReferringDoctor').textContent = patient.referringDoctor || 'N/A';
    document.getElementById('viewWardStatus').textContent = formatStatus(patient.status);
    document.getElementById('viewWardDiagnosis').textContent = patient.diagnosis || 'No diagnosis recorded';
    document.getElementById('viewWardTreatmentPlan').textContent = patient.treatmentPlan || 'No treatment plan recorded';
    
    // Store patient ID for print function
    window.currentViewingWardPatient = patient;
    
    // Show modal
    document.getElementById('viewWardPatientModal').classList.add('active');
    console.log('✅ View modal opened');
};

window.closeViewWardPatientModal = function() {
    document.getElementById('viewWardPatientModal').classList.remove('active');
    window.currentViewingWardPatient = null;
};

window.printWardPatientFromModal = function() {
    if (window.currentViewingWardPatient) {
        printWardPatientData(window.currentViewingWardPatient);
    }
};

// Edit ward patient
window.editWardPatient = function(patientId) {
    console.log('✏️ Opening edit modal for patient:', patientId);
    
    const patient = wardPatients.find(p => p.id === patientId);
    if (!patient) {
        alert('Patient not found');
        console.error('❌ Patient not found:', patientId);
        return;
    }
    
    console.log('✅ Patient data:', patient);
    
    // Store patient document ID
    document.getElementById('editWardPatientDocId').value = patientId;
    
    // Populate read-only fields
    document.getElementById('editWardPatientIdDisplay').textContent = patient.patientId || 'N/A';
    document.getElementById('editWardPatientNameDisplay').textContent = patient.patientName || 'N/A';
    
    // Populate editable fields
    document.getElementById('editWardBedNumber').value = patient.bedNumber || '';
    document.getElementById('editWardStatus').value = patient.status || 'admitted';
    document.getElementById('editWardDiagnosis').value = patient.diagnosis || '';
    document.getElementById('editWardTreatmentPlan').value = patient.treatmentPlan || '';
    
    // Show modal
    document.getElementById('editWardPatientModal').classList.add('active');
    console.log('✅ Edit modal opened');
};

window.closeEditWardPatientModal = function() {
    document.getElementById('editWardPatientModal').classList.remove('active');
};

window.saveWardPatientChanges = async function() {
    console.log('💾 Saving ward patient changes...');
    
    const patientId = document.getElementById('editWardPatientDocId').value;
    if (!patientId) {
        alert('Error: Patient ID not found');
        return;
    }
    
    // Get updated values
    const updates = {
        bedNumber: document.getElementById('editWardBedNumber').value.trim(),
        status: document.getElementById('editWardStatus').value,
        diagnosis: document.getElementById('editWardDiagnosis').value.trim(),
        treatmentPlan: document.getElementById('editWardTreatmentPlan').value.trim()
    };
    
    console.log('📝 Updates to save:', updates);
    
    if (!updates.bedNumber) {
        alert('Bed number is required');
        return;
    }
    
    try {
        const result = await updateWardPatient(patientId, updates);
        
        if (result.success) {
            console.log('✅ Patient updated successfully');
            alert('✅ Patient information updated successfully!');
            closeEditWardPatientModal();
        } else {
            console.error('❌ Update failed:', result.error);
            alert('❌ Error updating patient: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error saving changes:', error);
        alert('❌ Error saving changes: ' + error.message);
    }
};

// Print ward patient
window.printWardPatient = function(patientId) {
    const patient = wardPatients.find(p => p.id === patientId);
    if (!patient) {
        alert('Patient not found');
        return;
    }
    
    printWardPatientData(patient);
};

// Helper function to print patient data
function printWardPatientData(patient) {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(`
        <html>
        <head>
            <title>Ward Patient - ${patient.patientId}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 30px; 
                    line-height: 1.6;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 15px;
                    margin-bottom: 25px;
                }
                .section {
                    margin-bottom: 20px;
                }
                .section-title {
                    font-weight: bold;
                    font-size: 16px;
                    color: #2563eb;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                    margin-bottom: 10px;
                }
                .info-row {
                    display: flex;
                    padding: 8px 0;
                    border-bottom: 1px solid #f0f0f0;
                }
                .info-label {
                    font-weight: bold;
                    width: 180px;
                    color: #555;
                }
                .info-value {
                    flex: 1;
                    color: #333;
                }
                .urgent {
                    background: #ef4444;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Ward Patient Information</h2>
                <p>Patient ID: ${patient.patientId}</p>
                <p>Print Date: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="section">
                <div class="section-title">Patient Information</div>
                <div class="info-row">
                    <div class="info-label">Patient Name:</div>
                    <div class="info-value">${patient.patientName || patient.name || 'N/A'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Age:</div>
                    <div class="info-value">${patient.age || 'N/A'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Gender:</div>
                    <div class="info-value">${patient.gender || 'N/A'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Priority:</div>
                    <div class="info-value">
                        ${patient.priority === 'urgent' ? '<span class="urgent">URGENT</span>' : 'Normal'}
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Admission Details</div>
                <div class="info-row">
                    <div class="info-label">Bed Number:</div>
                    <div class="info-value">${patient.bedNumber || 'Not assigned'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Admission Date:</div>
                    <div class="info-value">${patient.admissionDate || 'N/A'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Admitted By:</div>
                    <div class="info-value">${patient.admittedBy || 'N/A'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Status:</div>
                    <div class="info-value">${patient.status || 'N/A'}</div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Clinical Information</div>
                <div class="info-row">
                    <div class="info-label">Diagnosis:</div>
                    <div class="info-value">${patient.diagnosis || 'N/A'}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Treatment Plan:</div>
                    <div class="info-value">${patient.treatmentPlan || 'N/A'}</div>
                </div>
                ${patient.notes ? `
                <div class="info-row">
                    <div class="info-label">Notes:</div>
                    <div class="info-value">${patient.notes}</div>
                </div>
                ` : ''}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}


// ==================== PATIENT MANAGEMENT MODAL ====================

// Global state for current patient being managed
let currentManagedPatient = null;
let vitalsUnsubscribe = null;
let notesUnsubscribe = null;
let medicationsUnsubscribe = null;

// Manage patient (full management interface)
window.managePatient = async function(patientId) {
    console.log('🏥 Opening patient management for:', patientId);
    
    const patient = wardPatients.find(p => p.id === patientId);
    if (!patient) {
        alert('Patient not found');
        console.error('❌ Patient not found:', patientId);
        return;
    }
    
    currentManagedPatient = patient;
    
    // Store patient ID
    document.getElementById('managePatientDocId').value = patientId;
    
    // Populate header
    document.getElementById('managePatientName').textContent = patient.patientName || 'N/A';
    document.getElementById('managePatientId').textContent = patient.patientId || 'N/A';
    document.getElementById('managePatientAge').textContent = patient.age ? `${patient.age} years` : 'N/A';
    document.getElementById('managePatientGender').textContent = patient.gender || 'N/A';
    document.getElementById('managePatientBed').textContent = patient.bedNumber || 'Not assigned';
    document.getElementById('managePatientStatus').textContent = formatStatus(patient.status);
    
    // Populate treatment tab
    document.getElementById('currentDiagnosis').value = patient.diagnosis || '';
    document.getElementById('currentTreatmentPlan').value = patient.treatmentPlan || '';
    
    // Setup realtime listeners for history data
    setupVitalsListener(patientId);
    setupNotesListener(patientId);
    setupMedicationsListener(patientId);
    
    // Load discharge summary if exists
    loadDischargeSummary(patient);
    
    // Show modal
    document.getElementById('managePatientModal').classList.add('active');
    
    // Switch to first tab
    switchManageTab('vitals');
    
    console.log('✅ Patient management modal opened');
};

window.closeManagePatientModal = function() {
    document.getElementById('managePatientModal').classList.remove('active');
    currentManagedPatient = null;
    
    // Cleanup realtime listeners
    if (vitalsUnsubscribe) {
        vitalsUnsubscribe();
        vitalsUnsubscribe = null;
    }
    if (notesUnsubscribe) {
        notesUnsubscribe();
        notesUnsubscribe = null;
    }
    if (medicationsUnsubscribe) {
        medicationsUnsubscribe();
        medicationsUnsubscribe = null;
    }
};

// Tab switching
window.switchManageTab = function(tabName) {
    // Remove active class from all tabs and panes
    document.querySelectorAll('.manage-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.style.display = 'none');
    
    // Add active class to selected tab and pane
    document.querySelector(`.manage-tab[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).style.display = 'block';
};

// ==================== VITALS MANAGEMENT ====================

window.saveVitals = async function() {
    console.log('💓 Saving vitals...');
    
    const patientId = document.getElementById('managePatientDocId').value;
    if (!patientId) {
        alert('Patient ID not found');
        return;
    }
    
    const vitals = {
        bloodPressure: document.getElementById('vitalBloodPressure').value.trim(),
        heartRate: document.getElementById('vitalHeartRate').value,
        temperature: document.getElementById('vitalTemperature').value,
        respiratoryRate: document.getElementById('vitalRespiratoryRate').value,
        oxygenSaturation: document.getElementById('vitalOxygenSaturation').value,
        weight: document.getElementById('vitalWeight').value,
        recordedAt: new Date().toISOString(),
        recordedBy: localStorage.getItem('currentUser') || 'Nurse'
    };
    
    // Validate
    if (!vitals.bloodPressure && !vitals.heartRate && !vitals.temperature) {
        alert('Please enter at least one vital sign');
        return;
    }
    
    try {
        // Save to patient's vitals subcollection
        const { doc, setDoc, collection } = await import('./firebase-config.js');
        const { db } = await import('./firebase-config.js');
        
        const vitalsRef = collection(db, 'ward_admissions', patientId, 'vitals');
        await setDoc(doc(vitalsRef), vitals);
        
        console.log('✅ Vitals saved');
        showNotification('✅ Vitals recorded successfully', 'success');
        
        // Clear form
        document.getElementById('vitalBloodPressure').value = '';
        document.getElementById('vitalHeartRate').value = '';
        document.getElementById('vitalTemperature').value = '';
        document.getElementById('vitalRespiratoryRate').value = '';
        document.getElementById('vitalOxygenSaturation').value = '';
        document.getElementById('vitalWeight').value = '';
        
        // Realtime listener will auto-update the display
        
    } catch (error) {
        console.error('❌ Error saving vitals:', error);
        alert('❌ Error saving vitals: ' + error.message);
    }
};

async function setupVitalsListener(patientId) {
    // Cleanup existing listener
    if (vitalsUnsubscribe) {
        vitalsUnsubscribe();
    }
    
    try {
        const { collection, query, orderBy, limit, onSnapshot, db } = await import('./firebase-config.js');
        console.log('👂 Setting up realtime vitals listener...');
        
        const vitalsRef = collection(db, 'ward_admissions', patientId, 'vitals');
        const q = query(vitalsRef, orderBy('recordedAt', 'desc'), limit(10));
        
        vitalsUnsubscribe = onSnapshot(q, (snapshot) => {
        
        const historyHtml = snapshot.empty ? 
            '<div class="empty-state"><i class="fas fa-heartbeat"></i><p>No vitals recorded yet</p></div>' :
            snapshot.docs.map(doc => {
                const vital = doc.data();
                return `
                    <div class="vital-record">
                        <div class="vital-record-header">
                            <span class="vital-record-time">${new Date(vital.recordedAt).toLocaleString()}</span>
                            <span class="vital-record-by">By: ${vital.recordedBy}</span>
                        </div>
                        <div class="vital-record-data">
                            ${vital.bloodPressure ? `<div class="vital-item"><div class="vital-item-label">BP</div><div class="vital-item-value">${vital.bloodPressure} mmHg</div></div>` : ''}
                            ${vital.heartRate ? `<div class="vital-item"><div class="vital-item-label">HR</div><div class="vital-item-value">${vital.heartRate} bpm</div></div>` : ''}
                            ${vital.temperature ? `<div class="vital-item"><div class="vital-item-label">Temp</div><div class="vital-item-value">${vital.temperature}°C</div></div>` : ''}
                            ${vital.respiratoryRate ? `<div class="vital-item"><div class="vital-item-label">RR</div><div class="vital-item-value">${vital.respiratoryRate}/min</div></div>` : ''}
                            ${vital.oxygenSaturation ? `<div class="vital-item"><div class="vital-item-label">SpO2</div><div class="vital-item-value">${vital.oxygenSaturation}%</div></div>` : ''}
                            ${vital.weight ? `<div class="vital-item"><div class="vital-item-label">Weight</div><div class="vital-item-value">${vital.weight} kg</div></div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        
            const element = document.getElementById('vitalsHistoryList');
            if (element) {
                element.innerHTML = historyHtml;
                console.log('✅ Vitals history updated (realtime)');
            }
        }, (error) => {
            console.error('❌ Error loading vitals:', error);
            const element = document.getElementById('vitalsHistoryList');
            if (element) {
                element.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading vitals</p></div>';
            }
        });
    } catch (error) {
        console.error('❌ Error setting up vitals listener:', error);
    }
}

// ==================== NOTES MANAGEMENT ====================

window.addClinicalNote = async function() {
    console.log('📝 Adding clinical note...');
    
    const patientId = document.getElementById('managePatientDocId').value;
    if (!patientId) {
        alert('Patient ID not found');
        return;
    }
    
    const noteType = document.getElementById('noteType').value;
    const noteContent = document.getElementById('noteContent').value.trim();
    
    if (!noteContent) {
        alert('Please enter note content');
        return;
    }
    
    const note = {
        type: noteType,
        content: noteContent,
        createdAt: new Date().toISOString(),
        createdBy: localStorage.getItem('currentUser') || 'Staff'
    };
    
    try {
        const { doc, setDoc, collection } = await import('./firebase-config.js');
        const { db } = await import('./firebase-config.js');
        
        const notesRef = collection(db, 'ward_admissions', patientId, 'notes');
        await setDoc(doc(notesRef), note);
        
        console.log('✅ Note added');
        showNotification('✅ Note added successfully', 'success');
        
        // Clear form
        document.getElementById('noteContent').value = '';
        
        // Realtime listener will auto-update
        
    } catch (error) {
        console.error('❌ Error adding note:', error);
        alert('❌ Error adding note: ' + error.message);
    }
};

async function setupNotesListener(patientId) {
    // Cleanup existing listener
    if (notesUnsubscribe) {
        notesUnsubscribe();
    }
    
    try {
        const { collection, query, orderBy, limit, onSnapshot, db } = await import('./firebase-config.js');
        console.log('👂 Setting up realtime notes listener...');
        
        const notesRef = collection(db, 'ward_admissions', patientId, 'notes');
        const q = query(notesRef, orderBy('createdAt', 'desc'), limit(20));
        
        notesUnsubscribe = onSnapshot(q, (snapshot) => {
            const notesHtml = snapshot.empty ?
                '<div class="empty-state"><i class="fas fa-notes-medical"></i><p>No notes recorded yet</p></div>' :
                snapshot.docs.map(doc => {
                    const note = doc.data();
                    return `
                        <div class="note-item ${note.type}">
                            <div class="note-header">
                                <span class="note-type">${note.type}</span>
                                <span class="note-time">${new Date(note.createdAt).toLocaleString()}</span>
                            </div>
                            <div class="note-content">${note.content}</div>
                            <div class="note-by">By: ${note.createdBy}</div>
                        </div>
                    `;
                }).join('');
            
            const element = document.getElementById('notesHistoryList');
            if (element) {
                element.innerHTML = notesHtml;
                console.log('✅ Notes history updated (realtime)');
            }
        }, (error) => {
            console.error('❌ Error loading notes:', error);
            const element = document.getElementById('notesHistoryList');
            if (element) {
                element.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading notes</p></div>';
            }
        });
    } catch (error) {
        console.error('❌ Error setting up notes listener:', error);
    }
}

// ==================== TREATMENT & MEDICATIONS ====================

window.addMedication = async function() {
    console.log('💊 Adding medication...');
    
    const patientId = document.getElementById('managePatientDocId').value;
    if (!patientId) {
        alert('Patient ID not found');
        return;
    }
    
    const name = document.getElementById('medicationName').value.trim();
    const dosage = document.getElementById('medicationDosage').value.trim();
    const frequency = document.getElementById('medicationFrequency').value.trim();
    
    if (!name || !dosage || !frequency) {
        alert('Please fill all medication fields');
        return;
    }
    
    const medication = {
        name,
        dosage,
        frequency,
        addedAt: new Date().toISOString(),
        addedBy: localStorage.getItem('currentUser') || 'Doctor',
        active: true
    };
    
    try {
        const { doc, setDoc, collection } = await import('./firebase-config.js');
        const { db } = await import('./firebase-config.js');
        
        const medsRef = collection(db, 'ward_admissions', patientId, 'medications');
        await setDoc(doc(medsRef), medication);
        
        console.log('✅ Medication added');
        showNotification('✅ Medication added successfully', 'success');
        
        // Clear form
        document.getElementById('medicationName').value = '';
        document.getElementById('medicationDosage').value = '';
        document.getElementById('medicationFrequency').value = '';
        
        // Realtime listener will auto-update
        
    } catch (error) {
        console.error('❌ Error adding medication:', error);
        alert('❌ Error adding medication: ' + error.message);
    }
};

async function setupMedicationsListener(patientId) {
    // Cleanup existing listener
    if (medicationsUnsubscribe) {
        medicationsUnsubscribe();
    }
    
    try {
        const { collection, query, where, onSnapshot, db } = await import('./firebase-config.js');
        console.log('👂 Setting up realtime medications listener...');
        
        const medsRef = collection(db, 'ward_admissions', patientId, 'medications');
        const q = query(medsRef, where('active', '==', true));
        
        medicationsUnsubscribe = onSnapshot(q, (snapshot) => {
        
        const medsHtml = snapshot.empty ?
            '<div class="empty-state"><i class="fas fa-prescription"></i><p>No medications prescribed yet</p></div>' :
            snapshot.docs.map(doc => {
                const med = doc.data();
                return `
                    <div class="medication-item">
                        <div class="medication-info">
                            <div class="medication-name">${med.name}</div>
                            <div class="medication-details">${med.dosage} | ${med.frequency}</div>
                        </div>
                        <div class="medication-actions">
                            <button class="btn btn-danger btn-sm" onclick="discontinueMedication('${doc.id}')">
                                <i class="fas fa-stop"></i> Discontinue
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        
            const element = document.getElementById('medicationsList');
            if (element) {
                element.innerHTML = medsHtml;
                console.log('✅ Medications list updated (realtime)');
            }
        }, (error) => {
            console.error('❌ Error loading medications:', error);
            const element = document.getElementById('medicationsList');
            if (element) {
                element.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading medications</p></div>';
            }
        });
    } catch (error) {
        console.error('❌ Error setting up medications listener:', error);
    }
}

window.discontinueMedication = async function(medId) {
    if (!confirm('Discontinue this medication?')) return;
    
    const patientId = document.getElementById('managePatientDocId').value;
    
    try {
        const { doc, updateDoc } = await import('./firebase-config.js');
        const { db } = await import('./firebase-config.js');
        
        await updateDoc(doc(db, 'ward_admissions', patientId, 'medications', medId), {
            active: false,
            discontinuedAt: new Date().toISOString()
        });
        
        showNotification('✅ Medication discontinued', 'success');
        // Realtime listener will auto-update
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error discontinuing medication');
    }
};

window.saveTreatmentPlan = async function() {
    console.log('💊 Saving treatment plan...');
    
    const patientId = document.getElementById('managePatientDocId').value;
    const diagnosis = document.getElementById('currentDiagnosis').value.trim();
    const treatmentPlan = document.getElementById('currentTreatmentPlan').value.trim();
    
    if (!diagnosis || !treatmentPlan) {
        alert('Please enter diagnosis and treatment plan');
        return;
    }
    
    try {
        const result = await updateWardPatient(patientId, { diagnosis, treatmentPlan });
        
        if (result.success) {
            showNotification('✅ Treatment plan updated', 'success');
        } else {
            alert('❌ Error: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error saving treatment plan');
    }
};

// ==================== DISCHARGE SUMMARY ====================

function loadDischargeSummary(patient) {
    // Pre-fill discharge form with current data
    document.getElementById('admissionReason').value = patient.admissionReason || '';
    document.getElementById('dischargeDiagnosis').value = patient.diagnosis || '';
    
    // Set discharge date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('dischargeDate').value = now.toISOString().slice(0, 16);
}

window.saveDischargeSummary = async function() {
    console.log('📄 Saving discharge summary...');
    
    const patientId = document.getElementById('managePatientDocId').value;
    
    const summary = {
        dischargeDate: document.getElementById('dischargeDate').value,
        admissionReason: document.getElementById('admissionReason').value.trim(),
        hospitalCourse: document.getElementById('hospitalCourse').value.trim(),
        dischargeDiagnosis: document.getElementById('dischargeDiagnosis').value.trim(),
        dischargeMedications: document.getElementById('dischargeMedications').value.trim(),
        followUpInstructions: document.getElementById('followUpInstructions').value.trim(),
        dischargeCondition: document.getElementById('dischargeCondition').value,
        createdAt: new Date().toISOString(),
        createdBy: localStorage.getItem('currentUser') || 'Doctor'
    };
    
    if (!summary.dischargeDiagnosis || !summary.dischargeCondition) {
        alert('Please fill discharge diagnosis and condition');
        return;
    }
    
    try {
        const { doc, setDoc } = await import('./firebase-config.js');
        const { db } = await import('./firebase-config.js');
        
        await setDoc(doc(db, 'ward_admissions', patientId, 'discharge', 'summary'), summary);
        
        showNotification('✅ Discharge summary saved', 'success');
        console.log('✅ Discharge summary saved');
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error saving discharge summary');
    }
};

window.printDischargeSummary = function() {
    const patient = currentManagedPatient;
    if (!patient) {
        alert('Patient data not found');
        return;
    }
    
    const summary = {
        dischargeDate: document.getElementById('dischargeDate').value,
        admissionReason: document.getElementById('admissionReason').value,
        hospitalCourse: document.getElementById('hospitalCourse').value,
        dischargeDiagnosis: document.getElementById('dischargeDiagnosis').value,
        dischargeMedications: document.getElementById('dischargeMedications').value,
        followUpInstructions: document.getElementById('followUpInstructions').value,
        dischargeCondition: document.getElementById('dischargeCondition').value
    };
    
    const printWindow = window.open('', '', 'height=800,width=900');
    printWindow.document.write(`
        <html>
        <head>
            <title>Discharge Summary - ${patient.patientId}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
                .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
                .hospital-name { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
                .document-title { font-size: 20px; font-weight: bold; margin-top: 10px; }
                .section { margin-bottom: 25px; }
                .section-title { font-weight: bold; font-size: 16px; color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px; }
                .info-row { display: flex; margin-bottom: 8px; }
                .info-label { font-weight: bold; min-width: 180px; color: #555; }
                .info-value { flex: 1; color: #333; }
                .content-block { background: #f9fafb; padding: 15px; border-radius: 5px; margin: 10px 0; white-space: pre-wrap; }
                .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
                .signature-line { margin-top: 40px; border-top: 1px solid #333; width: 300px; padding-top: 5px; }
                @media print { body { padding: 20px; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="hospital-name">Hospital Management System</div>
                <div class="document-title">DISCHARGE SUMMARY</div>
                <p style="margin-top: 10px; color: #666;">Printed on: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="section">
                <div class="section-title">Patient Information</div>
                <div class="info-row"><div class="info-label">Patient ID:</div><div class="info-value">${patient.patientId}</div></div>
                <div class="info-row"><div class="info-label">Patient Name:</div><div class="info-value">${patient.patientName}</div></div>
                <div class="info-row"><div class="info-label">Age:</div><div class="info-value">${patient.age} years</div></div>
                <div class="info-row"><div class="info-label">Gender:</div><div class="info-value">${patient.gender}</div></div>
                <div class="info-row"><div class="info-label">Bed Number:</div><div class="info-value">${patient.bedNumber}</div></div>
            </div>
            
            <div class="section">
                <div class="section-title">Admission & Discharge Details</div>
                <div class="info-row"><div class="info-label">Admission Date:</div><div class="info-value">${patient.admissionDate || 'N/A'}</div></div>
                <div class="info-row"><div class="info-label">Discharge Date:</div><div class="info-value">${summary.dischargeDate ? new Date(summary.dischargeDate).toLocaleString() : 'N/A'}</div></div>
                <div class="info-row"><div class="info-label">Discharge Condition:</div><div class="info-value"><strong>${summary.dischargeCondition}</strong></div></div>
            </div>
            
            <div class="section">
                <div class="section-title">Reason for Admission</div>
                <div class="content-block">${summary.admissionReason || 'Not specified'}</div>
            </div>
            
            <div class="section">
                <div class="section-title">Hospital Course</div>
                <div class="content-block">${summary.hospitalCourse || 'Not specified'}</div>
            </div>
            
            <div class="section">
                <div class="section-title">Discharge Diagnosis</div>
                <div class="content-block">${summary.dischargeDiagnosis || 'Not specified'}</div>
            </div>
            
            <div class="section">
                <div class="section-title">Discharge Medications</div>
                <div class="content-block">${summary.dischargeMedications || 'None'}</div>
            </div>
            
            <div class="section">
                <div class="section-title">Follow-up Instructions</div>
                <div class="content-block">${summary.followUpInstructions || 'Not specified'}</div>
            </div>
            
            <div class="footer">
                <div class="signature-line">
                    <div>Attending Physician Signature</div>
                </div>
                <p style="margin-top: 30px; color: #666; font-size: 12px;">This is a computer-generated document.</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
};

window.dischargePatient = async function() {
    if (!confirm('Discharge this patient? This will update their status to "discharged".')) {
        return;
    }
    
    const patientId = document.getElementById('managePatientDocId').value;
    
    try {
        const result = await updateWardPatient(patientId, { 
            status: 'discharged',
            dischargedAt: new Date().toISOString()
        });
        
        if (result.success) {
            showNotification('✅ Patient discharged successfully', 'success');
            closeManagePatientModal();
        } else {
            alert('❌ Error: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error discharging patient');
    }
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
