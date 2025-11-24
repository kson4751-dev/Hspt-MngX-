// ===================================
// INVENTORY UTILITY MODULE - RxFlow HMS
// ===================================

/**
 * Inventory Management Utility Functions
 * Handles inventory operations, stock tracking, and reporting
 * Connected to Firebase Firestore for real-time synchronization
 */

// Firebase references - will be initialized dynamically
let db = null;
let inventoryCollection = null;
let inventoryTransactionsCollection = null;
let inventoryUnsubscribe = null;
let isInventoryFirebaseInitialized = false;

// Local cache for inventory items
let inventoryCache = [];

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
 * Initialize Firebase Inventory Module
 */
async function initializeInventoryFirebase() {
    // Prevent double initialization
    if (isInventoryFirebaseInitialized) {
        console.log('⚠️ Inventory Firebase already initialized, skipping...');
        return true;
    }
    
    console.log('🔧 Initializing Inventory Firebase module...');
    
    try {
        // Import Firebase modules
        const { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } = 
            await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        
        console.log('Firebase modules imported successfully');
        
        // Get Firestore instance
        const app = getApp();
        db = getFirestore(app);
        
        console.log('Firestore instance obtained');
        
        // Store Firebase functions globally for this module
        window.firestoreModule = { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp };
        
        // Initialize collections
        inventoryCollection = collection(db, 'inventory');
        inventoryTransactionsCollection = collection(db, 'inventoryTransactions');
        
        console.log('Collections initialized');
        
        // Setup real-time listener
        setupInventoryRealtimeListener();
        
        isInventoryFirebaseInitialized = true;
        console.log('✅ Inventory Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Error initializing Inventory Firebase:', error);
        return false;
    }
}

/**
 * Setup real-time listener for inventory updates
 */
function setupInventoryRealtimeListener() {
    if (!inventoryCollection || !window.firestoreModule) {
        console.error('Cannot setup listener - collection or module not ready');
        return;
    }

    const { onSnapshot } = window.firestoreModule;
    
    console.log('Setting up inventory real-time listener...');
    
    inventoryUnsubscribe = onSnapshot(inventoryCollection, (snapshot) => {
        inventoryCache = [];
        console.log('Inventory snapshot received, docs count:', snapshot.size);
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Processing inventory item:', doc.id, data);
            inventoryCache.push({
                id: doc.id,
                ...data,
                // Convert Firestore timestamps to ISO strings for compatibility
                dateAdded: data.dateAdded?.toDate ? data.dateAdded.toDate().toISOString() : data.dateAdded,
                lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated
            });
        });

        console.log(`✅ Inventory synced: ${inventoryCache.length} items in cache`);

        // Update UI if on inventory page
        if (typeof updateInventoryDisplay === 'function') {
            console.log('Calling updateInventoryDisplay...');
            updateInventoryDisplay();
        }
    }, (error) => {
        console.error('Error in inventory listener:', error);
    });
}

/**
 * Add new inventory item to Firestore
 */
async function addInventoryItem(itemData) {
    if (!db || !window.firestoreModule) {
        throw new Error('Firebase not initialized');
    }

    try {
        const { addDoc, serverTimestamp } = window.firestoreModule;
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        const newItem = {
            ...itemData,
            dateAdded: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            createdBy: currentUser?.email || 'system'
        };

        const docRef = await addDoc(inventoryCollection, newItem);
        
        // Log transaction
        await logInventoryTransaction({
            itemId: docRef.id,
            itemCode: itemData.code,
            itemName: itemData.name,
            type: 'stock-in',
            oldQuantity: 0,
            newQuantity: itemData.quantity,
            difference: itemData.quantity,
            reason: 'Initial stock',
            timestamp: serverTimestamp(),
            performedBy: currentUser?.email || 'system'
        });

        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding inventory item:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update inventory item in Firestore
 */
async function updateInventoryItem(itemId, updateData) {
    if (!db || !window.firestoreModule) {
        throw new Error('Firebase not initialized');
    }

    try {
        const { updateDoc, doc, serverTimestamp } = window.firestoreModule;
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        const itemRef = doc(db, 'inventory', itemId);
        
        await updateDoc(itemRef, {
            ...updateData,
            lastUpdated: serverTimestamp(),
            updatedBy: currentUser?.email || 'system'
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating inventory item:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all inventory items (from cache for real-time data)
 */
function getAllInventoryItems() {
    console.log('getAllInventoryItems called, cache has:', inventoryCache.length, 'items');
    return inventoryCache || [];
}

/**
 * Get item by ID
 */
function getInventoryItemById(id) {
    return inventoryCache.find(item => item.id === id);
}

/**
 * Get item by code
 */
function getInventoryItemByCode(code) {
    return inventoryCache.find(item => item.code === code);
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
 * Update item quantity in Firestore
 */
async function updateItemQuantity(itemId, newQuantity, reason = 'adjustment') {
    if (!db || !window.firestoreModule) {
        throw new Error('Firebase not initialized');
    }

    try {
        const { updateDoc, doc, serverTimestamp } = window.firestoreModule;
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        const item = getInventoryItemById(itemId);
        if (!item) {
            throw new Error('Item not found');
        }

        const oldQuantity = item.quantity;
        const totalValue = newQuantity * item.costPrice;

        const itemRef = doc(db, 'inventory', itemId);
        
        await updateDoc(itemRef, {
            quantity: newQuantity,
            totalValue: totalValue,
            lastUpdated: serverTimestamp(),
            updatedBy: currentUser?.email || 'system'
        });

        // Log the transaction
        await logInventoryTransaction({
            itemId: itemId,
            itemCode: item.code,
            itemName: item.name,
            type: newQuantity > oldQuantity ? 'stock-in' : 'stock-out',
            oldQuantity: oldQuantity,
            newQuantity: newQuantity,
            difference: newQuantity - oldQuantity,
            reason: reason,
            timestamp: serverTimestamp(),
            performedBy: currentUser?.email || 'system'
        });

        return { success: true };
    } catch (error) {
        console.error('Error updating item quantity:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Log inventory transaction to Firestore
 */
async function logInventoryTransaction(transaction) {
    if (!inventoryTransactionsCollection || !window.firestoreModule) {
        console.error('Transactions collection not initialized');
        return;
    }

    try {
        const { addDoc } = window.firestoreModule;
        await addDoc(inventoryTransactionsCollection, transaction);
    } catch (error) {
        console.error('Error logging transaction:', error);
    }
}

/**
 * Get inventory transactions from Firestore
 */
async function getInventoryTransactions(itemId = null) {
    if (!inventoryTransactionsCollection || !window.firestoreModule) {
        return [];
    }

    try {
        const { getDocs, query, where, orderBy, limit } = 
            await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        let q = query(inventoryTransactionsCollection, orderBy('timestamp', 'desc'), limit(100));
        
        if (itemId) {
            q = query(inventoryTransactionsCollection, where('itemId', '==', itemId), orderBy('timestamp', 'desc'), limit(100));
        }
        
        const snapshot = await getDocs(q);
        const transactions = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            transactions.push({
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp
            });
        });
        
        return transactions;
    } catch (error) {
        console.error('Error getting transactions:', error);
        return [];
    }
}

/**
 * Delete inventory item from Firestore
 */
async function deleteInventoryItem(itemId) {
    if (!db || !window.firestoreModule) {
        throw new Error('Firebase not initialized');
    }

    try {
        const { deleteDoc, doc, serverTimestamp } = window.firestoreModule;
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        const item = getInventoryItemById(itemId);
        if (!item) {
            throw new Error('Item not found');
        }

        // Log deletion before deleting
        await logInventoryTransaction({
            itemId: itemId,
            itemCode: item.code,
            itemName: item.name,
            type: 'deleted',
            reason: 'Item removed from inventory',
            timestamp: serverTimestamp(),
            performedBy: currentUser?.email || 'system'
        });

        const itemRef = doc(db, 'inventory', itemId);
        await deleteDoc(itemRef);
        
        return { success: true };
    } catch (error) {
        console.error('Error deleting item:', error);
        return { success: false, error: error.message };
    }
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

/**
 * Cleanup function - unsubscribe from listeners
 */
function cleanupInventoryListeners() {
    if (inventoryUnsubscribe) {
        inventoryUnsubscribe();
        inventoryUnsubscribe = null;
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ITEM_CATEGORIES,
        MEASUREMENT_UNITS,
        STORAGE_LOCATIONS,
        ITEM_STATUS,
        initializeInventoryFirebase,
        addInventoryItem,
        updateInventoryItem,
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
        formatInventoryCurrency,
        cleanupInventoryListeners
    };
}

console.log('Inventory utility module loaded successfully');
