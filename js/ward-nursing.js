// Ward & Nursing Module - Complete Implementation with Firestore
// Manages patient admissions, nurse reports, doctor reports, and discharges

import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, onSnapshot, serverTimestamp, addDoc } from './firebase-config.js';

// Global variables
let currentWardPatient = null;
let wardPatientsListener = null;
let wardQueueListener = null;

// Initialize Ward & Nursing Module
export function initWardNursingModule() {
    console.log('Initializing Ward & Nursing Module...');
    
    // Set up real-time listeners
    setupWardQueueListener();
    setupWardPatientsListener();
    
    // Setup search and filter handlers
    setupSearchAndFilters();
    
    // Load initial data
    loadWardStats();
}

// Setup real-time listener for nursing queue (patients referred by doctors)
function setupWardQueueListener() {
    const queueContainer = document.getElementById('wardNursingQueue');
    
    if (wardQueueListener) {
        wardQueueListener(); // Unsubscribe previous listener
    }
    
    try {
        const q = query(
            collection(db, 'wardQueue'),
            where('status', '==', 'pending'),
            orderBy('timestamp', 'desc')
        );
        
        wardQueueListener = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                queueContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No pending admissions from doctors</p>
                    </div>
                `;
                return;
            }
            
            queueContainer.innerHTML = '';
            snapshot.forEach((doc) => {
                const patient = doc.data();
                const queueCard = createWardQueueCard(doc.id, patient);
                queueContainer.appendChild(queueCard);
            });
        }, (error) => {
            console.error('Error loading ward queue:', error);
            showNotification('Error loading queue', 'error');
        });
    } catch (error) {
        console.error('Error setting up ward queue listener:', error);
    }
}

// Create queue card for pending admissions
function createWardQueueCard(queueId, patient) {
    const card = document.createElement('div');
    card.className = 'ward-queue-card';
    
    const isUrgent = patient.priority === 'urgent' || patient.condition === 'critical';
    
    card.innerHTML = `
        <div class="patient-name">${patient.patientName}</div>
        <div class="patient-info">
            <i class="fas fa-id-card"></i> ${patient.patientId}
        </div>
        <div class="patient-info">
            <i class="fas fa-user"></i> ${patient.age || 'N/A'} yrs, ${patient.gender || 'N/A'}
        </div>
        <div class="patient-info">
            <i class="fas fa-user-md"></i> Dr. ${patient.referringDoctor || 'Unknown'}
        </div>
        <div class="diagnosis-badge ${isUrgent ? 'urgent-badge' : ''}">
            ${patient.diagnosis || 'Admission Required'}
        </div>
        <div style="margin-top: 12px;">
            <button class="btn btn-sm btn-success" onclick="openAdmitPatientModal('${queueId}')" style="width: 100%;">
                <i class="fas fa-hospital-user"></i> Admit to Ward
            </button>
        </div>
    `;
    
    return card;
}

// Setup real-time listener for admitted patients
function setupWardPatientsListener() {
    const tableBody = document.getElementById('wardPatientsBody');
    
    if (wardPatientsListener) {
        wardPatientsListener();
    }
    
    try {
        const q = query(
            collection(db, 'wardPatients'),
            orderBy('admissionDate', 'desc')
        );
        
        wardPatientsListener = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                tableBody.innerHTML = `
                    <tr class="empty-row">
                        <td colspan="8">
                            <div class="empty-state">
                                <i class="fas fa-bed"></i>
                                <p>No patients in ward</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            tableBody.innerHTML = '';
            snapshot.forEach((doc) => {
                const patient = doc.data();
                const row = createWardPatientRow(doc.id, patient);
                tableBody.appendChild(row);
            });
            
            // Update stats after loading patients
            loadWardStats();
        }, (error) => {
            console.error('Error loading ward patients:', error);
            showNotification('Error loading patients', 'error');
        });
    } catch (error) {
        console.error('Error setting up ward patients listener:', error);
    }
}

// Create table row for ward patient
function createWardPatientRow(patientId, patient) {
    const row = document.createElement('tr');
    
    const statusClass = patient.status === 'discharged' ? 'status-completed' : 
                       patient.status === 'critical' ? 'status-critical' : 'status-active';
    
    const ageGender = `${patient.age || 'N/A'} / ${patient.gender || 'N/A'}`;
    const admissionDate = patient.admissionDate ? formatDate(patient.admissionDate) : 'N/A';
    
    row.innerHTML = `
        <td>${patient.patientId}</td>
        <td>${patient.patientName}</td>
        <td>${ageGender}</td>
        <td><strong>${patient.bedNumber || 'N/A'}</strong></td>
        <td>${admissionDate}</td>
        <td>${patient.diagnosis || 'N/A'}</td>
        <td><span class="status-badge ${statusClass}">${capitalizeFirst(patient.status || 'admitted')}</span></td>
        <td>
            <div class="action-buttons">
                <button class="btn btn-sm btn-info" onclick="viewWardPatient('${patientId}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-primary" onclick="openNurseReportModal('${patientId}')" title="Nurse Report">
                    <i class="fas fa-user-nurse"></i>
                </button>
                <button class="btn btn-sm btn-secondary" onclick="openDoctorReportModal('${patientId}')" title="Doctor Report">
                    <i class="fas fa-user-md"></i>
                </button>
                ${patient.status !== 'discharged' ? `
                    <button class="btn btn-sm btn-warning" onclick="openDischargeModal('${patientId}')" title="Discharge">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                ` : `
                    <button class="btn btn-sm btn-success" onclick="viewDischargeReport('${patientId}')" title="Discharge Report">
                        <i class="fas fa-file-medical"></i>
                    </button>
                `}
            </div>
        </td>
    `;
    
    return row;
}

// Load ward statistics
async function loadWardStats() {
    try {
        const patientsSnapshot = await getDocs(collection(db, 'wardPatients'));
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let totalPatients = 0;
        let admittedToday = 0;
        let dischargedToday = 0;
        let occupiedBeds = 0;
        
        patientsSnapshot.forEach((doc) => {
            const patient = doc.data();
            totalPatients++;
            
            if (patient.status !== 'discharged') {
                occupiedBeds++;
            }
            
            if (patient.admissionDate) {
                const admissionDate = patient.admissionDate.toDate ? patient.admissionDate.toDate() : new Date(patient.admissionDate);
                admissionDate.setHours(0, 0, 0, 0);
                if (admissionDate.getTime() === today.getTime()) {
                    admittedToday++;
                }
            }
            
            if (patient.dischargeDate) {
                const dischargeDate = patient.dischargeDate.toDate ? patient.dischargeDate.toDate() : new Date(patient.dischargeDate);
                dischargeDate.setHours(0, 0, 0, 0);
                if (dischargeDate.getTime() === today.getTime()) {
                    dischargedToday++;
                }
            }
        });
        
        document.getElementById('wardTotalPatientsCount').textContent = totalPatients;
        document.getElementById('wardAdmittedTodayCount').textContent = admittedToday;
        document.getElementById('wardDischargedTodayCount').textContent = dischargedToday;
        document.getElementById('wardOccupiedBedsCount').textContent = occupiedBeds;
        
    } catch (error) {
        console.error('Error loading ward stats:', error);
    }
}

// Admit patient from queue
window.openAdmitPatientModal = async function(queueId) {
    try {
        const queueDoc = await getDoc(doc(db, 'wardQueue', queueId));
        if (!queueDoc.exists()) {
            showNotification('Patient not found', 'error');
            return;
        }
        
        const patient = queueDoc.data();
        currentWardPatient = { queueId, ...patient };
        
        // Fill modal with patient data
        document.getElementById('admitPatientName').textContent = patient.patientName;
        document.getElementById('admitPatientId').textContent = patient.patientId;
        document.getElementById('admitBedNumber').value = '';
        document.getElementById('admitWardRoom').value = '';
        document.getElementById('admitInitialCondition').value = 'stable';
        document.getElementById('admitSpecialInstructions').value = '';
        
        // Show modal
        document.getElementById('admitPatientModal').style.display = 'flex';
    } catch (error) {
        console.error('Error opening admit modal:', error);
        showNotification('Error loading patient data', 'error');
    }
};

window.closeAdmitPatientModal = function() {
    document.getElementById('admitPatientModal').style.display = 'none';
    currentWardPatient = null;
};

window.confirmAdmitPatient = async function() {
    const bedNumber = document.getElementById('admitBedNumber').value.trim();
    
    if (!bedNumber) {
        showNotification('Please enter a bed number', 'error');
        return;
    }
    
    if (!currentWardPatient) {
        showNotification('No patient selected', 'error');
        return;
    }
    
    try {
        const wardRoom = document.getElementById('admitWardRoom').value;
        const initialCondition = document.getElementById('admitInitialCondition').value;
        const specialInstructions = document.getElementById('admitSpecialInstructions').value;
        
        // Create ward patient record
        const wardPatientData = {
            patientId: currentWardPatient.patientId,
            patientName: currentWardPatient.patientName,
            age: currentWardPatient.age,
            gender: currentWardPatient.gender,
            bedNumber: bedNumber,
            wardRoom: wardRoom,
            diagnosis: currentWardPatient.diagnosis,
            referringDoctor: currentWardPatient.referringDoctor,
            admissionDate: serverTimestamp(),
            status: initialCondition,
            specialInstructions: specialInstructions,
            nurseReports: [],
            doctorReports: [],
            admitted: true,
            discharged: false
        };
        
        // Add to ward patients collection
        await addDoc(collection(db, 'wardPatients'), wardPatientData);
        
        // Update queue status
        await updateDoc(doc(db, 'wardQueue', currentWardPatient.queueId), {
            status: 'admitted',
            admittedAt: serverTimestamp(),
            bedNumber: bedNumber
        });
        
        showNotification('Patient admitted successfully', 'success');
        closeAdmitPatientModal();
        
    } catch (error) {
        console.error('Error admitting patient:', error);
        showNotification('Error admitting patient', 'error');
    }
};

// View patient details
window.viewWardPatient = async function(patientId) {
    try {
        const patientDoc = await getDoc(doc(db, 'wardPatients', patientId));
        if (!patientDoc.exists()) {
            showNotification('Patient not found', 'error');
            return;
        }
        
        const patient = patientDoc.data();
        
        // Fill modal with patient data
        document.getElementById('wardPatientId').textContent = patient.patientId;
        document.getElementById('wardPatientName').textContent = patient.patientName;
        document.getElementById('wardPatientAgeGender').textContent = `${patient.age || 'N/A'} / ${patient.gender || 'N/A'}`;
        document.getElementById('wardPatientBed').textContent = patient.bedNumber || 'N/A';
        document.getElementById('wardPatientAdmissionDate').textContent = patient.admissionDate ? formatDate(patient.admissionDate) : 'N/A';
        document.getElementById('wardPatientStatus').textContent = capitalizeFirst(patient.status || 'admitted');
        document.getElementById('wardPatientDiagnosis').textContent = patient.diagnosis || 'N/A';
        document.getElementById('wardPatientDoctor').textContent = patient.referringDoctor || 'N/A';
        
        // Display doctor reports
        const doctorReportDiv = document.getElementById('wardDoctorReport');
        if (patient.doctorReports && patient.doctorReports.length > 0) {
            doctorReportDiv.innerHTML = patient.doctorReports.map(report => `
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(37, 99, 235, 0.05); border-radius: 6px;">
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 5px;">
                        ${formatDate(report.timestamp)} - Dr. ${report.doctorName || 'Unknown'}
                    </div>
                    <div style="margin-bottom: 8px;"><strong>Diagnosis:</strong> ${report.diagnosis || 'N/A'}</div>
                    <div style="margin-bottom: 8px;"><strong>Treatment Plan:</strong> ${report.treatmentPlan || 'N/A'}</div>
                    ${report.clinicalFindings ? `<div style="margin-bottom: 8px;"><strong>Clinical Findings:</strong> ${report.clinicalFindings}</div>` : ''}
                    ${report.prognosis ? `<div><strong>Prognosis:</strong> ${report.prognosis}</div>` : ''}
                </div>
            `).join('');
        } else {
            doctorReportDiv.innerHTML = '<p class="text-muted">No doctor\'s reports available</p>';
        }
        
        // Display nurse reports
        const nurseReportDiv = document.getElementById('wardNurseReport');
        if (patient.nurseReports && patient.nurseReports.length > 0) {
            nurseReportDiv.innerHTML = patient.nurseReports.map(report => `
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(16, 185, 129, 0.05); border-radius: 6px;">
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 5px;">
                        ${formatDate(report.timestamp)} - ${report.nurseName || 'Nurse'}
                    </div>
                    ${report.vitals ? `
                        <div style="margin-bottom: 8px;">
                            <strong>Vitals:</strong> BP: ${report.vitals.bp || 'N/A'}, 
                            Pulse: ${report.vitals.pulse || 'N/A'}, 
                            Temp: ${report.vitals.temp || 'N/A'}°C, 
                            SpO2: ${report.vitals.spo2 || 'N/A'}%
                        </div>
                    ` : ''}
                    <div style="margin-bottom: 8px;"><strong>Condition:</strong> ${capitalizeFirst(report.condition || 'N/A')}</div>
                    <div style="margin-bottom: 8px;"><strong>Notes:</strong> ${report.notes || 'N/A'}</div>
                    ${report.medicationsGiven ? `<div style="margin-bottom: 8px;"><strong>Medications:</strong> ${report.medicationsGiven}</div>` : ''}
                </div>
            `).join('');
        } else {
            nurseReportDiv.innerHTML = '<p class="text-muted">No nurse\'s reports available</p>';
        }
        
        // Show modal
        document.getElementById('wardPatientModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading patient:', error);
        showNotification('Error loading patient details', 'error');
    }
};

window.closeWardPatientModal = function() {
    document.getElementById('wardPatientModal').style.display = 'none';
};

// Nurse Report Modal
window.openNurseReportModal = async function(patientId) {
    try {
        const patientDoc = await getDoc(doc(db, 'wardPatients', patientId));
        if (!patientDoc.exists()) {
            showNotification('Patient not found', 'error');
            return;
        }
        
        const patient = patientDoc.data();
        currentWardPatient = { id: patientId, ...patient };
        
        // Fill modal
        document.getElementById('nurseReportPatientName').textContent = patient.patientName;
        document.getElementById('nurseReportPatientId').textContent = patient.patientId;
        document.getElementById('nurseReportBedNo').textContent = patient.bedNumber || 'N/A';
        
        // Clear form
        document.getElementById('nurseVitalsBP').value = '';
        document.getElementById('nurseVitalsPulse').value = '';
        document.getElementById('nurseVitalsTemp').value = '';
        document.getElementById('nurseVitalsSpO2').value = '';
        document.getElementById('nursePatientCondition').value = '';
        document.getElementById('nurseMedicationsGiven').value = '';
        document.getElementById('nurseReportNotes').value = '';
        document.getElementById('nurseFollowupActions').value = '';
        
        // Show modal
        document.getElementById('addNurseReportModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error opening nurse report modal:', error);
        showNotification('Error loading patient', 'error');
    }
};

window.closeNurseReportModal = function() {
    document.getElementById('addNurseReportModal').style.display = 'none';
    currentWardPatient = null;
};

window.saveNurseReport = async function() {
    const condition = document.getElementById('nursePatientCondition').value;
    const notes = document.getElementById('nurseReportNotes').value.trim();
    
    if (!condition || !notes) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    if (!currentWardPatient) {
        showNotification('No patient selected', 'error');
        return;
    }
    
    try {
        // Get current user (nurse name)
        const currentUser = getCurrentUser();
        const nurseName = currentUser ? currentUser.displayName || currentUser.email : 'Nurse';
        
        const nurseReport = {
            timestamp: new Date().toISOString(),
            nurseName: nurseName,
            vitals: {
                bp: document.getElementById('nurseVitalsBP').value,
                pulse: document.getElementById('nurseVitalsPulse').value,
                temp: document.getElementById('nurseVitalsTemp').value,
                spo2: document.getElementById('nurseVitalsSpO2').value
            },
            condition: condition,
            medicationsGiven: document.getElementById('nurseMedicationsGiven').value,
            notes: notes,
            followupActions: document.getElementById('nurseFollowupActions').value
        };
        
        // Get current reports
        const patientDoc = await getDoc(doc(db, 'wardPatients', currentWardPatient.id));
        const currentReports = patientDoc.data().nurseReports || [];
        
        // Add new report
        currentReports.push(nurseReport);
        
        // Update patient document
        await updateDoc(doc(db, 'wardPatients', currentWardPatient.id), {
            nurseReports: currentReports,
            lastNurseUpdate: serverTimestamp(),
            status: condition // Update status based on condition
        });
        
        showNotification('Nurse report saved successfully', 'success');
        closeNurseReportModal();
        
    } catch (error) {
        console.error('Error saving nurse report:', error);
        showNotification('Error saving report', 'error');
    }
};

// Doctor Report Modal
window.openDoctorReportModal = async function(patientId) {
    try {
        const patientDoc = await getDoc(doc(db, 'wardPatients', patientId));
        if (!patientDoc.exists()) {
            showNotification('Patient not found', 'error');
            return;
        }
        
        const patient = patientDoc.data();
        currentWardPatient = { id: patientId, ...patient };
        
        // Fill modal
        document.getElementById('doctorReportPatientName').textContent = patient.patientName;
        document.getElementById('doctorReportPatientId').textContent = patient.patientId;
        document.getElementById('doctorReportBedNo').textContent = patient.bedNumber || 'N/A';
        
        // Pre-fill diagnosis if available
        document.getElementById('doctorDiagnosis').value = patient.diagnosis || '';
        
        // Clear other fields
        document.getElementById('doctorPatientProgress').value = '';
        document.getElementById('doctorTreatmentPlan').value = '';
        document.getElementById('doctorClinicalFindings').value = '';
        document.getElementById('doctorAdditionalOrders').value = '';
        document.getElementById('doctorPrognosis').value = '';
        
        // Show modal
        document.getElementById('addDoctorReportModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error opening doctor report modal:', error);
        showNotification('Error loading patient', 'error');
    }
};

window.closeDoctorReportModal = function() {
    document.getElementById('addDoctorReportModal').style.display = 'none';
    currentWardPatient = null;
};

window.saveDoctorReport = async function() {
    const diagnosis = document.getElementById('doctorDiagnosis').value.trim();
    const treatmentPlan = document.getElementById('doctorTreatmentPlan').value.trim();
    
    if (!diagnosis || !treatmentPlan) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    if (!currentWardPatient) {
        showNotification('No patient selected', 'error');
        return;
    }
    
    try {
        // Get current user (doctor name)
        const currentUser = getCurrentUser();
        const doctorName = currentUser ? currentUser.displayName || currentUser.email : 'Doctor';
        
        const doctorReport = {
            timestamp: new Date().toISOString(),
            doctorName: doctorName,
            diagnosis: diagnosis,
            progress: document.getElementById('doctorPatientProgress').value,
            treatmentPlan: treatmentPlan,
            clinicalFindings: document.getElementById('doctorClinicalFindings').value,
            additionalOrders: document.getElementById('doctorAdditionalOrders').value,
            prognosis: document.getElementById('doctorPrognosis').value
        };
        
        // Get current reports
        const patientDoc = await getDoc(doc(db, 'wardPatients', currentWardPatient.id));
        const currentReports = patientDoc.data().doctorReports || [];
        
        // Add new report
        currentReports.push(doctorReport);
        
        // Update patient document
        await updateDoc(doc(db, 'wardPatients', currentWardPatient.id), {
            doctorReports: currentReports,
            diagnosis: diagnosis, // Update current diagnosis
            lastDoctorUpdate: serverTimestamp()
        });
        
        showNotification('Doctor report saved successfully', 'success');
        closeDoctorReportModal();
        
    } catch (error) {
        console.error('Error saving doctor report:', error);
        showNotification('Error saving report', 'error');
    }
};

// Discharge Patient Modal
window.openDischargeModal = async function(patientId) {
    try {
        const patientDoc = await getDoc(doc(db, 'wardPatients', patientId));
        if (!patientDoc.exists()) {
            showNotification('Patient not found', 'error');
            return;
        }
        
        const patient = patientDoc.data();
        currentWardPatient = { id: patientId, ...patient };
        
        // Fill modal
        document.getElementById('dischargePatientName').textContent = patient.patientName;
        document.getElementById('dischargePatientId').textContent = patient.patientId;
        document.getElementById('dischargeBedNo').textContent = patient.bedNumber || 'N/A';
        
        // Set default discharge date/time to now
        const now = new Date();
        const dateTimeString = now.toISOString().slice(0, 16);
        document.getElementById('dischargeDateTime').value = dateTimeString;
        
        // Clear form
        document.getElementById('dischargeType').value = '';
        document.getElementById('dischargeSummary').value = '';
        document.getElementById('dischargeFollowup').value = '';
        document.getElementById('dischargeMedications').value = '';
        document.getElementById('dischargePrecautions').value = '';
        
        // Show modal
        document.getElementById('dischargePatientModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error opening discharge modal:', error);
        showNotification('Error loading patient', 'error');
    }
};

window.closeDischargeModal = function() {
    document.getElementById('dischargePatientModal').style.display = 'none';
    currentWardPatient = null;
};

window.confirmDischargePatient = async function() {
    const dischargeDateTime = document.getElementById('dischargeDateTime').value;
    const dischargeType = document.getElementById('dischargeType').value;
    const dischargeSummary = document.getElementById('dischargeSummary').value.trim();
    
    if (!dischargeDateTime || !dischargeType || !dischargeSummary) {
        showNotification('Please fill all required fields', 'error');
        return;
    }
    
    if (!currentWardPatient) {
        showNotification('No patient selected', 'error');
        return;
    }
    
    try {
        const dischargeData = {
            dischargeDate: new Date(dischargeDateTime).toISOString(),
            dischargeType: dischargeType,
            dischargeSummary: dischargeSummary,
            followupInstructions: document.getElementById('dischargeFollowup').value,
            dischargeMedications: document.getElementById('dischargeMedications').value,
            precautions: document.getElementById('dischargePrecautions').value,
            dischargedBy: getCurrentUser()?.displayName || getCurrentUser()?.email || 'Staff',
            dischargedAt: serverTimestamp()
        };
        
        // Update patient document
        await updateDoc(doc(db, 'wardPatients', currentWardPatient.id), {
            ...dischargeData,
            status: 'discharged',
            discharged: true,
            bedNumber: null // Free up the bed
        });
        
        showNotification('Patient discharged successfully', 'success');
        closeDischargeModal();
        
        // Automatically show discharge report
        setTimeout(() => {
            viewDischargeReport(currentWardPatient.id);
        }, 500);
        
    } catch (error) {
        console.error('Error discharging patient:', error);
        showNotification('Error discharging patient', 'error');
    }
};

// View Discharge Report
window.viewDischargeReport = async function(patientId) {
    try {
        const patientDoc = await getDoc(doc(db, 'wardPatients', patientId));
        if (!patientDoc.exists()) {
            showNotification('Patient not found', 'error');
            return;
        }
        
        const patient = patientDoc.data();
        
        // Generate discharge report HTML
        const reportHTML = `
            <div class="discharge-header">
                <h1>RxFlow Hospital</h1>
                <h2>Discharge Summary</h2>
            </div>
            
            <div class="discharge-section">
                <h3>Patient Information</h3>
                <div class="discharge-info-row">
                    <strong>Patient Name:</strong>
                    <span>${patient.patientName}</span>
                </div>
                <div class="discharge-info-row">
                    <strong>Patient ID:</strong>
                    <span>${patient.patientId}</span>
                </div>
                <div class="discharge-info-row">
                    <strong>Age / Gender:</strong>
                    <span>${patient.age || 'N/A'} / ${patient.gender || 'N/A'}</span>
                </div>
                <div class="discharge-info-row">
                    <strong>Bed Number:</strong>
                    <span>${patient.bedNumber || 'N/A'}</span>
                </div>
            </div>
            
            <div class="discharge-section">
                <h3>Admission Details</h3>
                <div class="discharge-info-row">
                    <strong>Admission Date:</strong>
                    <span>${patient.admissionDate ? formatDate(patient.admissionDate) : 'N/A'}</span>
                </div>
                <div class="discharge-info-row">
                    <strong>Discharge Date:</strong>
                    <span>${patient.dischargeDate ? formatDate(patient.dischargeDate) : 'N/A'}</span>
                </div>
                <div class="discharge-info-row">
                    <strong>Discharge Type:</strong>
                    <span>${capitalizeFirst(patient.dischargeType || 'N/A')}</span>
                </div>
                <div class="discharge-info-row">
                    <strong>Referring Doctor:</strong>
                    <span>${patient.referringDoctor || 'N/A'}</span>
                </div>
            </div>
            
            <div class="discharge-section">
                <h3>Diagnosis</h3>
                <p>${patient.diagnosis || 'N/A'}</p>
            </div>
            
            <div class="discharge-section">
                <h3>Discharge Summary</h3>
                <p style="white-space: pre-wrap;">${patient.dischargeSummary || 'N/A'}</p>
            </div>
            
            ${patient.followupInstructions ? `
                <div class="discharge-section">
                    <h3>Follow-up Instructions</h3>
                    <p style="white-space: pre-wrap;">${patient.followupInstructions}</p>
                </div>
            ` : ''}
            
            ${patient.dischargeMedications ? `
                <div class="discharge-section">
                    <h3>Medications on Discharge</h3>
                    <p style="white-space: pre-wrap;">${patient.dischargeMedications}</p>
                </div>
            ` : ''}
            
            ${patient.precautions ? `
                <div class="discharge-section">
                    <h3>Precautions & Advice</h3>
                    <p style="white-space: pre-wrap;">${patient.precautions}</p>
                </div>
            ` : ''}
            
            <div class="discharge-section">
                <div class="discharge-info-row">
                    <strong>Discharged By:</strong>
                    <span>${patient.dischargedBy || 'N/A'}</span>
                </div>
                <div class="discharge-info-row">
                    <strong>Date Generated:</strong>
                    <span>${new Date().toLocaleString()}</span>
                </div>
            </div>
        `;
        
        document.getElementById('dischargeReportContent').innerHTML = reportHTML;
        document.getElementById('dischargeReportModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading discharge report:', error);
        showNotification('Error loading discharge report', 'error');
    }
};

window.closeDischargeReportModal = function() {
    document.getElementById('dischargeReportModal').style.display = 'none';
};

window.printDischargeReport = function() {
    window.print();
};

// Refresh functions
window.refreshWardQueue = function() {
    setupWardQueueListener();
    showNotification('Queue refreshed', 'success');
};

window.refreshWardPatients = function() {
    setupWardPatientsListener();
    loadWardStats();
    showNotification('Patients list refreshed', 'success');
};

// Search and filter functionality
function setupSearchAndFilters() {
    const searchInput = document.getElementById('wardSearchInput');
    const statusFilter = document.getElementById('wardStatusFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterWardPatients);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', filterWardPatients);
    }
}

function filterWardPatients() {
    const searchTerm = document.getElementById('wardSearchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('wardStatusFilter')?.value || '';
    
    const rows = document.querySelectorAll('#wardPatientsBody tr:not(.empty-row)');
    
    rows.forEach(row => {
        const patientId = row.cells[0]?.textContent.toLowerCase() || '';
        const patientName = row.cells[1]?.textContent.toLowerCase() || '';
        const status = row.cells[6]?.textContent.toLowerCase() || '';
        
        const matchesSearch = patientId.includes(searchTerm) || patientName.includes(searchTerm);
        const matchesStatus = !statusFilter || status.includes(statusFilter.toLowerCase());
        
        row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
    });
}

// Utility functions
function formatDate(date) {
    if (!date) return 'N/A';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return d.toLocaleString('en-US', options);
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCurrentUser() {
    // Try to get from session/local storage
    const sessionUser = sessionStorage.getItem('currentUser');
    const localUser = localStorage.getItem('currentUser');
    
    if (sessionUser) {
        return JSON.parse(sessionUser);
    } else if (localUser) {
        return JSON.parse(localUser);
    }
    
    return null;
}

function showNotification(message, type = 'info') {
    // Create notification element
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

// Export init function
export { initWardNursingModule };
