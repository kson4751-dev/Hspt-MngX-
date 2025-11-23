// Sample Expense Data for Testing
// Run this in the browser console to populate the expense module with sample data

function initializeSampleExpenses() {
    const sampleExpenses = [
        {
            id: 'EXP-001',
            category: 'medical-supplies',
            subcategory: 'Surgical Gloves',
            description: 'Box of sterile surgical gloves (100 pairs)',
            amount: 8500.00,
            date: '2025-11-20',
            paymentMethod: 'mpesa',
            notes: 'Urgent purchase for operating room',
            vendorName: 'MediSupply Kenya Ltd',
            vendorContact: '+254722123456',
            invoiceNumber: 'INV-2025-1120',
            purchaseOrderNumber: 'PO-2025-089',
            department: 'emergency',
            authorizedBy: 'Dr. Sarah Kamau',
            status: 'paid',
            recurring: 'no',
            timestamp: new Date('2025-11-20T10:30:00').toISOString(),
            recordedBy: 'John Mwangi'
        },
        {
            id: 'EXP-002',
            category: 'utilities',
            subcategory: 'Electricity',
            description: 'Monthly electricity bill - November 2025',
            amount: 125000.00,
            date: '2025-11-15',
            paymentMethod: 'bank-transfer',
            notes: 'Kenya Power monthly bill',
            vendorName: 'Kenya Power & Lighting Company',
            vendorContact: '+254203201000',
            invoiceNumber: 'KPLC-NOV-2025',
            purchaseOrderNumber: '',
            department: 'general',
            authorizedBy: 'Finance Manager',
            status: 'paid',
            recurring: 'monthly',
            timestamp: new Date('2025-11-15T14:20:00').toISOString(),
            recordedBy: 'Finance Department'
        },
        {
            id: 'EXP-003',
            category: 'pharmaceuticals',
            subcategory: 'Antibiotics',
            description: 'Amoxicillin 500mg - 1000 tablets',
            amount: 45000.00,
            date: '2025-11-18',
            paymentMethod: 'cheque',
            notes: 'Stock replenishment for pharmacy',
            vendorName: 'PharmaCare Distributors',
            vendorContact: '+254733456789',
            invoiceNumber: 'PC-INV-5678',
            purchaseOrderNumber: 'PO-2025-092',
            department: 'pharmacy',
            authorizedBy: 'Chief Pharmacist',
            status: 'approved',
            recurring: 'no',
            timestamp: new Date('2025-11-18T09:15:00').toISOString(),
            recordedBy: 'Mary Wanjiku'
        },
        {
            id: 'EXP-004',
            category: 'food-catering',
            subcategory: 'Patient Meals',
            description: 'Catering services for inpatients - Week 47',
            amount: 78000.00,
            date: '2025-11-19',
            paymentMethod: 'cash',
            notes: 'Weekly catering contract',
            vendorName: 'Hospital Catering Services',
            vendorContact: '+254711223344',
            invoiceNumber: 'HCS-W47-2025',
            purchaseOrderNumber: '',
            department: 'ward',
            authorizedBy: 'Ward Supervisor',
            status: 'paid',
            recurring: 'weekly',
            timestamp: new Date('2025-11-19T11:00:00').toISOString(),
            recordedBy: 'Peter Omondi'
        },
        {
            id: 'EXP-005',
            category: 'maintenance',
            subcategory: 'Equipment Repair',
            description: 'X-ray machine maintenance and calibration',
            amount: 95000.00,
            date: '2025-11-21',
            paymentMethod: 'bank-transfer',
            notes: 'Scheduled quarterly maintenance',
            vendorName: 'MediTech Solutions',
            vendorContact: '+254722998877',
            invoiceNumber: 'MT-2025-1121',
            purchaseOrderNumber: 'PO-2025-095',
            department: 'radiology',
            authorizedBy: 'Head of Radiology',
            status: 'pending',
            recurring: 'quarterly',
            timestamp: new Date('2025-11-21T13:45:00').toISOString(),
            recordedBy: 'Admin Office'
        },
        {
            id: 'EXP-006',
            category: 'laboratory',
            subcategory: 'Test Reagents',
            description: 'Blood test reagent kit - Complete panel',
            amount: 62000.00,
            date: '2025-11-17',
            paymentMethod: 'mpesa',
            notes: 'Reagents for hematology tests',
            vendorName: 'Lab Solutions Kenya',
            vendorContact: '+254733665544',
            invoiceNumber: 'LSK-11-2025',
            purchaseOrderNumber: 'PO-2025-088',
            department: 'laboratory',
            authorizedBy: 'Lab Technician',
            status: 'paid',
            recurring: 'no',
            timestamp: new Date('2025-11-17T08:30:00').toISOString(),
            recordedBy: 'Grace Njeri'
        },
        {
            id: 'EXP-007',
            category: 'cleaning',
            subcategory: 'Cleaning Supplies',
            description: 'Monthly cleaning and sanitation supplies',
            amount: 32000.00,
            date: '2025-11-16',
            paymentMethod: 'cash',
            notes: 'Detergents, disinfectants, mops, etc.',
            vendorName: 'Clean Hospital Supplies',
            vendorContact: '+254700112233',
            invoiceNumber: 'CHS-NOV-2025',
            purchaseOrderNumber: '',
            department: 'housekeeping',
            authorizedBy: 'Housekeeping Manager',
            status: 'paid',
            recurring: 'monthly',
            timestamp: new Date('2025-11-16T10:00:00').toISOString(),
            recordedBy: 'Housekeeping'
        },
        {
            id: 'EXP-008',
            category: 'technology',
            subcategory: 'Software License',
            description: 'Annual hospital management system license renewal',
            amount: 180000.00,
            date: '2025-11-22',
            paymentMethod: 'bank-transfer',
            notes: 'HMS software annual subscription',
            vendorName: 'HealthTech Systems Ltd',
            vendorContact: '+254722334455',
            invoiceNumber: 'HTS-LIC-2025',
            purchaseOrderNumber: 'PO-2025-098',
            department: 'it',
            authorizedBy: 'IT Manager',
            status: 'approved',
            recurring: 'annually',
            timestamp: new Date('2025-11-22T09:00:00').toISOString(),
            recordedBy: 'IT Department'
        }
    ];

    // Save to localStorage
    localStorage.setItem('expenses', JSON.stringify(sampleExpenses));
    
    console.log('✅ Sample expenses initialized!');
    console.log(`Total expenses: ${sampleExpenses.length}`);
    console.log(`Total amount: KSh ${sampleExpenses.reduce((sum, exp) => sum + exp.amount, 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`);
    
    return sampleExpenses;
}

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
    console.log('Sample expense data ready. Run initializeSampleExpenses() to load sample data.');
    
    // Auto-load sample data if no expenses exist
    window.addEventListener('load', function() {
        setTimeout(() => {
            const expenses = localStorage.getItem('expenses');
            if (!expenses || JSON.parse(expenses).length === 0) {
                console.log('No expenses found. Loading sample data...');
                initializeSampleExpenses();
            }
        }, 1000);
    });
}
