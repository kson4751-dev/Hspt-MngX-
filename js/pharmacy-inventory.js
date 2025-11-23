// ===================================
// PHARMACY INVENTORY MODULE - RxFlow HMS
// ===================================

/**
 * Pharmacy Inventory Management Module
 * Handles drug inventory with Firestore real-time database integration
 */

import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, orderBy, serverTimestamp, addDoc } from './firebase-config.js';

// Drug Categories Configuration
const DRUG_CATEGORIES = {
    'analgesics': 'Analgesics',
    'antibiotics': 'Antibiotics',
    'antivirals': 'Antivirals',
    'antifungals': 'Antifungals',
    'antihistamines': 'Antihistamines',
    'cardiovascular': 'Cardiovascular',
    'diabetes': 'Diabetes',
    'gastrointestinal': 'Gastrointestinal',
    'respiratory': 'Respiratory',
    'dermatological': 'Dermatological',
    'psychiatric': 'Psychiatric',
    'vitamins': 'Vitamins & Supplements',
    'injections': 'Injections',
    'iv-fluids': 'IV Fluids',
    'surgical': 'Surgical Supplies',
    'other': 'Other'
};

// Drug Types
const DRUG_TYPES = {
    'tablet': 'Tablet',
    'capsule': 'Capsule',
    'syrup': 'Syrup',
    'injection': 'Injection',
    'cream': 'Cream/Ointment',
    'drops': 'Drops',
    'inhaler': 'Inhaler',
    'suppository': 'Suppository',
    'powder': 'Powder'
};

// Stock Status
const STOCK_STATUS = {
    'in-stock': { label: 'In Stock', color: '#10b981' },
    'low-stock': { label: 'Low Stock', color: '#f59e0b' },
    'out-of-stock': { label: 'Out of Stock', color: '#ef4444' },
    'expiring-soon': { label: 'Expiring Soon', color: '#f97316' },
    'expired': { label: 'Expired', color: '#991b1b' }
};

// Pagination and filtering state
let currentPage = 1;
let pageSize = 25;
let filteredDrugs = [];
let allDrugs = [];
let unsubscribe = null;

/**
 * Initialize Pharmacy Inventory Module
 */
export function initPharmacyInventory() {
    console.log('Initializing Pharmacy Inventory Module...');
    
    // Set up real-time listener for drugs collection
    setupRealtimeListener();
    
    // Initialize event listeners
    initEventListeners();
    
    // Load initial data
    loadDrugsData();
}

/**
 * Setup Firestore real-time listener
 */
function setupRealtimeListener() {
    const drugsRef = collection(db, 'pharmacy_inventory');
    const q = query(drugsRef, orderBy('createdAt', 'desc'));
    
    // Unsubscribe from previous listener if exists
    if (unsubscribe) {
        unsubscribe();
    }
    
    // Subscribe to real-time updates
    unsubscribe = onSnapshot(q, (snapshot) => {
        allDrugs = [];
        snapshot.forEach((doc) => {
            allDrugs.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Update UI with new data
        filteredDrugs = [...allDrugs];
        updateStatistics();
        displayDrugs();
        updatePagination();
    }, (error) => {
        console.error('Error listening to drugs:', error);
        showNotification('Error loading drugs data', 'error');
    });
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Add Product buttons
    const addNewDrugBtn = document.getElementById('addNewDrugBtn');
    const addFirstDrugBtn = document.getElementById('addFirstDrugBtn');
    
    if (addNewDrugBtn) {
        addNewDrugBtn.addEventListener('click', openAddDrugModal);
    }
    if (addFirstDrugBtn) {
        addFirstDrugBtn.addEventListener('click', openAddDrugModal);
    }
    
    // Modal close buttons
    const closeAddDrugModal = document.getElementById('closeAddDrugModal');
    const cancelDrugBtn = document.getElementById('cancelDrugBtn');
    const closeViewDrugModal = document.getElementById('closeViewDrugModal');
    const closeViewDrugModalFooter = document.getElementById('closeViewDrugModalFooter');
    const closeEditDrugModal = document.getElementById('closeEditDrugModal');
    
    if (closeAddDrugModal) closeAddDrugModal.addEventListener('click', closeAddModal);
    if (cancelDrugBtn) cancelDrugBtn.addEventListener('click', closeAddModal);
    if (closeViewDrugModal) closeViewDrugModal.addEventListener('click', closeViewModal);
    if (closeViewDrugModalFooter) closeViewDrugModalFooter.addEventListener('click', closeViewModal);
    if (closeEditDrugModal) closeEditDrugModal.addEventListener('click', closeEditModal);
    
    // Form submission
    const addDrugForm = document.getElementById('addDrugForm');
    if (addDrugForm) {
        addDrugForm.addEventListener('submit', handleAddDrug);
    }
    
    // Calculate total value on quantity/cost change
    const stockQuantity = document.getElementById('stockQuantity');
    const costPrice = document.getElementById('costPrice');
    const totalValue = document.getElementById('totalValue');
    
    if (stockQuantity && costPrice && totalValue) {
        stockQuantity.addEventListener('input', calculateTotalValue);
        costPrice.addEventListener('input', calculateTotalValue);
    }
    
    // Search functionality
    const drugSearchInput = document.getElementById('drugSearchInput');
    if (drugSearchInput) {
        drugSearchInput.addEventListener('input', handleSearch);
    }
    
    // Filter buttons
    const applyDrugFiltersBtn = document.getElementById('applyDrugFiltersBtn');
    const clearDrugFiltersBtn = document.getElementById('clearDrugFiltersBtn');
    
    if (applyDrugFiltersBtn) {
        applyDrugFiltersBtn.addEventListener('click', applyFilters);
    }
    if (clearDrugFiltersBtn) {
        clearDrugFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Export button
    const exportDrugsBtn = document.getElementById('exportDrugsBtn');
    if (exportDrugsBtn) {
        exportDrugsBtn.addEventListener('click', exportToCSV);
    }
    
    // Pagination
    const drugFirstPageBtn = document.getElementById('drugFirstPageBtn');
    const drugPrevPageBtn = document.getElementById('drugPrevPageBtn');
    const drugNextPageBtn = document.getElementById('drugNextPageBtn');
    const drugLastPageBtn = document.getElementById('drugLastPageBtn');
    const drugPageSize = document.getElementById('drugPageSize');
    
    if (drugFirstPageBtn) drugFirstPageBtn.addEventListener('click', () => goToPage(1));
    if (drugPrevPageBtn) drugPrevPageBtn.addEventListener('click', () => goToPage(currentPage - 1));
    if (drugNextPageBtn) drugNextPageBtn.addEventListener('click', () => goToPage(currentPage + 1));
    if (drugLastPageBtn) drugLastPageBtn.addEventListener('click', () => goToPage(Math.ceil(filteredDrugs.length / pageSize)));
    if (drugPageSize) drugPageSize.addEventListener('change', handlePageSizeChange);
    
    // Select all checkbox
    const selectAllDrugs = document.getElementById('selectAllDrugs');
    if (selectAllDrugs) {
        selectAllDrugs.addEventListener('change', handleSelectAll);
    }
    
    // Prescription functionality
    const newPrescriptionBtn = document.getElementById('newPrescriptionBtn');
    const closePrescriptionModal = document.getElementById('closePrescriptionModal');
    const cancelPrescriptionBtn = document.getElementById('cancelPrescriptionBtn');
    const newPrescriptionForm = document.getElementById('newPrescriptionForm');
    const addMedicationBtn = document.getElementById('addMedicationBtn');
    
    if (newPrescriptionBtn) {
        newPrescriptionBtn.addEventListener('click', openPrescriptionModal);
    }
    if (closePrescriptionModal) {
        closePrescriptionModal.addEventListener('click', closePrescriptionModalFunc);
    }
    if (cancelPrescriptionBtn) {
        cancelPrescriptionBtn.addEventListener('click', closePrescriptionModalFunc);
    }
    if (newPrescriptionForm) {
        newPrescriptionForm.addEventListener('submit', handlePrescriptionSubmit);
    }
    if (addMedicationBtn) {
        addMedicationBtn.addEventListener('click', addMedicationRow);
    }
    
    // Set default prescription date to today
    const prescDate = document.getElementById('prescDate');
    if (prescDate) {
        prescDate.valueAsDate = new Date();
    }
}

/**
 * Open prescription modal
 */
function openPrescriptionModal() {
    const modal = document.getElementById('newPrescriptionModal');
    if (modal) {
        modal.classList.add('active');
        populateDrugSelects();
        
        // Set today's date
        const prescDate = document.getElementById('prescDate');
        if (prescDate) {
            prescDate.valueAsDate = new Date();
        }
    }
}

/**
 * Close prescription modal
 */
function closePrescriptionModalFunc() {
    const modal = document.getElementById('newPrescriptionModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('newPrescriptionForm')?.reset();
        
        // Remove extra medication rows
        const medicationsList = document.getElementById('medicationsList');
        const items = medicationsList.querySelectorAll('.medication-item');
        items.forEach((item, index) => {
            if (index > 0) {
                item.remove();
            }
        });
    }
}

/**
 * Populate drug select dropdowns with available drugs
 */
function populateDrugSelects() {
    const selects = document.querySelectorAll('.medication-select');
    
    selects.forEach(select => {
        // Clear existing options except first
        select.innerHTML = '<option value="">-- Select Drug --</option>';
        
        // Add drugs that are in stock
        allDrugs
            .filter(drug => drug.stockQuantity > 0)
            .forEach(drug => {
                const option = document.createElement('option');
                option.value = drug.id;
                option.textContent = `${drug.drugName} ${drug.strength ? '(' + drug.strength + ')' : ''} - Stock: ${drug.stockQuantity}`;
                option.dataset.drugName = drug.drugName;
                option.dataset.strength = drug.strength || '';
                select.appendChild(option);
            });
    });
}

/**
 * Add medication row
 */
function addMedicationRow() {
    const medicationsList = document.getElementById('medicationsList');
    const currentItems = medicationsList.querySelectorAll('.medication-item').length;
    
    const newItem = document.createElement('div');
    newItem.className = 'medication-item';
    newItem.setAttribute('data-index', currentItems + 1);
    newItem.innerHTML = `
        <button type="button" class="remove-medication" onclick="window.pharmacyInventory.removeMedicationRow(this)">
            <i class="fas fa-times"></i>
        </button>
        <div class="form-row">
            <div class="form-group">
                <label>Drug Name <span class="required">*</span></label>
                <select class="form-input medication-select" required>
                    <option value="">-- Select Drug --</option>
                </select>
            </div>
            <div class="form-group">
                <label>Dosage <span class="required">*</span></label>
                <input type="text" class="form-input medication-dosage" placeholder="e.g., 2 tablets" required>
            </div>
        </div>

        <div class="form-row three-cols">
            <div class="form-group">
                <label>Frequency <span class="required">*</span></label>
                <select class="form-input medication-frequency" required>
                    <option value="">Select</option>
                    <option value="once-daily">Once Daily</option>
                    <option value="twice-daily">Twice Daily</option>
                    <option value="three-times">Three Times Daily</option>
                    <option value="four-times">Four Times Daily</option>
                    <option value="every-6-hours">Every 6 Hours</option>
                    <option value="every-8-hours">Every 8 Hours</option>
                    <option value="as-needed">As Needed (PRN)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Duration <span class="required">*</span></label>
                <input type="text" class="form-input medication-duration" placeholder="e.g., 7 days" required>
            </div>
            <div class="form-group">
                <label>Quantity <span class="required">*</span></label>
                <input type="number" class="form-input medication-quantity" placeholder="Total quantity" min="1" required>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group full-width">
                <label>Instructions</label>
                <input type="text" class="form-input medication-instructions" placeholder="Special instructions (e.g., Take with food)">
            </div>
        </div>
    `;
    
    medicationsList.appendChild(newItem);
    populateDrugSelects();
}

/**
 * Remove medication row
 */
function removeMedicationRow(button) {
    const medicationItem = button.closest('.medication-item');
    medicationItem.remove();
    
    // Renumber remaining items
    const items = document.querySelectorAll('.medication-item');
    items.forEach((item, index) => {
        item.setAttribute('data-index', index + 1);
    });
}

/**
 * Handle prescription form submission
 */
async function handlePrescriptionSubmit(event) {
    event.preventDefault();
    
    // Collect patient information
    const patientData = {
        patientId: document.getElementById('prescPatientId').value,
        patientName: document.getElementById('prescPatientName').value,
        age: document.getElementById('prescPatientAge').value,
        gender: document.getElementById('prescPatientGender').value,
        contact: document.getElementById('prescPatientContact').value
    };
    
    // Collect doctor information
    const doctorName = document.getElementById('prescDoctorName').value;
    const prescDate = document.getElementById('prescDate').value;
    
    // Collect medications
    const medications = [];
    const medicationItems = document.querySelectorAll('.medication-item');
    
    medicationItems.forEach(item => {
        const drugSelect = item.querySelector('.medication-select');
        const selectedOption = drugSelect.options[drugSelect.selectedIndex];
        
        medications.push({
            drugId: drugSelect.value,
            drugName: selectedOption.dataset.drugName,
            strength: selectedOption.dataset.strength,
            dosage: item.querySelector('.medication-dosage').value,
            frequency: item.querySelector('.medication-frequency').value,
            duration: item.querySelector('.medication-duration').value,
            quantity: parseInt(item.querySelector('.medication-quantity').value),
            instructions: item.querySelector('.medication-instructions').value
        });
    });
    
    // Collect notes
    const notes = document.getElementById('prescNotes').value;
    
    // Create prescription object
    const prescription = {
        prescriptionNumber: generatePrescriptionNumber(),
        patient: patientData,
        doctor: doctorName,
        prescriptionDate: prescDate,
        medications: medications,
        notes: notes,
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: 'current-user' // Replace with actual user from auth
    };
    
    try {
        // Save to Firestore
        await addDoc(collection(db, 'prescriptions'), prescription);
        
        // Update drug stock quantities
        for (const med of medications) {
            const drugRef = doc(db, 'pharmacy_inventory', med.drugId);
            const drugDoc = await getDoc(drugRef);
            
            if (drugDoc.exists()) {
                const currentStock = drugDoc.data().stockQuantity;
                const newStock = currentStock - med.quantity;
                
                await updateDoc(drugRef, {
                    stockQuantity: newStock,
                    updatedAt: serverTimestamp()
                });
            }
        }
        
        showNotification('Prescription generated successfully!', 'success');
        closePrescriptionModalFunc();
        
        // Optionally: Print or download prescription
        printPrescription(prescription);
        
    } catch (error) {
        console.error('Error creating prescription:', error);
        showNotification('Error creating prescription: ' + error.message, 'error');
    }
}

/**
 * Generate unique prescription number
 */
function generatePrescriptionNumber() {
    const prefix = 'RX';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${year}${month}${day}-${random}`;
}

/**
 * Print prescription as receipt
 */
function printPrescription(prescription) {
    // Create a receipt-style printable prescription format
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    const medicationsHTML = prescription.medications.map((med, index) => `
        <div class="medication-item">
            <div class="med-header">
                <strong>${index + 1}. ${med.drugName}</strong>
                ${med.strength ? `<span class="strength">${med.strength}</span>` : ''}
            </div>
            <div class="med-details">
                <div class="detail-row">
                    <span class="label">Dosage:</span>
                    <span class="value">${med.dosage}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Frequency:</span>
                    <span class="value">${med.frequency.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Duration:</span>
                    <span class="value">${med.duration}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Quantity:</span>
                    <span class="value">${med.quantity}</span>
                </div>
                ${med.instructions ? `
                <div class="instructions">
                    <span class="label">Instructions:</span>
                    <span class="value">${med.instructions}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
    const formattedTime = currentDate.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Prescription Receipt - ${prescription.prescriptionNumber}</title>
            <meta charset="utf-8">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.4;
                    padding: 10mm;
                    max-width: 80mm;
                    margin: 0 auto;
                    background: white;
                }
                
                .receipt-header {
                    text-align: center;
                    border-bottom: 2px dashed #000;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                }
                
                .receipt-header h1 {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 5px;
                    text-transform: uppercase;
                }
                
                .receipt-header .subtitle {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 3px;
                }
                
                .receipt-header .rx-number {
                    font-size: 11px;
                    margin-top: 5px;
                    font-weight: bold;
                }
                
                .section {
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 1px dashed #999;
                }
                
                .section:last-of-type {
                    border-bottom: 2px dashed #000;
                }
                
                .section-title {
                    font-weight: bold;
                    font-size: 13px;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    border-bottom: 1px solid #000;
                    padding-bottom: 3px;
                }
                
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                    gap: 10px;
                }
                
                .info-row .label {
                    font-weight: bold;
                    min-width: 80px;
                }
                
                .info-row .value {
                    text-align: right;
                    flex: 1;
                }
                
                .medication-item {
                    margin-bottom: 12px;
                    padding: 8px;
                    background: #f9f9f9;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                
                .med-header {
                    font-size: 13px;
                    margin-bottom: 6px;
                    padding-bottom: 5px;
                    border-bottom: 1px solid #ccc;
                }
                
                .med-header strong {
                    display: block;
                }
                
                .strength {
                    font-size: 11px;
                    color: #666;
                    font-weight: normal;
                    display: block;
                    margin-top: 2px;
                }
                
                .med-details {
                    font-size: 11px;
                }
                
                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                    gap: 5px;
                }
                
                .detail-row .label {
                    font-weight: bold;
                    min-width: 70px;
                }
                
                .detail-row .value {
                    text-align: right;
                    flex: 1;
                }
                
                .instructions {
                    margin-top: 5px;
                    padding-top: 5px;
                    border-top: 1px dotted #ccc;
                }
                
                .instructions .label {
                    font-weight: bold;
                    display: block;
                    margin-bottom: 2px;
                }
                
                .instructions .value {
                    font-style: italic;
                    display: block;
                }
                
                .notes-section {
                    margin-top: 10px;
                    padding: 8px;
                    background: #fffacd;
                    border: 1px solid #f0e68c;
                    border-radius: 4px;
                }
                
                .notes-section .label {
                    font-weight: bold;
                    display: block;
                    margin-bottom: 5px;
                }
                
                .signature-section {
                    margin-top: 20px;
                    text-align: center;
                }
                
                .signature-line {
                    margin-top: 30px;
                    border-top: 1px solid #000;
                    padding-top: 5px;
                    font-size: 11px;
                }
                
                .footer {
                    margin-top: 20px;
                    padding-top: 10px;
                    border-top: 2px dashed #000;
                    text-align: center;
                    font-size: 10px;
                    color: #666;
                }
                
                .print-info {
                    margin-top: 10px;
                    font-size: 9px;
                    color: #999;
                }
                
                .no-print {
                    text-align: center;
                    margin-top: 20px;
                }
                
                .print-btn {
                    padding: 10px 20px;
                    background: #2563eb;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    font-family: Arial, sans-serif;
                }
                
                .print-btn:hover {
                    background: #1d4ed8;
                }
                
                @media print {
                    body {
                        padding: 0;
                    }
                    .no-print {
                        display: none;
                    }
                }
                
                @page {
                    size: 80mm auto;
                    margin: 0;
                }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                <h1>⚕ RxFlow Hospital</h1>
                <div class="subtitle">PRESCRIPTION RECEIPT</div>
                <div class="rx-number">Rx No: ${prescription.prescriptionNumber}</div>
            </div>
            
            <div class="section">
                <div class="section-title">Patient Details</div>
                <div class="info-row">
                    <span class="label">Name:</span>
                    <span class="value">${prescription.patient.patientName}</span>
                </div>
                <div class="info-row">
                    <span class="label">ID:</span>
                    <span class="value">${prescription.patient.patientId}</span>
                </div>
                ${prescription.patient.age ? `
                <div class="info-row">
                    <span class="label">Age/Gender:</span>
                    <span class="value">${prescription.patient.age} yrs / ${prescription.patient.gender || 'N/A'}</span>
                </div>
                ` : ''}
                ${prescription.patient.contact ? `
                <div class="info-row">
                    <span class="label">Contact:</span>
                    <span class="value">${prescription.patient.contact}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="section">
                <div class="section-title">Doctor Details</div>
                <div class="info-row">
                    <span class="label">Doctor:</span>
                    <span class="value">Dr. ${prescription.doctor}</span>
                </div>
                <div class="info-row">
                    <span class="label">Date:</span>
                    <span class="value">${formattedDate}</span>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">Medications (${prescription.medications.length})</div>
                ${medicationsHTML}
            </div>
            
            ${prescription.notes ? `
            <div class="notes-section">
                <span class="label">⚠ Diagnosis/Notes:</span>
                <div>${prescription.notes}</div>
            </div>
            ` : ''}
            
            <div class="signature-section">
                <div class="signature-line">
                    Doctor's Signature
                </div>
            </div>
            
            <div class="footer">
                <div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
                <p style="margin: 8px 0;">
                    Please verify all medications with pharmacist<br>
                    before consumption
                </p>
                <div class="print-info">
                    Printed: ${formattedDate} at ${formattedTime}<br>
                    System: RxFlow Hospital Management
                </div>
                <div>━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
            </div>
            
            <div class="no-print">
                <button class="print-btn" onclick="window.print()">
                    🖨 Print Receipt
                </button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Auto print after a short delay
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

/**
 * Calculate total value
 */
function calculateTotalValue() {
    const stockQuantity = parseFloat(document.getElementById('stockQuantity')?.value) || 0;
    const costPrice = parseFloat(document.getElementById('costPrice')?.value) || 0;
    const totalValue = document.getElementById('totalValue');
    
    if (totalValue) {
        const total = (stockQuantity * costPrice).toFixed(2);
        totalValue.value = `KSh ${total}`;
    }
}

/**
 * Load drugs data from Firestore
 */
async function loadDrugsData() {
    try {
        const drugsRef = collection(db, 'pharmacy_inventory');
        const q = query(drugsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        allDrugs = [];
        snapshot.forEach((doc) => {
            allDrugs.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        filteredDrugs = [...allDrugs];
        updateStatistics();
        displayDrugs();
        updatePagination();
    } catch (error) {
        console.error('Error loading drugs:', error);
        showNotification('Error loading drugs data', 'error');
    }
}

/**
 * Update statistics cards
 */
function updateStatistics() {
    const totalDrugsCount = document.getElementById('totalDrugsCount');
    const inStockCount = document.getElementById('inStockCount');
    const lowStockCount = document.getElementById('lowStockCount');
    const expiringSoonCount = document.getElementById('expiringSoonCount');
    
    const total = allDrugs.length;
    const inStock = allDrugs.filter(d => {
        const status = determineStockStatus(d);
        return status === 'in-stock';
    }).length;
    const lowStock = allDrugs.filter(d => {
        const status = determineStockStatus(d);
        return status === 'low-stock';
    }).length;
    const expiringSoon = allDrugs.filter(d => {
        const status = determineStockStatus(d);
        return status === 'expiring-soon' || status === 'expired';
    }).length;
    
    if (totalDrugsCount) totalDrugsCount.textContent = total;
    if (inStockCount) inStockCount.textContent = inStock;
    if (lowStockCount) lowStockCount.textContent = lowStock;
    if (expiringSoonCount) expiringSoonCount.textContent = expiringSoon;
}

/**
 * Determine stock status based on quantity and expiry
 */
function determineStockStatus(drug) {
    const today = new Date();
    const expiryDate = new Date(drug.expiryDate);
    const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    // Check if expired
    if (daysUntilExpiry < 0) {
        return 'expired';
    }
    
    // Check if expiring soon (within 90 days)
    if (daysUntilExpiry <= 90) {
        return 'expiring-soon';
    }
    
    // Check stock levels
    if (drug.stockQuantity === 0) {
        return 'out-of-stock';
    } else if (drug.stockQuantity <= drug.reorderLevel) {
        return 'low-stock';
    }
    
    return 'in-stock';
}

/**
 * Display drugs in table
 */
function displayDrugs() {
    const tableBody = document.getElementById('drugsTableBody');
    const paginationContainer = document.getElementById('drugPaginationContainer');
    
    if (!tableBody) return;
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedDrugs = filteredDrugs.slice(startIndex, endIndex);
    
    // Clear table
    tableBody.innerHTML = '';
    
    // Check if empty
    if (paginatedDrugs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    <div class="empty-state-content">
                        <i class="fas fa-pills"></i>
                        <h3>No Drugs Found</h3>
                        <p>Start by adding your first medication to the pharmacy inventory</p>
                        <button class="btn btn-primary" onclick="window.pharmacyInventory.openAddDrugModal()">
                            <i class="fas fa-plus"></i> Add Product
                        </button>
                    </div>
                </td>
            </tr>
        `;
        if (paginationContainer) paginationContainer.style.display = 'none';
        return;
    }
    
    // Show pagination
    if (paginationContainer) paginationContainer.style.display = 'flex';
    
    // Populate table
    paginatedDrugs.forEach(drug => {
        const status = determineStockStatus(drug);
        const statusInfo = STOCK_STATUS[status];
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="drug-checkbox" data-id="${drug.id}">
            </td>
            <td><strong>${drug.drugCode || 'N/A'}</strong></td>
            <td>${drug.drugName}</td>
            <td>${drug.genericName || '-'}</td>
            <td><span class="badge badge-info">${DRUG_CATEGORIES[drug.drugCategory] || drug.drugCategory}</span></td>
            <td>${DRUG_TYPES[drug.drugType] || drug.drugType}</td>
            <td>${drug.stockQuantity} ${drug.unitOfMeasure || ''}</td>
            <td><strong>KSh ${parseFloat(drug.sellingPrice).toFixed(2)}</strong></td>
            <td>${formatDate(drug.expiryDate)}</td>
            <td><span class="badge" style="background-color: ${statusInfo.color};">${statusInfo.label}</span></td>
            <td>
                <button class="btn-icon" onclick="window.pharmacyInventory.viewDrug('${drug.id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon" onclick="window.pharmacyInventory.editDrug('${drug.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-icon-danger" onclick="window.pharmacyInventory.deleteDrug('${drug.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * Update pagination controls
 */
function updatePagination() {
    const totalPages = Math.ceil(filteredDrugs.length / pageSize);
    const startRecord = filteredDrugs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endRecord = Math.min(currentPage * pageSize, filteredDrugs.length);
    
    // Update pagination info
    const drugShowingStart = document.getElementById('drugShowingStart');
    const drugShowingEnd = document.getElementById('drugShowingEnd');
    const drugTotalRecords = document.getElementById('drugTotalRecords');
    const drugCurrentPage = document.getElementById('drugCurrentPage');
    const drugTotalPages = document.getElementById('drugTotalPages');
    
    if (drugShowingStart) drugShowingStart.textContent = startRecord;
    if (drugShowingEnd) drugShowingEnd.textContent = endRecord;
    if (drugTotalRecords) drugTotalRecords.textContent = filteredDrugs.length;
    if (drugCurrentPage) drugCurrentPage.textContent = currentPage;
    if (drugTotalPages) drugTotalPages.textContent = totalPages;
    
    // Update button states
    const drugFirstPageBtn = document.getElementById('drugFirstPageBtn');
    const drugPrevPageBtn = document.getElementById('drugPrevPageBtn');
    const drugNextPageBtn = document.getElementById('drugNextPageBtn');
    const drugLastPageBtn = document.getElementById('drugLastPageBtn');
    
    if (drugFirstPageBtn) drugFirstPageBtn.disabled = currentPage === 1;
    if (drugPrevPageBtn) drugPrevPageBtn.disabled = currentPage === 1;
    if (drugNextPageBtn) drugNextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    if (drugLastPageBtn) drugLastPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

/**
 * Handle page navigation
 */
function goToPage(page) {
    const totalPages = Math.ceil(filteredDrugs.length / pageSize);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayDrugs();
    updatePagination();
}

/**
 * Handle page size change
 */
function handlePageSizeChange(event) {
    pageSize = parseInt(event.target.value);
    currentPage = 1;
    displayDrugs();
    updatePagination();
}

/**
 * Handle search
 */
function handleSearch(event) {
    const searchTerm = event.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        filteredDrugs = [...allDrugs];
    } else {
        filteredDrugs = allDrugs.filter(drug => {
            return (
                drug.drugName?.toLowerCase().includes(searchTerm) ||
                drug.genericName?.toLowerCase().includes(searchTerm) ||
                drug.manufacturer?.toLowerCase().includes(searchTerm) ||
                drug.batchNumber?.toLowerCase().includes(searchTerm) ||
                drug.drugCode?.toLowerCase().includes(searchTerm)
            );
        });
    }
    
    currentPage = 1;
    displayDrugs();
    updatePagination();
}

/**
 * Apply filters
 */
function applyFilters() {
    const category = document.getElementById('filterDrugCategory')?.value;
    const type = document.getElementById('filterDrugType')?.value;
    const stockStatus = document.getElementById('filterStockStatus')?.value;
    const prescriptionType = document.getElementById('filterPrescriptionType')?.value;
    
    filteredDrugs = allDrugs.filter(drug => {
        let matches = true;
        
        if (category && drug.drugCategory !== category) {
            matches = false;
        }
        
        if (type && drug.drugType !== type) {
            matches = false;
        }
        
        if (stockStatus) {
            const status = determineStockStatus(drug);
            if (status !== stockStatus) {
                matches = false;
            }
        }
        
        if (prescriptionType && drug.prescriptionType !== prescriptionType) {
            matches = false;
        }
        
        return matches;
    });
    
    currentPage = 1;
    displayDrugs();
    updatePagination();
    showNotification('Filters applied successfully', 'success');
}

/**
 * Clear filters
 */
function clearFilters() {
    document.getElementById('filterDrugCategory').value = '';
    document.getElementById('filterDrugType').value = '';
    document.getElementById('filterStockStatus').value = '';
    document.getElementById('filterPrescriptionType').value = '';
    document.getElementById('drugSearchInput').value = '';
    
    filteredDrugs = [...allDrugs];
    currentPage = 1;
    displayDrugs();
    updatePagination();
    showNotification('Filters cleared', 'success');
}

/**
 * Handle select all checkbox
 */
function handleSelectAll(event) {
    const checkboxes = document.querySelectorAll('.drug-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = event.target.checked;
    });
}

/**
 * Open add drug modal
 */
function openAddDrugModal() {
    const modal = document.getElementById('addDrugModal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('addDrugForm')?.reset();
    }
}

/**
 * Close add modal
 */
function closeAddModal() {
    const modal = document.getElementById('addDrugModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('addDrugForm')?.reset();
    }
}

/**
 * Handle add drug form submission
 */
async function handleAddDrug(event) {
    event.preventDefault();
    
    const formData = {
        drugName: document.getElementById('drugName').value,
        genericName: document.getElementById('genericName').value,
        drugCategory: document.getElementById('drugCategory').value,
        drugType: document.getElementById('drugType').value,
        strength: document.getElementById('strength').value,
        manufacturer: document.getElementById('manufacturer').value,
        batchNumber: document.getElementById('batchNumber').value,
        expiryDate: document.getElementById('expiryDate').value,
        stockQuantity: parseFloat(document.getElementById('stockQuantity').value),
        reorderLevel: parseFloat(document.getElementById('reorderLevel').value),
        unitOfMeasure: document.getElementById('unitOfMeasure').value,
        costPrice: parseFloat(document.getElementById('costPrice').value),
        sellingPrice: parseFloat(document.getElementById('sellingPrice').value),
        prescriptionType: document.getElementById('prescriptionType').value,
        storageCondition: document.getElementById('storageCondition').value,
        supplierName: document.getElementById('supplierName').value,
        description: document.getElementById('description').value,
        drugCode: generateDrugCode(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    
    try {
        // Add to Firestore
        await addDoc(collection(db, 'pharmacy_inventory'), formData);
        
        showNotification('Drug added successfully!', 'success');
        closeAddModal();
        
        // Data will be updated automatically via real-time listener
    } catch (error) {
        console.error('Error adding drug:', error);
        showNotification('Error adding drug: ' + error.message, 'error');
    }
}

/**
 * Generate unique drug code
 */
function generateDrugCode() {
    const prefix = 'DRG';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * View drug details
 */
async function viewDrug(drugId) {
    try {
        const drugDoc = await getDoc(doc(db, 'pharmacy_inventory', drugId));
        
        if (!drugDoc.exists()) {
            showNotification('Drug not found', 'error');
            return;
        }
        
        const drug = { id: drugDoc.id, ...drugDoc.data() };
        const status = determineStockStatus(drug);
        const statusInfo = STOCK_STATUS[status];
        
        const modalBody = document.getElementById('viewDrugModalBody');
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="drug-details">
                    <div class="detail-section">
                        <h3>Basic Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Drug Code:</label>
                                <span>${drug.drugCode || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Drug Name:</label>
                                <span><strong>${drug.drugName}</strong></span>
                            </div>
                            <div class="detail-item">
                                <label>Generic Name:</label>
                                <span>${drug.genericName || '-'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Category:</label>
                                <span>${DRUG_CATEGORIES[drug.drugCategory] || drug.drugCategory}</span>
                            </div>
                            <div class="detail-item">
                                <label>Type:</label>
                                <span>${DRUG_TYPES[drug.drugType] || drug.drugType}</span>
                            </div>
                            <div class="detail-item">
                                <label>Strength:</label>
                                <span>${drug.strength || '-'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Manufacturer:</label>
                                <span>${drug.manufacturer || '-'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Stock Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Batch Number:</label>
                                <span>${drug.batchNumber}</span>
                            </div>
                            <div class="detail-item">
                                <label>Stock Quantity:</label>
                                <span><strong>${drug.stockQuantity} ${drug.unitOfMeasure || ''}</strong></span>
                            </div>
                            <div class="detail-item">
                                <label>Reorder Level:</label>
                                <span>${drug.reorderLevel} ${drug.unitOfMeasure || ''}</span>
                            </div>
                            <div class="detail-item">
                                <label>Expiry Date:</label>
                                <span>${formatDate(drug.expiryDate)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Status:</label>
                                <span><span class="badge" style="background-color: ${statusInfo.color};">${statusInfo.label}</span></span>
                            </div>
                            <div class="detail-item">
                                <label>Storage Condition:</label>
                                <span>${drug.storageCondition || '-'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Pricing</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Cost Price:</label>
                                <span>KSh ${parseFloat(drug.costPrice).toFixed(2)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Selling Price:</label>
                                <span><strong>KSh ${parseFloat(drug.sellingPrice).toFixed(2)}</strong></span>
                            </div>
                            <div class="detail-item">
                                <label>Total Value:</label>
                                <span>KSh ${(drug.stockQuantity * drug.costPrice).toFixed(2)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Prescription Type:</label>
                                <span>${drug.prescriptionType === 'prescription' ? 'Prescription Only' : 'Over the Counter'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3>Additional Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Supplier:</label>
                                <span>${drug.supplierName || '-'}</span>
                            </div>
                            <div class="detail-item full-width">
                                <label>Description:</label>
                                <span>${drug.description || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        const modal = document.getElementById('viewDrugModal');
        if (modal) {
            modal.classList.add('active');
        }
    } catch (error) {
        console.error('Error viewing drug:', error);
        showNotification('Error loading drug details', 'error');
    }
}

/**
 * Close view modal
 */
function closeViewModal() {
    const modal = document.getElementById('viewDrugModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Edit drug
 */
async function editDrug(drugId) {
    try {
        const drugDoc = await getDoc(doc(db, 'pharmacy_inventory', drugId));
        
        if (!drugDoc.exists()) {
            showNotification('Drug not found', 'error');
            return;
        }
        
        const drug = { id: drugDoc.id, ...drugDoc.data() };
        
        const modalBody = document.getElementById('editDrugModalBody');
        if (modalBody) {
            modalBody.innerHTML = `
                <form id="editDrugForm" class="inventory-form">
                    <input type="hidden" id="editDrugId" value="${drug.id}">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editDrugName">Drug Name <span class="required">*</span></label>
                            <input type="text" id="editDrugName" class="form-input" value="${drug.drugName}" required>
                        </div>
                        <div class="form-group">
                            <label for="editGenericName">Generic Name</label>
                            <input type="text" id="editGenericName" class="form-input" value="${drug.genericName || ''}">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editStockQuantity">Stock Quantity <span class="required">*</span></label>
                            <input type="number" id="editStockQuantity" class="form-input" value="${drug.stockQuantity}" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="editReorderLevel">Reorder Level <span class="required">*</span></label>
                            <input type="number" id="editReorderLevel" class="form-input" value="${drug.reorderLevel}" min="0" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editCostPrice">Cost Price (KSh) <span class="required">*</span></label>
                            <input type="number" id="editCostPrice" class="form-input" value="${drug.costPrice}" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="editSellingPrice">Selling Price (KSh) <span class="required">*</span></label>
                            <input type="number" id="editSellingPrice" class="form-input" value="${drug.sellingPrice}" step="0.01" min="0" required>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editExpiryDate">Expiry Date <span class="required">*</span></label>
                            <input type="date" id="editExpiryDate" class="form-input" value="${drug.expiryDate}" required>
                        </div>
                        <div class="form-group">
                            <label for="editSupplierName">Supplier Name</label>
                            <input type="text" id="editSupplierName" class="form-input" value="${drug.supplierName || ''}">
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="window.pharmacyInventory.closeEditModal()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-check"></i> Update Drug
                        </button>
                    </div>
                </form>
            `;
            
            // Attach form submit handler
            const editForm = document.getElementById('editDrugForm');
            if (editForm) {
                editForm.addEventListener('submit', handleEditDrug);
            }
        }
        
        const modal = document.getElementById('editDrugModal');
        if (modal) {
            modal.classList.add('active');
        }
    } catch (error) {
        console.error('Error loading drug for edit:', error);
        showNotification('Error loading drug details', 'error');
    }
}

/**
 * Handle edit drug form submission
 */
async function handleEditDrug(event) {
    event.preventDefault();
    
    const drugId = document.getElementById('editDrugId').value;
    const updateData = {
        drugName: document.getElementById('editDrugName').value,
        genericName: document.getElementById('editGenericName').value,
        stockQuantity: parseFloat(document.getElementById('editStockQuantity').value),
        reorderLevel: parseFloat(document.getElementById('editReorderLevel').value),
        costPrice: parseFloat(document.getElementById('editCostPrice').value),
        sellingPrice: parseFloat(document.getElementById('editSellingPrice').value),
        expiryDate: document.getElementById('editExpiryDate').value,
        supplierName: document.getElementById('editSupplierName').value,
        updatedAt: serverTimestamp()
    };
    
    try {
        await updateDoc(doc(db, 'pharmacy_inventory', drugId), updateData);
        
        showNotification('Drug updated successfully!', 'success');
        closeEditModal();
        
        // Data will be updated automatically via real-time listener
    } catch (error) {
        console.error('Error updating drug:', error);
        showNotification('Error updating drug: ' + error.message, 'error');
    }
}

/**
 * Close edit modal
 */
function closeEditModal() {
    const modal = document.getElementById('editDrugModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Delete drug
 */
async function deleteDrug(drugId) {
    if (!confirm('Are you sure you want to delete this drug? This action cannot be undone.')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'pharmacy_inventory', drugId));
        
        showNotification('Drug deleted successfully!', 'success');
        
        // Data will be updated automatically via real-time listener
    } catch (error) {
        console.error('Error deleting drug:', error);
        showNotification('Error deleting drug: ' + error.message, 'error');
    }
}

/**
 * Export to CSV
 */
function exportToCSV() {
    if (filteredDrugs.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    const headers = ['Drug Code', 'Drug Name', 'Generic Name', 'Category', 'Type', 'Stock Quantity', 'Unit', 'Cost Price', 'Selling Price', 'Expiry Date', 'Batch Number', 'Status'];
    
    const rows = filteredDrugs.map(drug => {
        const status = determineStockStatus(drug);
        const statusInfo = STOCK_STATUS[status];
        
        return [
            drug.drugCode || '',
            drug.drugName,
            drug.genericName || '',
            DRUG_CATEGORIES[drug.drugCategory] || drug.drugCategory,
            DRUG_TYPES[drug.drugType] || drug.drugType,
            drug.stockQuantity,
            drug.unitOfMeasure || '',
            drug.costPrice,
            drug.sellingPrice,
            drug.expiryDate,
            drug.batchNumber,
            statusInfo.label
        ];
    });
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `pharmacy_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Data exported successfully!', 'success');
}

/**
 * Format date
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // You can implement a toast notification system here
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // For now, use a simple alert for errors
    if (type === 'error') {
        alert(message);
    }
}

// Export functions for global access
window.pharmacyInventory = {
    initPharmacyInventory,
    openAddDrugModal,
    viewDrug,
    editDrug,
    deleteDrug,
    closeEditModal,
    removeMedicationRow
};

// Auto-initialize when pharmacy inventory module is active
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the pharmacy inventory module
    const pharmacyInventoryModule = document.getElementById('pharmacy-inventory-module');
    if (pharmacyInventoryModule) {
        // Initialize when module becomes visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    initPharmacyInventory();
                }
            });
        });
        
        observer.observe(pharmacyInventoryModule, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
});
