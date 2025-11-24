/**
 * Prescription Queue System for Pharmacy POS
 * Handles real-time prescription queue without modifying app.js
 */

import { db, collection, addDoc, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from './firebase-config.js';

let queueUnsubscribe = null;
let prescriptionQueue = [];

/**
 * Initialize prescription queue system
 */
export function initPrescriptionQueue() {
    console.log('Initializing Prescription Queue...');
    
    const queueContainer = document.getElementById('prescriptionQueue');
    const queueBadge = document.getElementById('queueCount');
    
    if (!queueContainer || !queueBadge) {
        console.error('Queue elements not found');
        return;
    }
    
    // Setup real-time listener
    setupQueueListener(queueContainer, queueBadge);
}

// Export to window for app.js access
window.prescriptionQueue = { initPrescriptionQueue };

/**
 * Update dashboard pharmacy orders count
 */
function updateDashboardPharmacyOrders(count) {
    // Update dashboard stats if available
    if (window.dashboardStats) {
        window.dashboardStats.pharmacyOrders = count;
    }
    
    // Update dashboard display
    const dashPharmacyOrders = document.getElementById('dashPharmacyOrders');
    if (dashPharmacyOrders) {
        dashPharmacyOrders.textContent = count;
    }
    
    console.log(`💊 Pharmacy Orders Updated: ${count} pending prescriptions (Dashboard updated)`);
}

/**
 * Setup Firestore real-time listener
 */
function setupQueueListener(container, badge) {
    try {
        const prescRef = collection(db, 'prescriptions');
        const q = query(prescRef, where('status', '==', 'pending'));
        
        if (queueUnsubscribe) {
            queueUnsubscribe();
        }
        
        queueUnsubscribe = onSnapshot(q, 
            (snapshot) => {
                prescriptionQueue = [];
                snapshot.forEach((doc) => {
                    prescriptionQueue.push({ id: doc.id, ...doc.data() });
                });
                
                // Sort by prescribedAt in JavaScript
                prescriptionQueue.sort((a, b) => {
                    const dateA = new Date(a.prescribedAt || 0);
                    const dateB = new Date(b.prescribedAt || 0);
                    return dateB - dateA; // newest first
                });
                
                console.log(`✓ ${prescriptionQueue.length} prescriptions in queue`);
                
                // Update dashboard pharmacy orders
                updateDashboardPharmacyOrders(prescriptionQueue.length);
                
                displayQueue(container, badge);
            },
            (error) => {
                console.error('Queue error:', error);
                container.innerHTML = `<div style="padding:20px;text-align:center;color:#ef4444;"><i class="fas fa-exclamation-circle"></i><p style="margin:8px 0 0;">Error loading queue</p><p style="font-size:11px;margin:4px 0 0;color:var(--text-muted);">${error.message}</p></div>`;
            }
        );
        
    } catch (error) {
        console.error('Setup error:', error);
        container.innerHTML = `<div style="padding:20px;text-align:center;color:#ef4444;"><i class="fas fa-exclamation-circle"></i><p style="margin:8px 0 0;">Setup error</p><p style="font-size:11px;margin:4px 0 0;color:var(--text-muted);">${error.message}</p></div>`;
    }
}

/**
 * Display prescription queue
 */
function displayQueue(container, badge) {
    badge.textContent = prescriptionQueue.length;
    
    if (prescriptionQueue.length === 0) {
        container.innerHTML = `
            <div style="padding:30px 20px;text-align:center;color:var(--text-muted);">
                <i class="fas fa-inbox" style="font-size:36px;opacity:0.3;margin-bottom:10px;"></i>
                <p style="margin:0;font-size:14px;">No pending prescriptions</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = prescriptionQueue.map(presc => {
        const date = new Date(presc.prescribedAt);
        const timeAgo = getTimeAgo(date);
        const medCount = presc.medications?.length || 0;
        
        return `
            <div class="queue-item" style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:6px;padding:12px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                    <div style="flex:1;">
                        <div style="font-weight:600;color:var(--primary-color);font-size:12px;margin-bottom:4px;">${presc.prescriptionNumber}</div>
                        <div style="font-size:13px;font-weight:500;margin-bottom:2px;">${presc.patientName}</div>
                        <div style="font-size:11px;color:var(--text-muted);">PT: ${presc.patientId} • Age: ${presc.patientAge}</div>
                        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;"><i class="fas fa-pills" style="font-size:10px;"></i> ${medCount} med${medCount !== 1 ? 's' : ''} • ${timeAgo}</div>
                    </div>
                    <button onclick="window.cancelPrescription('${presc.id}')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px;font-size:16px;" title="Cancel"><i class="fas fa-times"></i></button>
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="window.viewPrescriptionDetails('${presc.id}')" class="btn btn-sm btn-outline" style="flex:1;font-size:11px;padding:6px;"><i class="fas fa-eye"></i> View</button>
                    <button onclick="window.loadPrescriptionToCart('${presc.id}')" class="btn btn-sm btn-primary" style="flex:1;font-size:11px;padding:6px;"><i class="fas fa-cart-plus"></i> Add to Cart</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Get time ago text
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
}

/**
 * View prescription details in modal
 */
window.viewPrescriptionDetails = function(prescId) {
    const presc = prescriptionQueue.find(p => p.id === prescId);
    if (!presc) return;
    
    const modalBody = document.getElementById('viewPrescriptionModalBody');
    if (!modalBody) return;
    
    // Format prescribed date
    const prescDate = new Date(presc.prescribedAt);
    const dateStr = prescDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    // Build medications list
    let medsHTML = '';
    if (presc.medications && presc.medications.length > 0) {
        medsHTML = presc.medications.map((med, i) => `
            <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:6px;padding:12px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px;">
                    <div style="font-weight:600;font-size:14px;color:var(--text-primary);">${i + 1}. ${med.drugName || med.name || 'Unknown Drug'}</div>
                    <div style="background:var(--primary-color);color:white;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">Qty: ${med.quantity || 'N/A'}</div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:var(--text-muted);">
                    <div><i class="fas fa-pills" style="color:var(--primary-color);margin-right:4px;"></i><strong>Dosage:</strong> ${med.dosage || 'N/A'}</div>
                    <div><i class="fas fa-clock" style="color:var(--primary-color);margin-right:4px;"></i><strong>Frequency:</strong> ${med.frequency || med.dosage || 'N/A'}</div>
                    <div><i class="fas fa-calendar" style="color:var(--primary-color);margin-right:4px;"></i><strong>Duration:</strong> ${med.duration || 'N/A'}</div>
                    <div><i class="fas fa-route" style="color:var(--primary-color);margin-right:4px;"></i><strong>Route:</strong> ${med.route || 'Oral'}</div>
                    ${med.instructions ? `<div style="grid-column:1/-1;"><i class="fas fa-info-circle" style="color:var(--primary-color);margin-right:4px;"></i><strong>Instructions:</strong> ${med.instructions}</div>` : ''}
                </div>
            </div>
        `).join('');
    } else {
        medsHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No medications prescribed</p>';
    }
    
    modalBody.innerHTML = `
        <div style="margin-bottom:20px;">
            <!-- Patient Info Card -->
            <div style="background:linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);color:white;padding:16px;border-radius:8px;margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <div>
                        <div style="font-size:11px;opacity:0.9;margin-bottom:4px;">PRESCRIPTION NUMBER</div>
                        <div style="font-size:18px;font-weight:700;letter-spacing:0.5px;">${presc.prescriptionNumber}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:11px;opacity:0.9;margin-bottom:4px;">PRESCRIBED</div>
                        <div style="font-size:12px;font-weight:500;">${dateStr}</div>
                    </div>
                </div>
            </div>
            
            <!-- Patient Details -->
            <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px;margin-bottom:20px;">
                <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--border-color);">
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">PATIENT NAME</div>
                    <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${presc.patientName}</div>
                </div>
                <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--border-color);">
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">PATIENT ID</div>
                    <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${presc.patientId}</div>
                </div>
                <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--border-color);">
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">AGE / GENDER</div>
                    <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${presc.patientAge} years / ${presc.patientGender}</div>
                </div>
                <div style="background:var(--card-bg);padding:12px;border-radius:6px;border:1px solid var(--border-color);">
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">PRESCRIBED BY</div>
                    <div style="font-size:14px;font-weight:600;color:var(--text-primary);">${presc.prescribedBy}</div>
                </div>
            </div>
            
            <!-- Medications Section -->
            <div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                    <h4 style="margin:0;font-size:14px;font-weight:600;color:var(--text-primary);"><i class="fas fa-pills" style="color:var(--primary-color);margin-right:6px;"></i>Prescribed Medications</h4>
                    <span style="background:var(--primary-color);color:white;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;">${presc.medications?.length || 0} Items</span>
                </div>
                <div style="max-height:300px;overflow-y:auto;">
                    ${medsHTML}
                </div>
            </div>
        </div>
    `;
    
    // Store current prescription ID for cart button
    const cartBtn = document.getElementById('addPrescriptionToCartFromModal');
    if (cartBtn) {
        cartBtn.onclick = function() {
            window.loadPrescriptionToCart(prescId);
            closeModal('viewPrescriptionModal');
        };
    }
    
    // Open modal
    openModal('viewPrescriptionModal');
};

/**
 * Load prescription to cart
 */
window.loadPrescriptionToCart = async function(prescId) {
    const presc = prescriptionQueue.find(p => p.id === prescId);
    if (!presc) {
        console.error('Prescription not found:', prescId);
        return;
    }
    
    console.log('Loading prescription to cart:', presc.prescriptionNumber);
    
    try {
        // Mark as processing
        await updateDoc(doc(db, 'prescriptions', prescId), {
            status: 'processing',
            processedAt: new Date().toISOString()
        });
        
        // Trigger custom event that pharmacy-pos.js will handle
        const event = new CustomEvent('loadPrescriptionToCart', {
            detail: presc,
            bubbles: true
        });
        document.dispatchEvent(event);
        
        console.log('✓ Prescription dispatched to cart');
        
    } catch (error) {
        console.error('Error loading to cart:', error);
        alert('Error loading prescription to cart: ' + error.message);
    }
};

/**
 * Cancel prescription
 */
window.cancelPrescription = async function(prescId) {
    if (!confirm('Cancel this prescription?')) return;
    
    try {
        await updateDoc(doc(db, 'prescriptions', prescId), {
            status: 'cancelled',
            cancelledAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Cancel error:', error);
        alert('Error cancelling prescription');
    }
};

/**
 * Send prescription from Rx modal (called from app.js via window)
 */
window.sendPrescriptionToPharmacy = async function(prescriptionData) {
    try {
        console.log('Sending prescription to Firestore:', prescriptionData);
        
        const prescNumber = generatePrescriptionNumber();
        
        // Map medication fields from Rx modal format to pharmacy format
        const mappedMedications = (prescriptionData.medications || []).map(med => ({
            drugName: med.name || med.drugName || 'Unknown',
            dosage: med.dosage || 'Not specified',
            frequency: med.dosage || med.frequency || 'Not specified', // dosage field contains frequency like "BD"
            duration: med.duration ? `${med.duration} days` : 'Not specified',
            quantity: med.quantity || calculateQuantity(med.dosage, med.duration) || 1,
            route: med.route || 'Oral',
            instructions: med.instructions || ''
        }));
        
        const data = {
            prescriptionNumber: prescNumber,
            patientId: prescriptionData.patientId || 'N/A',
            patientName: prescriptionData.patientName || 'Unknown',
            patientAge: prescriptionData.age || 0,
            patientGender: prescriptionData.gender || 'N/A',
            patientContact: prescriptionData.contact || 'N/A',
            diagnosis: prescriptionData.diagnosis || [],
            medications: mappedMedications,
            prescribedBy: prescriptionData.prescribedBy || 'Doctor',
            prescribedAt: new Date().toISOString(),
            status: 'pending',
            createdAt: serverTimestamp()
        };
        
        console.log('Prescription data to save:', data);
        
        const docRef = await addDoc(collection(db, 'prescriptions'), data);
        
        console.log('Prescription saved successfully with ID:', docRef.id);
        
        return {
            success: true,
            prescriptionNumber: prescNumber
        };
    } catch (error) {
        console.error('Send prescription error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Calculate quantity based on frequency and duration
 */
function calculateQuantity(dosage, duration) {
    if (!dosage || !duration) return 1;
    
    const durationDays = parseInt(duration) || 7;
    let timesPerDay = 1;
    
    // Parse dosage/frequency
    const dosageUpper = dosage.toUpperCase();
    if (dosageUpper.includes('QID') || dosageUpper.includes('4')) timesPerDay = 4;
    else if (dosageUpper.includes('TID') || dosageUpper.includes('TDS') || dosageUpper.includes('3')) timesPerDay = 3;
    else if (dosageUpper.includes('BD') || dosageUpper.includes('BID') || dosageUpper.includes('2')) timesPerDay = 2;
    else if (dosageUpper.includes('OD') || dosageUpper.includes('ONCE')) timesPerDay = 1;
    
    return Math.ceil(timesPerDay * durationDays);
}

/**
 * Generate prescription number
 */
function generatePrescriptionNumber() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RX${year}${month}${day}-${random}`;
}
