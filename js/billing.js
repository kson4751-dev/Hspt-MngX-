// ===================================
// BILLING MODULE - RxFlow HMS
// Stable Rebuild v3.0
// ===================================

import { 
    db, 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    doc, 
    query, 
    orderBy, 
    where, 
    onSnapshot, 
    serverTimestamp,
    limit
} from './firebase-config.js';
import { logActivity } from './firebase-helpers.js';

// ===================================
// MODULE STATE - Single Source of Truth
// ===================================
const State = {
    patients: [],
    bills: [],
    filteredBills: [],
    isFiltering: false,
    billsPrimed: false,
    selectedPatient: null,
    currentPage: 1,
    pageSize: 25,
    initialized: false,
    processing: false,
    listenersAttached: {
        bills: false,
        search: false,
        form: false,
        services: false,
        viewBills: false,
        export: false
    },
    unsubscribeBills: null
};

// ===================================
// UTILITIES
// ===================================
const $ = (id) => document.getElementById(id);

const toClassName = (value) => (value || 'unknown')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

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

const notify = (message, type = 'info') => {
    // Remove any existing notifications
    document.querySelectorAll('.billing-toast').forEach(n => n.remove());
    
    const toast = document.createElement('div');
    toast.className = `billing-toast billing-toast-${type}`;
    
    const colors = {
        success: '#10b981',
        error: '#ef4444', 
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const icons = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `<i class="fas fa-${icons[type]}"></i> ${message}`;
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 99999;
        padding: 14px 20px; border-radius: 8px;
        background: ${colors[type]}; color: white;
        font-size: 14px; font-weight: 500;
        display: flex; align-items: center; gap: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        animation: toastIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);

    if (typeof window !== 'undefined' && typeof window.showNotification === 'function') {
        try {
            window.showNotification(message, type);
        } catch (err) {
            console.warn('Billing: Global notification failed', err);
        }
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

async function dispatchBillingNotification(bill) {
    try {
        if (typeof window === 'undefined') return;
        const { userId } = getUserContext();
        if (!userId) return;

        const message = `${bill.patientName || 'Patient'} paid ${formatMoney(bill.totalAmount)} via ${bill.paymentMethod || 'N/A'}.`;

        if (typeof window.createNotification === 'function') {
            await window.createNotification(
                userId,
                'success',
                'Billing Receipt Processed',
                message,
                'fa-receipt',
                {
                    receiptNumber: bill.receiptNumber,
                    amount: bill.totalAmount,
                    patient: bill.patientName,
                    paymentMethod: bill.paymentMethod
                }
            );
        }
    } catch (err) {
        console.warn('Billing: Notification dispatch failed', err);
    }
}

async function logBillingActivityEntry(bill) {
    try {
        await logActivity({
            module: 'Billing',
            type: 'billing',
            action: 'Receipt Processed',
            patient: bill.patientName,
            patientId: bill.patientId,
            status: 'success',
            statusText: 'Completed',
            description: `Receipt ${bill.receiptNumber} processed for ${formatMoney(bill.totalAmount)} (${bill.paymentMethod || 'N/A'})`,
            metadata: {
                receiptNumber: bill.receiptNumber,
                patientNumber: bill.patientNumber,
                paymentMethod: bill.paymentMethod,
                totalAmount: bill.totalAmount,
                billId: bill.id || null
            }
        });
    } catch (err) {
        console.warn('Billing: Activity log failed', err);
    }
}

// ===================================
// INITIALIZATION
// ===================================
export async function initBillingModule() {
    if (State.initialized) {
        console.log('Billing: Already initialized');
        return;
    }
    
    console.log('Billing: Initializing...');
    
    try {
        await loadPatients();
        attachSearchListeners();
        attachFormListeners();
        attachServiceListeners();
        startBillsListener();
        
        State.initialized = true;
        console.log('Billing: Ready ✓');
    } catch (err) {
        console.error('Billing: Init failed', err);
        notify('Failed to initialize billing', 'error');
    }
}

// ===================================
// LOAD PATIENTS
// ===================================
async function loadPatients() {
    try {
        const snap = await getDocs(collection(db, 'patients'));
        State.patients = [];
        
        snap.forEach(doc => {
            const d = doc.data();
            State.patients.push({
                id: doc.id,
                number: d.patientNumber || d.patientId || doc.id,
                name: d.fullName || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Unknown',
                age: d.age || '-',
                gender: d.gender || '-',
                phone: d.phone || d.phoneNumber || ''
            });
        });
        
        console.log(`Billing: Loaded ${State.patients.length} patients`);
    } catch (err) {
        console.error('Billing: Failed to load patients', err);
    }
}

// ===================================
// PATIENT SEARCH
// ===================================
function attachSearchListeners() {
    if (State.listenersAttached.search) return;
    
    const input = $('billingPatientSearchInput');
    const results = $('billingPatientSearchResults');
    
    if (!input || !results) return;
    
    let timer;
    
    input.addEventListener('focus', () => {
        if (!input.value.trim()) {
            showPatientResults(State.patients.slice(0, 15));
        }
    });
    
    input.addEventListener('input', () => {
        clearTimeout(timer);
        const term = input.value.trim().toLowerCase();
        
        if (!term) {
            showPatientResults(State.patients.slice(0, 15));
            return;
        }
        
        if (term.length < 2) {
            results.innerHTML = '<div class="search-msg"><i class="fas fa-keyboard"></i> Type 2+ characters</div>';
            return;
        }
        
        results.innerHTML = '<div class="search-msg"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
        
        timer = setTimeout(() => {
            const matches = State.patients.filter(p => 
                p.number.toLowerCase().includes(term) ||
                p.name.toLowerCase().includes(term) ||
                p.phone.includes(term)
            );
            showPatientResults(matches);
        }, 250);
    });
    
    // Event delegation for patient selection
    results.addEventListener('click', (e) => {
        const item = e.target.closest('.search-patient-item');
        if (item) {
            const id = item.dataset.id;
            selectPatient(id);
        }
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.innerHTML = '';
        }
    });
    
    State.listenersAttached.search = true;
}

function showPatientResults(patients) {
    const results = $('billingPatientSearchResults');
    if (!results) return;
    
    if (!patients.length) {
        results.innerHTML = '<div class="search-msg"><i class="fas fa-user-slash"></i> No patients found</div>';
        return;
    }
    
    results.innerHTML = patients.map(p => `
        <div class="search-patient-item" data-id="${p.id}">
            <div class="patient-info">
                <strong>${p.name}</strong>
                <span class="patient-id">#${p.number}</span>
            </div>
            <div class="patient-details">
                <span><i class="fas fa-venus-mars"></i> ${p.gender}</span>
                <span><i class="fas fa-birthday-cake"></i> ${p.age}</span>
                ${p.phone ? `<span><i class="fas fa-phone"></i> ${p.phone}</span>` : ''}
            </div>
        </div>
    `).join('');
}

function selectPatient(id) {
    const patient = State.patients.find(p => p.id === id);
    if (!patient) {
        notify('Patient not found', 'error');
        return;
    }
    
    State.selectedPatient = patient;
    
    // Update display
    const num = $('displayPatientNumber');
    const name = $('displayPatientName');
    const age = $('displayPatientAge');
    const gender = $('displayPatientGender');
    
    if (num) num.textContent = patient.number;
    if (name) name.textContent = patient.name;
    if (age) age.textContent = patient.age;
    if (gender) gender.textContent = patient.gender;
    
    // Show sections
    const infoSection = $('selectedPatientSection');
    const formSection = $('billingFormSection');
    
    if (infoSection) infoSection.style.display = 'block';
    if (formSection) formSection.style.display = 'block';
    
    // Clear search
    const input = $('billingPatientSearchInput');
    const results = $('billingPatientSearchResults');
    if (input) input.value = '';
    if (results) results.innerHTML = '';
    
    // Reset form
    resetForm();
    
    // Scroll to form
    if (infoSection) {
        setTimeout(() => infoSection.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    
    notify(`Selected: ${patient.name}`, 'success');
}

// Global access
window.selectPatient = selectPatient;

// ===================================
// MODE TOGGLE
// ===================================
window.toggleBillingMode = function(mode) {
    const searchMode = $('patientSearchMode');
    const manualMode = $('manualPatientMode');
    const searchBtn = $('searchPatientBtn');
    const manualBtn = $('manualBillBtn');
    
    if (mode === 'search') {
        if (searchMode) searchMode.style.display = 'block';
        if (manualMode) manualMode.style.display = 'none';
        if (searchBtn) searchBtn.classList.add('active');
        if (manualBtn) manualBtn.classList.remove('active');
    } else {
        if (searchMode) searchMode.style.display = 'none';
        if (manualMode) manualMode.style.display = 'block';
        if (searchBtn) searchBtn.classList.remove('active');
        if (manualBtn) manualBtn.classList.add('active');
    }
    
    // Hide billing sections
    const infoSection = $('selectedPatientSection');
    const formSection = $('billingFormSection');
    if (infoSection) infoSection.style.display = 'none';
    if (formSection) formSection.style.display = 'none';
    
    State.selectedPatient = null;
};

window.useManualPatient = function() {
    const name = $('manualPatientName')?.value.trim();
    const number = $('manualPatientNumber')?.value.trim() || `WLK-${Date.now().toString().slice(-6)}`;
    const age = $('manualPatientAge')?.value || '-';
    const gender = $('manualPatientGender')?.value || '-';
    
    if (!name) {
        notify('Please enter patient name', 'warning');
        $('manualPatientName')?.focus();
        return;
    }
    
    State.selectedPatient = { id: `manual-${Date.now()}`, number, name, age, gender, isManual: true };
    
    // Update display
    const numEl = $('displayPatientNumber');
    const nameEl = $('displayPatientName');
    const ageEl = $('displayPatientAge');
    const genderEl = $('displayPatientGender');
    
    if (numEl) numEl.textContent = number;
    if (nameEl) nameEl.textContent = name;
    if (ageEl) ageEl.textContent = age;
    if (genderEl) genderEl.textContent = gender;
    
    // Show sections
    const infoSection = $('selectedPatientSection');
    const formSection = $('billingFormSection');
    if (infoSection) infoSection.style.display = 'block';
    if (formSection) formSection.style.display = 'block';
    
    resetForm();
    
    if (infoSection) {
        setTimeout(() => infoSection.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    
    notify(`Walk-in: ${name}`, 'success');
};

// ===================================
// BILLING FORM
// ===================================
function attachFormListeners() {
    if (State.listenersAttached.form) return;
    
    const form = $('billingForm');
    const consultToggle = $('consultationFeeToggle');
    const pharmToggle = $('pharmacyPaymentToggle');
    const clearBtn = $('clearBillingBtn');
    
    // Toggles
    if (consultToggle) {
        consultToggle.addEventListener('change', (e) => {
            const content = $('consultationFeeContent');
            if (content) content.style.display = e.target.checked ? 'block' : 'none';
            updateSummary();
        });
    }
    
    if (pharmToggle) {
        pharmToggle.addEventListener('change', (e) => {
            const content = $('pharmacyPaymentContent');
            if (content) content.style.display = e.target.checked ? 'block' : 'none';
            updateSummary();
        });
    }
    
    // Amount inputs
    ['consultationAmount', 'pharmacyAmount'].forEach(id => {
        const el = $(id);
        if (el) el.addEventListener('input', updateSummary);
    });
    
    // Form submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (State.processing) {
                console.log('Billing: Already processing');
                return;
            }
            
            await processPayment();
        });
    }
    
    // Clear button
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear all billing data?')) {
                clearAll();
            }
        });
    }
    
    State.listenersAttached.form = true;
}

function attachServiceListeners() {
    if (State.listenersAttached.services) return;
    
    const addBtn = $('addServiceBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addService);
    }
    
    window.removeService = (id) => {
        const el = $(id);
        if (el) {
            el.remove();
            updateSummary();
        }
    };
    
    window.updateBillSummary = updateSummary;
    
    State.listenersAttached.services = true;
}

function addService() {
    const container = $('servicesContainer');
    if (!container) return;
    
    const id = `svc-${Date.now()}`;
    const html = `
        <div class="service-row" id="${id}">
            <input type="text" class="form-input svc-desc" placeholder="Service description">
            <input type="number" class="form-input svc-amt" min="0" step="0.01" value="0" oninput="updateBillSummary()">
            <button type="button" class="btn-remove-svc" onclick="removeService('${id}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function updateSummary() {
    let consultation = 0;
    let services = 0;
    let pharmacy = 0;
    
    // Consultation
    if ($('consultationFeeToggle')?.checked) {
        consultation = parseFloat($('consultationAmount')?.value) || 0;
    }
    
    // Services
    document.querySelectorAll('.svc-amt').forEach(input => {
        services += parseFloat(input.value) || 0;
    });
    
    // Pharmacy
    if ($('pharmacyPaymentToggle')?.checked) {
        pharmacy = parseFloat($('pharmacyAmount')?.value) || 0;
    }
    
    const total = consultation + services + pharmacy;
    
    const sumConsult = $('summaryConsultation');
    const sumSvc = $('summaryServices');
    const sumPharm = $('summaryPharmacy');
    const sumTotal = $('summaryTotal');
    
    if (sumConsult) sumConsult.textContent = formatMoney(consultation);
    if (sumSvc) sumSvc.textContent = formatMoney(services);
    if (sumPharm) sumPharm.textContent = formatMoney(pharmacy);
    if (sumTotal) sumTotal.textContent = formatMoney(total);
}

function resetForm() {
    const form = $('billingForm');
    if (form) form.reset();
    
    const consultToggle = $('consultationFeeToggle');
    const pharmToggle = $('pharmacyPaymentToggle');
    const consultContent = $('consultationFeeContent');
    const pharmContent = $('pharmacyPaymentContent');
    const servicesContainer = $('servicesContainer');
    
    if (consultToggle) consultToggle.checked = false;
    if (pharmToggle) pharmToggle.checked = false;
    if (consultContent) consultContent.style.display = 'none';
    if (pharmContent) pharmContent.style.display = 'none';
    if (servicesContainer) servicesContainer.innerHTML = '';
    
    updateSummary();
}

function clearAll() {
    resetForm();
    State.selectedPatient = null;
    
    const infoSection = $('selectedPatientSection');
    const formSection = $('billingFormSection');
    if (infoSection) infoSection.style.display = 'none';
    if (formSection) formSection.style.display = 'none';
    
    notify('Form cleared', 'info');
}

// ===================================
// PAYMENT PROCESSING
// ===================================
async function processPayment() {
    if (State.processing) return;
    
    State.processing = true;
    
    const submitBtn = document.querySelector('#billingForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }
    
    try {
        // Validate
        if (!State.selectedPatient) {
            notify('Select a patient first', 'warning');
            return;
        }
        
        const paymentMethod = $('billingPaymentMethod')?.value;
        if (!paymentMethod) {
            notify('Select payment method', 'warning');
            return;
        }
        
        // Collect items
        const items = [];
        let total = 0;
        
        // Consultation
        if ($('consultationFeeToggle')?.checked) {
            const amt = parseFloat($('consultationAmount')?.value) || 0;
            if (amt > 0) {
                items.push({ description: 'Consultation Fee', amount: amt });
                total += amt;
            }
        }
        
        // Services
        document.querySelectorAll('.service-row').forEach(row => {
            const desc = row.querySelector('.svc-desc')?.value.trim();
            const amt = parseFloat(row.querySelector('.svc-amt')?.value) || 0;
            if (desc && amt > 0) {
                items.push({ description: desc, amount: amt });
                total += amt;
            }
        });
        
        // Pharmacy
        if ($('pharmacyPaymentToggle')?.checked) {
            const amt = parseFloat($('pharmacyAmount')?.value) || 0;
            const rx = $('pharmacyPrescriptionNumber')?.value.trim();
            if (amt > 0) {
                items.push({ description: `Pharmacy${rx ? ` (Rx: ${rx})` : ''}`, amount: amt });
                total += amt;
            }
        }
        
        if (items.length === 0) {
            notify('Add at least one item', 'warning');
            return;
        }
        
        // Generate receipt number
        const receiptNumber = await generateReceiptNumber();
        
        // Bill data
        const bill = {
            receiptNumber,
            patientId: State.selectedPatient.id,
            patientNumber: State.selectedPatient.number,
            patientName: State.selectedPatient.name,
            patientAge: State.selectedPatient.age,
            patientGender: State.selectedPatient.gender,
            items,
            totalAmount: total,
            paymentMethod,
            paymentReference: $('paymentReference')?.value.trim() || null,
            notes: $('billingNotes')?.value.trim() || null,
            status: 'paid',
            createdAt: serverTimestamp(),
            dateTime: new Date().toISOString()
        };
        
        // Save
        const docRef = await addDoc(collection(db, 'bills'), bill);
        console.log('Billing: Saved', docRef.id);
        
        const savedBill = { ...bill, id: docRef.id };
        
        // Show receipt
        showReceipt(savedBill);
        
        // Log activity + push notifications (non-blocking)
        Promise.allSettled([
            logBillingActivityEntry(savedBill),
            dispatchBillingNotification(savedBill)
        ]);
        
        // Clear
        clearAll();
        
        notify('Payment successful!', 'success');
        
    } catch (err) {
        console.error('Billing: Error', err);
        notify('Payment failed: ' + err.message, 'error');
    } finally {
        State.processing = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-receipt"></i> Generate Receipt & Save';
        }
    }
}

async function generateReceiptNumber() {
    try {
        const snap = await getDocs(query(collection(db, 'bills'), orderBy('createdAt', 'desc'), limit(1)));
        let max = 0;
        
        snap.forEach(doc => {
            const num = parseInt(doc.data().receiptNumber?.replace(/\D/g, '')) || 0;
            if (num > max) max = num;
        });
        
        return `RCP-${String(max + 1).padStart(6, '0')}`;
    } catch {
        return `RCP-${Date.now().toString().slice(-8)}`;
    }
}

// ===================================
// RECEIPT DISPLAY & PRINT
// ===================================
function showReceipt(bill) {
    const modal = $('receiptModal');
    const content = $('receiptContent');
    if (!modal || !content) return;
    
    const dateStr = bill.dateTime ? new Date(bill.dateTime) : new Date();
    
    content.innerHTML = `
        <div class="receipt-document">
            <div class="receipt-header">
                <div class="receipt-logo">
                    <i class="fas fa-hospital"></i>
                    <h2>RxFlow Hospital</h2>
                </div>
                <div class="receipt-title">
                    <h3>PAYMENT RECEIPT</h3>
                    <p class="receipt-number">${bill.receiptNumber}</p>
                </div>
            </div>
            
            <div class="receipt-divider"></div>
            
            <div class="receipt-details-grid">
                <div class="receipt-col">
                    <h4>Patient Details</h4>
                    <p><strong>ID:</strong> ${bill.patientNumber}</p>
                    <p><strong>Name:</strong> ${bill.patientName}</p>
                    <p><strong>Age:</strong> ${bill.patientAge || '-'}</p>
                    <p><strong>Gender:</strong> ${bill.patientGender || '-'}</p>
                </div>
                <div class="receipt-col">
                    <h4>Payment Details</h4>
                    <p><strong>Date:</strong> ${formatDate(bill.dateTime)}</p>
                    <p><strong>Time:</strong> ${formatTime(bill.dateTime)}</p>
                    <p><strong>Method:</strong> ${bill.paymentMethod?.toUpperCase()}</p>
                    ${bill.paymentReference ? `<p><strong>Ref:</strong> ${bill.paymentReference}</p>` : ''}
                </div>
            </div>
            
            <div class="receipt-divider"></div>
            
            <table class="receipt-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th class="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${bill.items.map(item => `
                        <tr>
                            <td>${item.description}</td>
                            <td class="text-right">${formatMoney(item.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td><strong>TOTAL PAID</strong></td>
                        <td class="text-right"><strong>${formatMoney(bill.totalAmount)}</strong></td>
                    </tr>
                </tfoot>
            </table>
            
            ${bill.notes ? `<div class="receipt-notes"><strong>Notes:</strong> ${bill.notes}</div>` : ''}
            
            <div class="receipt-footer">
                <p>Thank you for choosing RxFlow Hospital</p>
                <p class="receipt-generated">This is a computer-generated receipt</p>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

window.closeReceiptModal = () => {
    const modal = $('receiptModal');
    if (modal) modal.style.display = 'none';
};

window.printReceipt = () => {
    const content = $('receiptContent');
    if (!content) return;
    
    const printWin = window.open('', '_blank', 'width=400,height=600');
    printWin.document.write(`
<!DOCTYPE html>
<html>
<head>
    <title>Receipt</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Courier New', monospace; 
            padding: 20px; 
            max-width: 320px; 
            margin: 0 auto;
            font-size: 12px;
            line-height: 1.4;
        }
        .receipt-document { padding: 10px; }
        .receipt-header { text-align: center; margin-bottom: 15px; }
        .receipt-logo i { display: none; }
        .receipt-logo h2 { font-size: 18px; margin-bottom: 5px; }
        .receipt-title h3 { font-size: 14px; border: 1px dashed #000; padding: 5px; margin: 10px 0; }
        .receipt-number { font-size: 12px; font-weight: bold; }
        .receipt-divider { border-top: 1px dashed #000; margin: 10px 0; }
        .receipt-details-grid { margin: 10px 0; }
        .receipt-col { margin-bottom: 10px; }
        .receipt-col h4 { font-size: 12px; text-decoration: underline; margin-bottom: 5px; }
        .receipt-col p { font-size: 11px; margin: 2px 0; }
        .receipt-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .receipt-table th, .receipt-table td { 
            padding: 5px 2px; 
            text-align: left; 
            font-size: 11px;
            border-bottom: 1px dotted #ccc;
        }
        .receipt-table .text-right { text-align: right; }
        .receipt-table tfoot { border-top: 2px solid #000; }
        .total-row td { padding-top: 10px; font-size: 13px; }
        .receipt-notes { font-size: 10px; margin: 10px 0; padding: 5px; background: #f5f5f5; }
        .receipt-footer { text-align: center; margin-top: 20px; font-size: 10px; }
        .receipt-generated { font-style: italic; margin-top: 5px; color: #666; }
        @media print {
            body { padding: 5px; }
        }
    </style>
</head>
<body>
    ${content.innerHTML}
    <script>window.onload = function() { window.print(); }</script>
</body>
</html>
    `);
    printWin.document.close();
};

// ===================================
// BILLS LISTENER - STABLE
// ===================================
function startBillsListener() {
    if (State.listenersAttached.bills) {
        console.log('Billing: Bills listener exists');
        return;
    }
    
    console.log('Billing: Starting bills listener...');
    
    const billsRef = collection(db, 'bills');
    const q = query(billsRef, orderBy('createdAt', 'desc'));
    
    State.unsubscribeBills = onSnapshot(q, 
        (snapshot) => {
            // Build fresh array from snapshot
            const billsMap = new Map();
            
            snapshot.docs.forEach(doc => {
                if (!billsMap.has(doc.id)) {
                    billsMap.set(doc.id, { id: doc.id, ...doc.data() });
                }
            });
            
            const billsArray = Array.from(billsMap.values());
            updateBillsState(billsArray, 'realtime');
        },
        (error) => {
            console.error('Billing: Listener error', error);
        }
    );
    
    State.listenersAttached.bills = true;
}

async function loadBillsOnce(limitCount = 200) {
    try {
        const snap = await getDocs(query(collection(db, 'bills'), orderBy('createdAt', 'desc'), limit(limitCount)));
        const billsArray = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateBillsState(billsArray, 'initial');
    } catch (err) {
        console.error('Billing: Failed to load bills snapshot', err);
    }
}

function updateBillsState(billsArray, source = 'snapshot') {
    State.bills = billsArray;
    State.billsPrimed = true;
    console.log(`Billing: ${billsArray.length} bills loaded (${source})`);
    
    renderRecentTransactions();
    updateStats();
    if (State.isFiltering) {
        filterBills();
    } else {
        renderBillsTable();
    }
}

// ===================================
// RECENT TRANSACTIONS - STABLE
// ===================================
function renderRecentTransactions() {
    const tbody = $('recentBillingsTableBody');
    if (!tbody) return;
    
    // Get latest 10
    const recent = State.bills.slice(0, 10);
    
    if (recent.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-cell">
                    <div class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>No recent transactions</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Build HTML once
    const rows = recent.map(bill => {
        const time = formatTime(bill.dateTime);
        const method = bill.paymentMethod || '-';
        const status = bill.status || 'paid';
        const methodClass = toClassName(method);
        const statusClass = toClassName(status);
        
        return `
            <tr data-id="${bill.id}">
                <td>${time}</td>
                <td><strong>${bill.receiptNumber || '-'}</strong></td>
                <td>${bill.patientName || '-'}</td>
                <td>${formatMoney(bill.totalAmount)}</td>
                <td><span class="method-badge method-${methodClass}">${method}</span></td>
                <td><span class="status-badge status-${statusClass}">${status}</span></td>
                <td>
                    <button class="btn-action" onclick="viewReceipt('${bill.id}')" title="View Receipt">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action" onclick="printBillReceipt('${bill.id}')" title="Print Receipt">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = rows.join('');
}

// ===================================
// STATS
// ===================================
function updateStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    let todayRev = 0, todayCount = 0, monthRev = 0, pending = 0;
    
    State.bills.forEach(bill => {
        const billDate = bill.dateTime ? new Date(bill.dateTime) : null;
        const amt = bill.totalAmount || 0;
        
        if (billDate && billDate >= today) {
            todayRev += amt;
            todayCount++;
        }
        
        if (billDate && billDate >= monthStart) {
            monthRev += amt;
        }
        
        if (bill.status === 'pending') {
            pending++;
        }
    });
    
    const todayRevEl = $('todayRevenue');
    const todayCountEl = $('todayPayments');
    const monthRevEl = $('monthRevenue');
    const pendingEl = $('pendingBills');
    
    if (todayRevEl) todayRevEl.textContent = formatMoney(todayRev);
    if (todayCountEl) todayCountEl.textContent = todayCount;
    if (monthRevEl) monthRevEl.textContent = formatMoney(monthRev);
    if (pendingEl) pendingEl.textContent = pending;
}

// ===================================
// VIEW RECEIPT / PRINT
// ===================================
window.viewReceipt = (id) => {
    const bill = State.bills.find(b => b.id === id);
    if (bill) showReceipt(bill);
};

window.printBillReceipt = (id) => {
    const bill = State.bills.find(b => b.id === id);
    if (bill) {
        showReceipt(bill);
        setTimeout(() => window.printReceipt(), 300);
    }
};

window.viewBillDetails = window.viewReceipt;
window.reprintReceipt = window.printBillReceipt;

// ===================================
// VIEW ALL BILLS MODULE
// ===================================
export function initViewBillsModule() {
    console.log('Billing: Init View Bills');
    startBillsListener();
    
    if (!State.listenersAttached.viewBills) {
        setupViewBillsListeners();
        State.listenersAttached.viewBills = true;
    }
    
    if (!State.billsPrimed) {
        loadBillsOnce();
    }
    
    renderBillsTable();
}

function setupViewBillsListeners() {
    // Search
    const searchInput = $('billSearchInput');
    if (searchInput) {
        let timer;
        searchInput.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(filterBills, 250);
        });
    }
    
    // Filters
    ['filterPaymentStatus', 'filterPaymentMethod', 'filterDate'].forEach(id => {
        const el = $(id);
        if (el) el.addEventListener('change', filterBills);
    });
    
    // Clear filters
    const clearBtn = $('clearBillFiltersBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if ($('billSearchInput')) $('billSearchInput').value = '';
            if ($('filterPaymentStatus')) $('filterPaymentStatus').value = '';
            if ($('filterPaymentMethod')) $('filterPaymentMethod').value = '';
            if ($('filterDate')) $('filterDate').value = '';
            filterBills();
        });
    }
    
    // Export dropdown
    const exportBtn = $('exportDropdownBtn');
    const exportMenu = $('exportDropdown');
    if (exportBtn && exportMenu) {
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            exportMenu.style.display = exportMenu.style.display === 'block' ? 'none' : 'block';
        });
        
        document.addEventListener('click', () => {
            exportMenu.style.display = 'none';
        });
    }
}

function filterBills() {
    const search = ($('billSearchInput')?.value || '').toLowerCase();
    const status = $('filterPaymentStatus')?.value || '';
    const method = $('filterPaymentMethod')?.value || '';
    const date = $('filterDate')?.value || '';
    
    const filtered = State.bills.filter(bill => {
        if (search) {
            const fields = [bill.receiptNumber, bill.patientNumber, bill.patientName]
                .map(f => (f || '').toLowerCase());
            if (!fields.some(f => f.includes(search))) return false;
        }
        
        if (status && bill.status !== status) return false;
        if (method && bill.paymentMethod !== method) return false;
        
        if (date) {
            const billDate = bill.dateTime ? new Date(bill.dateTime).toISOString().split('T')[0] : '';
            if (billDate !== date) return false;
        }
        
        return true;
    });
    
    State.isFiltering = Boolean(search || status || method || date);
    State.filteredBills = State.isFiltering ? filtered : [];
    State.currentPage = 1;
    renderBillsTable();
}

function renderBillsTable() {
    const tbody = $('billingTableBody');
    if (!tbody) return;
    
    const bills = State.isFiltering ? State.filteredBills : State.bills;
    
    const start = (State.currentPage - 1) * State.pageSize;
    const end = start + State.pageSize;
    const page = bills.slice(start, end);
    
    if (page.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-cell">
                    <div class="empty-state">
                        <i class="fas fa-file-invoice"></i>
                        <p>No bills found</p>
                    </div>
                </td>
            </tr>
        `;
        updatePagination(0);
        return;
    }
    
    tbody.innerHTML = page.map(bill => {
        const date = formatDate(bill.dateTime);
        const time = formatTime(bill.dateTime);
        const itemCount = bill.items?.length || 0;
        const method = bill.paymentMethod || '-';
        const status = bill.status || 'paid';
        const methodClass = toClassName(method);
        const statusClass = toClassName(status);
        
        return `
            <tr data-id="${bill.id}">
                <td><strong>${bill.receiptNumber || '-'}</strong></td>
                <td>${date} ${time}</td>
                <td>${bill.patientNumber || '-'}</td>
                <td>${bill.patientName || '-'}</td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td>${formatMoney(bill.totalAmount)}</td>
                <td><span class="method-badge method-${methodClass}">${method}</span></td>
                <td><span class="status-badge status-${statusClass}">${status}</span></td>
                <td>
                    <button class="btn-action" onclick="viewReceipt('${bill.id}')" title="View Receipt">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action" onclick="printBillReceipt('${bill.id}')" title="Print Receipt">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    updatePagination(bills.length);
}

function updatePagination(total) {
    const startEl = $('billShowingStart');
    const endEl = $('billShowingEnd');
    const totalEl = $('billTotalItems');
    const prevBtn = $('billPrevBtn');
    const nextBtn = $('billNextBtn');
    
    const start = total === 0 ? 0 : (State.currentPage - 1) * State.pageSize + 1;
    const end = Math.min(State.currentPage * State.pageSize, total);
    
    if (startEl) startEl.textContent = start;
    if (endEl) endEl.textContent = end;
    if (totalEl) totalEl.textContent = total;
    
    if (prevBtn) prevBtn.disabled = State.currentPage <= 1;
    if (nextBtn) nextBtn.disabled = end >= total;
}

window.billPrevPage = () => {
    if (State.currentPage > 1) {
        State.currentPage--;
        renderBillsTable();
    }
};

window.billNextPage = () => {
    State.currentPage++;
    renderBillsTable();
};

window.changeBillPageSize = (size) => {
    State.pageSize = parseInt(size);
    State.currentPage = 1;
    renderBillsTable();
};

// ===================================
// EXPORT FUNCTIONS
// ===================================
window.exportBillsAsPDF = () => {
    const exportMenu = $('exportDropdown');
    if (exportMenu) {
        exportMenu.style.display = 'none';
    }
    
    const bills = State.isFiltering ? State.filteredBills : State.bills;
    if (!bills.length) {
        notify('No bills to export', 'warning');
        return;
    }
    
    const printWin = window.open('', '_blank');
    printWin.document.write(`
<!DOCTYPE html>
<html>
<head>
    <title>Bills Report</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 30px; }
        h1 { color: #2563eb; margin-bottom: 10px; }
        .meta { color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 12px; }
        th { background: #f3f4f6; }
        .text-right { text-align: right; }
    </style>
</head>
<body>
    <h1>RxFlow Hospital - Receipts Report</h1>
    <p class="meta">Generated: ${new Date().toLocaleString()} | Total: ${bills.length} receipts</p>
    <table>
        <thead>
            <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Patient</th>
                <th class="text-right">Amount</th>
                <th>Method</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${bills.map(b => `
                <tr>
                    <td>${b.receiptNumber || '-'}</td>
                    <td>${formatDate(b.dateTime)}</td>
                    <td>${b.patientName || '-'}</td>
                    <td class="text-right">${formatMoney(b.totalAmount)}</td>
                    <td>${b.paymentMethod || '-'}</td>
                    <td>${b.status || 'paid'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    <script>window.onload = () => window.print();</script>
</body>
</html>
    `);
    printWin.document.close();
    notify(`Exporting ${bills.length} receipts`, 'success');
};

window.exportBillsAsExcel = () => {
    const exportMenu = $('exportDropdown');
    if (exportMenu) {
        exportMenu.style.display = 'none';
    }
    
    const bills = State.isFiltering ? State.filteredBills : State.bills;
    if (!bills.length) {
        notify('No bills to export', 'warning');
        return;
    }
    
    const html = `
        <table>
            <tr><th>Receipt #</th><th>Date</th><th>Patient ID</th><th>Patient Name</th><th>Amount</th><th>Method</th><th>Status</th></tr>
            ${bills.map(b => `
                <tr>
                    <td>${b.receiptNumber || ''}</td>
                    <td>${formatDate(b.dateTime)}</td>
                    <td>${b.patientNumber || ''}</td>
                    <td>${b.patientName || ''}</td>
                    <td>${b.totalAmount || 0}</td>
                    <td>${b.paymentMethod || ''}</td>
                    <td>${b.status || 'paid'}</td>
                </tr>
            `).join('')}
        </table>
    `;
    
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipts_${new Date().toISOString().split('T')[0]}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    
    notify(`Exported ${bills.length} receipts`, 'success');
};

window.exportBillsAsCSV = () => {
    const exportMenu = $('exportDropdown');
    if (exportMenu) {
        exportMenu.style.display = 'none';
    }
    
    const bills = State.isFiltering ? State.filteredBills : State.bills;
    if (!bills.length) {
        notify('No bills to export', 'warning');
        return;
    }
    
    let csv = 'Receipt #,Date,Patient ID,Patient Name,Amount,Method,Status\n';
    bills.forEach(b => {
        csv += `"${b.receiptNumber || ''}","${formatDate(b.dateTime)}","${b.patientNumber || ''}","${b.patientName || ''}",${b.totalAmount || 0},"${b.paymentMethod || ''}","${b.status || 'paid'}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    notify(`Exported ${bills.length} receipts`, 'success');
};

// ===================================
// INJECT STYLES
// ===================================
const style = document.createElement('style');
style.textContent = `
    @keyframes toastIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes toastOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    
    .search-msg { text-align: center; padding: 20px; color: #666; }
    .search-msg i { margin-right: 8px; }
    
    .search-patient-item {
        padding: 12px 15px;
        border-bottom: 1px solid #eee;
        cursor: pointer;
        transition: background 0.2s;
    }
    .search-patient-item:hover { background: #f0f7ff; }
    .search-patient-item:last-child { border-bottom: none; }
    .search-patient-item .patient-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .search-patient-item .patient-info strong { color: #1a1a2e; }
    .search-patient-item .patient-id { color: #3b82f6; font-size: 12px; }
    .search-patient-item .patient-details { display: flex; gap: 12px; font-size: 12px; color: #666; }
    .search-patient-item .patient-details i { margin-right: 4px; }
    
    .service-row {
        display: grid;
        grid-template-columns: 1fr 120px 40px;
        gap: 10px;
        align-items: end;
        margin-bottom: 10px;
        padding: 10px;
        background: #f9fafb;
        border-radius: 8px;
    }
    .btn-remove-svc {
        background: #fee2e2;
        color: #dc2626;
        border: none;
        border-radius: 6px;
        padding: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .btn-remove-svc:hover { background: #dc2626; color: white; }
    
    .empty-cell { padding: 40px !important; }
    .empty-state { text-align: center; color: #9ca3af; }
    .empty-state i { font-size: 48px; margin-bottom: 10px; opacity: 0.5; }
    .empty-state p { font-size: 14px; }
    
    .method-badge, .status-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }
    .method-badge { background: #e0e7ff; color: #4338ca; }
    .method-cash { background: #d1fae5; color: #065f46; }
    .method-mpesa { background: #dcfce7; color: #166534; }
    .method-card { background: #dbeafe; color: #1e40af; }
    .method-insurance { background: #fef3c7; color: #92400e; }
    
    .status-badge { background: #d1fae5; color: #065f46; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-cancelled { background: #fee2e2; color: #991b1b; }
    
    .btn-action {
        background: none;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 6px 10px;
        cursor: pointer;
        color: #6b7280;
        transition: all 0.2s;
        margin-right: 4px;
    }
    .btn-action:hover { background: #3b82f6; color: white; border-color: #3b82f6; }
    
    /* Receipt Styles */
    .receipt-document { max-width: 450px; margin: 0 auto; }
    .receipt-header { text-align: center; margin-bottom: 20px; }
    .receipt-logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; }
    .receipt-logo i { font-size: 28px; color: #3b82f6; }
    .receipt-logo h2 { margin: 0; color: #1e40af; font-size: 22px; }
    .receipt-title h3 { 
        display: inline-block;
        padding: 8px 20px;
        background: #3b82f6;
        color: white;
        border-radius: 20px;
        font-size: 14px;
        margin: 10px 0 5px;
    }
    .receipt-number { font-size: 16px; font-weight: bold; color: #1e40af; }
    .receipt-divider { height: 2px; background: linear-gradient(to right, transparent, #3b82f6, transparent); margin: 15px 0; }
    .receipt-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .receipt-col h4 { font-size: 12px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .receipt-col p { font-size: 13px; margin: 4px 0; color: #374151; }
    .receipt-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .receipt-table th { background: #f3f4f6; padding: 10px; font-size: 12px; text-align: left; }
    .receipt-table td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .receipt-table .text-right { text-align: right; }
    .receipt-table .total-row td { border-top: 2px solid #3b82f6; font-size: 16px; color: #1e40af; }
    .receipt-notes { background: #fefce8; padding: 10px; border-radius: 6px; font-size: 12px; margin: 10px 0; }
    .receipt-footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px dashed #e5e7eb; }
    .receipt-footer p { font-size: 12px; color: #6b7280; margin: 4px 0; }
    .receipt-generated { font-style: italic; font-size: 10px !important; }
`;
document.head.appendChild(style);

// ===================================
// PREFILL BILLING FORM FROM REQUEST
// ===================================
window.prefillBillingForm = function(request) {
    console.log('🔄 Prefilling billing form from request:', request);
    
    try {
        // Set patient information
        const patient = {
            id: request.patientId || `request-${request.id}`,
            number: request.patientNumber || 'N/A',
            name: request.patientName || 'Unknown',
            age: request.patientAge || '-',
            gender: request.patientGender || '-',
            isFromRequest: true,
            requestId: request.id
        };
        
        State.selectedPatient = patient;
        
        // Update patient display
        const numEl = $('displayPatientNumber');
        const nameEl = $('displayPatientName');
        const ageEl = $('displayPatientAge');
        const genderEl = $('displayPatientGender');
        
        if (numEl) numEl.textContent = patient.number;
        if (nameEl) nameEl.textContent = patient.name;
        if (ageEl) ageEl.textContent = patient.age;
        if (genderEl) genderEl.textContent = patient.gender;
        
        // Show patient and form sections
        const infoSection = $('selectedPatientSection');
        const formSection = $('billingFormSection');
        if (infoSection) infoSection.style.display = 'block';
        if (formSection) formSection.style.display = 'block';
        
        // Hide search modes
        const searchMode = $('patientSearchMode');
        const manualMode = $('manualPatientMode');
        if (searchMode) searchMode.style.display = 'none';
        if (manualMode) manualMode.style.display = 'none';
        
        // Pre-fill service based on department
        if (request.department === 'Pharmacy') {
            // Enable pharmacy payment toggle
            const pharmToggle = $('pharmacyPaymentToggle');
            if (pharmToggle && !pharmToggle.checked) {
                pharmToggle.click();
            }
            
            // Set pharmacy amount
            const pharmAmount = $('pharmacyAmount');
            if (pharmAmount) pharmAmount.value = request.amount || 0;
            
            // Set prescription number if available
            const pharmPrescription = $('pharmacyPrescriptionNumber');
            if (pharmPrescription && request.notes) {
                const rxMatch = request.notes.match(/Rx[:\s#]*([A-Z0-9-]+)/i);
                if (rxMatch) {
                    pharmPrescription.value = rxMatch[1];
                }
            }
            
        } else if (request.department === 'Laboratory' || request.department === 'Imaging' || request.department === 'Ward') {
            // Add as additional service
            addServiceRow();
            
            // Wait for row to be added
            setTimeout(() => {
                const serviceRows = document.querySelectorAll('.service-row');
                if (serviceRows.length > 0) {
                    const lastRow = serviceRows[serviceRows.length - 1];
                    const descInput = lastRow.querySelector('.svc-desc');
                    const amtInput = lastRow.querySelector('.svc-amt');
                    
                    if (descInput) descInput.value = request.serviceType || `${request.department} Service`;
                    if (amtInput) amtInput.value = request.amount || 0;
                }
            }, 100);
            
        } else if (request.department === 'Reception') {
            // Enable consultation fee
            const consultToggle = $('consultationFeeToggle');
            if (consultToggle && !consultToggle.checked) {
                consultToggle.click();
            }
            
            // Set consultation amount
            const consultAmount = $('consultationAmount');
            if (consultAmount) consultAmount.value = request.amount || 500;
        }
        
        // Add notes
        const notesField = $('billingNotes');
        if (notesField) {
            const noteText = `From ${request.department} - ${request.serviceType}\n${request.notes || ''}`.trim();
            notesField.value = noteText;
        }
        
        // Update summary
        updateSummary();
        
        // Store request ID for later reference
        window._currentBillingRequestId = request.id;
        
        // Show success message
        notify(`Loaded billing request from ${request.department}`, 'success');
        
        // Scroll to form
        setTimeout(() => {
            if (formSection) {
                formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 200);
        
        console.log('✅ Billing form prefilled successfully');
        
    } catch (error) {
        console.error('❌ Failed to prefill billing form:', error);
        notify('Failed to load request data', 'error');
    }
};

// Module loaded
console.log('✅ Billing Module v3.0 Ready');
