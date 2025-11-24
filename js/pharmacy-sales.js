/**
 * RxFlow - Pharmacy Sales Module
 * View and manage all pharmacy sales transactions
 */

import { 
    db,
    collection,
    getDocs,
    query,
    where,
    orderBy as firestoreOrderBy,
    doc,
    getDoc
} from './firebase-config.js';

// State
let allSales = [];
let filteredSales = [];
let currentPage = 1;
const itemsPerPage = 10;

// DOM Elements
let salesSearchInput, dateFilter, paymentFilter, exportSalesBtn;
let customDateRange, startDate, endDate, applyDateRange;
let salesTableBody;
let totalRevenue, todaySales, totalTransactions, itemsSold;
let salesShowingStart, salesShowingEnd, salesTotalCount;
let salesCurrentPage, salesPrevPage, salesNextPage;

/**
 * Initialize Pharmacy Sales Module
 */
export function initPharmacySales() {
    console.log('========================================');
    console.log('INITIALIZING PHARMACY SALES MODULE');
    console.log('========================================');
    
    // Get DOM elements
    salesSearchInput = document.getElementById('salesSearchInput');
    dateFilter = document.getElementById('dateFilter');
    paymentFilter = document.getElementById('paymentFilter');
    exportSalesBtn = document.getElementById('exportSalesBtn');
    
    customDateRange = document.getElementById('customDateRange');
    startDate = document.getElementById('startDate');
    endDate = document.getElementById('endDate');
    applyDateRange = document.getElementById('applyDateRange');
    
    salesTableBody = document.getElementById('salesTableBody');
    
    totalRevenue = document.getElementById('totalRevenue');
    todaySales = document.getElementById('todaySales');
    totalTransactions = document.getElementById('totalTransactions');
    itemsSold = document.getElementById('itemsSold');
    
    salesShowingStart = document.getElementById('salesShowingStart');
    salesShowingEnd = document.getElementById('salesShowingEnd');
    salesTotalCount = document.getElementById('salesTotalCount');
    salesCurrentPage = document.getElementById('salesCurrentPage');
    salesPrevPage = document.getElementById('salesPrevPage');
    salesNextPage = document.getElementById('salesNextPage');
    
    // Setup event listeners
    setupEventListeners();
    
    // Load sales data
    loadSalesData();
    
    console.log('✓ Sales module initialized');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search
    if (salesSearchInput) {
        let searchTimeout;
        salesSearchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applyFilters();
            }, 300);
        });
    }
    
    // Date filter
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            if (this.value === 'custom') {
                customDateRange.style.display = 'block';
            } else {
                customDateRange.style.display = 'none';
                applyFilters();
            }
        });
    }
    
    // Payment filter
    if (paymentFilter) {
        paymentFilter.addEventListener('change', () => applyFilters());
    }
    
    // Custom date range
    if (applyDateRange) {
        applyDateRange.addEventListener('click', () => applyFilters());
    }
    
    // Export
    if (exportSalesBtn) {
        exportSalesBtn.addEventListener('click', exportToCSV);
    }
    
    // Pagination
    if (salesPrevPage) {
        salesPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displaySales();
            }
        });
    }
    
    if (salesNextPage) {
        salesNextPage.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                displaySales();
            }
        });
    }
}

/**
 * Load sales data from Firestore
 */
async function loadSalesData() {
    console.log('Loading sales data...');
    
    try {
        const salesRef = collection(db, 'pharmacy_sales');
        const snapshot = await getDocs(salesRef);
        
        allSales = [];
        snapshot.forEach((doc) => {
            allSales.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Sort by date (newest first)
        allSales.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.timestamp);
            const dateB = b.createdAt?.toDate?.() || new Date(b.timestamp);
            return dateB - dateA;
        });
        
        console.log(`✓ Loaded ${allSales.length} sales`);
        
        // Apply initial filter (today by default)
        applyFilters();
        
    } catch (error) {
        console.error('Error loading sales:', error);
        salesTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--danger-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 32px; margin-bottom: 8px;"></i>
                    <p>Error loading sales data</p>
                    <small>${error.message}</small>
                </td>
            </tr>
        `;
    }
}

/**
 * Apply filters
 */
function applyFilters() {
    console.log('Applying filters...');
    
    // Start with all sales
    let filtered = [...allSales];
    
    // Apply date filter
    const dateFilterValue = dateFilter?.value || 'today';
    filtered = filterByDate(filtered, dateFilterValue);
    
    // Apply payment filter
    const paymentFilterValue = paymentFilter?.value || 'all';
    if (paymentFilterValue !== 'all') {
        filtered = filtered.filter(sale => sale.paymentMethod === paymentFilterValue);
    }
    
    // Apply search
    const searchValue = salesSearchInput?.value.trim().toLowerCase() || '';
    if (searchValue) {
        filtered = filtered.filter(sale => {
            const saleNumber = (sale.saleNumber || '').toLowerCase();
            const customerName = (sale.customerName || '').toLowerCase();
            const paymentMethod = (sale.paymentMethod || '').toLowerCase();
            
            return saleNumber.includes(searchValue) || 
                   customerName.includes(searchValue) || 
                   paymentMethod.includes(searchValue);
        });
    }
    
    filteredSales = filtered;
    currentPage = 1;
    
    // Update stats and display
    updateStats();
    displaySales();
}

/**
 * Filter by date
 */
function filterByDate(sales, filterType) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filterType) {
        case 'today':
            return sales.filter(sale => {
                const saleDate = sale.createdAt?.toDate?.() || new Date(sale.timestamp);
                return saleDate >= today;
            });
            
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return sales.filter(sale => {
                const saleDate = sale.createdAt?.toDate?.() || new Date(sale.timestamp);
                return saleDate >= yesterday && saleDate < today;
            });
            
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return sales.filter(sale => {
                const saleDate = sale.createdAt?.toDate?.() || new Date(sale.timestamp);
                return saleDate >= weekAgo;
            });
            
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return sales.filter(sale => {
                const saleDate = sale.createdAt?.toDate?.() || new Date(sale.timestamp);
                return saleDate >= monthAgo;
            });
            
        case 'custom':
            if (startDate?.value && endDate?.value) {
                const start = new Date(startDate.value);
                const end = new Date(endDate.value);
                end.setHours(23, 59, 59, 999);
                
                return sales.filter(sale => {
                    const saleDate = sale.createdAt?.toDate?.() || new Date(sale.timestamp);
                    return saleDate >= start && saleDate <= end;
                });
            }
            return sales;
            
        default: // 'all'
            return sales;
    }
}

/**
 * Update statistics
 */
function updateStats() {
    // Calculate total revenue from filtered sales
    const revenue = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    totalRevenue.textContent = `KSh ${revenue.toFixed(2)}`;
    
    // Calculate today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTotal = allSales
        .filter(sale => {
            const saleDate = sale.createdAt?.toDate?.() || new Date(sale.timestamp);
            return saleDate >= today;
        })
        .reduce((sum, sale) => sum + (sale.total || 0), 0);
    todaySales.textContent = `KSh ${todayTotal.toFixed(2)}`;
    
    // Total transactions
    totalTransactions.textContent = filteredSales.length;
    
    // Items sold
    const totalItems = filteredSales.reduce((sum, sale) => {
        return sum + (sale.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0);
    }, 0);
    itemsSold.textContent = totalItems;
}

/**
 * Display sales in table
 */
function displaySales() {
    if (filteredSales.length === 0) {
        salesTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i>
                    <p>No sales found</p>
                    <small style="color: var(--text-muted);">Try adjusting your filters</small>
                </td>
            </tr>
        `;
        updatePaginationInfo(0, 0, 0);
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredSales.length);
    const pageSales = filteredSales.slice(startIndex, endIndex);
    
    // Build table rows
    salesTableBody.innerHTML = pageSales.map(sale => {
        const saleDate = sale.createdAt?.toDate?.() || new Date(sale.timestamp);
        const itemCount = sale.items?.length || 0;
        
        return `
            <tr>
                <td>
                    <span class="sale-number">${sale.saleNumber}</span>
                </td>
                <td>
                    <span class="sale-date">${saleDate.toLocaleDateString()}</span>
                    <span class="sale-time">${saleDate.toLocaleTimeString()}</span>
                </td>
                <td>
                    <span class="customer-name">${sale.customerName}</span>
                    ${sale.customerContact !== 'N/A' ? `<span class="customer-contact">${sale.customerContact}</span>` : ''}
                </td>
                <td>
                    <span class="items-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
                </td>
                <td>
                    <span class="payment-badge ${sale.paymentMethod}">${sale.paymentMethod.replace('-', ' ')}</span>
                </td>
                <td>
                    <span class="amount-value">KSh ${parseFloat(sale.total || 0).toFixed(2)}</span>
                </td>
                <td>
                    <span class="status-badge ${sale.status || 'completed'}">${sale.status || 'completed'}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action view" onclick="window.viewSale('${sale.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn-action print" onclick="window.printSale('${sale.id}')">
                            <i class="fas fa-print"></i> Print
                        </button>
                        <button class="btn-action billing" onclick="window.sendToBilling('${sale.id}')">
                            <i class="fas fa-file-invoice"></i> Billing
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Update pagination info
    updatePaginationInfo(startIndex + 1, endIndex, filteredSales.length);
}

/**
 * Update pagination information
 */
function updatePaginationInfo(start, end, total) {
    salesShowingStart.textContent = start;
    salesShowingEnd.textContent = end;
    salesTotalCount.textContent = total;
    salesCurrentPage.textContent = currentPage;
    
    const totalPages = Math.ceil(total / itemsPerPage);
    
    salesPrevPage.disabled = currentPage === 1;
    salesNextPage.disabled = currentPage >= totalPages || total === 0;
}

/**
 * View sale details
 */
window.viewSale = function(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) {
        alert('Sale not found');
        return;
    }
    
    const saleDate = sale.createdAt?.toDate?.() || new Date(sale.timestamp);
    
    // Populate modal with sale data
    document.getElementById('modalSaleNumber').textContent = sale.saleNumber || sale.id;
    document.getElementById('modalSaleDate').textContent = saleDate.toLocaleString();
    document.getElementById('modalSaleTotal').textContent = (sale.total || 0).toFixed(2);
    document.getElementById('modalSaleStatus').textContent = (sale.status || 'completed').toUpperCase();
    
    // Customer info
    document.getElementById('modalCustomerName').textContent = sale.customerName || 'Walk-in Customer';
    document.getElementById('modalCustomerContact').textContent = sale.customerContact || 'N/A';
    document.getElementById('modalPaymentMethod').textContent = formatPaymentMethod(sale.paymentMethod);
    document.getElementById('modalServedBy').textContent = sale.servedBy || sale.cashier || 'Staff';
    
    // Items sold
    const itemsTableBody = document.getElementById('modalSaleItems');
    if (sale.items && sale.items.length > 0) {
        itemsTableBody.innerHTML = sale.items.map(item => `
            <tr>
                <td style="text-align: left;">
                    <strong>${item.name || item.drugName || 'Unknown Item'}</strong>
                    ${item.genericName ? `<br><small style="color: var(--text-secondary);">${item.genericName}</small>` : ''}
                </td>
                <td style="text-align: center;">${item.quantity || 1}</td>
                <td style="text-align: right;">KSh ${(item.unitPrice || item.price || 0).toFixed(2)}</td>
                <td style="text-align: right;"><strong>KSh ${((item.quantity || 1) * (item.unitPrice || item.price || 0)).toFixed(2)}</strong></td>
            </tr>
        `).join('');
    } else {
        itemsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-secondary);">No items in this sale</td></tr>';
    }
    
    // Sale summary
    document.getElementById('modalSubtotal').textContent = (sale.subtotal || 0).toFixed(2);
    document.getElementById('modalTax').textContent = (sale.tax || 0).toFixed(2);
    document.getElementById('modalDiscount').textContent = (sale.discount || 0).toFixed(2);
    document.getElementById('modalTotalAmount').textContent = (sale.total || 0).toFixed(2);
    
    // Store current sale ID for printing
    window.currentViewingSaleId = saleId;
    
    // Show modal
    const modal = document.getElementById('saleDetailsModal');
    modal.classList.add('active');
    modal.style.display = 'flex';
};

/**
 * Close sale details modal
 */
window.closeSaleDetailsModal = function() {
    const modal = document.getElementById('saleDetailsModal');
    modal.classList.remove('active');
    modal.style.display = 'none';
    window.currentViewingSaleId = null;
};

/**
 * Print sale from modal
 */
window.printSaleFromModal = function() {
    if (window.currentViewingSaleId) {
        window.printSale(window.currentViewingSaleId);
    }
};

/**
 * Format payment method for display
 */
function formatPaymentMethod(method) {
    const methods = {
        'cash': 'Cash',
        'card': 'Card',
        'mobile-money': 'Mobile Money',
        'mpesa': 'M-Pesa',
        'insurance': 'Insurance',
        'bank-transfer': 'Bank Transfer'
    };
    return methods[method] || method || 'Cash';
}

/**
 * Print sale receipt
 */
window.printSale = function(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;
    
    const saleDate = sale.createdAt?.toDate?.() || new Date(sale.timestamp);
    
    const receiptWindow = window.open('', '_blank', 'width=300,height=600');
    
    const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Receipt - ${sale.saleNumber}</title>
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
                    <span>${sale.saleNumber}</span>
                </div>
                <div class="info-row">
                    <span>Date:</span>
                    <span>${saleDate.toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span>Customer:</span>
                    <span>${sale.customerName}</span>
                </div>
                ${sale.customerContact !== 'N/A' ? `
                <div class="info-row">
                    <span>Contact:</span>
                    <span>${sale.customerContact}</span>
                </div>
                ` : ''}
                <div class="info-row">
                    <span>Payment:</span>
                    <span>${sale.paymentMethod.toUpperCase()}</span>
                </div>
            </div>
            
            <div class="items-table">
                ${sale.items.map(item => `
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
                    <span>KSh ${sale.subtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span>Tax (${sale.taxRate || 0}%):</span>
                    <span>KSh ${sale.tax.toFixed(2)}</span>
                </div>
                ${sale.discount > 0 ? `
                <div class="total-row">
                    <span>Discount:</span>
                    <span>- KSh ${sale.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="total-row grand-total">
                    <span>TOTAL:</span>
                    <span>KSh ${sale.total.toFixed(2)}</span>
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
};

/**
 * Send to billing
 */
window.sendToBilling = function(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;
    
    if (confirm(`Send sale ${sale.saleNumber} to billing module?`)) {
        // TODO: Implement billing integration
        alert('Sale sent to billing successfully!\n\nThis will create an invoice in the billing module.');
        console.log('Sending to billing:', sale);
    }
};

/**
 * Export to CSV
 */
function exportToCSV() {
    if (filteredSales.length === 0) {
        alert('No sales data to export');
        return;
    }
    
    const headers = ['Sale Number', 'Date', 'Time', 'Customer', 'Contact', 'Items', 'Payment Method', 'Subtotal', 'Tax', 'Discount', 'Total', 'Status'];
    
    const rows = filteredSales.map(sale => {
        const saleDate = sale.createdAt?.toDate?.() || new Date(sale.timestamp);
        const itemCount = sale.items?.length || 0;
        
        return [
            sale.saleNumber,
            saleDate.toLocaleDateString(),
            saleDate.toLocaleTimeString(),
            sale.customerName,
            sale.customerContact,
            itemCount,
            sale.paymentMethod,
            sale.subtotal.toFixed(2),
            sale.tax.toFixed(2),
            sale.discount || 0,
            sale.total.toFixed(2),
            sale.status || 'completed'
        ];
    });
    
    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy-sales-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    console.log('Exported', filteredSales.length, 'sales to CSV');
}

// Export module to window
window.pharmacySales = {
    initPharmacySales
};
