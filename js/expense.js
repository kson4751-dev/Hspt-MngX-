// ===================================
// EXPENSE MODULE - RxFlow HMS
// ===================================

/**
 * Expense Management Module
 * Handles expense tracking, categorization, and reporting
 */

// Expense Categories Configuration
const EXPENSE_CATEGORIES = {
    'medical-supplies': 'Medical Supplies & Equipment',
    'pharmaceuticals': 'Pharmaceuticals & Medications',
    'utilities': 'Utilities (Water, Electricity, Gas)',
    'salaries': 'Salaries & Wages',
    'maintenance': 'Maintenance & Repairs',
    'laboratory': 'Laboratory Supplies',
    'administrative': 'Administrative Expenses',
    'food-catering': 'Food & Catering Services',
    'transportation': 'Transportation & Fuel',
    'cleaning': 'Cleaning & Sanitation',
    'insurance': 'Insurance',
    'training': 'Training & Development',
    'marketing': 'Marketing & Advertising',
    'rent': 'Rent & Lease',
    'technology': 'Technology & IT Services',
    'other': 'Other Expenses'
};

// Payment Methods
const PAYMENT_METHODS = {
    'cash': 'Cash',
    'mpesa': 'M-Pesa',
    'bank-transfer': 'Bank Transfer',
    'cheque': 'Cheque',
    'credit-card': 'Credit Card',
    'debit-card': 'Debit Card',
    'other': 'Other'
};

// Expense Status
const EXPENSE_STATUS = {
    'pending': { label: 'Pending Approval', color: '#f59e0b' },
    'approved': { label: 'Approved', color: '#10b981' },
    'paid': { label: 'Paid', color: '#2563eb' },
    'rejected': { label: 'Rejected', color: '#ef4444' }
};

/**
 * Get all expenses from storage
 */
function getAllExpenses() {
    try {
        const expenses = localStorage.getItem('expenses');
        return expenses ? JSON.parse(expenses) : [];
    } catch (error) {
        console.error('Error loading expenses:', error);
        return [];
    }
}

/**
 * Get expense by ID
 */
function getExpenseById(id) {
    const expenses = getAllExpenses();
    return expenses.find(exp => exp.id === id);
}

/**
 * Filter expenses by criteria
 */
function filterExpenses(criteria) {
    let expenses = getAllExpenses();

    if (criteria.category) {
        expenses = expenses.filter(exp => exp.category === criteria.category);
    }

    if (criteria.department) {
        expenses = expenses.filter(exp => exp.department === criteria.department);
    }

    if (criteria.status) {
        expenses = expenses.filter(exp => exp.status === criteria.status);
    }

    if (criteria.startDate) {
        expenses = expenses.filter(exp => new Date(exp.date) >= new Date(criteria.startDate));
    }

    if (criteria.endDate) {
        expenses = expenses.filter(exp => new Date(exp.date) <= new Date(criteria.endDate));
    }

    if (criteria.minAmount) {
        expenses = expenses.filter(exp => exp.amount >= criteria.minAmount);
    }

    if (criteria.maxAmount) {
        expenses = expenses.filter(exp => exp.amount <= criteria.maxAmount);
    }

    return expenses;
}

/**
 * Calculate total expenses
 */
function calculateTotalExpenses(expenses = null) {
    const expenseList = expenses || getAllExpenses();
    return expenseList.reduce((total, exp) => total + exp.amount, 0);
}

/**
 * Get expenses by category
 */
function getExpensesByCategory() {
    const expenses = getAllExpenses();
    const categoryTotals = {};

    expenses.forEach(exp => {
        if (!categoryTotals[exp.category]) {
            categoryTotals[exp.category] = {
                total: 0,
                count: 0,
                categoryName: EXPENSE_CATEGORIES[exp.category] || exp.category
            };
        }
        categoryTotals[exp.category].total += exp.amount;
        categoryTotals[exp.category].count++;
    });

    return categoryTotals;
}

/**
 * Get expenses by department
 */
function getExpensesByDepartment() {
    const expenses = getAllExpenses();
    const departmentTotals = {};

    expenses.forEach(exp => {
        if (!departmentTotals[exp.department]) {
            departmentTotals[exp.department] = {
                total: 0,
                count: 0
            };
        }
        departmentTotals[exp.department].total += exp.amount;
        departmentTotals[exp.department].count++;
    });

    return departmentTotals;
}

/**
 * Get expenses by date range
 */
function getExpensesByDateRange(startDate, endDate) {
    const expenses = getAllExpenses();
    const start = new Date(startDate);
    const end = new Date(endDate);

    return expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= start && expDate <= end;
    });
}

/**
 * Get monthly expenses summary
 */
function getMonthlyExpensesSummary(year = new Date().getFullYear()) {
    const expenses = getAllExpenses();
    const monthlyData = Array(12).fill(0);

    expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        if (expDate.getFullYear() === year) {
            const month = expDate.getMonth();
            monthlyData[month] += exp.amount;
        }
    });

    return monthlyData;
}

/**
 * Update expense status
 */
function updateExpenseStatus(expenseId, newStatus) {
    const expenses = getAllExpenses();
    const expenseIndex = expenses.findIndex(exp => exp.id === expenseId);

    if (expenseIndex !== -1) {
        expenses[expenseIndex].status = newStatus;
        expenses[expenseIndex].statusUpdatedAt = new Date().toISOString();
        localStorage.setItem('expenses', JSON.stringify(expenses));
        return true;
    }

    return false;
}

/**
 * Delete expense
 */
function deleteExpense(expenseId) {
    let expenses = getAllExpenses();
    expenses = expenses.filter(exp => exp.id !== expenseId);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    return true;
}

/**
 * Export expenses to CSV
 */
function exportExpensesToCSV(expenses = null) {
    const expenseList = expenses || getAllExpenses();
    
    if (expenseList.length === 0) {
        alert('No expenses to export');
        return;
    }

    // CSV headers
    const headers = [
        'ID',
        'Date',
        'Category',
        'Subcategory',
        'Description',
        'Amount (KSh)',
        'Payment Method',
        'Department',
        'Vendor',
        'Invoice Number',
        'Status',
        'Authorized By',
        'Notes'
    ];

    // CSV rows
    const rows = expenseList.map(exp => [
        exp.id,
        exp.date,
        EXPENSE_CATEGORIES[exp.category] || exp.category,
        exp.subcategory || '',
        exp.description,
        exp.amount.toFixed(2),
        PAYMENT_METHODS[exp.paymentMethod] || exp.paymentMethod,
        exp.department,
        exp.vendorName || '',
        exp.invoiceNumber || '',
        exp.status,
        exp.authorizedBy || '',
        exp.notes || ''
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
    link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

/**
 * Get expense statistics
 */
function getExpenseStatistics() {
    const expenses = getAllExpenses();
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    // Total expenses
    const totalExpenses = expenses.length;
    const totalAmount = calculateTotalExpenses(expenses);

    // This month's expenses
    const monthlyExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === thisMonth && expDate.getFullYear() === thisYear;
    });
    const monthlyTotal = calculateTotalExpenses(monthlyExpenses);

    // Pending expenses
    const pendingExpenses = expenses.filter(exp => exp.status === 'pending');
    const pendingTotal = calculateTotalExpenses(pendingExpenses);

    // Category breakdown
    const categoryBreakdown = getExpensesByCategory();

    // Department breakdown
    const departmentBreakdown = getExpensesByDepartment();

    return {
        total: {
            count: totalExpenses,
            amount: totalAmount
        },
        monthly: {
            count: monthlyExpenses.length,
            amount: monthlyTotal
        },
        pending: {
            count: pendingExpenses.length,
            amount: pendingTotal
        },
        categories: categoryBreakdown,
        departments: departmentBreakdown
    };
}

/**
 * Validate expense data
 */
function validateExpenseData(data) {
    const errors = [];

    if (!data.category) {
        errors.push('Category is required');
    }

    if (!data.description || data.description.trim() === '') {
        errors.push('Description is required');
    }

    if (!data.amount || data.amount <= 0) {
        errors.push('Valid amount is required');
    }

    if (!data.date) {
        errors.push('Date is required');
    }

    if (!data.paymentMethod) {
        errors.push('Payment method is required');
    }

    if (!data.department) {
        errors.push('Department is required');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EXPENSE_CATEGORIES,
        PAYMENT_METHODS,
        EXPENSE_STATUS,
        getAllExpenses,
        getExpenseById,
        filterExpenses,
        calculateTotalExpenses,
        getExpensesByCategory,
        getExpensesByDepartment,
        getExpensesByDateRange,
        getMonthlyExpensesSummary,
        updateExpenseStatus,
        deleteExpense,
        exportExpensesToCSV,
        formatCurrency,
        formatDate,
        getExpenseStatistics,
        validateExpenseData
    };
}

console.log('Expense utility module loaded successfully');
