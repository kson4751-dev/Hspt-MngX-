// Imaging Module - Medical Imaging Services Management
import { db, storage, collection, addDoc, getDocs, doc, updateDoc, onSnapshot, ref, uploadBytes, getDownloadURL } from './firebase-config.js';

let imagingRequests = [];
let currentFilter = 'all';
let selectedPatientForImaging = null;
let currentEditingRequest = null;
let unsubscribeImaging = null;
let currentPatientMode = 'search';
let pendingFiles = []; // Files waiting to be uploaded

// Initialize Imaging Module
export function initImagingModule() {
    console.log('🔬 Initializing Imaging Module...');
    
    if (!db) {
        console.error('❌ Firebase DB not initialized');
        return;
    }
    
    // Set up real-time listener for imaging requests
    setupRealtimeListener();
    
    // Set up search functionality
    setupImagingSearch();
    
    console.log('✅ Imaging Module initialized');
}

// Make init function globally available
window.initImagingModule = initImagingModule;

// Setup real-time listener - REBUILT
function setupRealtimeListener() {
    // Unsubscribe from previous listener if exists
    if (unsubscribeImaging) {
        unsubscribeImaging();
        console.log('🔄 Unsubscribed from previous listener');
    }

    console.log('🔄 Setting up real-time listener for imaging_requests...');
    
    try {
        const imagingRef = collection(db, 'imaging_requests');
        
        unsubscribeImaging = onSnapshot(imagingRef, 
            (snapshot) => {
                console.log('📥 Received snapshot with', snapshot.size, 'documents');
                
                // Clear and rebuild array
                imagingRequests = [];
                
                snapshot.forEach((docSnapshot) => {
                    const data = docSnapshot.data();
                    imagingRequests.push({
                        id: docSnapshot.id,
                        ...data
                    });
                });
                
                // Sort by date (newest first)
                imagingRequests.sort((a, b) => {
                    const dateA = new Date(a.dateTime || a.createdAt || 0);
                    const dateB = new Date(b.dateTime || b.createdAt || 0);
                    return dateB - dateA; // Newest first
                });
                
                console.log('📊 Processed', imagingRequests.length, 'requests (sorted newest first)');
                if (imagingRequests.length > 0) {
                    const newest = new Date(imagingRequests[0].dateTime || imagingRequests[0].createdAt);
                    console.log('📅 Newest request:', newest.toLocaleString());
                }
                
                // Update all UI components
                renderStats();
                renderQueue();
                renderTable();
            },
            (error) => {
                console.error('❌ Listener error:', error);
            }
        );
        
        console.log('✅ Real-time listener active');
        
    } catch (error) {
        console.error('❌ Failed to setup listener:', error);
    }
}

// Render statistics
function renderStats() {
    const total = imagingRequests.length;
    const completed = imagingRequests.filter(r => r.status === 'Completed').length;
    // Queue count excludes reviewed patients
    const inQueue = imagingRequests.filter(r => 
        (r.status === 'Pending' || r.status === 'In Progress') && !r.reviewed
    ).length;

    const totalEl = document.getElementById('imagingTotalRequests');
    const completedEl = document.getElementById('imagingCompleted');
    const inQueueEl = document.getElementById('imagingInQueue');
    
    if (totalEl) totalEl.textContent = total;
    if (completedEl) completedEl.textContent = completed;
    if (inQueueEl) inQueueEl.textContent = inQueue;
    
    console.log('📈 Stats updated: Total:', total, 'Completed:', completed, 'In Queue:', inQueue);
}

// Render queue section - REBUILT
function renderQueue() {
    const container = document.getElementById('imagingQueueContainer');
    const emptyState = document.getElementById('imagingQueueEmpty');
    
    if (!container) {
        console.error('❌ Queue container not found');
        return;
    }
    
    // Filter queue requests - exclude reviewed patients
    let queueRequests = imagingRequests.filter(r => 
        (r.status === 'Pending' || r.status === 'In Progress') && !r.reviewed
    );
    
    // Apply filter
    if (currentFilter === 'pending') {
        queueRequests = queueRequests.filter(r => r.status === 'Pending');
    } else if (currentFilter === 'in-progress') {
        queueRequests = queueRequests.filter(r => r.status === 'In Progress');
    }
    
    console.log('📋 Queue has', queueRequests.length, 'items (filter:', currentFilter + ')');
    
    // Clear existing cards (but keep empty state)
    const existingCards = container.querySelectorAll('.imaging-queue-card');
    existingCards.forEach(card => card.remove());
    
    // Also remove the "more" indicator if exists
    const moreIndicator = container.querySelector('[data-more-indicator]');
    if (moreIndicator) moreIndicator.remove();
    
    if (queueRequests.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Limit queue to 5 patients max
    const displayRequests = queueRequests.slice(0, 5);
    const remainingCount = queueRequests.length - 5;
    
    // Create cards
    displayRequests.forEach(request => {
        const card = document.createElement('div');
        card.className = 'imaging-queue-card';
        card.setAttribute('data-id', request.id);
        
        const priorityColor = {
            'Emergency': '#e74c3c',
            'Urgent': '#f39c12',
            'Routine': '#3498db'
        }[request.priority] || '#3498db';
        
        const statusColor = {
            'Pending': '#f39c12',
            'In Progress': '#3498db'
        }[request.status] || '#f39c12';
        
        const date = new Date(request.dateTime || request.createdAt);
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div>
                    <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">${request.patientName || 'Unknown'}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${request.patientNumber || '-'}</div>
                </div>
                <span style="padding: 4px 10px; background: ${priorityColor}; color: white; border-radius: 6px; font-size: 11px; font-weight: 600;">
                    ${request.priority || 'Routine'}
                </span>
            </div>
            <div style="padding: 10px 0; border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); margin-bottom: 12px;">
                <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 4px;">
                    <strong>${request.imagingType || '-'}</strong> - ${request.bodyPart || '-'}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                    <i class="fas fa-clock" style="font-size: 10px;"></i> ${timeStr}
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <span style="padding: 4px 10px; background: ${statusColor}; color: white; border-radius: 6px; font-size: 11px; font-weight: 500;">
                    ${request.status || 'Pending'}
                </span>
                <div style="display: flex; gap: 6px;">
                    <button onclick="window.viewImagingRequest('${request.id}')" style="padding: 6px 10px; font-size: 11px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer;" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="window.markAsReviewed('${request.id}')" style="padding: 6px 10px; font-size: 11px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;" title="Mark as Reviewed">
                        <i class="fas fa-check"></i> Reviewed
                    </button>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Show remaining count if more than 5
    if (remainingCount > 0) {
        const moreCard = document.createElement('div');
        moreCard.style.cssText = 'text-align: center; padding: 16px; color: var(--text-secondary); font-size: 13px; background: var(--bg-secondary); border-radius: 10px; margin-top: 8px;';
        moreCard.innerHTML = `<i class="fas fa-ellipsis-h" style="margin-right: 6px;"></i> +${remainingCount} more in queue`;
        container.appendChild(moreCard);
    }
}

// Render table - REBUILT
function renderTable() {
    const tbody = document.getElementById('imagingTableBody');
    
    if (!tbody) {
        console.error('❌ Table body not found');
        return;
    }
    
    console.log('📋 Rendering table with', imagingRequests.length, 'rows (newest first)');
    
    if (imagingRequests.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-inbox" style="font-size: 40px; color: var(--text-secondary); opacity: 0.3; display: block; margin-bottom: 12px;"></i>
                    <span style="color: var(--text-secondary); font-size: 14px;">No imaging requests yet</span>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    // Use already sorted array (newest first from real-time listener)
    imagingRequests.forEach(request => {
        const date = new Date(request.dateTime || request.createdAt);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        const priorityColor = {
            'Emergency': '#e74c3c',
            'Urgent': '#f39c12',
            'Routine': '#3498db'
        }[request.priority] || '#3498db';
        
        const statusColor = {
            'Pending': '#f39c12',
            'In Progress': '#3498db',
            'Completed': '#2ecc71',
            'Cancelled': '#95a5a6'
        }[request.status] || '#f39c12';
        
        const hasResults = request.resultFiles && request.resultFiles.length > 0;
        
        html += `
            <tr data-id="${request.id}">
                <td><strong style="font-size: 13px;">#${(request.id || '').substring(0, 6).toUpperCase()}</strong></td>
                <td>
                    <div style="font-weight: 500;">${request.patientName || 'Unknown'}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${request.patientNumber || '-'}</div>
                </td>
                <td>
                    <strong>${request.imagingType || '-'}</strong><br>
                    <small style="color: var(--text-secondary);">${request.bodyPart || '-'}</small>
                </td>
                <td>
                    <span style="padding: 4px 8px; background: ${priorityColor}; color: white; border-radius: 6px; font-size: 11px; font-weight: 600;">
                        ${request.priority || 'Routine'}
                    </span>
                </td>
                <td>
                    <span style="padding: 6px 12px; background: ${statusColor}; color: white; border-radius: 6px; font-size: 12px; font-weight: 500; display: inline-block;">
                        ${request.status || 'Pending'}
                    </span>
                    ${hasResults ? '<i class="fas fa-paperclip" style="margin-left: 6px; color: #27ae60;" title="Has results"></i>' : ''}
                </td>
                <td>
                    <div style="font-size: 13px;">${dateStr}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${timeStr}</div>
                </td>
                <td>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button class="btn btn-sm" onclick="window.viewImagingRequest('${request.id}')" style="padding: 6px 10px; font-size: 11px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer;" title="View & Edit">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm" onclick="window.addRadiographerNote('${request.id}')" style="padding: 6px 10px; font-size: 11px; background: #16a085; color: white; border: none; border-radius: 6px; cursor: pointer;" title="Add Note">
                            <i class="fas fa-sticky-note"></i>
                        </button>
                        <button class="btn btn-sm" onclick="window.uploadImagingResults('${request.id}')" style="padding: 6px 10px; font-size: 11px; background: #9b59b6; color: white; border: none; border-radius: 6px; cursor: pointer;" title="Upload Results">
                            <i class="fas fa-upload"></i>
                        </button>
                        ${hasResults ? `
                        <button class="btn btn-sm" onclick="window.viewImagingResults('${request.id}')" style="padding: 6px 10px; font-size: 11px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;" title="View Results">
                            <i class="fas fa-file-medical"></i>
                        </button>
                        ` : ''}
                        ${hasResults && request.status !== 'Completed' ? `
                        <button class="btn btn-sm" onclick="window.quickSendToDoctor('${request.id}')" style="padding: 6px 10px; font-size: 11px; background: #e67e22; color: white; border: none; border-radius: 6px; cursor: pointer;" title="Send to Doctor">
                            <i class="fas fa-user-md"></i>
                        </button>
                        ` : ''}
                        ${request.status === 'Completed' && request.sentToDoctor ? `
                        <span style="padding: 6px 10px; font-size: 10px; background: #95a5a6; color: white; border-radius: 6px;" title="Already sent to doctor">
                            <i class="fas fa-check"></i> Sent
                        </span>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    console.log('✅ Table rendered successfully');
}

// Filter queue
window.filterImagingQueue = function(filter) {
    currentFilter = filter;
    renderQueue();

    // Update button styles
    document.querySelectorAll('.imaging-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = event.target.closest('button');
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
};

// Filter table by search term
function filterTable(searchTerm) {
    const tbody = document.getElementById('imagingTableBody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr[data-id]');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Setup search functionality
function setupImagingSearch() {
    const searchInput = document.getElementById('imagingSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterTable(searchTerm);
        });
    }
}

// Setup patient search (called when modal opens)
function setupPatientSearch() {
    const patientSearch = document.getElementById('imagingPatientSearch');
    if (patientSearch) {
        // Remove existing listeners
        const newInput = patientSearch.cloneNode(true);
        patientSearch.parentNode.replaceChild(newInput, patientSearch);
        
        // Add new listener for real-time Firestore search
        newInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            searchPatientsFromFirestore(searchTerm);
        });
    }
}

// Search patients directly from Firestore
async function searchPatientsFromFirestore(searchTerm) {
    const resultsContainer = document.getElementById('imagingPatientResults');
    
    if (!searchTerm || searchTerm.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    try {
        resultsContainer.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i> Searching patients...</div>';
        
        console.log('🔍 Searching for:', searchTerm);
        
        if (!db) {
            console.error('❌ Firebase DB not initialized');
            resultsContainer.innerHTML = '<div style="padding: 12px; color: #e74c3c; font-size: 13px; text-align: center;">Database not initialized</div>';
            return;
        }
        
        const patientsRef = collection(db, 'patients');
        const snapshot = await getDocs(patientsRef);
        
        console.log('📊 Total patients in database:', snapshot.size);
        
        const term = searchTerm.toLowerCase();
        const results = [];
        
        snapshot.forEach((docSnapshot) => {
            const patient = docSnapshot.data();
            // Search in multiple fields
            const firstName = (patient.firstName || '').toLowerCase();
            const lastName = (patient.lastName || '').toLowerCase();
            const fullName = (patient.fullName || patient.name || '').toLowerCase();
            const patientNumber = (patient.patientNumber || '').toLowerCase();
            const phone = (patient.phone || '').toLowerCase();
            const idNumber = (patient.idNumber || '').toLowerCase();
            
            // Check if search term matches any field
            if (firstName.includes(term) || 
                lastName.includes(term) || 
                fullName.includes(term) || 
                patientNumber.includes(term) ||
                phone.includes(term) ||
                idNumber.includes(term)) {
                results.push({
                    id: docSnapshot.id,
                    ...patient
                });
            }
        });

        console.log('✅ Found', results.length, 'matching patients');

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--text-secondary); font-size: 13px;">
                    <i class="fas fa-search" style="font-size: 24px; opacity: 0.3; display: block; margin-bottom: 8px;"></i>
                    <p>No patients found matching "${searchTerm}"</p>
                    <small>Try searching by name, number, phone, or ID</small>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = results.slice(0, 10).map(patient => {
            const patientName = patient.fullName || patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown';
            const patientNumber = patient.patientNumber || 'N/A';
            const age = patient.age ? `${patient.age}y` : '';
            const gender = patient.gender || '';
            const phone = patient.phone || '';
            
            return `
                <div class="imaging-patient-result-item" onclick="window.selectPatient('${patient.id}', '${patientName.replace(/'/g, "\\'")}', '${patientNumber}')" style="padding: 12px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                        <strong style="font-size: 14px; color: var(--text-primary);">${patientName}</strong>
                        <span style="background: var(--primary-color); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${patientNumber}</span>
                    </div>
                    <div style="display: flex; gap: 12px; font-size: 12px; color: var(--text-secondary);">
                        ${age ? `<span><i class="fas fa-birthday-cake" style="margin-right: 4px;"></i>${age}</span>` : ''}
                        ${gender ? `<span><i class="fas fa-${gender.toLowerCase() === 'male' ? 'mars' : gender.toLowerCase() === 'female' ? 'venus' : 'user'}" style="margin-right: 4px;"></i>${gender}</span>` : ''}
                        ${phone ? `<span><i class="fas fa-phone" style="margin-right: 4px;"></i>${phone}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Add hover effect via style tag if not already added
        if (!document.getElementById('imaging-search-hover-styles')) {
            const style = document.createElement('style');
            style.id = 'imaging-search-hover-styles';
            style.textContent = `
                .imaging-patient-result-item:hover {
                    background: var(--bg-secondary) !important;
                }
            `;
            document.head.appendChild(style);
        }
        
    } catch (error) {
        console.error('❌ Error searching patients:', error);
        resultsContainer.innerHTML = `
            <div style="padding: 12px; color: #e74c3c; font-size: 13px; text-align: center;">
                <i class="fas fa-exclamation-triangle"></i> Error: ${error.message}
            </div>
        `;
    }
}

// Select patient
window.selectPatient = function(id, name, number) {
    selectedPatientForImaging = { id, name, number };
    document.getElementById('imagingPatientName').textContent = name;
    document.getElementById('imagingPatientNumber').textContent = number;
    document.getElementById('imagingSelectedPatient').style.display = 'block';
    document.getElementById('imagingPatientSearch').value = '';
    document.getElementById('imagingPatientResults').innerHTML = '';
};

// Toggle patient mode (search vs manual)
window.toggleImagingPatientMode = function(mode) {
    currentPatientMode = mode;
    
    const searchMode = document.getElementById('imagingSearchMode');
    const manualMode = document.getElementById('imagingManualMode');
    const searchBtn = document.getElementById('searchPatientModeBtn');
    const manualBtn = document.getElementById('manualPatientModeBtn');
    
    if (mode === 'search') {
        searchMode.style.display = 'block';
        manualMode.style.display = 'none';
        searchBtn.classList.add('active');
        manualBtn.classList.remove('active');
        
        // Clear manual fields
        document.getElementById('manualImagingPatientNumber').value = '';
        document.getElementById('manualImagingPatientName').value = '';
        document.getElementById('manualImagingPatientAge').value = '';
        document.getElementById('manualImagingPatientGender').value = '';
        document.getElementById('manualImagingPatientPhone').value = '';
    } else {
        searchMode.style.display = 'none';
        manualMode.style.display = 'block';
        searchBtn.classList.remove('active');
        manualBtn.classList.add('active');
        
        // Clear search
        selectedPatientForImaging = null;
        document.getElementById('imagingSelectedPatient').style.display = 'none';
        document.getElementById('imagingPatientSearch').value = '';
        document.getElementById('imagingPatientResults').innerHTML = '';
    }
};

// Search patients for new request (DEPRECATED - now using real-time)
async function searchPatients(e) {
    // This function is now deprecated in favor of searchPatientsRealtime
    // Kept for backwards compatibility
    searchPatientsRealtime(e.target.value);
}

// Select patient (used by both selectPatientForImaging and internal calls)
function selectPatient(id, name, number) {
    console.log('✅ Patient selected:', { id, name, number });
    
    selectedPatientForImaging = { id, name, number };
    
    document.getElementById('imagingPatientName').textContent = name;
    document.getElementById('imagingPatientNumber').textContent = number;
    document.getElementById('imagingSelectedPatient').style.display = 'block';
    document.getElementById('imagingPatientSearch').value = '';
    document.getElementById('imagingPatientResults').innerHTML = '';
}

// Select patient for imaging request (public API)
window.selectPatientForImaging = function(id, name, number) {
    selectPatient(id, name, number);
};

// Clear selected patient
window.clearImagingPatient = function() {
    selectedPatientForImaging = null;
    document.getElementById('imagingSelectedPatient').style.display = 'none';
};

// Show new imaging request modal
window.showNewImagingRequestModal = function() {
    document.getElementById('newImagingRequestModal').style.display = 'flex';
    
    // Reset form
    currentPatientMode = 'search';
    document.getElementById('imagingSearchMode').style.display = 'block';
    document.getElementById('imagingManualMode').style.display = 'none';
    document.getElementById('searchPatientModeBtn').classList.add('active');
    document.getElementById('manualPatientModeBtn').classList.remove('active');
    
    // Clear all fields
    selectedPatientForImaging = null;
    document.getElementById('imagingSelectedPatient').style.display = 'none';
    document.getElementById('imagingPatientSearch').value = '';
    document.getElementById('imagingPatientResults').innerHTML = '';
    document.getElementById('imagingType').value = '';
    document.getElementById('imagingBodyPart').value = '';
    document.getElementById('imagingPriority').value = 'Routine';
    document.getElementById('imagingRequestedBy').value = '';
    document.getElementById('imagingNotes').value = '';
    
    // Clear manual fields
    document.getElementById('manualImagingPatientNumber').value = '';
    document.getElementById('manualImagingPatientName').value = '';
    document.getElementById('manualImagingPatientAge').value = '';
    document.getElementById('manualImagingPatientGender').value = '';
    document.getElementById('manualImagingPatientPhone').value = '';
    
    // Setup search
    setTimeout(() => {
        setupPatientSearch();
    }, 100);
};

// Close modal
window.closeImagingRequestModal = function() {
    document.getElementById('newImagingRequestModal').style.display = 'none';
};

// Submit imaging request - CLEAN VERSION
window.submitImagingRequest = async function() {
    try {
        let patientData = null;
        
        // Get patient data based on mode
        if (currentPatientMode === 'search') {
            if (!selectedPatientForImaging) {
                alert('Please select a patient');
                return;
            }
            patientData = selectedPatientForImaging;
        } else {
            // Manual entry
            const manualName = document.getElementById('manualImagingPatientName').value.trim();
            if (!manualName) {
                alert('Please enter patient name');
                return;
            }
            
            let patientNumber = document.getElementById('manualImagingPatientNumber').value.trim();
            if (!patientNumber) {
                patientNumber = 'WI-' + Date.now().toString().slice(-6);
            }
            
            patientData = {
                id: 'manual_' + Date.now(),
                name: manualName,
                number: patientNumber,
                age: document.getElementById('manualImagingPatientAge').value || '',
                gender: document.getElementById('manualImagingPatientGender').value || '',
                phone: document.getElementById('manualImagingPatientPhone').value || ''
            };
        }

        // Get form data
        const imagingType = document.getElementById('imagingType').value;
        const bodyPart = document.getElementById('imagingBodyPart').value;
        const priority = document.getElementById('imagingPriority').value;
        const requestedBy = document.getElementById('imagingRequestedBy').value;
        const notes = document.getElementById('imagingNotes').value;

        // Validate
        if (!imagingType || !bodyPart || !requestedBy) {
            alert('Please fill in all required fields');
            return;
        }

        // Create request object
        const requestData = {
            patientId: patientData.id,
            patientName: patientData.name,
            patientNumber: patientData.number,
            patientAge: patientData.age || '',
            patientGender: patientData.gender || '',
            patientPhone: patientData.phone || '',
            imagingType: imagingType,
            bodyPart: bodyPart,
            priority: priority,
            requestedBy: requestedBy,
            notes: notes,
            status: 'Pending',
            dateTime: new Date().toISOString(),
            technicianNotes: '',
            createdAt: new Date().toISOString()
        };

        console.log('📤 Submitting to Firestore:', requestData);

        // Add to Firestore
        const imagingRef = collection(db, 'imaging_requests');
        const docRef = await addDoc(imagingRef, requestData);
        
        console.log('✅ Successfully added with ID:', docRef.id);
        
        // Close modal and show success
        closeImagingRequestModal();
        alert('Imaging request submitted successfully!');
        
    } catch (error) {
        console.error('❌ Submit error:', error);
        alert('Error: ' + error.message);
    }
};

// View imaging request
window.viewImagingRequest = async function(requestId) {
    const request = imagingRequests.find(r => r.id === requestId);
    if (!request) return;

    currentEditingRequest = request;
    pendingFiles = []; // Clear pending files

    // Populate fields
    document.getElementById('viewImagingId').textContent = request.requestId || request.id.substring(0, 8).toUpperCase();
    document.getElementById('viewImagingPatientName').textContent = request.patientName || '-';
    document.getElementById('viewImagingPatientNumber').textContent = request.patientNumber || '-';
    
    const date = new Date(request.dateTime || request.createdAt);
    document.getElementById('viewImagingDate').textContent = date.toLocaleString();
    
    document.getElementById('viewImagingType').textContent = request.imagingType || '-';
    document.getElementById('viewImagingBodyPart').textContent = request.bodyPart || '-';
    document.getElementById('viewImagingPriority').textContent = request.priority || '-';
    document.getElementById('viewImagingRequestedBy').textContent = request.requestedBy || '-';
    document.getElementById('viewImagingNotes').textContent = request.notes || 'No additional notes';
    
    document.getElementById('updateImagingStatus').value = request.status || 'Pending';
    document.getElementById('imagingTechnicianNotes').value = request.technicianNotes || '';

    // Clear file upload area
    document.getElementById('imagingFilesList').innerHTML = '';
    document.getElementById('imagingUploadedFiles').style.display = 'none';
    
    // Show existing results if any
    displayExistingResults(request.resultFiles || []);

    document.getElementById('viewImagingRequestModal').style.display = 'flex';
};

// Upload imaging results (quick action from table)
window.uploadImagingResults = function(requestId) {
    window.viewImagingRequest(requestId);
    // Focus on upload area
    setTimeout(() => {
        document.getElementById('imagingUploadArea').scrollIntoView({ behavior: 'smooth' });
    }, 300);
};

// View imaging results (quick action from table)
window.viewImagingResults = function(requestId) {
    const request = imagingRequests.find(r => r.id === requestId);
    if (!request || !request.resultFiles || request.resultFiles.length === 0) {
        alert('No results available for this request');
        return;
    }
    
    // Open first result in new tab
    window.open(request.resultFiles[0].url, '_blank');
};

// Display existing uploaded results
function displayExistingResults(files) {
    const container = document.getElementById('imagingResultsList');
    const section = document.getElementById('imagingExistingResults');
    
    if (!files || files.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    container.innerHTML = files.map((file, index) => `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 10px; min-width: 200px;">
            <i class="fas ${file.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image'}" style="font-size: 24px; color: ${file.type === 'application/pdf' ? '#e74c3c' : '#3498db'};"></i>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${formatFileSize(file.size)}</div>
            </div>
            <a href="${file.url}" target="_blank" style="color: var(--primary-color); font-size: 14px;" title="View">
                <i class="fas fa-external-link-alt"></i>
            </a>
        </div>
    `).join('');
}

// Handle file selection
window.handleImagingFileSelect = function(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
            return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            alert(`File "${file.name}" is not supported. Please upload images or PDF files.`);
            return;
        }
        
        pendingFiles.push(file);
    });
    
    displayPendingFiles();
    event.target.value = ''; // Reset input
};

// Display pending files to upload
function displayPendingFiles() {
    const container = document.getElementById('imagingFilesList');
    const section = document.getElementById('imagingUploadedFiles');
    
    if (pendingFiles.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    container.innerHTML = pendingFiles.map((file, index) => `
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 10px; min-width: 200px;">
            <i class="fas ${file.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image'}" style="font-size: 24px; color: ${file.type === 'application/pdf' ? '#e74c3c' : '#3498db'};"></i>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${formatFileSize(file.size)}</div>
            </div>
            <button onclick="removePendingFile(${index})" style="background: none; border: none; color: #e74c3c; cursor: pointer; font-size: 14px;" title="Remove">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// Remove pending file
window.removePendingFile = function(index) {
    pendingFiles.splice(index, 1);
    displayPendingFiles();
};

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Upload files to Firebase Storage
async function uploadFilesToStorage(requestId) {
    if (pendingFiles.length === 0) return [];
    
    const uploadedFiles = [];
    
    for (const file of pendingFiles) {
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `imaging_results/${requestId}/${fileName}`);
            
            console.log('📤 Uploading:', file.name);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            uploadedFiles.push({
                name: file.name,
                url: downloadURL,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString()
            });
            
            console.log('✅ Uploaded:', file.name);
        } catch (error) {
            console.error('❌ Upload error:', error);
            throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }
    }
    
    return uploadedFiles;
}

// Close view imaging modal
window.closeViewImagingModal = function() {
    document.getElementById('viewImagingRequestModal').style.display = 'none';
    currentEditingRequest = null;
    pendingFiles = [];
};

// Save imaging request (without sending to doctor)
window.saveImagingRequest = async function() {
    console.log('🔘 Save Changes button clicked');
    
    if (!currentEditingRequest) {
        alert('No request selected');
        return;
    }

    try {
        // Show immediate feedback
        const btn = event?.target?.closest('button');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        
        const status = document.getElementById('updateImagingStatus').value;
        const technicianNotes = document.getElementById('imagingTechnicianNotes').value;

        console.log('📝 Current status:', status);
        console.log('📝 Pending files:', pendingFiles.length);

        // Upload any pending files
        let newFiles = [];
        if (pendingFiles.length > 0) {
            console.log('📤 Uploading', pendingFiles.length, 'files...');
            newFiles = await uploadFilesToStorage(currentEditingRequest.id);
            console.log('✅ Files uploaded:', newFiles.length);
        }

        // Combine with existing files
        const existingFiles = currentEditingRequest.resultFiles || [];
        const allFiles = [...existingFiles, ...newFiles];

        console.log('📎 Total files:', allFiles.length);

        // Determine final status
        let finalStatus = status;
        
        // If files were uploaded, automatically set status to Completed
        if (allFiles.length > 0 && (status === 'Pending' || status === 'In Progress')) {
            finalStatus = 'Completed';
            console.log('✅ Status auto-changed to Completed (files uploaded)');
        }

        const updateData = {
            status: finalStatus,
            technicianNotes: technicianNotes,
            resultFiles: allFiles,
            lastUpdated: new Date().toISOString(),
            completedAt: finalStatus === 'Completed' ? new Date().toISOString() : currentEditingRequest.completedAt
        };

        console.log('📝 Saving request:', currentEditingRequest.id, '- Status:', finalStatus);

        const requestRef = doc(db, 'imaging_requests', currentEditingRequest.id);
        await updateDoc(requestRef, updateData);
        
        console.log('✅ Request saved successfully');
        
        pendingFiles = [];
        closeViewImagingModal();
        
        // Show success notification
        if (newFiles.length > 0) {
            alert(`✅ Success!\n\nChanges saved and status updated to ${finalStatus}\n${newFiles.length} file(s) uploaded`);
            showNotification(`Changes saved! Status: ${finalStatus}`, 'success');
        } else {
            alert('✅ Changes saved successfully!');
            showNotification('Changes saved successfully!', 'success');
        }
        
    } catch (error) {
        console.error('❌ Save error:', error);
        alert('❌ Error saving changes:\n\n' + error.message);
        
        // Re-enable button on error
        const btn = event?.target?.closest('button');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }
};

// Save and send to doctor
window.saveAndSendToDoctor = async function() {
    if (!currentEditingRequest) {
        alert('No request selected');
        return;
    }

    try {
        const status = document.getElementById('updateImagingStatus').value;
        const technicianNotes = document.getElementById('imagingTechnicianNotes').value;

        // Upload any pending files
        let newFiles = [];
        if (pendingFiles.length > 0) {
            newFiles = await uploadFilesToStorage(currentEditingRequest.id);
        }

        // Combine with existing files
        const existingFiles = currentEditingRequest.resultFiles || [];
        const allFiles = [...existingFiles, ...newFiles];

        const updateData = {
            status: 'Completed',
            technicianNotes: technicianNotes,
            resultFiles: allFiles,
            lastUpdated: new Date().toISOString(),
            sentToDoctor: true,
            sentToDoctorAt: new Date().toISOString(),
            sentToDoctorName: currentEditingRequest.requestedBy
        };

        console.log('📝 Saving and sending to doctor:', currentEditingRequest.id);

        const requestRef = doc(db, 'imaging_requests', currentEditingRequest.id);
        await updateDoc(requestRef, updateData);
        
        // Create notification for doctor (if notification system exists)
        try {
            const notificationRef = collection(db, 'notifications');
            await addDoc(notificationRef, {
                type: 'imaging_result',
                title: 'Imaging Results Ready',
                message: `${currentEditingRequest.imagingType} results for patient ${currentEditingRequest.patientName} are ready`,
                patientId: currentEditingRequest.patientId,
                patientName: currentEditingRequest.patientName,
                imagingRequestId: currentEditingRequest.id,
                recipientRole: 'doctor',
                recipientName: currentEditingRequest.requestedBy,
                read: false,
                createdAt: new Date().toISOString()
            });
            console.log('🔔 Notification created for doctor');
        } catch (notifError) {
            console.log('⚠️ Could not create notification:', notifError);
        }
        
        console.log('✅ Results sent to doctor');
        
        pendingFiles = [];
        closeViewImagingModal();
        alert('Results saved and sent to ' + currentEditingRequest.requestedBy + '!');
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert('Error: ' + error.message);
    }
};

// Mark as Reviewed - removes patient from queue and sets status to In Progress
window.markAsReviewed = async function(requestId) {
    try {
        const request = imagingRequests.find(r => r.id === requestId);
        if (!request) {
            alert('Request not found');
            return;
        }
        
        console.log('✅ Marking as reviewed:', requestId);
        
        const requestRef = doc(db, 'imaging_requests', requestId);
        await updateDoc(requestRef, {
            reviewed: true,
            reviewedAt: new Date().toISOString(),
            inQueue: false,
            status: 'In Progress' // Auto change status to In Progress
        });
        
        // Visual feedback - animate card removal
        const card = document.querySelector(`.imaging-queue-card[data-id="${requestId}"]`);
        if (card) {
            card.style.transition = 'all 0.3s ease';
            card.style.transform = 'translateX(100%)';
            card.style.opacity = '0';
            setTimeout(() => {
                renderQueue();
            }, 300);
        }
        
        console.log('✅ Patient marked as In Progress and removed from queue');
        
    } catch (error) {
        console.error('❌ Error marking as reviewed:', error);
        alert('Error: ' + error.message);
    }
};

// Quick send to doctor from table
window.quickSendToDoctor = async function(requestId) {
    try {
        const request = imagingRequests.find(r => r.id === requestId);
        if (!request) {
            alert('Request not found');
            return;
        }

        if (!request.resultFiles || request.resultFiles.length === 0) {
            alert('Please upload results before sending to doctor');
            return;
        }

        const confirmed = confirm(`Send ${request.imagingType} results for ${request.patientName} to Dr. ${request.requestedBy}?`);
        if (!confirmed) return;

        const updateData = {
            status: 'Completed',
            lastUpdated: new Date().toISOString(),
            sentToDoctor: true,
            sentToDoctorAt: new Date().toISOString(),
            sentToDoctorName: request.requestedBy
        };

        console.log('📤 Sending to doctor:', requestId);

        const requestRef = doc(db, 'imaging_requests', requestId);
        await updateDoc(requestRef, updateData);
        
        // Create notification for doctor
        try {
            const notificationRef = collection(db, 'notifications');
            await addDoc(notificationRef, {
                type: 'imaging_result',
                title: 'Imaging Results Ready',
                message: `${request.imagingType} results for patient ${request.patientName} are ready`,
                patientId: request.patientId,
                patientName: request.patientName,
                imagingRequestId: request.id,
                recipientRole: 'doctor',
                recipientName: request.requestedBy,
                read: false,
                createdAt: new Date().toISOString()
            });
            console.log('🔔 Notification created for doctor');
        } catch (notifError) {
            console.log('⚠️ Could not create notification:', notifError);
        }
        
        console.log('✅ Results sent to doctor');
        showNotification(`Results sent to ${request.requestedBy}!`, 'success');
        
    } catch (error) {
        console.error('❌ Error sending to doctor:', error);
        alert('Error: ' + error.message);
    }
};

// Add radiographer note
window.addRadiographerNote = function(requestId) {
    const request = imagingRequests.find(r => r.id === requestId);
    if (!request) {
        alert('Request not found');
        return;
    }

    // Store current request ID for saving
    window.currentNoteRequestId = requestId;

    // Populate patient info
    document.getElementById('notePatientName').textContent = request.patientName || 'Unknown';
    document.getElementById('notePatientNumber').textContent = request.patientNumber || '-';
    document.getElementById('noteImagingType').textContent = request.imagingType || '-';
    document.getElementById('noteBodyPart').textContent = request.bodyPart || '-';

    const existingNote = request.technicianNotes || '';
    const noteSaved = request.noteSaved || false;
    const noteSavedDate = request.noteSavedDate || '';

    // Check if note already exists and is saved
    if (noteSaved && existingNote) {
        // Show read-only version
        document.getElementById('radiographerNoteInput').style.display = 'none';
        document.getElementById('saveNoteBtn').style.display = 'none';
        document.getElementById('existingNoteDisplay').style.display = 'block';
        document.getElementById('existingNoteContent').textContent = existingNote;
        
        const savedDate = new Date(noteSavedDate);
        document.getElementById('noteSavedDate').textContent = savedDate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        // Show editable version
        document.getElementById('radiographerNoteInput').style.display = 'block';
        document.getElementById('radiographerNoteInput').value = existingNote;
        document.getElementById('saveNoteBtn').style.display = 'inline-flex';
        document.getElementById('existingNoteDisplay').style.display = 'none';
    }

    // Show modal
    document.getElementById('radiographerNoteModal').style.display = 'flex';
};

// Close radiographer note modal
window.closeRadiographerNoteModal = function() {
    document.getElementById('radiographerNoteModal').style.display = 'none';
    window.currentNoteRequestId = null;
};

// Save radiographer note
window.saveRadiographerNote = async function() {
    if (!window.currentNoteRequestId) {
        alert('No request selected');
        return;
    }

    try {
        const note = document.getElementById('radiographerNoteInput').value.trim();
        
        if (!note) {
            alert('Please enter a note before saving');
            return;
        }

        const confirmed = confirm('Once saved, this note cannot be edited. Continue?');
        if (!confirmed) return;

        const updateData = {
            technicianNotes: note,
            noteSaved: true,
            noteSavedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        };

        console.log('📝 Saving note for:', window.currentNoteRequestId);

        const requestRef = doc(db, 'imaging_requests', window.currentNoteRequestId);
        await updateDoc(requestRef, updateData);
        
        console.log('✅ Note saved successfully');
        showNotification('Note saved successfully and locked', 'success');
        
        closeRadiographerNoteModal();
        
    } catch (error) {
        console.error('❌ Error saving note:', error);
        alert('Error: ' + error.message);
    }
};

// Refresh imaging data
window.refreshImagingData = function() {
    const btn = event.target.closest('button');
    const icon = btn.querySelector('i');
    
    icon.classList.add('fa-spin');
    
    setTimeout(() => {
        icon.classList.remove('fa-spin');
        showNotification('Imaging data refreshed', 'success');
    }, 1000);
};

// Show notification
function showNotification(message, type) {
    // Use existing notification system if available
    if (window.showNotificationMessage) {
        window.showNotificationMessage(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Auto-initialize when module loads if imaging module is visible
document.addEventListener('DOMContentLoaded', () => {
    const imagingModule = document.getElementById('imaging-module');
    if (imagingModule && imagingModule.classList.contains('active')) {
        console.log('🔬 Auto-initializing Imaging Module on page load...');
        initImagingModule();
    }
});

// Also initialize immediately if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        const imagingModule = document.getElementById('imaging-module');
        if (imagingModule && imagingModule.classList.contains('active')) {
            console.log('🔬 Late auto-initializing Imaging Module...');
            initImagingModule();
        }
    }, 500);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeImaging) {
        unsubscribeImaging();
    }
});