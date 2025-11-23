// ===================================
// BILLING MODULE - RxFlow HMS
// ===================================

/**
 * Billing and Payment Management System
 * Handles patient billing, payment processing, and receipt generation
 */

// Import Firebase configuration
import { db, collection, addDoc, getDocs, updateDoc, doc, query, orderBy, where, onSnapshot, serverTimestamp } from './firebase-config.js';

// Module state
let selectedPatient = null;
let additionalServices = [];
let allPatients = [];
let allBills = [];
let currentBillPage = 1;
let billPageSize = 25;
let filteredBills = [];
let isInitialized = false;
let billsListenerUnsubscribe = null;

/**
 * Initialize Billing Module
 */
export async function initBillingModule() {
    // Prevent multiple initializations
    if (isInitialized) {
        console.log('Billing Module already initialized, skipping...');
        return;
    }
    
    console.log('Initializing Billing Module...');
    
    // Load patients for search
    await loadPatients();
    
    // Setup event listeners
    setupPatientSearch();
    setupBillingForm();
    setupToggleSwitches();
    setupServiceButtons();
    setupModeToggle();
    
    // Setup real-time listener for bills (only once)
    if (!billsListenerUnsubscribe) {
        billsListenerUnsubscribe = setupBillsRealtimeListener();
    }
    
    // Load stats
    updateBillingStats();
    
    isInitialized = true;
    console.log('Billing Module initialized successfully');
}

/**
 * Load all patients from Firestore
 */
async function loadPatients() {
    try {
        console.log('Loading patients from Firestore...');
        // Load from new patients collection
        const patientsCollection = collection(db, 'patients');
        const querySnapshot = await getDocs(patientsCollection);
        
        allPatients = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const patient = {
                id: doc.id,
                patientNumber: data.patientNumber || data.patientId || doc.id,
                fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                age: data.age,
                gender: data.gender,
                phone: data.phone || data.phoneNumber || data.contact,
                consultationFeePaid: data.consultationFeePaid || false
            };
            allPatients.push(patient);
            console.log('Loaded patient:', patient.patientNumber, patient.fullName);
        });
        
        console.log(`✅ Loaded ${allPatients.length} patients successfully`);
        
        // If no patients, show helpful message
        if (allPatients.length === 0) {
            console.warn('No patients found in database');
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        showNotification('Error loading patients: ' + error.message, 'error');
    }
}

/**
 * Setup patient search functionality
 */
function setupPatientSearch() {
    const searchInput = document.getElementById('billingPatientSearchInput');
    const resultsContainer = document.getElementById('billingPatientSearchResults');
    
    if (!searchInput) return;
    
    let searchTimeout;
    
    // Show all patients when input is focused (if empty)
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length === 0) {
            if (allPatients.length > 0) {
                displayPatientResults(allPatients);
            } else {
                resultsContainer.innerHTML = `
                    <div style="text-align:center;padding:30px 20px;color:var(--text-secondary);">
                        <i class="fas fa-users" style="font-size:48px;opacity:0.3;margin-bottom:16px;"></i>
                        <p style="font-size:15px;margin:0;">No patients in system</p>
                        <p style="font-size:13px;margin:8px 0 0 0;opacity:0.8;">Register patients in the Reception module first</p>
                    </div>
                `;
            }
        }
    });
    
    // Clear results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
            if (searchInput.value.trim().length === 0) {
                resultsContainer.innerHTML = '';
            }
        }
    });
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const searchTerm = e.target.value.trim().toLowerCase();
        
        if (searchTerm.length === 0) {
            // Show all patients when search is cleared
            if (allPatients.length > 0) {
                displayPatientResults(allPatients);
            } else {
                resultsContainer.innerHTML = `
                    <div style="text-align:center;padding:30px 20px;color:var(--text-secondary);">
                        <i class="fas fa-users" style="font-size:48px;opacity:0.3;margin-bottom:16px;"></i>
                        <p style="font-size:15px;margin:0;">No patients in system</p>
                        <p style="font-size:13px;margin:8px 0 0 0;opacity:0.8;">Register patients in the Reception module first</p>
                    </div>
                `;
            }
            return;
        }
        
        if (searchTerm.length < 2) {
            resultsContainer.innerHTML = `
                <div style="text-align:center;padding:20px;color:var(--text-secondary);">
                    <i class="fas fa-keyboard" style="font-size:32px;opacity:0.3;margin-bottom:12px;"></i>
                    <p style="font-size:14px;margin:0;">Type at least 2 characters to search...</p>
                </div>
            `;
            return;
        }
        
        // Show loading indicator
        resultsContainer.innerHTML = `
            <div style="text-align:center;padding:30px;">
                <div class="spinner" style="width:40px;height:40px;border:4px solid rgba(52,152,219,0.2);border-top-color:var(--primary-color);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px;"></div>
                <p style="color:var(--text-secondary);font-size:14px;margin:0;">Searching patients...</p>
            </div>
        `;
        
        searchTimeout = setTimeout(() => {
            console.log('Searching for:', searchTerm);
            console.log('Total patients:', allPatients.length);
            
            const results = allPatients.filter(patient => {
                // Safely get values with fallbacks
                const patientNumber = (patient.patientNumber || '').toString().toLowerCase();
                const fullName = (patient.fullName || '').toString().toLowerCase();
                const firstName = (patient.firstName || '').toString().toLowerCase();
                const lastName = (patient.lastName || '').toString().toLowerCase();
                const phone = (patient.phone || '').toString();
                
                // Check if search term matches any field
                const matches = patientNumber.includes(searchTerm) ||
                               fullName.includes(searchTerm) ||
                               firstName.includes(searchTerm) ||
                               lastName.includes(searchTerm) ||
                               phone.includes(searchTerm);
                
                return matches;
            });
            
            console.log('Found', results.length, 'matching patients');
            displayPatientResults(results);
        }, 300);
    });
}

// Add spinner animation to stylesheet if not present
if (!document.getElementById('billing-animations')) {
    const style = document.createElement('style');
    style.id = 'billing-animations';
    style.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Display patient search results
 */
function displayPatientResults(patients) {
    const resultsContainer = document.getElementById('billingPatientSearchResults');
    
    if (patients.length === 0) {
        resultsContainer.innerHTML = `
            <div style="text-align:center;padding:40px 20px;">
                <i class="fas fa-user-slash" style="font-size:48px;color:var(--text-secondary);opacity:0.3;margin-bottom:16px;"></i>
                <p style="color:var(--text-secondary);font-size:15px;margin:0;">No patients found</p>
                <p style="color:var(--text-secondary);font-size:13px;margin:8px 0 0 0;opacity:0.8;">Try searching with a different term</p>
            </div>
        `;
        return;
    }
    
    // Add a subtle header showing count
    const headerHTML = `
        <div style="padding:8px 12px;margin-bottom:12px;background:linear-gradient(135deg,rgba(52,152,219,0.08) 0%,rgba(155,89,182,0.05) 100%);border-radius:8px;display:flex;align-items:center;gap:8px;">
            <i class="fas fa-users" style="color:var(--primary-color);"></i>
            <span style="font-size:13px;font-weight:600;color:var(--text-primary);">${patients.length} Patient${patients.length > 1 ? 's' : ''} Found</span>
        </div>
    `;
    
    resultsContainer.innerHTML = headerHTML + patients.map(patient => `
        <div class="patient-result-item" onclick="selectPatient('${patient.id}')">
            <div class="patient-result-info">
                <h5>${patient.fullName}</h5>
                <p>Patient #: ${patient.patientNumber}</p>
                <div class="patient-meta">
                    <span><i class="fas fa-user"></i> ${patient.gender || 'N/A'}</span>
                    <span><i class="fas fa-birthday-cake"></i> ${patient.age || 'N/A'} years</span>
                    ${patient.phone ? `<span><i class="fas fa-phone"></i> ${patient.phone}</span>` : ''}
                </div>
            </div>
            <i class="fas fa-chevron-right" style="color:var(--primary-color);"></i>
        </div>
    `).join('');
}

/**
 * Select a patient for billing
 */
window.selectPatient = function(patientId) {
    selectedPatient = allPatients.find(p => p.id === patientId);
    
    if (!selectedPatient) return;
    
    // Display patient info
    document.getElementById('displayPatientNumber').textContent = selectedPatient.patientNumber;
    document.getElementById('displayPatientName').textContent = selectedPatient.fullName;
    document.getElementById('displayPatientAge').textContent = selectedPatient.age || 'N/A';
    document.getElementById('displayPatientGender').textContent = selectedPatient.gender || 'N/A';
    
    // Show sections
    document.getElementById('selectedPatientSection').style.display = 'block';
    document.getElementById('billingFormSection').style.display = 'block';
    
    // Clear search
    const searchInput = document.getElementById('billingPatientSearchInput');
    const resultsContainer = document.getElementById('billingPatientSearchResults');
    if (searchInput) searchInput.value = '';
    if (resultsContainer) resultsContainer.innerHTML = '';
    
    // Reset form
    resetBillingForm();
    
    showNotification(`Patient ${selectedPatient.fullName} selected`, 'success');
};

/**
 * Setup mode toggle for patient selection
 */
function setupModeToggle() {
    const searchBtn = document.getElementById('searchPatientBtn');
    const manualBtn = document.getElementById('manualBillBtn');
    
    if (searchBtn && manualBtn) {
        // Set initial state
        searchBtn.classList.add('active');
    }
}

/**
 * Toggle between search and manual billing modes
 */
window.toggleBillingMode = function(mode) {
    const searchMode = document.getElementById('patientSearchMode');
    const manualMode = document.getElementById('manualPatientMode');
    const searchBtn = document.getElementById('searchPatientBtn');
    const manualBtn = document.getElementById('manualBillBtn');
    
    if (mode === 'search') {
        searchMode.style.display = 'block';
        manualMode.style.display = 'none';
        searchBtn.classList.add('active');
        manualBtn.classList.remove('active');
        
        // Clear manual inputs
        document.getElementById('manualPatientNumber').value = '';
        document.getElementById('manualPatientName').value = '';
        document.getElementById('manualPatientAge').value = '';
        document.getElementById('manualPatientGender').value = '';
    } else {
        searchMode.style.display = 'none';
        manualMode.style.display = 'block';
        searchBtn.classList.remove('active');
        manualBtn.classList.add('active');
        
        // Clear search
        const searchInput = document.getElementById('billingPatientSearchInput');
        const resultsContainer = document.getElementById('billingPatientSearchResults');
        if (searchInput) searchInput.value = '';
        if (resultsContainer) resultsContainer.innerHTML = '';
    }
    
    // Hide patient info section
    document.getElementById('selectedPatientSection').style.display = 'none';
    document.getElementById('billingFormSection').style.display = 'none';
};

/**
 * Use manual patient information
 */
window.useManualPatient = function() {
    const patientNumber = document.getElementById('manualPatientNumber').value.trim() || 'WALK-IN-' + Date.now();
    const patientName = document.getElementById('manualPatientName').value.trim();
    const patientAge = document.getElementById('manualPatientAge').value.trim();
    const patientGender = document.getElementById('manualPatientGender').value;
    
    if (!patientName) {
        showNotification('Please enter patient name', 'warning');
        document.getElementById('manualPatientName').focus();
        return;
    }
    
    // Create temporary patient object
    selectedPatient = {
        id: 'manual-' + Date.now(),
        patientNumber: patientNumber,
        fullName: patientName,
        age: patientAge || 'N/A',
        gender: patientGender || 'N/A',
        isManualEntry: true
    };
    
    // Display patient info
    document.getElementById('displayPatientNumber').textContent = selectedPatient.patientNumber;
    document.getElementById('displayPatientName').textContent = selectedPatient.fullName;
    document.getElementById('displayPatientAge').textContent = selectedPatient.age;
    document.getElementById('displayPatientGender').textContent = selectedPatient.gender;
    
    // Show sections
    document.getElementById('selectedPatientSection').style.display = 'block';
    document.getElementById('billingFormSection').style.display = 'block';
    
    // Reset form
    resetBillingForm();
    
    showNotification(`Manual entry created for ${selectedPatient.fullName}`, 'success');
};

/**
 * Setup toggle switches
 */
function setupToggleSwitches() {
    const consultationToggle = document.getElementById('consultationFeeToggle');
    const pharmacyToggle = document.getElementById('pharmacyPaymentToggle');
    
    if (consultationToggle) {
        consultationToggle.addEventListener('change', (e) => {
            document.getElementById('consultationFeeContent').style.display = 
                e.target.checked ? 'block' : 'none';
            updateBillSummary();
        });
    }
    
    if (pharmacyToggle) {
        pharmacyToggle.addEventListener('change', (e) => {
            document.getElementById('pharmacyPaymentContent').style.display = 
                e.target.checked ? 'block' : 'none';
            updateBillSummary();
        });
    }
}

/**
 * Setup service buttons
 */
function setupServiceButtons() {
    const addServiceBtn = document.getElementById('addServiceBtn');
    
    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', addServiceItem);
    }
}

/**
 * Add a new service item
 */
function addServiceItem() {
    const serviceId = 'service-' + Date.now();
    const servicesContainer = document.getElementById('servicesContainer');
    
    const serviceHTML = `
        <div class="service-item" id="${serviceId}">
            <div class="form-group">
                <label>Service Description</label>
                <input type="text" class="form-input service-description" placeholder="e.g., X-Ray, Lab Test, Imaging...">
            </div>
            <div class="form-group">
                <label>Amount (KSh)</label>
                <input type="number" class="form-input service-amount" min="0" step="0.01" value="0" onchange="updateBillSummary()">
            </div>
            <button type="button" class="remove-service-btn" onclick="removeService('${serviceId}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    servicesContainer.insertAdjacentHTML('beforeend', serviceHTML);
    updateBillSummary();
}

/**
 * Remove a service item
 */
window.removeService = function(serviceId) {
    document.getElementById(serviceId).remove();
    updateBillSummary();
};

/**
 * Update bill summary
 */
function updateBillSummary() {
    let consultationFee = 0;
    let servicesTotal = 0;
    let pharmacyTotal = 0;
    
    // Consultation fee
    const consultationToggle = document.getElementById('consultationFeeToggle');
    if (consultationToggle && consultationToggle.checked) {
        consultationFee = parseFloat(document.getElementById('consultationAmount').value) || 0;
    }
    
    // Additional services
    const serviceAmounts = document.querySelectorAll('.service-amount');
    serviceAmounts.forEach(input => {
        servicesTotal += parseFloat(input.value) || 0;
    });
    
    // Pharmacy payment
    const pharmacyToggle = document.getElementById('pharmacyPaymentToggle');
    if (pharmacyToggle && pharmacyToggle.checked) {
        pharmacyTotal = parseFloat(document.getElementById('pharmacyAmount').value) || 0;
    }
    
    const total = consultationFee + servicesTotal + pharmacyTotal;
    
    // Update summary display
    document.getElementById('summaryConsultation').textContent = formatCurrency(consultationFee);
    document.getElementById('summaryServices').textContent = formatCurrency(servicesTotal);
    document.getElementById('summaryPharmacy').textContent = formatCurrency(pharmacyTotal);
    document.getElementById('summaryTotal').textContent = formatCurrency(total);
}

/**
 * Setup billing form submission
 */
function setupBillingForm() {
    const billingForm = document.getElementById('billingForm');
    const clearBtn = document.getElementById('clearBillingBtn');
    
    console.log('Setting up billing form...', billingForm ? 'Form found' : 'Form NOT found');
    
    // Add input listeners for real-time calculation
    const consultationAmount = document.getElementById('consultationAmount');
    const pharmacyAmount = document.getElementById('pharmacyAmount');
    
    if (consultationAmount) {
        consultationAmount.removeEventListener('input', updateBillSummary);
        consultationAmount.addEventListener('input', updateBillSummary);
    }
    if (pharmacyAmount) {
        pharmacyAmount.removeEventListener('input', updateBillSummary);
        pharmacyAmount.addEventListener('input', updateBillSummary);
    }
    
    if (billingForm) {
        // Clone and replace form to remove all old event listeners
        const newForm = billingForm.cloneNode(true);
        billingForm.parentNode.replaceChild(newForm, billingForm);
        
        // Add submit handler to the new form
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('📝 Form submitted, processing billing...');
            await processBilling();
        });
        console.log('✅ Billing form submit handler attached (cleaned)');
    } else {
        console.error('❌ Billing form element not found!');
    }
    
    // Re-get clear button after cloning
    const newClearBtn = document.getElementById('clearBillingBtn');
    if (newClearBtn) {
        newClearBtn.addEventListener('click', () => {
            if (confirm('Clear all billing information?')) {
                resetBillingForm();
                selectedPatient = null;
                document.getElementById('selectedPatientSection').style.display = 'none';
                document.getElementById('billingFormSection').style.display = 'none';
            }
        });
    }
}

/**
 * Generate sequential receipt number
 */
async function generateReceiptNumber() {
    try {
        // Get the latest bill to determine next number
        const billsCollection = collection(db, 'bills');
        const q = query(billsCollection, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        let maxNumber = 0;
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.receiptNumber && data.receiptNumber.startsWith('RCP-')) {
                const numPart = data.receiptNumber.replace('RCP-', '');
                const num = parseInt(numPart);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        });
        
        // Generate next number
        const nextNumber = maxNumber + 1;
        return 'RCP-' + String(nextNumber).padStart(3, '0');
    } catch (error) {
        console.error('Error generating receipt number:', error);
        // Fallback to timestamp-based
        return 'RCP-' + Date.now();
    }
}

/**
 * Process billing and save to Firestore
 */
async function processBilling() {
    console.log('🔍 Starting billing process...');
    
    if (!selectedPatient) {
        console.warn('⚠️ No patient selected');
        showNotification('Please select a patient first', 'warning');
        return;
    }
    
    console.log('✓ Patient selected:', selectedPatient.fullName);
    
    const paymentMethodEl = document.getElementById('billingPaymentMethod');
    console.log('Payment method element:', paymentMethodEl);
    const paymentMethod = paymentMethodEl ? paymentMethodEl.value : '';
    console.log('Payment method value:', paymentMethod);
    
    if (!paymentMethod || paymentMethod === '') {
        console.warn('⚠️ No payment method selected');
        showNotification('Please select a payment method', 'warning');
        return;
    }
    
    console.log('✓ Payment method:', paymentMethod);
    
    try {
        // Collect bill items
        const billItems = [];
        let totalAmount = 0;
        
        console.log('📋 Collecting bill items...');
        
        // Consultation fee
        const consultationToggle = document.getElementById('consultationFeeToggle');
        if (consultationToggle && consultationToggle.checked) {
            const amount = parseFloat(document.getElementById('consultationAmount').value) || 0;
            const status = document.getElementById('consultationStatus').value;
            billItems.push({
                type: 'consultation',
                description: 'Consultation Fee',
                amount: amount,
                status: status
            });
            totalAmount += amount;
            console.log('  ✓ Consultation:', amount);
        }
        
        // Additional services
        const serviceItems = document.querySelectorAll('.service-item');
        console.log('  Found', serviceItems.length, 'service items');
        serviceItems.forEach((item, index) => {
            const descriptionEl = item.querySelector('.service-description');
            const amountEl = item.querySelector('.service-amount');
            const description = descriptionEl ? descriptionEl.value.trim() : '';
            const amount = parseFloat(amountEl ? amountEl.value : 0) || 0;
            
            console.log(`  Service ${index + 1}:`, description, amount);
            
            if (description && amount > 0) {
                billItems.push({
                    type: 'service',
                    description: description,
                    amount: amount,
                    status: 'paid'
                });
                totalAmount += amount;
                console.log('    ✓ Added to bill');
            } else if (description && amount === 0) {
                console.warn('    ⚠️ Service has 0 amount, skipped');
            } else if (!description) {
                console.warn('    ⚠️ Service has no description, skipped');
            }
        });
        
        // Pharmacy payment
        const pharmacyToggle = document.getElementById('pharmacyPaymentToggle');
        if (pharmacyToggle && pharmacyToggle.checked) {
            const amount = parseFloat(document.getElementById('pharmacyAmount').value) || 0;
            const prescriptionNumber = document.getElementById('pharmacyPrescriptionNumber').value;
            if (amount > 0) {
                billItems.push({
                    type: 'pharmacy',
                    description: 'Pharmacy Payment' + (prescriptionNumber ? ` (${prescriptionNumber})` : ''),
                    amount: amount,
                    status: 'paid',
                    prescriptionNumber: prescriptionNumber
                });
                totalAmount += amount;
                console.log('  ✓ Pharmacy:', amount);
            }
        }
        
        if (billItems.length === 0) {
            console.warn('⚠️ No bill items added');
            showNotification('Please add at least one bill item', 'warning');
            return;
        }
        
        console.log('✓ Total items:', billItems.length, 'Total amount:', totalAmount);
        
        // Generate sequential receipt number
        const receiptNumber = await generateReceiptNumber();
        console.log('✓ Receipt number:', receiptNumber);
        
        // Prepare bill data (with proper null checks)
        const billData = {
            receiptNumber: receiptNumber,
            patientId: selectedPatient.id || '',
            patientNumber: selectedPatient.patientNumber || '',
            patientName: selectedPatient.fullName || '',
            patientAge: selectedPatient.age || null,
            patientGender: selectedPatient.gender || null,
            items: billItems,
            totalAmount: totalAmount,
            paymentMethod: paymentMethod,
            paymentReference: document.getElementById('paymentReference')?.value || null,
            notes: document.getElementById('billingNotes')?.value || null,
            status: 'paid',
            createdAt: serverTimestamp(),
            createdBy: 'Current User',
            dateTime: new Date().toISOString()
        };
        
        console.log('💾 Saving to Firestore...', billData);
        
        // Save to Firestore
        const billsCollection = collection(db, 'bills');
        const docRef = await addDoc(billsCollection, billData);
        
        console.log('✅ Bill saved to Firestore with ID:', docRef.id);
        
        // Show receipt
        showReceipt({ ...billData, id: docRef.id });
        
        // Reset form
        resetBillingForm();
        selectedPatient = null;
        document.getElementById('selectedPatientSection').style.display = 'none';
        document.getElementById('billingFormSection').style.display = 'none';
        
        showNotification('✅ Payment processed successfully!', 'success');
        
        // Update stats
        updateBillingStats();
        
        console.log('✅ Billing process completed successfully');
        
    } catch (error) {
        console.error('❌ Error processing billing:', error);
        console.error('Error details:', error.message, error.stack);
        showNotification('Error processing payment: ' + error.message, 'error');
    }
}

/**
 * Reset billing form
 */
function resetBillingForm() {
    document.getElementById('billingForm').reset();
    document.getElementById('consultationFeeToggle').checked = false;
    document.getElementById('pharmacyPaymentToggle').checked = false;
    document.getElementById('consultationFeeContent').style.display = 'none';
    document.getElementById('pharmacyPaymentContent').style.display = 'none';
    document.getElementById('servicesContainer').innerHTML = '';
    updateBillSummary();
}

/**
 * Show receipt modal
 */
function showReceipt(billData) {
    const modal = document.getElementById('receiptModal');
    const receiptContent = document.getElementById('receiptContent');
    
    const itemsHTML = billData.items.map(item => `
        <tr>
            <td>${item.description}</td>
            <td style="text-align:right;">${formatCurrency(item.amount)}</td>
        </tr>
    `).join('');
    
    receiptContent.innerHTML = `
        <div class="receipt-header">
            <h2>RxFlow Hospital Management System</h2>
            <p>Payment Receipt</p>
            <p><strong>Receipt #: ${billData.receiptNumber}</strong></p>
        </div>
        
        <div class="receipt-details">
            <div class="receipt-section">
                <h4>Patient Information</h4>
                <p><strong>Patient #:</strong> ${billData.patientNumber}</p>
                <p><strong>Name:</strong> ${billData.patientName}</p>
                <p><strong>Age:</strong> ${billData.patientAge || 'N/A'}</p>
                <p><strong>Gender:</strong> ${billData.patientGender || 'N/A'}</p>
            </div>
            <div class="receipt-section">
                <h4>Payment Information</h4>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
                <p><strong>Method:</strong> ${billData.paymentMethod.toUpperCase()}</p>
                ${billData.paymentReference ? `<p><strong>Ref:</strong> ${billData.paymentReference}</p>` : ''}
            </div>
        </div>
        
        <div class="receipt-items">
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align:right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
        </div>
        
        <div class="receipt-total">
            TOTAL PAID: ${formatCurrency(billData.totalAmount)}
        </div>
        
        ${billData.notes ? `<p style="margin-top:20px;"><strong>Notes:</strong> ${billData.notes}</p>` : ''}
        
        <div class="receipt-footer">
            <p>Thank you for choosing RxFlow Hospital</p>
            <p>This is a computer-generated receipt</p>
        </div>
    `;
    
    modal.style.display = 'flex';
}

/**
 * Close receipt modal
 */
window.closeReceiptModal = function() {
    document.getElementById('receiptModal').style.display = 'none';
};

/**
 * Print receipt
 */
window.printReceipt = function() {
    const receiptContent = document.getElementById('receiptContent').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Receipt</title>');
    printWindow.document.write('<style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{padding:8px;border-bottom:1px solid #ddd;}th{background:#f5f5f5;text-align:left;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(receiptContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
};

/**
 * Setup bills real-time listener
 */
function setupBillsRealtimeListener() {
    try {
        const billsCollection = collection(db, 'bills');
        const q = query(billsCollection, orderBy('dateTime', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            allBills = [];
            snapshot.forEach((doc) => {
                allBills.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`🔔 Real-time update: ${allBills.length} bills synced`);
            
            // Update view if on bills module
            const viewModule = document.getElementById('billing-view-module');
            if (viewModule && viewModule.classList.contains('active')) {
                filterAndRenderBills();
            }
            
            updateBillingStats();
        });
        
        console.log('✅ Bills real-time listener setup');
        return unsubscribe;
    } catch (error) {
        console.error('Error setting up bills listener:', error);
        return null;
    }
}

/**
 * Initialize view bills module
 */
export function initViewBillsModule() {
    console.log('Initializing View Bills Module...');
    
    setupBillSearch();
    setupBillFilters();
    setupExportDropdown();
    filterAndRenderBills();
}

/**
 * Setup export dropdown
 */
function setupExportDropdown() {
    const dropdownBtn = document.getElementById('exportDropdownBtn');
    const dropdown = document.getElementById('exportDropdown');
    
    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownBtn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }
}

/**
 * Setup bill search
 */
function setupBillSearch() {
    const searchInput = document.getElementById('billSearchInput');
    
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterAndRenderBills();
            }, 300);
        });
    }
}

/**
 * Setup bill filters
 */
function setupBillFilters() {
    const filterStatus = document.getElementById('filterPaymentStatus');
    const filterMethod = document.getElementById('filterPaymentMethod');
    const filterDate = document.getElementById('filterDate');
    const clearFiltersBtn = document.getElementById('clearBillFiltersBtn');
    
    [filterStatus, filterMethod, filterDate].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', filterAndRenderBills);
        }
    });
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            document.getElementById('billSearchInput').value = '';
            if (filterStatus) filterStatus.value = '';
            if (filterMethod) filterMethod.value = '';
            if (filterDate) filterDate.value = '';
            filterAndRenderBills();
        });
    }
}

/**
 * Filter and render bills
 */
function filterAndRenderBills() {
    const searchTerm = document.getElementById('billSearchInput')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterPaymentStatus')?.value || '';
    const methodFilter = document.getElementById('filterPaymentMethod')?.value || '';
    const dateFilter = document.getElementById('filterDate')?.value || '';
    
    filteredBills = allBills.filter(bill => {
        const matchesSearch = !searchTerm || 
            bill.patientName.toLowerCase().includes(searchTerm) ||
            bill.patientNumber.toLowerCase().includes(searchTerm) ||
            bill.receiptNumber.toLowerCase().includes(searchTerm);
        
        const matchesStatus = !statusFilter || bill.status === statusFilter;
        const matchesMethod = !methodFilter || bill.paymentMethod === methodFilter;
        
        let matchesDate = true;
        if (dateFilter && bill.dateTime) {
            const billDate = new Date(bill.dateTime).toISOString().split('T')[0];
            matchesDate = billDate === dateFilter;
        }
        
        return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    });
    
    renderBillsTable();
}

/**
 * Render bills table
 */
function renderBillsTable() {
    const tbody = document.getElementById('billingTableBody');
    if (!tbody) return;
    
    const startIndex = (currentBillPage - 1) * billPageSize;
    const endIndex = startIndex + billPageSize;
    const pageItems = filteredBills.slice(startIndex, endIndex);
    
    if (filteredBills.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="9">
                    <div class="empty-state-content">
                        <i class="fas fa-file-invoice"></i>
                        <p>No billing records found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pageItems.map(bill => {
        const date = new Date(bill.dateTime);
        const servicesCount = bill.items.length;
        const servicesSummary = bill.items.map(item => item.description).join(', ');
        
        return `
            <tr>
                <td><strong>${bill.receiptNumber}</strong></td>
                <td>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</td>
                <td>${bill.patientNumber}</td>
                <td>${bill.patientName}</td>
                <td title="${servicesSummary}">${servicesCount} item(s)</td>
                <td><strong>${formatCurrency(bill.totalAmount)}</strong></td>
                <td>${bill.paymentMethod.toUpperCase()}</td>
                <td><span class="status-badge ${bill.status}">${bill.status.toUpperCase()}</span></td>
                <td>
                    <button class="bill-action-btn view" onclick="viewBill('${bill.id}')" title="View Receipt">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="bill-action-btn print" onclick="printBill('${bill.id}')" title="Print Bill">
                        <i class="fas fa-print"></i>
                    </button>
                    ${bill.status !== 'cancelled' ? `
                    <button class="bill-action-btn cancel" onclick="cancelBill('${bill.id}')" title="Cancel">
                        <i class="fas fa-ban"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
    
    // Update pagination
    updateBillPagination();
}

/**
 * View bill details
 */
window.viewBill = function(billId) {
    const bill = allBills.find(b => b.id === billId);
    if (bill) {
        showReceipt(bill);
    }
};

/**
 * Print bill
 */
window.printBill = function(billId) {
    const bill = allBills.find(b => b.id === billId);
    if (!bill) {
        showNotification('Bill not found', 'error');
        return;
    }
    
    // Create print window with receipt
    const printWindow = window.open('', '_blank');
    const date = new Date(bill.dateTime);
    
    const itemsHTML = bill.items.map(item => `
        <tr>
            <td style="padding:8px;border-bottom:1px solid #ddd;">${item.description}</td>
            <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">${formatCurrency(item.amount)}</td>
        </tr>
    `).join('');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - ${bill.receiptNumber}</title>
            <style>
                body { font-family: 'Courier New', monospace; max-width: 800px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 24px; }
                .header p { margin: 5px 0; font-size: 12px; }
                .info { margin-bottom: 20px; }
                .info table { width: 100%; }
                .info td { padding: 5px 0; }
                .items table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .items th { background: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #000; }
                .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; }
                .footer { text-align: center; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; }
                @media print {
                    body { margin: 0; padding: 10mm; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>RxFlow Hospital Management System</h1>
                <p>Payment Receipt</p>
                <p>Receipt No: <strong>${bill.receiptNumber}</strong></p>
                <p>Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</p>
            </div>
            
            <div class="info">
                <table>
                    <tr>
                        <td><strong>Patient Number:</strong></td>
                        <td>${bill.patientNumber}</td>
                    </tr>
                    <tr>
                        <td><strong>Patient Name:</strong></td>
                        <td>${bill.patientName}</td>
                    </tr>
                    <tr>
                        <td><strong>Payment Method:</strong></td>
                        <td>${bill.paymentMethod.toUpperCase()}</td>
                    </tr>
                    ${bill.paymentReference ? `
                    <tr>
                        <td><strong>Reference:</strong></td>
                        <td>${bill.paymentReference}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>
            
            <div class="items">
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th style="text-align:right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
            </div>
            
            <div class="total">
                <p>TOTAL AMOUNT: ${formatCurrency(bill.totalAmount)}</p>
            </div>
            
            ${bill.notes ? `
            <div style="margin-top:20px;">
                <p><strong>Notes:</strong> ${bill.notes}</p>
            </div>
            ` : ''}
            
            <div class="footer">
                <p>Thank you for choosing RxFlow Hospital</p>
                <p>This is an official receipt</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    // Close after print dialog is closed (optional)
                    // window.onafterprint = function() { window.close(); };
                }
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
};

/**
 * Cancel bill
 */
window.cancelBill = async function(billId) {
    if (!confirm('Are you sure you want to cancel this bill?')) return;
    
    try {
        const billDoc = doc(db, 'bills', billId);
        await updateDoc(billDoc, {
            status: 'cancelled',
            cancelledAt: serverTimestamp(),
            cancelledBy: 'Current User'
        });
        
        showNotification('Bill cancelled successfully', 'success');
    } catch (error) {
        console.error('Error cancelling bill:', error);
        showNotification('Error cancelling bill', 'error');
    }
};

/**
 * Update bill pagination
 */
function updateBillPagination() {
    const totalItems = filteredBills.length;
    const totalPages = Math.ceil(totalItems / billPageSize);
    const startIndex = (currentBillPage - 1) * billPageSize + 1;
    const endIndex = Math.min(startIndex + billPageSize - 1, totalItems);
    
    document.getElementById('billShowingStart').textContent = totalItems > 0 ? startIndex : 0;
    document.getElementById('billShowingEnd').textContent = endIndex;
    document.getElementById('billTotalItems').textContent = totalItems;
    
    const prevBtn = document.getElementById('billPrevBtn');
    const nextBtn = document.getElementById('billNextBtn');
    
    if (prevBtn) prevBtn.disabled = currentBillPage === 1;
    if (nextBtn) nextBtn.disabled = currentBillPage >= totalPages;
}

/**
 * Go to previous page
 */
window.billPrevPage = function() {
    if (currentBillPage > 1) {
        currentBillPage--;
        renderBillsTable();
    }
};

/**
 * Go to next page
 */
window.billNextPage = function() {
    const totalPages = Math.ceil(filteredBills.length / billPageSize);
    if (currentBillPage < totalPages) {
        currentBillPage++;
        renderBillsTable();
    }
};

/**
 * Change page size
 */
window.changeBillPageSize = function(newSize) {
    billPageSize = parseInt(newSize);
    currentBillPage = 1;
    renderBillsTable();
};

/**
 * Update billing stats
 */
function updateBillingStats() {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Today's revenue
    const todayBills = allBills.filter(bill => {
        const billDate = new Date(bill.dateTime).toISOString().split('T')[0];
        return billDate === today && bill.status === 'paid';
    });
    const todayRevenue = todayBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    
    // This month's revenue
    const monthBills = allBills.filter(bill => {
        const billDate = new Date(bill.dateTime);
        return billDate.getMonth() === currentMonth && 
               billDate.getFullYear() === currentYear &&
               bill.status === 'paid';
    });
    const monthRevenue = monthBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    
    // Pending bills
    const pendingBills = allBills.filter(bill => bill.status === 'pending').length;
    
    document.getElementById('todayRevenue').textContent = formatCurrency(todayRevenue);
    document.getElementById('todayPayments').textContent = todayBills.length;
    document.getElementById('pendingBills').textContent = pendingBills;
    document.getElementById('monthRevenue').textContent = formatCurrency(monthRevenue);
    
    // Update recent billings table
    updateRecentBillings();
}

/**
 * Update recent billings table
 */
function updateRecentBillings() {
    const tbody = document.getElementById('recentBillingsTableBody');
    if (!tbody) return;
    
    // Get last 5 bills, sorted by date
    const recentBills = [...allBills]
        .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
        .slice(0, 5);
    
    if (recentBills.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="7">
                    <div class="empty-state-content">
                        <i class="fas fa-file-invoice"></i>
                        <p>No recent transactions</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = recentBills.map(bill => {
        const date = new Date(bill.dateTime);
        const timeAgo = getTimeAgo(date);
        
        return `
            <tr>
                <td class="time-col">${timeAgo}</td>
                <td class="receipt-col">${bill.receiptNumber}</td>
                <td>${bill.patientName}</td>
                <td class="amount-col">${formatCurrency(bill.totalAmount)}</td>
                <td><span class="method-badge"><i class="fas fa-${getPaymentIcon(bill.paymentMethod)}"></i> ${bill.paymentMethod.toUpperCase()}</span></td>
                <td><span class="status-badge ${bill.status}">${bill.status.toUpperCase()}</span></td>
                <td>
                    <button class="action-btn-sm" onclick="viewBill('${bill.id}')" title="View Receipt">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Get time ago string
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Get payment method icon
 */
function getPaymentIcon(method) {
    const icons = {
        'cash': 'money-bill-wave',
        'mpesa': 'mobile-alt',
        'card': 'credit-card',
        'bank-transfer': 'university',
        'insurance': 'shield-alt'
    };
    return icons[method] || 'money-check';
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Show notification - Clean and simple
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    
    const bgColors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    
    const icons = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    notification.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
            <i class="fas fa-${icons[type]}" style="font-size:16px;"></i>
            <span style="flex:1;">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:white;cursor:pointer;font-size:14px;padding:0;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${bgColors[type]};
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 10001;
        min-width: 280px;
        max-width: 400px;
        font-family: 'Montserrat', sans-serif;
        font-size: 13px;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Export bills as PDF
 */
window.exportBillsAsPDF = function() {
    try {
        // Close dropdown
        document.getElementById('exportDropdown').style.display = 'none';
        
        if (filteredBills.length === 0) {
            showNotification('No bills to export', 'warning');
            return;
        }
        
        // Create printable content
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bills Report - ${new Date().toLocaleDateString()}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #2563eb; text-align: center; }
                    .meta { text-align: center; color: #666; margin-bottom: 30px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #2563eb; color: white; padding: 12px; text-align: left; }
                    td { padding: 10px; border-bottom: 1px solid #ddd; }
                    tr:hover { background: #f5f5f5; }
                    .total { font-weight: bold; font-size: 18px; margin-top: 20px; text-align: right; }
                    .status { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
                    .paid { background: #d4edda; color: #155724; }
                    .pending { background: #fff3cd; color: #856404; }
                    .cancelled { background: #f8d7da; color: #721c24; }
                </style>
            </head>
            <body>
                <h1>RxFlow Hospital - Bills Report</h1>
                <div class="meta">
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    <p>Total Records: ${filteredBills.length}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Receipt</th>
                            <th>Date</th>
                            <th>Patient</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredBills.map((bill, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${bill.receiptNumber}</td>
                                <td>${new Date(bill.dateTime).toLocaleDateString()}</td>
                                <td>${bill.patientName}</td>
                                <td>${formatCurrency(bill.totalAmount)}</td>
                                <td>${bill.paymentMethod.toUpperCase()}</td>
                                <td><span class="status ${bill.status}">${bill.status.toUpperCase()}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="total">
                    Total Amount: ${formatCurrency(filteredBills.reduce((sum, bill) => sum + (bill.status === 'paid' ? bill.totalAmount : 0), 0))}
                </div>
            </body>
            </html>
        `;
        
        // Open print dialog
        const printWindow = window.open('', '', 'height=800,width=1000');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        
        showNotification(`Exported ${filteredBills.length} bills to PDF`, 'success');
    } catch (error) {
        console.error('Error exporting PDF:', error);
        showNotification('Error exporting PDF', 'error');
    }
};

/**
 * Export bills as Excel
 */
window.exportBillsAsExcel = function() {
    try {
        // Close dropdown
        document.getElementById('exportDropdown').style.display = 'none';
        
        if (filteredBills.length === 0) {
            showNotification('No bills to export', 'warning');
            return;
        }
        
        // Create HTML table for Excel
        let htmlTable = `
            <table>
                <thead>
                    <tr>
                        <th>Receipt Number</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Patient Number</th>
                        <th>Patient Name</th>
                        <th>Total Amount</th>
                        <th>Payment Method</th>
                        <th>Payment Reference</th>
                        <th>Status</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        filteredBills.forEach(bill => {
            const date = new Date(bill.dateTime);
            htmlTable += `
                <tr>
                    <td>${bill.receiptNumber}</td>
                    <td>${date.toLocaleDateString()}</td>
                    <td>${date.toLocaleTimeString()}</td>
                    <td>${bill.patientNumber}</td>
                    <td>${bill.patientName}</td>
                    <td>${bill.totalAmount}</td>
                    <td>${bill.paymentMethod}</td>
                    <td>${bill.paymentReference || '-'}</td>
                    <td>${bill.status}</td>
                    <td>${bill.notes || '-'}</td>
                </tr>
            `;
        });
        
        htmlTable += '</tbody></table>';
        
        // Create blob and download
        const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Bills_Report_${new Date().toISOString().split('T')[0]}.xls`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showNotification(`Exported ${filteredBills.length} bills to Excel`, 'success');
    } catch (error) {
        console.error('Error exporting Excel:', error);
        showNotification('Error exporting Excel', 'error');
    }
};

/**
 * Export bills as CSV
 */
window.exportBillsAsCSV = function() {
    try {
        // Close dropdown
        document.getElementById('exportDropdown').style.display = 'none';
        
        if (filteredBills.length === 0) {
            showNotification('No bills to export', 'warning');
            return;
        }
        
        // Create CSV content
        let csv = 'Receipt Number,Date,Time,Patient Number,Patient Name,Total Amount,Payment Method,Payment Reference,Status,Notes\n';
        
        filteredBills.forEach(bill => {
            const date = new Date(bill.dateTime);
            csv += `"${bill.receiptNumber}","${date.toLocaleDateString()}","${date.toLocaleTimeString()}","${bill.patientNumber}","${bill.patientName}",${bill.totalAmount},"${bill.paymentMethod}","${bill.paymentReference || '-'}","${bill.status}","${bill.notes || '-'}"\n`;
        });
        
        // Create blob and download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Bills_Report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showNotification(`Exported ${filteredBills.length} bills to CSV`, 'success');
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showNotification('Error exporting CSV', 'error');
    }
};

// Export functions
window.billingModule = {
    initBillingModule,
    initViewBillsModule
};

console.log('Billing module loaded successfully');
