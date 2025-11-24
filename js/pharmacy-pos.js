/**
 * RxFlow - Pharmacy POS Module
 * Real-time point of sale system for medication dispensing
 */

import { 
    db,
    collection,
    getDocs,
    addDoc, 
    updateDoc,
    doc,
    serverTimestamp 
} from './firebase-config.js';

// Cart state
let cart = [];
let prescriptionData = null;
let allInventoryDrugs = []; // Cache all drugs

// DOM Elements
let posSearchInput, posSearchResults, loadPrescriptionBtn, prescriptionNumber;
let cartItemsContainer, cartItemCount, cartSubtotal, cartTax, cartTotal, cartDiscount;
let customerName, customerContact, paymentMethod, prescriptionRef;
let clearCartBtn, checkoutBtn, taxRate, discountAmount;

/**
 * Initialize Pharmacy POS Module
 */
export function initPharmacyPOS() {
    console.log('========================================');
    console.log('INITIALIZING PHARMACY POS MODULE');
    console.log('========================================');
    
    // Get DOM elements
    posSearchInput = document.getElementById('posSearchInput');
    posSearchResults = document.getElementById('posSearchResults');
    
    if (!posSearchInput) {
        console.error('ERROR: posSearchInput element not found!');
        alert('POS Search input not found. Please refresh the page.');
        return;
    }
    
    if (!posSearchResults) {
        console.error('ERROR: posSearchResults element not found!');
        alert('POS Search results container not found. Please refresh the page.');
        return;
    }
    
    console.log('✓ Search input found');
    console.log('✓ Search results container found');
    
    loadPrescriptionBtn = document.getElementById('loadPrescriptionBtn');
    prescriptionNumber = document.getElementById('prescriptionNumber');
    
    cartItemsContainer = document.getElementById('cartItems');
    cartItemCount = document.getElementById('cartItemCount');
    cartSubtotal = document.getElementById('cartSubtotal');
    cartTax = document.getElementById('cartTax');
    cartTotal = document.getElementById('cartTotal');
    cartDiscount = document.getElementById('cartDiscount');
    
    customerName = document.getElementById('customerName');
    customerContact = document.getElementById('customerContact');
    paymentMethod = document.getElementById('paymentMethod');
    prescriptionRef = document.getElementById('prescriptionRef');
    
    taxRate = document.getElementById('taxRate');
    discountAmount = document.getElementById('discountAmount');
    
    clearCartBtn = document.getElementById('clearCartBtn');
    checkoutBtn = document.getElementById('checkoutBtn');
    
    // Load inventory data
    loadInventoryData();
    
    // Setup search
    setupSearch();
    
    // Setup other event listeners
    setupOtherListeners();
    
    // Listen for prescription load events from queue
    setupPrescriptionQueueListener();
    
    // Initialize cart display
    updateCartDisplay();
    
    console.log('========================================');
    console.log('POS MODULE INITIALIZED SUCCESSFULLY');
    console.log('========================================');
}

/**
 * Load all inventory data once
 */
async function loadInventoryData() {
    console.log('Loading inventory data from Firebase...');
    
    try {
        const inventoryRef = collection(db, 'pharmacy_inventory');
        const snapshot = await getDocs(inventoryRef);
        
        allInventoryDrugs = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            allInventoryDrugs.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log(`✓ Loaded ${allInventoryDrugs.length} drugs from inventory`);
        
        if (allInventoryDrugs.length === 0) {
            console.warn('WARNING: No drugs found in inventory!');
            posSearchResults.innerHTML = `
                <div style="text-align: center; padding: 20px; background: rgba(241, 196, 15, 0.1); border-radius: 8px; color: #f1c40f;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 28px; margin-bottom: 8px;"></i>
                    <p style="margin: 0; font-weight: 600;">No drugs in inventory</p>
                    <small style="color: var(--text-muted);">Please add drugs in the Pharmacy Inventory module first</small>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('ERROR loading inventory:', error);
        posSearchResults.innerHTML = `
            <div style="text-align: center; padding: 20px; background: rgba(231, 76, 60, 0.1); border-radius: 8px; color: #e74c3c;">
                <i class="fas fa-times-circle" style="font-size: 28px; margin-bottom: 8px;"></i>
                <p style="margin: 0; font-weight: 600;">Failed to load inventory</p>
                <small style="color: var(--text-muted);">${error.message}</small>
            </div>
        `;
    }
}

/**
 * Setup prescription queue event listener
 */
function setupPrescriptionQueueListener() {
    document.addEventListener('loadPrescriptionToCart', async (event) => {
        const presc = event.detail;
        if (!presc) return;
        
        console.log('Loading prescription from queue:', presc.prescriptionNumber);
        
        // Store prescription data
        prescriptionData = presc;
        
        // Fill customer info
        if (customerName) customerName.value = presc.patientName;
        if (customerContact && presc.patientContact !== 'N/A') {
            customerContact.value = presc.patientContact;
        }
        if (prescriptionRef) prescriptionRef.value = presc.prescriptionNumber;
        if (prescriptionNumber) prescriptionNumber.value = presc.prescriptionNumber;
        
        // Clear cart
        cart = [];
        
        let added = 0;
        let notFound = [];
        
        // Add medications to cart
        for (const med of presc.medications || []) {
            // Handle both drugName and name fields for compatibility
            const medName = med.drugName || med.name || '';
            
            const drug = allInventoryDrugs.find(d => 
                d.drugName.toLowerCase() === medName.toLowerCase() && 
                d.stockQuantity > 0
            );
            
            if (drug) {
                const qty = Math.min(parseInt(med.quantity) || 1, drug.stockQuantity);
                cart.push({
                    id: drug.id,
                    name: drug.drugName,
                    code: drug.drugCode,
                    price: parseFloat(drug.sellingPrice || 0),
                    quantity: qty,
                    maxStock: drug.stockQuantity
                });
                added++;
            } else {
                notFound.push(medName);
            }
        }
        
        updateCartDisplay();
        
        // Show detailed notification
        let notificationMsg = `${presc.prescriptionNumber} loaded`;
        if (added === presc.medications.length) {
            showNotification(`✓ ${notificationMsg} - All ${added} medications added to cart`, 'success');
        } else {
            showNotification(`⚠ ${notificationMsg} - ${added}/${presc.medications.length} items added`, 'warning');
        }
        
        // Show detailed alert if some items not found
        if (notFound.length > 0) {
            setTimeout(() => {
                alert(`✓ Added ${added} of ${presc.medications.length} medications to cart\n\n⚠ OUT OF STOCK:\n${notFound.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\nPlease add these items to inventory or remove from cart before checkout.`);
            }, 500);
        }
        
        console.log(`✓ Cart updated: ${added} items added, ${notFound.length} not found`);
    });
}

/**
 * Setup search functionality
 */
function setupSearch() {
    console.log('Setting up search functionality...');
    
    let typingTimer;
    const typingDelay = 300; // milliseconds
    
    posSearchInput.addEventListener('keyup', function() {
        clearTimeout(typingTimer);
        const searchText = this.value.trim();
        
        console.log(`Search input: "${searchText}"`);
        
        if (searchText.length === 0) {
            posSearchResults.innerHTML = '';
            return;
        }
        
        if (searchText.length < 2) {
            posSearchResults.innerHTML = `
                <div style="text-align: center; padding: 12px; font-size: 12px; color: var(--text-muted);">
                    <i class="fas fa-info-circle"></i> Type at least 2 characters to search
                </div>
            `;
            return;
        }
        
        // Show loading
        posSearchResults.innerHTML = `
            <div style="text-align: center; padding: 16px; color: var(--primary-color);">
                <i class="fas fa-spinner fa-spin" style="font-size: 20px;"></i>
                <p style="margin: 8px 0 0 0; font-size: 12px;">Searching...</p>
            </div>
        `;
        
        typingTimer = setTimeout(() => {
            searchDrugs(searchText);
        }, typingDelay);
    });
    
    console.log('✓ Search event listener attached');
}

/**
 * Search drugs in loaded inventory
 */
function searchDrugs(searchText) {
    console.log(`Searching for: "${searchText}"`);
    console.log(`Total drugs to search: ${allInventoryDrugs.length}`);
    
    if (allInventoryDrugs.length === 0) {
        posSearchResults.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--warning-color);">
                <i class="fas fa-box-open" style="font-size: 32px; opacity: 0.5; margin-bottom: 8px;"></i>
                <p style="margin: 0; font-weight: 600;">Inventory is empty</p>
                <small style="color: var(--text-muted);">Add drugs in Pharmacy Inventory first</small>
            </div>
        `;
        return;
    }
    
    const searchLower = searchText.toLowerCase();
    
    // Filter drugs
    const results = allInventoryDrugs.filter(drug => {
        // Must have stock
        if (!drug.stockQuantity || drug.stockQuantity <= 0) {
            return false;
        }
        
        // Search in multiple fields
        const drugName = (drug.drugName || '').toLowerCase();
        const drugCode = (drug.drugCode || '').toLowerCase();
        const category = (drug.category || '').toLowerCase();
        const manufacturer = (drug.manufacturer || '').toLowerCase();
        
        return drugName.includes(searchLower) || 
               drugCode.includes(searchLower) || 
               category.includes(searchLower) || 
               manufacturer.includes(searchLower);
    });
    
    console.log(`Found ${results.length} matching drugs`);
    
    // Display results
    if (results.length === 0) {
        posSearchResults.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                <i class="fas fa-search" style="font-size: 28px; opacity: 0.4; margin-bottom: 8px;"></i>
                <p style="margin: 0; font-weight: 600;">No results found</p>
                <small style="color: var(--text-muted);">Try different search terms</small>
            </div>
        `;
        return;
    }
    
    // Build results HTML
    let resultsHTML = '';
    results.forEach(drug => {
        const stockStatus = getStockStatusText(drug.stockQuantity, drug.reorderLevel || 10);
        const stockClass = stockStatus.toLowerCase().replace(' ', '-');
        const price = parseFloat(drug.sellingPrice || 0).toFixed(2);
        
        resultsHTML += `
            <div class="search-result-item" onclick="window.posAddToCart('${drug.id}')">
                <div class="search-result-info">
                    <h5>${drug.drugName}</h5>
                    <p>${drug.category || 'N/A'} • ${drug.manufacturer || 'N/A'} • ${drug.drugCode || 'N/A'}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="search-result-stock ${stockClass}">${drug.stockQuantity} in stock</span>
                    <span class="search-result-price">KSh ${price}</span>
                </div>
            </div>
        `;
    });
    
    posSearchResults.innerHTML = resultsHTML;
    console.log('✓ Results displayed');
}

/**
 * Get stock status text
 */
function getStockStatusText(quantity, reorderLevel) {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= reorderLevel) return 'Low Stock';
    return 'In Stock';
}

/**
 * Add drug to cart by ID
 */
window.posAddToCart = function(drugId) {
    console.log(`Adding drug to cart: ${drugId}`);
    
    const drug = allInventoryDrugs.find(d => d.id === drugId);
    
    if (!drug) {
        console.error('Drug not found:', drugId);
        showNotification('Error: Drug not found', 'error');
        return;
    }
    
    console.log(`Drug found: ${drug.drugName}`);
    
    // Check if already in cart
    const existingItem = cart.find(item => item.id === drugId);
    
    if (existingItem) {
        // Check stock limit
        if (existingItem.quantity >= drug.stockQuantity) {
            showNotification(`Cannot add more. Only ${drug.stockQuantity} in stock`, 'warning');
            return;
        }
        existingItem.quantity++;
        console.log(`Increased quantity to ${existingItem.quantity}`);
    } else {
        // Add new item
        cart.push({
            id: drug.id,
            name: drug.drugName,
            code: drug.drugCode,
            price: parseFloat(drug.sellingPrice || 0),
            quantity: 1,
            maxStock: drug.stockQuantity
        });
        console.log('Added new item to cart');
    }
    
    updateCartDisplay();
    showNotification(`${drug.drugName} added to cart`, 'success');
};

/**
 * Setup other event listeners
 */
function setupOtherListeners() {
    if (loadPrescriptionBtn) {
        loadPrescriptionBtn.addEventListener('click', loadPrescription);
    }
    
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', processCheckout);
    }
    
    if (taxRate) {
        taxRate.addEventListener('input', updateCartTotals);
    }
    
    if (discountAmount) {
        discountAmount.addEventListener('input', updateCartTotals);
    }
}

/**
 * Update cart display
 */
function updateCartDisplay() {
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartItemCount.textContent = totalItems;
    
    // Display cart items
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-basket"></i>
                <p>Cart is empty</p>
                <span>Search and add drugs to cart</span>
            </div>
        `;
    } else {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item" data-item-id="${item.id}">
                <div class="cart-item-info">
                    <h5>${item.name}</h5>
                    <p>${item.code}</p>
                </div>
                <div class="cart-item-quantity">
                    <button class="qty-btn qty-decrease" data-item-id="${item.id}">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="qty-value">${item.quantity}</span>
                    <button class="qty-btn qty-increase" data-item-id="${item.id}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="cart-item-price">KSh ${(item.price * item.quantity).toFixed(2)}</div>
                <button class="cart-item-remove" data-item-id="${item.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        
        // Add event listeners to cart item controls
        setupCartItemControls();
    }
    
    // Update totals
    updateCartTotals();
}

/**
 * Setup cart item controls
 */
function setupCartItemControls() {
    // Decrease quantity
    document.querySelectorAll('.qty-decrease').forEach(btn => {
        btn.addEventListener('click', () => {
            const itemId = btn.dataset.itemId;
            updateCartItemQuantity(itemId, -1);
        });
    });
    
    // Increase quantity
    document.querySelectorAll('.qty-increase').forEach(btn => {
        btn.addEventListener('click', () => {
            const itemId = btn.dataset.itemId;
            updateCartItemQuantity(itemId, 1);
        });
    });
    
    // Remove item
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const itemId = btn.dataset.itemId;
            removeFromCart(itemId);
        });
    });
}

/**
 * Update cart item quantity
 */
function updateCartItemQuantity(itemId, change) {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(itemId);
        return;
    }
    
    if (newQuantity > item.maxStock) {
        showNotification(`Maximum stock (${item.maxStock}) reached`, 'warning');
        return;
    }
    
    item.quantity = newQuantity;
    updateCartDisplay();
}

/**
 * Remove item from cart
 */
function removeFromCart(itemId) {
    const itemIndex = cart.findIndex(i => i.id === itemId);
    if (itemIndex > -1) {
        const itemName = cart[itemIndex].name;
        cart.splice(itemIndex, 1);
        showNotification(`${itemName} removed from cart`, 'info');
        updateCartDisplay();
    }
}

/**
 * Update cart totals
 */
function updateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxRateValue = parseFloat(taxRate?.value || 0) / 100; // Convert percentage to decimal
    const discountValue = parseFloat(discountAmount?.value || 0);
    const tax = subtotal * taxRateValue;
    const total = subtotal + tax - discountValue;
    
    cartSubtotal.textContent = `KSh ${subtotal.toFixed(2)}`;
    cartTax.textContent = `KSh ${tax.toFixed(2)}`;
    cartDiscount.textContent = `KSh ${discountValue.toFixed(2)}`;
    cartTotal.textContent = `KSh ${Math.max(0, total).toFixed(2)}`; // Ensure total doesn't go negative
}

/**
 * Clear cart
 */
function clearCart() {
    if (cart.length === 0) {
        showNotification('Cart is already empty', 'info');
        return;
    }
    
    if (confirm('Are you sure you want to clear the cart?')) {
        cart = [];
        prescriptionData = null;
        prescriptionRef.value = '';
        updateCartDisplay();
        showNotification('Cart cleared', 'info');
    }
}

/**
 * Load prescription
 */
async function loadPrescription() {
    const prescNumber = prescriptionNumber.value.trim();
    
    if (!prescNumber) {
        showNotification('Please enter a prescription number', 'warning');
        return;
    }
    
    try {
        // Fetch prescription from Firestore
        const prescRef = collection(db, 'prescriptions');
        const prescSnapshot = await getDocs(prescRef);
        
        let prescription = null;
        prescSnapshot.forEach((doc) => {
            if (doc.data().prescriptionNumber === prescNumber) {
                prescription = { id: doc.id, ...doc.data() };
            }
        });
        
        if (!prescription) {
            showNotification('Prescription not found', 'error');
            return;
        }
        
        // Store prescription data
        prescriptionData = prescription;
        prescriptionRef.value = prescNumber;
        
        // Auto-fill customer information
        if (prescription.patientName) {
            customerName.value = prescription.patientName;
        }
        if (prescription.patientContact) {
            customerContact.value = prescription.patientContact;
        }
        
        // Clear current cart and add prescription medications
        cart = [];
        
        // Add each medication from prescription to cart
        for (const medication of prescription.medications || []) {
            const drug = allInventoryDrugs.find(d => d.drugName === medication.drugName);
            
            if (drug) {
                const quantity = parseInt(medication.quantity) || 1;
                
                if (quantity <= drug.stockQuantity) {
                    cart.push({
                        id: drug.id,
                        name: drug.drugName,
                        code: drug.drugCode,
                        price: parseFloat(drug.sellingPrice || 0),
                        quantity: quantity,
                        maxStock: drug.stockQuantity
                    });
                } else {
                    showNotification(`Insufficient stock for ${drug.drugName}`, 'warning');
                }
            } else {
                showNotification(`Drug not found: ${medication.drugName}`, 'warning');
            }
        }
        
        updateCartDisplay();
        showNotification(`Prescription ${prescNumber} loaded successfully`, 'success');
        
    } catch (error) {
        console.error('Error loading prescription:', error);
        showNotification('Error loading prescription', 'error');
    }
}

/**
 * Process checkout
 */
async function processCheckout() {
    // Validation
    if (cart.length === 0) {
        showNotification('Cart is empty', 'warning');
        return;
    }
    
    if (!customerName.value.trim()) {
        showNotification('Please enter customer name', 'warning');
        customerName.focus();
        return;
    }
    
    if (!paymentMethod.value) {
        showNotification('Please select payment method', 'warning');
        paymentMethod.focus();
        return;
    }
    
    try {
        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxRateValue = parseFloat(taxRate.value || 0) / 100;
        const discountValue = parseFloat(discountAmount.value || 0);
        const tax = subtotal * taxRateValue;
        const total = Math.max(0, subtotal + tax - discountValue);
        
        // Generate sale number
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const saleNumber = `SALE-${timestamp}-${randomStr}`;
        
        // Prepare sale data
        const saleData = {
            saleNumber: saleNumber,
            customerName: customerName.value.trim(),
            customerContact: customerContact.value.trim() || 'N/A',
            paymentMethod: paymentMethod.value,
            prescriptionNumber: prescriptionRef.value || 'N/A',
            items: cart.map(item => ({
                drugId: item.id,
                drugName: item.name,
                drugCode: item.code,
                quantity: item.quantity,
                unitPrice: item.price,
                totalPrice: item.price * item.quantity
            })),
            subtotal: subtotal,
            taxRate: parseFloat(taxRate.value || 0),
            tax: tax,
            discount: discountValue,
            total: total,
            status: 'completed',
            soldBy: 'Current User', // Replace with actual user from auth
            createdAt: serverTimestamp(),
            timestamp: new Date().toISOString()
        };
        
        // Save sale to Firestore
        await addDoc(collection(db, 'pharmacy_sales'), saleData);
        
        // Track pharmacy sale activity
        if (window.trackPharmacyOrder) {
            window.trackPharmacyOrder(
                customerName.value.trim(),
                prescriptionRef.value || null,
                'Sale'
            );
        }
        
        // Update inventory stock quantities
        for (const item of cart) {
            const drug = allInventoryDrugs.find(d => d.id === item.id);
            
            if (drug) {
                const newStock = drug.stockQuantity - item.quantity;
                const drugRef = doc(db, 'pharmacy_inventory', item.id);
                await updateDoc(drugRef, {
                    stockQuantity: newStock,
                    lastUpdated: serverTimestamp()
                });
                
                // Update local cache
                drug.stockQuantity = newStock;
            }
        }
        
        // Show success message
        showNotification(`Sale ${saleNumber} completed successfully!`, 'success');
        
        // Print receipt
        printReceipt(saleData);
        
        // Reset form
        resetPOSForm();
        
    } catch (error) {
        console.error('Error processing checkout:', error);
        showNotification('Error completing sale', 'error');
    }
}

/**
 * Print receipt
 */
function printReceipt(saleData) {
    const receiptWindow = window.open('', '_blank', 'width=300,height=600');
    
    const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sale Receipt - ${saleData.saleNumber}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    padding: 10px;
                    width: 80mm;
                }
                .receipt-header {
                    text-align: center;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 2px dashed #000;
                }
                .receipt-header h1 {
                    font-size: 18px;
                    margin-bottom: 5px;
                }
                .receipt-info {
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px dashed #000;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                    font-size: 11px;
                }
                .items-table {
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px dashed #000;
                }
                .item-row {
                    margin-bottom: 8px;
                }
                .item-name {
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                .item-details {
                    display: flex;
                    justify-content: space-between;
                    font-size: 11px;
                }
                .totals {
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 2px dashed #000;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                }
                .total-row.grand-total {
                    font-size: 14px;
                    font-weight: bold;
                    margin-top: 5px;
                    padding-top: 5px;
                    border-top: 1px solid #000;
                }
                .footer {
                    text-align: center;
                    font-size: 10px;
                    margin-top: 10px;
                }
                @media print {
                    body { width: 80mm; }
                }
            </style>
        </head>
        <body>
            <div class="receipt-header">
                <h1>RxFlow Hospital</h1>
                <div>Pharmacy Sales Receipt</div>
            </div>
            
            <div class="receipt-info">
                <div class="info-row">
                    <span>Receipt #:</span>
                    <span>${saleData.saleNumber}</span>
                </div>
                <div class="info-row">
                    <span>Date:</span>
                    <span>${new Date().toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span>Customer:</span>
                    <span>${saleData.customerName}</span>
                </div>
                ${saleData.customerContact !== 'N/A' ? `
                <div class="info-row">
                    <span>Contact:</span>
                    <span>${saleData.customerContact}</span>
                </div>
                ` : ''}
                ${saleData.prescriptionNumber !== 'N/A' ? `
                <div class="info-row">
                    <span>Prescription:</span>
                    <span>${saleData.prescriptionNumber}</span>
                </div>
                ` : ''}
                <div class="info-row">
                    <span>Payment:</span>
                    <span>${saleData.paymentMethod.toUpperCase()}</span>
                </div>
            </div>
            
            <div class="items-table">
                ${saleData.items.map(item => `
                    <div class="item-row">
                        <div class="item-name">${item.drugName}</div>
                        <div class="item-details">
                            <span>${item.quantity} x KSh ${item.unitPrice.toFixed(2)}</span>
                            <span>KSh ${item.totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="totals">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>KSh ${saleData.subtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span>Tax (${saleData.taxRate}%):</span>
                    <span>KSh ${saleData.tax.toFixed(2)}</span>
                </div>
                ${saleData.discount > 0 ? `
                <div class="total-row">
                    <span>Discount:</span>
                    <span>- KSh ${saleData.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-row grand-total">
                    <span>TOTAL:</span>
                    <span>KSh ${saleData.total.toFixed(2)}</span>
                </div>
            </div>
            
            <div class="footer">
                <p>Thank you for your business!</p>
                <p>Keep this receipt for your records</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;
    
    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
}

/**
 * Reset POS form
 */
function resetPOSForm() {
    cart = [];
    prescriptionData = null;
    
    customerName.value = '';
    customerContact.value = '';
    paymentMethod.value = '';
    prescriptionRef.value = '';
    prescriptionNumber.value = '';
    posSearchInput.value = '';
    posSearchResults.innerHTML = '';
    
    updateCartDisplay();
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Export module to window for global access
window.pharmacyPOS = {
    initPharmacyPOS
};
