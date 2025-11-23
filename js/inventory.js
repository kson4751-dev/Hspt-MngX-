// ===================================
// INVENTORY UTILITY MODULE - RxFlow HMS
// ===================================

/**
 * Inventory Management Utility Functions
 * Handles inventory operations, stock tracking, and reporting
 */

// Item Categories Configuration
const ITEM_CATEGORIES = {
    'medical-equipment': 'Medical Equipment',
    'surgical-instruments': 'Surgical Instruments',
    'pharmaceuticals': 'Pharmaceuticals',
    'medical-consumables': 'Medical Consumables',
    'laboratory-supplies': 'Laboratory Supplies',
    'diagnostic-equipment': 'Diagnostic Equipment',
    'office-supplies': 'Office Supplies',
    'cleaning-supplies': 'Cleaning Supplies',
    'personal-protective': 'Personal Protective Equipment (PPE)',
    'furniture': 'Furniture & Fixtures',
    'technology': 'Technology & IT Equipment',
    'kitchen-supplies': 'Kitchen Supplies',
    'linen-bedding': 'Linen & Bedding',
    'utilities': 'Utilities & Maintenance',
    'other': 'Other'
};

// Units of Measurement
const MEASUREMENT_UNITS = {
    'pieces': 'Pieces (pcs)',
    'boxes': 'Boxes',
    'packs': 'Packs',
    'bottles': 'Bottles',
    'vials': 'Vials',
    'strips': 'Strips',
    'tablets': 'Tablets',
    'capsules': 'Capsules',
    'liters': 'Liters (L)',
    'milliliters': 'Milliliters (mL)',
    'kilograms': 'Kilograms (kg)',
    'grams': 'Grams (g)',
    'rolls': 'Rolls',
    'pairs': 'Pairs',
    'sets': 'Sets',
    'units': 'Units'
};

// Storage Locations
const STORAGE_LOCATIONS = {
    'main-pharmacy': 'Main Pharmacy',
    'emergency-pharmacy': 'Emergency Pharmacy',
    'main-store': 'Main Store',
    'laboratory-store': 'Laboratory Store',
    'surgical-store': 'Surgical Store',
    'ward-supplies': 'Ward Supplies',
    'cold-storage': 'Cold Storage',
    'warehouse': 'Warehouse',
    'office-store': 'Office Store',
    'maintenance-store': 'Maintenance Store'
};

// Item Status
const ITEM_STATUS = {
    'active': { label: 'Active', color: '#10b981' },
    'inactive': { label: 'Inactive', color: '#6b7280' },
    'discontinued': { label: 'Discontinued', color: '#ef4444' },
    'pending': { label: 'Pending Approval', color: '#f59e0b' }
};

/**
 * Get all inventory items
 */
function getAllInventoryItems() {
    try {
        const items = localStorage.getItem('inventoryItems');
        return items ? JSON.parse(items) : [];
    } catch (error) {
        console.error('Error loading inventory items:', error);
        return [];
    }
}

/**
 * Get item by ID
 */
function getInventoryItemById(id) {
    const items = getAllInventoryItems();
    return items.find(item => item.id === id);
}

/**
 * Get item by code
 */
function getInventoryItemByCode(code) {
    const items = getAllInventoryItems();
    return items.find(item => item.code === code);
}

/**
 * Filter inventory items
 */
function filterInventoryItems(criteria) {
    let items = getAllInventoryItems();

    if (criteria.category) {
        items = items.filter(item => item.category === criteria.category);
    }

    if (criteria.department) {
        items = items.filter(item => item.department === criteria.department);
    }

    if (criteria.status) {
        items = items.filter(item => item.status === criteria.status);
    }

    if (criteria.location) {
        items = items.filter(item => item.storageLocation === criteria.location);
    }

    if (criteria.lowStock) {
        items = items.filter(item => item.quantity <= item.reorderLevel);
    }

    if (criteria.expired) {
        const today = new Date();
        items = items.filter(item => {
            if (item.expiryDate) {
                return new Date(item.expiryDate) < today;
            }
            return false;
        });
    }

    return items;
}

/**
 * Get low stock items
 */
function getLowStockItems() {
    const items = getAllInventoryItems();
    return items.filter(item => item.quantity <= item.reorderLevel);
}

/**
 * Get expired items
 */
function getExpiredItems() {
    const items = getAllInventoryItems();
    const today = new Date();
    return items.filter(item => {
        if (item.expiryDate) {
            return new Date(item.expiryDate) < today;
        }
        return false;
    });
}

/**
 * Get items expiring soon (within 30 days)
 */
function getExpiringItems(days = 30) {
    const items = getAllInventoryItems();
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    return items.filter(item => {
        if (item.expiryDate) {
            const expiryDate = new Date(item.expiryDate);
            return expiryDate > today && expiryDate <= futureDate;
        }
        return false;
    });
}

/**
 * Calculate total inventory value
 */
function calculateTotalInventoryValue() {
    const items = getAllInventoryItems();
    return items.reduce((total, item) => total + item.totalValue, 0);
}

/**
 * Get inventory by category
 */
function getInventoryByCategory() {
    const items = getAllInventoryItems();
    const categoryData = {};

    items.forEach(item => {
        if (!categoryData[item.category]) {
            categoryData[item.category] = {
                count: 0,
                totalValue: 0,
                items: [],
                categoryName: ITEM_CATEGORIES[item.category] || item.category
            };
        }
        categoryData[item.category].count++;
        categoryData[item.category].totalValue += item.totalValue;
        categoryData[item.category].items.push(item);
    });

    return categoryData;
}

/**
 * Get inventory by location
 */
function getInventoryByLocation() {
    const items = getAllInventoryItems();
    const locationData = {};

    items.forEach(item => {
        if (!locationData[item.storageLocation]) {
            locationData[item.storageLocation] = {
                count: 0,
                totalValue: 0,
                items: []
            };
        }
        locationData[item.storageLocation].count++;
        locationData[item.storageLocation].totalValue += item.totalValue;
        locationData[item.storageLocation].items.push(item);
    });

    return locationData;
}

/**
 * Update item quantity
 */
function updateItemQuantity(itemId, newQuantity, reason = 'adjustment') {
    const items = getAllInventoryItems();
    const itemIndex = items.findIndex(item => item.id === itemId);

    if (itemIndex !== -1) {
        const oldQuantity = items[itemIndex].quantity;
        items[itemIndex].quantity = newQuantity;
        items[itemIndex].totalValue = newQuantity * items[itemIndex].costPrice;
        items[itemIndex].lastUpdated = new Date().toISOString();

        // Log the transaction
        logInventoryTransaction({
            itemId: itemId,
            itemCode: items[itemIndex].code,
            itemName: items[itemIndex].name,
            type: newQuantity > oldQuantity ? 'stock-in' : 'stock-out',
            oldQuantity: oldQuantity,
            newQuantity: newQuantity,
            difference: newQuantity - oldQuantity,
            reason: reason,
            timestamp: new Date().toISOString()
        });

        localStorage.setItem('inventoryItems', JSON.stringify(items));
        return true;
    }

    return false;
}

/**
 * Log inventory transaction
 */
function logInventoryTransaction(transaction) {
    let transactions = JSON.parse(localStorage.getItem('inventoryTransactions') || '[]');
    transactions.push(transaction);
    localStorage.setItem('inventoryTransactions', JSON.stringify(transactions));
}

/**
 * Get inventory transactions
 */
function getInventoryTransactions(itemId = null) {
    const transactions = JSON.parse(localStorage.getItem('inventoryTransactions') || '[]');
    
    if (itemId) {
        return transactions.filter(t => t.itemId === itemId);
    }
    
    return transactions;
}

/**
 * Delete inventory item
 */
function deleteInventoryItem(itemId) {
    let items = getAllInventoryItems();
    const itemIndex = items.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
        const deletedItem = items[itemIndex];
        items.splice(itemIndex, 1);
        localStorage.setItem('inventoryItems', JSON.stringify(items));
        
        // Log deletion
        logInventoryTransaction({
            itemId: itemId,
            itemCode: deletedItem.code,
            itemName: deletedItem.name,
            type: 'deleted',
            reason: 'Item removed from inventory',
            timestamp: new Date().toISOString()
        });
        
        return true;
    }
    
    return false;
}

/**
 * Export inventory to CSV
 */
function exportInventoryToCSV(items = null) {
    const itemList = items || getAllInventoryItems();
    
    if (itemList.length === 0) {
        alert('No items to export');
        return;
    }

    // CSV headers
    const headers = [
        'Item ID',
        'Code/SKU',
        'Name',
        'Category',
        'Brand',
        'Quantity',
        'Unit',
        'Reorder Level',
        'Cost Price',
        'Selling Price',
        'Total Value',
        'Storage Location',
        'Batch Number',
        'Expiry Date',
        'Status',
        'Supplier',
        'Date Added'
    ];

    // CSV rows
    const rows = itemList.map(item => [
        item.id,
        item.code,
        item.name,
        ITEM_CATEGORIES[item.category] || item.category,
        item.brand || '',
        item.quantity,
        item.unit,
        item.reorderLevel,
        item.costPrice.toFixed(2),
        item.sellingPrice ? item.sellingPrice.toFixed(2) : '',
        item.totalValue.toFixed(2),
        item.storageLocation,
        item.batchNumber || '',
        item.expiryDate || '',
        item.status,
        item.supplierName || '',
        new Date(item.dateAdded).toLocaleDateString()
    ]);

    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Get inventory statistics
 */
function getInventoryStatistics() {
    const items = getAllInventoryItems();
    const lowStockItems = getLowStockItems();
    const expiredItems = getExpiredItems();
    const expiringItems = getExpiringItems(30);

    return {
        totalItems: items.length,
        totalValue: calculateTotalInventoryValue(),
        lowStock: {
            count: lowStockItems.length,
            items: lowStockItems
        },
        expired: {
            count: expiredItems.length,
            items: expiredItems
        },
        expiringSoon: {
            count: expiringItems.length,
            items: expiringItems
        },
        categories: getInventoryByCategory(),
        locations: getInventoryByLocation()
    };
}

/**
 * Check stock level status
 */
function getStockLevelStatus(item) {
    if (item.quantity === 0) {
        return { status: 'out-of-stock', label: 'Out of Stock', color: '#ef4444' };
    } else if (item.quantity <= item.reorderLevel) {
        return { status: 'low', label: 'Low Stock', color: '#f59e0b' };
    } else if (item.maxLevel && item.quantity >= item.maxLevel) {
        return { status: 'high', label: 'Overstocked', color: '#3b82f6' };
    } else {
        return { status: 'normal', label: 'Normal', color: '#10b981' };
    }
}

/**
 * Generate reorder report
 */
function generateReorderReport() {
    const lowStockItems = getLowStockItems();
    
    return lowStockItems.map(item => ({
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        currentStock: item.quantity,
        reorderLevel: item.reorderLevel,
        recommendedOrder: item.maxLevel ? item.maxLevel - item.quantity : item.reorderLevel * 2,
        supplier: item.supplierName,
        estimatedCost: (item.maxLevel ? item.maxLevel - item.quantity : item.reorderLevel * 2) * item.costPrice
    }));
}

/**
 * Format currency
 */
function formatInventoryCurrency(amount) {
    return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ITEM_CATEGORIES,
        MEASUREMENT_UNITS,
        STORAGE_LOCATIONS,
        ITEM_STATUS,
        getAllInventoryItems,
        getInventoryItemById,
        getInventoryItemByCode,
        filterInventoryItems,
        getLowStockItems,
        getExpiredItems,
        getExpiringItems,
        calculateTotalInventoryValue,
        getInventoryByCategory,
        getInventoryByLocation,
        updateItemQuantity,
        deleteInventoryItem,
        exportInventoryToCSV,
        getInventoryStatistics,
        getStockLevelStatus,
        generateReorderReport,
        formatInventoryCurrency
    };
}

console.log('Inventory utility module loaded successfully');
