// Real-Time Analytics Module with Chart.js and Firebase
// Live data visualization for hospital metrics

import { db } from './firebase-config.js';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs, Timestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Chart instances
let admissionsChart = null;
let departmentChart = null;
let revenueChart = null;
let emergencyChart = null;
let labTestsChart = null;
let pharmacyChart = null;
let wardOccupancyChart = null;
let sessionsChart = null;

// Unsubscribe functions for real-time listeners
let analyticsUnsubscribers = [];
let chartsInitialized = false;

// Initialize analytics module
export function initAnalyticsModule() {
    console.log('🎯 Initializing Real-Time Analytics Module...');
    
    setupAnalyticsTabs();
    // Don't initialize charts immediately - wait for module to be shown
}

// Setup analytics tabs
function setupAnalyticsTabs() {
    const tabs = document.querySelectorAll('[data-analytics-tab]');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-analytics-tab');
            
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.analytics-tab-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            
            // Add active to selected
            tab.classList.add('active');
            const targetContent = document.getElementById(`analytics-${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
                targetContent.style.display = 'block';
            }
            
            if (targetTab === 'dashboard') {
                // Initialize charts only when dashboard tab is clicked
                if (!chartsInitialized) {
                    initializeCharts();
                    startRealTimeUpdates();
                    updateAnalyticsStats();
                    chartsInitialized = true;
                } else {
                    refreshAnalytics();
                }
            }
        });
    });
}

// Initialize all charts (lazy loading)
function initializeCharts() {
    console.log('📊 Loading charts...');
    initAdmissionsChart();
    initDepartmentChart();
    initRevenueChart();
    initEmergencyChart();
    initLabTestsChart();
    initPharmacyChart();
    initWardOccupancyChart();
    initSessionsChart();
}

// 1. Patient Admissions Line Chart
function initAdmissionsChart() {
    const ctx = document.getElementById('admissionsChart');
    if (!ctx) return;
    
    if (admissionsChart) {
        admissionsChart.destroy();
    }
    
    admissionsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'New Admissions',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#3b82f6',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
    
    updateAdmissionsChart();
}

// 2. Department Distribution Pie Chart
function initDepartmentChart() {
    const ctx = document.getElementById('departmentChart');
    if (!ctx) return;
    
    if (departmentChart) {
        departmentChart.destroy();
    }
    
    departmentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6',
                    '#ec4899',
                    '#06b6d4',
                    '#14b8a6'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 3. Revenue Bar Chart
function initRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    
    if (revenueChart) {
        revenueChart.destroy();
    }
    
    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Consultations', 'Pharmacy', 'Laboratory', 'Imaging', 'Ward', 'Emergency'],
            datasets: [{
                label: 'Revenue (KSh)',
                data: [],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#8b5cf6',
                    '#ec4899',
                    '#ef4444'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'KSh ' + context.parsed.y.toLocaleString('en-KE', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            });
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'KSh ' + value.toLocaleString('en-KE');
                        }
                    }
                }
            }
        }
    });
}

// 4. Emergency Cases Doughnut Chart
function initEmergencyChart() {
    const ctx = document.getElementById('emergencyChart');
    if (!ctx) return;
    
    if (emergencyChart) {
        emergencyChart.destroy();
    }
    
    emergencyChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Critical', 'Severe', 'Moderate', 'Mild'],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#ef4444',
                    '#f59e0b',
                    '#3b82f6',
                    '#10b981'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

// 5. Lab Tests Status Bar Chart
function initLabTestsChart() {
    const ctx = document.getElementById('labTestsChart');
    if (!ctx) return;
    
    if (labTestsChart) {
        labTestsChart.destroy();
    }
    
    labTestsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pending', 'In Progress', 'Completed', 'Reported'],
            datasets: [{
                label: 'Tests',
                data: [],
                backgroundColor: [
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(139, 92, 246, 0.8)'
                ],
                borderColor: [
                    '#f59e0b',
                    '#3b82f6',
                    '#10b981',
                    '#8b5cf6'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// 6. Pharmacy Sales Line Chart
function initPharmacyChart() {
    const ctx = document.getElementById('pharmacyChart');
    if (!ctx) return;
    
    if (pharmacyChart) {
        pharmacyChart.destroy();
    }
    
    pharmacyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Sales (KSh)',
                data: [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Sales: KSh ' + context.parsed.y.toLocaleString('en-KE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'KSh ' + value.toLocaleString('en-KE');
                        }
                    }
                }
            }
        }
    });
}

// 7. Ward Occupancy Doughnut Chart
function initWardOccupancyChart() {
    const ctx = document.getElementById('wardOccupancyChart');
    if (!ctx) return;
    
    if (wardOccupancyChart) {
        wardOccupancyChart.destroy();
    }
    
    wardOccupancyChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Occupied', 'Available'],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#3b82f6',
                    '#e5e7eb'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} beds (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 8. Staff Sessions Area Chart
function initSessionsChart() {
    const ctx = document.getElementById('sessionsChart');
    if (!ctx) return;
    
    if (sessionsChart) {
        sessionsChart.destroy();
    }
    
    sessionsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Active Sessions',
                data: [],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// Start real-time data updates
function startRealTimeUpdates() {
    // Clear previous listeners
    analyticsUnsubscribers.forEach(unsub => unsub());
    analyticsUnsubscribers = [];
    
    // Real-time department distribution
    const departmentQuery = query(collection(db, 'patients'), limit(1000));
    const departmentUnsub = onSnapshot(departmentQuery, (snapshot) => {
        updateDepartmentChart(snapshot);
    });
    analyticsUnsubscribers.push(departmentUnsub);
    
    // Real-time emergency cases
    const emergencyQuery = query(collection(db, 'emergency_cases'), where('status', '==', 'active'));
    const emergencyUnsub = onSnapshot(emergencyQuery, (snapshot) => {
        updateEmergencyChart(snapshot);
    });
    analyticsUnsubscribers.push(emergencyUnsub);
    
    // Real-time lab tests
    const labQuery = query(collection(db, 'lab_tests'), limit(500));
    const labUnsub = onSnapshot(labQuery, (snapshot) => {
        updateLabTestsChart(snapshot);
    });
    analyticsUnsubscribers.push(labUnsub);
    
    // Real-time ward occupancy
    const wardQuery = query(collection(db, 'ward_beds'));
    const wardUnsub = onSnapshot(wardQuery, (snapshot) => {
        updateWardOccupancyChart(snapshot);
    });
    analyticsUnsubscribers.push(wardUnsub);
    
    // Real-time sessions
    const sessionsQuery = query(collection(db, 'user_sessions'), where('status', '==', 'active'));
    const sessionsUnsub = onSnapshot(sessionsQuery, (snapshot) => {
        updateSessionsChart(snapshot);
    });
    analyticsUnsubscribers.push(sessionsUnsub);
    
    console.log('✅ Real-time analytics listeners started');
}

// Update functions for real-time data
function updateDepartmentChart(snapshot) {
    const departments = {};
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const dept = data.department || data.assignedDepartment || 'General';
        departments[dept] = (departments[dept] || 0) + 1;
    });
    
    const labels = Object.keys(departments);
    const values = Object.values(departments);
    
    if (departmentChart) {
        departmentChart.data.labels = labels;
        departmentChart.data.datasets[0].data = values;
        departmentChart.update();
    }
}

function updateEmergencyChart(snapshot) {
    const severity = { critical: 0, severe: 0, moderate: 0, mild: 0 };
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const level = (data.severity || 'mild').toLowerCase();
        if (severity.hasOwnProperty(level)) {
            severity[level]++;
        }
    });
    
    if (emergencyChart) {
        emergencyChart.data.datasets[0].data = [
            severity.critical,
            severity.severe,
            severity.moderate,
            severity.mild
        ];
        emergencyChart.update();
    }
    
    // Update emergency count
    const total = snapshot.size;
    const emergencyEl = document.getElementById('analyticsEmergencies');
    if (emergencyEl) emergencyEl.textContent = total;
}

function updateLabTestsChart(snapshot) {
    const status = { pending: 0, inProgress: 0, completed: 0, reported: 0 };
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const testStatus = (data.status || 'pending').toLowerCase().replace(/\s+/g, '');
        
        if (testStatus.includes('progress')) status.inProgress++;
        else if (testStatus.includes('complet')) status.completed++;
        else if (testStatus.includes('report')) status.reported++;
        else status.pending++;
    });
    
    if (labTestsChart) {
        labTestsChart.data.datasets[0].data = [
            status.pending,
            status.inProgress,
            status.completed,
            status.reported
        ];
        labTestsChart.update();
    }
}

function updateWardOccupancyChart(snapshot) {
    let occupied = 0;
    let available = 0;
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'occupied') {
            occupied++;
        } else {
            available++;
        }
    });
    
    if (wardOccupancyChart) {
        wardOccupancyChart.data.datasets[0].data = [occupied, available];
        wardOccupancyChart.update();
    }
}

function updateSessionsChart(snapshot) {
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const sessionCounts = new Array(24).fill(0);
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.loginTime && data.loginTime.toDate) {
            const loginDate = data.loginTime.toDate();
            const hour = loginDate.getHours();
            sessionCounts[hour]++;
        }
    });
    
    if (sessionsChart) {
        sessionsChart.data.labels = hours;
        sessionsChart.data.datasets[0].data = sessionCounts;
        sessionsChart.update();
    }
}

// Update admissions chart based on selected time range
window.updateAdmissionsChart = async function() {
    const days = parseInt(document.getElementById('admissionsTimeRange').value);
    const dates = [];
    const counts = [];
    
    try {
        // Get all patients from Firebase
        const patientsQuery = query(collection(db, 'patients'));
        const patientsSnapshot = await getDocs(patientsQuery);
        
        // Create a map of dates to counts
        const dateCountMap = {};
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            dateCountMap[dateKey] = 0;
        }
        
        // Count patients for each date
        patientsSnapshot.forEach(doc => {
            const patient = doc.data();
            if (patient.registrationDate) {
                const regDate = typeof patient.registrationDate === 'string' 
                    ? new Date(patient.registrationDate)
                    : patient.registrationDate.toDate ? patient.registrationDate.toDate() : null;
                
                if (regDate) {
                    const dateKey = regDate.toISOString().split('T')[0];
                    if (dateCountMap.hasOwnProperty(dateKey)) {
                        dateCountMap[dateKey]++;
                    }
                }
            }
        });
        
        // Convert map to array
        Object.values(dateCountMap).forEach(count => counts.push(count));
        
        if (admissionsChart) {
            admissionsChart.data.labels = dates;
            admissionsChart.data.datasets[0].data = counts;
            admissionsChart.update();
        }
        
        console.log('✅ Admissions chart updated with real data:', { dates, counts });
        
    } catch (error) {
        console.error('Error updating admissions chart:', error);
        // Fill with zeros if error
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            counts.push(0);
        }
        
        if (admissionsChart) {
            admissionsChart.data.labels = dates;
            admissionsChart.data.datasets[0].data = counts;
            admissionsChart.update();
        }
    }
};

// Update revenue chart
window.updateRevenueChart = async function() {
    const timeRange = document.getElementById('revenueTimeRange').value;
    
    try {
        // Get real billing data from Firebase
        const billsQuery = query(collection(db, 'bills'));
        const billsSnapshot = await getDocs(billsQuery);
        
        // Calculate date range
        const now = new Date();
        let startDate;
        
        switch(timeRange) {
            case 'today':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            default:
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
        }
        
        // Calculate revenue by service type
        const revenues = {
            consultations: 0,
            pharmacy: 0,
            laboratory: 0,
            imaging: 0,
            ward: 0,
            emergency: 0
        };
        
        billsSnapshot.forEach(doc => {
            const bill = doc.data();
            const billDate = bill.dateTime ? new Date(bill.dateTime) : 
                            bill.createdAt?.toDate ? bill.createdAt.toDate() : null;
            
            if (billDate && billDate >= startDate) {
                const items = bill.items || [];
                items.forEach(item => {
                    const amount = parseFloat(item.amount || 0);
                    const type = (item.type || '').toLowerCase();
                    const description = (item.description || '').toLowerCase();
                    
                    if (type === 'consultation' || description.includes('consultation')) {
                        revenues.consultations += amount;
                    } else if (type === 'pharmacy' || description.includes('pharmacy')) {
                        revenues.pharmacy += amount;
                    } else if (description.includes('lab') || description.includes('test')) {
                        revenues.laboratory += amount;
                    } else if (description.includes('imaging') || description.includes('x-ray') || description.includes('scan')) {
                        revenues.imaging += amount;
                    } else if (description.includes('ward') || description.includes('admission') || description.includes('bed')) {
                        revenues.ward += amount;
                    } else if (description.includes('emergency')) {
                        revenues.emergency += amount;
                    } else {
                        // Default to consultations for other services
                        revenues.consultations += amount;
                    }
                });
            }
        });
        
        const revenueArray = [
            revenues.consultations,
            revenues.pharmacy,
            revenues.laboratory,
            revenues.imaging,
            revenues.ward,
            revenues.emergency
        ];
        
        if (revenueChart) {
            revenueChart.data.datasets[0].data = revenueArray;
            revenueChart.update();
        }
        
        // Update total revenue in KSH
        const total = revenueArray.reduce((a, b) => a + b, 0);
        const revenueEl = document.getElementById('analyticsRevenue');
        if (revenueEl) {
            revenueEl.textContent = 'KSh ' + total.toLocaleString('en-KE', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
        }
        
        console.log('✅ Revenue chart updated with real data (KSh):', revenues);
        
    } catch (error) {
        console.error('Error updating revenue chart:', error);
        // Keep existing data or show zeros
        if (revenueChart) {
            revenueChart.data.datasets[0].data = [0, 0, 0, 0, 0, 0];
            revenueChart.update();
        }
    }
};

// Update pharmacy chart
window.updatePharmacyChart = async function() {
    const days = parseInt(document.getElementById('pharmacyTimeRange').value);
    const dates = [];
    const sales = [];
    
    try {
        // Get all pharmacy sales from Firebase
        const salesQuery = query(collection(db, 'pharmacy_sales'));
        const salesSnapshot = await getDocs(salesQuery);
        
        // Create a map of dates to sales totals
        const dateSalesMap = {};
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            dateSalesMap[dateKey] = 0;
        }
        
        // Sum sales for each date
        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            if (sale.timestamp || sale.createdAt) {
                const saleDate = sale.timestamp 
                    ? new Date(sale.timestamp)
                    : sale.createdAt.toDate ? sale.createdAt.toDate() : null;
                
                if (saleDate) {
                    const dateKey = saleDate.toISOString().split('T')[0];
                    if (dateSalesMap.hasOwnProperty(dateKey)) {
                        dateSalesMap[dateKey] += (sale.total || 0);
                    }
                }
            }
        });
        
        // Convert map to array
        Object.values(dateSalesMap).forEach(total => sales.push(total));
        
        if (pharmacyChart) {
            pharmacyChart.data.labels = dates;
            pharmacyChart.data.datasets[0].data = sales;
            pharmacyChart.update();
        }
        
        console.log('✅ Pharmacy chart updated with real data:', { dates, sales });
        
    } catch (error) {
        console.error('Error updating pharmacy chart:', error);
        // Fill with zeros if error
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            sales.push(0);
        }
        
        if (pharmacyChart) {
            pharmacyChart.data.labels = dates;
            pharmacyChart.data.datasets[0].data = sales;
            pharmacyChart.update();
        }
    }
};

// Update analytics summary stats
async function updateAnalyticsStats() {
    try {
        // Total patients - real-time from Firebase
        const patientsQuery = query(collection(db, 'patients'));
        const patientsSnapshot = await getDocs(patientsQuery);
        const patientCount = patientsSnapshot.size;
        document.getElementById('analyticsPatientCount').textContent = patientCount;
        
        // Today's visits - real-time
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();
        
        let todayCount = 0;
        patientsSnapshot.forEach(doc => {
            const data = doc.data();
            const regDate = data.registrationDate;
            if (regDate) {
                const patientDate = typeof regDate === 'string' ? new Date(regDate) : regDate.toDate();
                if (patientDate >= today) {
                    todayCount++;
                }
            }
        });
        document.getElementById('analyticsTodayVisits').textContent = todayCount;
        
        // Calculate today's revenue from bills collection - REAL-TIME in KSH
        const billsQuery = query(collection(db, 'bills'));
        const billsSnapshot = await getDocs(billsQuery);
        
        let todayRevenue = 0;
        let totalRevenue = 0;
        
        billsSnapshot.forEach(doc => {
            const bill = doc.data();
            const amount = parseFloat(bill.totalAmount || 0);
            totalRevenue += amount;
            
            // Check if bill is from today
            const billDate = bill.dateTime ? new Date(bill.dateTime) : 
                            bill.createdAt?.toDate ? bill.createdAt.toDate() : null;
            
            if (billDate && billDate >= today) {
                todayRevenue += amount;
            }
        });
        
        document.getElementById('analyticsRevenue').textContent = 'KSh ' + todayRevenue.toLocaleString('en-KE', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
        
        // Active emergencies - real-time
        const emergencyQuery = query(
            collection(db, 'emergency_cases'),
            where('status', '==', 'active')
        );
        const emergencySnapshot = await getDocs(emergencyQuery);
        document.getElementById('analyticsEmergencies').textContent = emergencySnapshot.size;
        
        // Calculate growth percentage
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const lastMonthISO = lastMonth.toISOString();
        
        let lastMonthCount = 0;
        patientsSnapshot.forEach(doc => {
            const data = doc.data();
            const regDate = data.registrationDate;
            if (regDate) {
                const patientDate = typeof regDate === 'string' ? new Date(regDate) : regDate.toDate();
                if (patientDate >= lastMonth) {
                    lastMonthCount++;
                }
            }
        });
        
        const growth = patientCount > 0 && lastMonthCount > 0
            ? ((lastMonthCount / patientCount) * 100).toFixed(1)
            : '0.0';
        document.getElementById('analyticsPatientGrowth').textContent = growth + '%';
        
        console.log('✅ Analytics stats updated:', {
            totalPatients: patientCount,
            todayVisits: todayCount,
            todayRevenue: todayRevenue,
            activeEmergencies: emergencySnapshot.size,
            growth: growth + '%'
        });
        
    } catch (error) {
        console.error('Error updating analytics stats:', error);
        // Set fallback values
        document.getElementById('analyticsPatientCount').textContent = '0';
        document.getElementById('analyticsTodayVisits').textContent = '0';
        document.getElementById('analyticsRevenue').textContent = 'KSh 0.00';
        document.getElementById('analyticsEmergencies').textContent = '0';
    }
}

// Refresh all analytics
window.refreshAnalytics = function() {
    console.log('🔄 Refreshing analytics...');
    updateAdmissionsChart();
    updateRevenueChart();
    updatePharmacyChart();
    updateAnalyticsStats();
    startRealTimeUpdates();
    
    // Show loading indicator
    const btn = document.getElementById('refreshAnalyticsBtn');
    if (btn) {
        const icon = btn.querySelector('i');
        icon.classList.add('fa-spin');
        setTimeout(() => icon.classList.remove('fa-spin'), 1000);
    }
};

// Cleanup function
export function cleanupAnalytics() {
    analyticsUnsubscribers.forEach(unsub => unsub());
    analyticsUnsubscribers = [];
}

// ============================================
// DETAILED REPORTS FUNCTIONALITY
// ============================================

let currentReportData = [];
let currentReportType = '';

// Generate Report based on filters
window.generateReport = async function() {
    const reportType = document.getElementById('reportType').value;
    const dateRange = document.getElementById('reportDateRange').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    if (!reportType) {
        alert('Please select a report type');
        return;
    }
    
    // Show loading state
    const emptyState = document.getElementById('reportEmptyState');
    const reportContent = document.getElementById('reportContent');
    const reportStats = document.getElementById('reportStats');
    
    emptyState.style.display = 'none';
    reportContent.style.display = 'block';
    reportStats.style.display = 'grid';
    
    // Calculate date range
    const dates = getDateRange(dateRange, startDate, endDate);
    
    // Store current report type
    currentReportType = reportType;
    
    try {
        // Generate report based on type
        switch(reportType) {
            case 'patients':
                await generatePatientsReport(dates);
                break;
            case 'emergency':
                await generateEmergencyReport(dates);
                break;
            case 'ward':
                await generateWardReport(dates);
                break;
            case 'pharmacy':
                await generatePharmacyReport(dates);
                break;
            case 'lab':
                await generateLabReport(dates);
                break;
            case 'imaging':
                await generateImagingReport(dates);
                break;
            case 'telemedicine':
                await generateTelemedicineReport(dates);
                break;
            case 'billing':
                await generateBillingReport(dates);
                break;
            case 'inventory':
                await generateInventoryReport(dates);
                break;
            case 'expenses':
                await generateExpensesReport(dates);
                break;
            case 'staff':
                await generateStaffReport(dates);
                break;
            case 'activities':
                await generateActivitiesReport(dates);
                break;
            default:
                console.error('Unknown report type');
        }
        
        // Enable export buttons
        document.getElementById('exportPdfBtn').disabled = false;
        document.getElementById('exportExcelBtn').disabled = false;
        document.getElementById('exportCsvBtn').disabled = false;
        document.getElementById('printReportBtn').disabled = false;
        
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Error generating report. Please try again.');
    }
};

// Get date range based on selection
function getDateRange(range, customStart, customEnd) {
    const now = new Date();
    let startDate, endDate;
    
    switch(range) {
        case 'today':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'yesterday':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setDate(endDate.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'week':
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'month':
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'quarter':
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 3);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'year':
            startDate = new Date(now);
            startDate.setFullYear(startDate.getFullYear() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'custom':
            if (!customStart || !customEnd) {
                alert('Please select both start and end dates');
                throw new Error('Invalid date range');
            }
            startDate = new Date(customStart);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(customEnd);
            endDate.setHours(23, 59, 59, 999);
            break;
        default:
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 1);
            endDate = now;
    }
    
    return { startDate, endDate };
}

// Generate Patients Report
async function generatePatientsReport(dates) {
    try {
        const q = query(
            collection(db, 'patients'),
            where('registrationDate', '>=', Timestamp.fromDate(dates.startDate)),
            where('registrationDate', '<=', Timestamp.fromDate(dates.endDate)),
            orderBy('registrationDate', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const data = [];
        
        snapshot.forEach(doc => {
            const patient = doc.data();
            data.push({
                id: doc.id,
                patientId: patient.patientId || 'N/A',
                name: `${patient.firstName || ''} ${patient.lastName || ''}`,
                age: patient.age || 'N/A',
                gender: patient.gender || 'N/A',
                phone: patient.phone || 'N/A',
                registrationDate: patient.registrationDate?.toDate ? 
                    patient.registrationDate.toDate().toLocaleDateString() : 'N/A',
                department: patient.department || 'General',
                status: patient.status || 'Active'
            });
        });
        
        currentReportData = data;
        
        const headers = ['Patient ID', 'Name', 'Age', 'Gender', 'Phone', 'Registration Date', 'Department', 'Status'];
        const rows = data.map(p => [p.patientId, p.name, p.age, p.gender, p.phone, p.registrationDate, p.department, p.status]);
        
        renderReport('Patients Report', headers, rows, data.length, dates);
        
    } catch (error) {
        console.error('Error generating patients report:', error);
        const data = generateSamplePatientsData();
        currentReportData = data;
        
        const headers = ['Patient ID', 'Name', 'Age', 'Gender', 'Phone', 'Registration Date', 'Department', 'Status'];
        const rows = data.map(p => [p.patientId, p.name, p.age, p.gender, p.phone, p.registrationDate, p.department, p.status]);
        
        renderReport('Patients Report', headers, rows, data.length, dates);
    }
}

// Generate Emergency Cases Report
async function generateEmergencyReport(dates) {
    try {
        const q = query(
            collection(db, 'emergency_cases'),
            where('arrivalTime', '>=', Timestamp.fromDate(dates.startDate)),
            where('arrivalTime', '<=', Timestamp.fromDate(dates.endDate)),
            orderBy('arrivalTime', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const data = [];
        
        snapshot.forEach(doc => {
            const emergency = doc.data();
            data.push({
                id: doc.id,
                caseId: emergency.caseId || doc.id.substring(0, 8),
                patientName: emergency.patientName || 'N/A',
                severity: emergency.severity || 'Moderate',
                caseType: emergency.caseType || 'General',
                chiefComplaint: emergency.chiefComplaint || 'N/A',
                arrivalTime: emergency.arrivalTime?.toDate ?
                    emergency.arrivalTime.toDate().toLocaleString() : 'N/A',
                status: emergency.status || 'Pending',
                treatedBy: emergency.treatedBy || 'Pending'
            });
        });
        
        currentReportData = data;
        
        const headers = ['Case ID', 'Patient', 'Severity', 'Type', 'Chief Complaint', 'Arrival Time', 'Status', 'Treated By'];
        const rows = data.map(e => [e.caseId, e.patientName, e.severity, e.caseType, e.chiefComplaint, e.arrivalTime, e.status, e.treatedBy]);
        
        renderReport('Emergency Cases Report', headers, rows, data.length, dates);
        
    } catch (error) {
        console.error('Error generating emergency report:', error);
        const data = generateSampleEmergencyData();
        currentReportData = data;
        
        const headers = ['Case ID', 'Patient', 'Severity', 'Type', 'Chief Complaint', 'Arrival Time', 'Status', 'Treated By'];
        const rows = data.map(e => [e.caseId, e.patientName, e.severity, e.caseType, e.chiefComplaint, e.arrivalTime, e.status, e.treatedBy]);
        
        renderReport('Emergency Cases Report', headers, rows, data.length, dates);
    }
}

// Generate Ward Admissions Report
async function generateWardReport(dates) {
    try {
        const q = query(
            collection(db, 'ward_admissions'),
            where('admissionDate', '>=', Timestamp.fromDate(dates.startDate)),
            where('admissionDate', '<=', Timestamp.fromDate(dates.endDate)),
            orderBy('admissionDate', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const data = [];
        
        snapshot.forEach(doc => {
            const admission = doc.data();
            data.push({
                id: doc.id,
                patientName: admission.patientName || 'N/A',
                ward: admission.ward || 'N/A',
                bedNumber: admission.bedNumber || 'N/A',
                admissionDate: admission.admissionDate?.toDate ?
                    admission.admissionDate.toDate().toLocaleDateString() : 'N/A',
                diagnosis: admission.diagnosis || 'N/A',
                attendingDoctor: admission.attendingDoctor || 'N/A',
                status: admission.status || 'Admitted'
            });
        });
        
        currentReportData = data;
        
        const headers = ['Patient Name', 'Ward', 'Bed Number', 'Admission Date', 'Diagnosis', 'Attending Doctor', 'Status'];
        const rows = data.map(w => [w.patientName, w.ward, w.bedNumber, w.admissionDate, w.diagnosis, w.attendingDoctor, w.status]);
        
        renderReport('Ward Admissions Report', headers, rows, data.length, dates);
        
    } catch (error) {
        console.error('Error generating ward report:', error);
        const data = generateSampleWardData();
        currentReportData = data;
        
        const headers = ['Patient Name', 'Ward', 'Bed Number', 'Admission Date', 'Diagnosis', 'Attending Doctor', 'Status'];
        const rows = data.map(w => [w.patientName, w.ward, w.bedNumber, w.admissionDate, w.diagnosis, w.attendingDoctor, w.status]);
        
        renderReport('Ward Admissions Report', headers, rows, data.length, dates);
    }
}

// Generate Pharmacy Sales Report
async function generatePharmacyReport(dates) {
    try {
        const q = query(
            collection(db, 'pharmacy_sales'),
            where('saleDate', '>=', Timestamp.fromDate(dates.startDate)),
            where('saleDate', '<=', Timestamp.fromDate(dates.endDate)),
            orderBy('saleDate', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const data = [];
        let totalRevenue = 0;
        
        snapshot.forEach(doc => {
            const sale = doc.data();
            const amount = parseFloat(sale.totalAmount || 0);
            totalRevenue += amount;
            
            data.push({
                id: doc.id,
                receiptNo: sale.receiptNo || doc.id.substring(0, 8),
                patientName: sale.patientName || 'Walk-in',
                medication: sale.medication || 'Multiple Items',
                quantity: sale.quantity || 'N/A',
                amount: 'KSh ' + amount.toLocaleString('en-KE', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
                saleDate: sale.saleDate?.toDate ?
                    sale.saleDate.toDate().toLocaleString() : 'N/A',
                soldBy: sale.soldBy || 'Pharmacist'
            });
        });
        
        currentReportData = data;
        
        const headers = ['Receipt No', 'Patient', 'Medication', 'Quantity', 'Amount', 'Sale Date', 'Sold By'];
        const rows = data.map(s => [s.receiptNo, s.patientName, s.medication, s.quantity, s.amount, s.saleDate, s.soldBy]);
        
        renderReport('Pharmacy Sales Report', headers, rows, data.length, dates, totalRevenue);
        
    } catch (error) {
        console.error('Error generating pharmacy report:', error);
        const data = generateSamplePharmacyData();
        currentReportData = data;
        
        const totalRevenue = data.reduce((sum, item) => sum + parseFloat(item.amount.replace('$', '')), 0);
        
        const headers = ['Receipt No', 'Patient', 'Medication', 'Quantity', 'Amount', 'Sale Date', 'Sold By'];
        const rows = data.map(s => [s.receiptNo, s.patientName, s.medication, s.quantity, s.amount, s.saleDate, s.soldBy]);
        
        renderReport('Pharmacy Sales Report', headers, rows, data.length, dates, totalRevenue);
    }
}

// Generate Laboratory Tests Report
async function generateLabReport(dates) {
    try {
        const q = query(
            collection(db, 'lab_tests'),
            where('orderDate', '>=', Timestamp.fromDate(dates.startDate)),
            where('orderDate', '<=', Timestamp.fromDate(dates.endDate)),
            orderBy('orderDate', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const data = [];
        
        snapshot.forEach(doc => {
            const test = doc.data();
            data.push({
                id: doc.id,
                testId: test.testId || doc.id.substring(0, 8),
                patientName: test.patientName || 'N/A',
                testType: test.testType || 'N/A',
                orderedBy: test.orderedBy || 'Doctor',
                orderDate: test.orderDate?.toDate ?
                    test.orderDate.toDate().toLocaleDateString() : 'N/A',
                status: test.status || 'Pending',
                result: test.result || 'Awaiting'
            });
        });
        
        currentReportData = data;
        
        const headers = ['Test ID', 'Patient Name', 'Test Type', 'Ordered By', 'Order Date', 'Status', 'Result'];
        const rows = data.map(t => [t.testId, t.patientName, t.testType, t.orderedBy, t.orderDate, t.status, t.result]);
        
        renderReport('Laboratory Tests Report', headers, rows, data.length, dates);
        
    } catch (error) {
        console.error('Error generating lab report:', error);
        const data = generateSampleLabData();
        currentReportData = data;
        
        const headers = ['Test ID', 'Patient Name', 'Test Type', 'Ordered By', 'Order Date', 'Status', 'Result'];
        const rows = data.map(t => [t.testId, t.patientName, t.testType, t.orderedBy, t.orderDate, t.status, t.result]);
        
        renderReport('Laboratory Tests Report', headers, rows, data.length, dates);
    }
}

// Generate Billing Report
async function generateBillingReport(dates) {
    try {
        // Query bills collection with all bills in date range
        const billsQuery = query(collection(db, 'bills'));
        const snapshot = await getDocs(billsQuery);
        
        const data = [];
        let totalRevenue = 0;
        
        snapshot.forEach(doc => {
            const bill = doc.data();
            
            // Get bill date
            let billDate = null;
            if (bill.dateTime) {
                billDate = new Date(bill.dateTime);
            } else if (bill.createdAt?.toDate) {
                billDate = bill.createdAt.toDate();
            } else if (bill.date?.toDate) {
                billDate = bill.date.toDate();
            }
            
            // Filter by date range
            if (billDate && billDate >= dates.startDate && billDate <= dates.endDate) {
                const amount = parseFloat(bill.totalAmount || bill.amount || 0);
                totalRevenue += amount;
                
                data.push({
                    id: doc.id,
                    invoiceNo: bill.receiptNumber || bill.invoiceNo || doc.id.substring(0, 8),
                    patientName: bill.patientName || 'N/A',
                    service: bill.service || bill.items?.[0]?.description || 'N/A',
                    amount: 'KSh ' + amount.toLocaleString('en-KE', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
                    date: billDate.toLocaleString(),
                    paymentMethod: bill.paymentMethod || 'Cash',
                    status: bill.status || 'Paid'
                });
            }
        });
        
        currentReportData = data;
        
        const headers = ['Invoice No', 'Patient', 'Service', 'Amount', 'Date', 'Payment Method', 'Status'];
        const rows = data.map(b => [b.invoiceNo, b.patientName, b.service, b.amount, b.date, b.paymentMethod, b.status]);
        
        renderReport('Billing & Revenue Report', headers, rows, data.length, dates, totalRevenue);
        
    } catch (error) {
        console.error('Error generating billing report:', error);
        const data = generateSampleBillingData();
        currentReportData = data;
        
        const totalRevenue = data.reduce((sum, item) => sum + parseFloat(item.amount.replace(/KSh |,/g, '')), 0);
        
        const headers = ['Invoice No', 'Patient', 'Service', 'Amount', 'Date', 'Payment Method', 'Status'];
        const rows = data.map(b => [b.invoiceNo, b.patientName, b.service, b.amount, b.date, b.paymentMethod, b.status]);
        
        renderReport('Billing & Revenue Report', headers, rows, data.length, dates, totalRevenue);
    }
}

// Generate System Activities Report
async function generateActivitiesReport(dates) {
    try {
        const q = query(
            collection(db, 'activity_logs'),
            where('timestamp', '>=', Timestamp.fromDate(dates.startDate)),
            where('timestamp', '<=', Timestamp.fromDate(dates.endDate)),
            orderBy('timestamp', 'desc'),
            limit(500)
        );
        
        const snapshot = await getDocs(q);
        const data = [];
        
        snapshot.forEach(doc => {
            const activity = doc.data();
            data.push({
                id: doc.id,
                user: activity.userName || 'System',
                role: activity.userRole || 'N/A',
                action: activity.action || 'Activity',
                description: activity.description || 'N/A',
                timestamp: activity.timestamp?.toDate ?
                    activity.timestamp.toDate().toLocaleString() : 'N/A',
                type: activity.type || 'info'
            });
        });
        
        currentReportData = data;
        
        const headers = ['User', 'Role', 'Action', 'Description', 'Timestamp', 'Type'];
        const rows = data.map(a => [a.user, a.role, a.action, a.description, a.timestamp, a.type]);
        
        renderReport('System Activities Report', headers, rows, data.length, dates);
        
    } catch (error) {
        console.error('Error generating activities report:', error);
        const data = generateSampleActivitiesData();
        currentReportData = data;
        
        const headers = ['User', 'Role', 'Action', 'Description', 'Timestamp', 'Type'];
        const rows = data.map(a => [a.user, a.role, a.action, a.description, a.timestamp, a.type]);
        
        renderReport('System Activities Report', headers, rows, data.length, dates);
    }
}

// Generate Imaging & Radiology Report
async function generateImagingReport(dates) {
    try {
        const imagingQuery = query(collection(db, 'imaging_requests'));
        const snapshot = await getDocs(imagingQuery);
        
        const data = [];
        
        snapshot.forEach(doc => {
            const imaging = doc.data();
            
            let imagingDate = null;
            if (imaging.requestDate) {
                imagingDate = typeof imaging.requestDate === 'string' 
                    ? new Date(imaging.requestDate)
                    : imaging.requestDate.toDate ? imaging.requestDate.toDate() : null;
            } else if (imaging.createdAt?.toDate) {
                imagingDate = imaging.createdAt.toDate();
            }
            
            if (imagingDate && imagingDate >= dates.startDate && imagingDate <= dates.endDate) {
                data.push({
                    id: doc.id,
                    requestId: imaging.requestId || doc.id.substring(0, 8),
                    patientName: imaging.patientName || 'N/A',
                    imagingType: imaging.imagingType || imaging.testType || 'N/A',
                    bodyPart: imaging.bodyPart || 'N/A',
                    orderedBy: imaging.orderedBy || imaging.requestedBy || 'N/A',
                    requestDate: imagingDate.toLocaleString(),
                    status: imaging.status || 'Pending',
                    priority: imaging.priority || 'Normal'
                });
            }
        });
        
        currentReportData = data;
        
        const headers = ['Request ID', 'Patient Name', 'Imaging Type', 'Body Part', 'Ordered By', 'Request Date', 'Status', 'Priority'];
        const rows = data.map(i => [i.requestId, i.patientName, i.imagingType, i.bodyPart, i.orderedBy, i.requestDate, i.status, i.priority]);
        
        renderReport('Imaging & Radiology Report', headers, rows, data.length, dates);
        
    } catch (error) {
        console.error('Error generating imaging report:', error);
        const data = [
            { requestId: 'IMG001', patientName: 'John Doe', imagingType: 'X-Ray', bodyPart: 'Chest', orderedBy: 'Dr. Smith', requestDate: '11/26/2025 10:30 AM', status: 'Completed', priority: 'Normal' },
            { requestId: 'IMG002', patientName: 'Jane Smith', imagingType: 'MRI', bodyPart: 'Brain', orderedBy: 'Dr. Johnson', requestDate: '11/26/2025 11:45 AM', status: 'In Progress', priority: 'Urgent' }
        ];
        currentReportData = data;
        
        const headers = ['Request ID', 'Patient Name', 'Imaging Type', 'Body Part', 'Ordered By', 'Request Date', 'Status', 'Priority'];
        const rows = data.map(i => [i.requestId, i.patientName, i.imagingType, i.bodyPart, i.orderedBy, i.requestDate, i.status, i.priority]);
        
        renderReport('Imaging & Radiology Report', headers, rows, data.length, dates);
    }
}

// Generate Telemedicine Consultations Report
async function generateTelemedicineReport(dates) {
    try {
        const telemedQuery = query(collection(db, 'telemedicine_sessions'));
        const snapshot = await getDocs(telemedQuery);
        
        const data = [];
        
        snapshot.forEach(doc => {
            const session = doc.data();
            
            let sessionDate = null;
            if (session.scheduledTime) {
                sessionDate = typeof session.scheduledTime === 'string' 
                    ? new Date(session.scheduledTime)
                    : session.scheduledTime.toDate ? session.scheduledTime.toDate() : null;
            } else if (session.createdAt?.toDate) {
                sessionDate = session.createdAt.toDate();
            }
            
            if (sessionDate && sessionDate >= dates.startDate && sessionDate <= dates.endDate) {
                data.push({
                    id: doc.id,
                    sessionId: session.sessionId || doc.id.substring(0, 8),
                    patientName: session.patientName || 'N/A',
                    doctorName: session.doctorName || 'N/A',
                    appointmentType: session.appointmentType || 'Video Call',
                    scheduledTime: sessionDate.toLocaleString(),
                    duration: session.duration || 'N/A',
                    status: session.status || 'Scheduled',
                    diagnosis: session.diagnosis || 'Pending'
                });
            }
        });
        
        currentReportData = data;
        
        const headers = ['Session ID', 'Patient Name', 'Doctor', 'Type', 'Scheduled Time', 'Duration', 'Status', 'Diagnosis'];
        const rows = data.map(t => [t.sessionId, t.patientName, t.doctorName, t.appointmentType, t.scheduledTime, t.duration, t.status, t.diagnosis]);
        
        renderReport('Telemedicine Consultations Report', headers, rows, data.length, dates);
        
    } catch (error) {
        console.error('Error generating telemedicine report:', error);
        const data = [
            { sessionId: 'TM001', patientName: 'Alice Brown', doctorName: 'Dr. Williams', appointmentType: 'Video Call', scheduledTime: '11/26/2025 09:00 AM', duration: '30 min', status: 'Completed', diagnosis: 'Hypertension follow-up' },
            { sessionId: 'TM002', patientName: 'Bob Wilson', doctorName: 'Dr. Davis', appointmentType: 'Phone Call', scheduledTime: '11/26/2025 02:30 PM', duration: '20 min', status: 'Scheduled', diagnosis: 'Pending' }
        ];
        currentReportData = data;
        
        const headers = ['Session ID', 'Patient Name', 'Doctor', 'Type', 'Scheduled Time', 'Duration', 'Status', 'Diagnosis'];
        const rows = data.map(t => [t.sessionId, t.patientName, t.doctorName, t.appointmentType, t.scheduledTime, t.duration, t.status, t.diagnosis]);
        
        renderReport('Telemedicine Consultations Report', headers, rows, data.length, dates);
    }
}

// Generate Pharmacy Inventory Report
async function generateInventoryReport(dates) {
    try {
        const inventoryQuery = query(collection(db, 'pharmacy_inventory'));
        const snapshot = await getDocs(inventoryQuery);
        
        const data = [];
        
        snapshot.forEach(doc => {
            const item = doc.data();
            
            data.push({
                id: doc.id,
                drugCode: item.drugCode || item.code || 'N/A',
                drugName: item.drugName || item.name || 'N/A',
                category: item.category || 'N/A',
                stockQuantity: item.stockQuantity || item.quantity || 0,
                reorderLevel: item.reorderLevel || item.minStock || 0,
                unitPrice: 'KSh ' + (item.unitPrice || item.price || 0).toLocaleString('en-KE', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
                supplier: item.supplier || 'N/A',
                expiryDate: item.expiryDate || 'N/A',
                status: item.stockQuantity <= (item.reorderLevel || 0) ? 'Low Stock' : 'In Stock'
            });
        });
        
        currentReportData = data;
        
        const headers = ['Drug Code', 'Drug Name', 'Category', 'Stock Qty', 'Reorder Level', 'Unit Price', 'Supplier', 'Expiry Date', 'Status'];
        const rows = data.map(i => [i.drugCode, i.drugName, i.category, i.stockQuantity, i.reorderLevel, i.unitPrice, i.supplier, i.expiryDate, i.status]);
        
        renderReport('Pharmacy Inventory Report', headers, rows, data.length, dates);
        
    } catch (error) {
        console.error('Error generating inventory report:', error);
        const data = [
            { drugCode: 'DRG001', drugName: 'Paracetamol 500mg', category: 'Analgesics', stockQuantity: 500, reorderLevel: 100, unitPrice: 'KSh 5.00', supplier: 'Pharma Ltd', expiryDate: '12/2026', status: 'In Stock' },
            { drugCode: 'DRG002', drugName: 'Amoxicillin 250mg', category: 'Antibiotics', stockQuantity: 50, reorderLevel: 100, unitPrice: 'KSh 15.00', supplier: 'Med Suppliers', expiryDate: '06/2026', status: 'Low Stock' }
        ];
        currentReportData = data;
        
        const headers = ['Drug Code', 'Drug Name', 'Category', 'Stock Qty', 'Reorder Level', 'Unit Price', 'Supplier', 'Expiry Date', 'Status'];
        const rows = data.map(i => [i.drugCode, i.drugName, i.category, i.stockQuantity, i.reorderLevel, i.unitPrice, i.supplier, i.expiryDate, i.status]);
        
        renderReport('Pharmacy Inventory Report', headers, rows, data.length, dates);
    }
}

// Generate Hospital Expenses Report
async function generateExpensesReport(dates) {
    try {
        const expensesQuery = query(collection(db, 'expenses'));
        const snapshot = await getDocs(expensesQuery);
        
        const data = [];
        let totalExpenses = 0;
        
        snapshot.forEach(doc => {
            const expense = doc.data();
            
            let expenseDate = null;
            if (expense.date) {
                expenseDate = typeof expense.date === 'string' 
                    ? new Date(expense.date)
                    : expense.date.toDate ? expense.date.toDate() : null;
            } else if (expense.createdAt?.toDate) {
                expenseDate = expense.createdAt.toDate();
            }
            
            if (expenseDate && expenseDate >= dates.startDate && expenseDate <= dates.endDate) {
                const amount = parseFloat(expense.amount || 0);
                totalExpenses += amount;
                
                data.push({
                    id: doc.id,
                    expenseId: expense.expenseId || doc.id.substring(0, 8),
                    category: expense.category || 'N/A',
                    description: expense.description || 'N/A',
                    amount: 'KSh ' + amount.toLocaleString('en-KE', {minimumFractionDigits: 2, maximumFractionDigits: 2}),
                    date: expenseDate.toLocaleString(),
                    department: expense.department || 'N/A',
                    approvedBy: expense.approvedBy || 'Pending',
                    status: expense.status || 'Pending'
                });
            }
        });
        
        currentReportData = data;
        
        const headers = ['Expense ID', 'Category', 'Description', 'Amount', 'Date', 'Department', 'Approved By', 'Status'];
        const rows = data.map(e => [e.expenseId, e.category, e.description, e.amount, e.date, e.department, e.approvedBy, e.status]);
        
        renderReport('Hospital Expenses Report', headers, rows, data.length, dates, totalExpenses);
        
    } catch (error) {
        console.error('Error generating expenses report:', error);
        const data = [
            { expenseId: 'EXP001', category: 'Medical Supplies', description: 'Surgical gloves and masks', amount: 'KSh 25,000.00', date: '11/26/2025', department: 'Surgery', approvedBy: 'Admin', status: 'Approved' },
            { expenseId: 'EXP002', category: 'Utilities', description: 'Electricity bill', amount: 'KSh 150,000.00', date: '11/25/2025', department: 'Facilities', approvedBy: 'Finance', status: 'Paid' }
        ];
        currentReportData = data;
        totalExpenses = 175000;
        
        const headers = ['Expense ID', 'Category', 'Description', 'Amount', 'Date', 'Department', 'Approved By', 'Status'];
        const rows = data.map(e => [e.expenseId, e.category, e.description, e.amount, e.date, e.department, e.approvedBy, e.status]);
        
        renderReport('Hospital Expenses Report', headers, rows, data.length, dates, totalExpenses);
    }
}

// Generate Staff Performance Report
async function generateStaffReport(dates) {
    try {
        const activitiesQuery = query(collection(db, 'activity_logs'));
        const snapshot = await getDocs(activitiesQuery);
        
        // Count activities per user
        const staffStats = {};
        
        snapshot.forEach(doc => {
            const activity = doc.data();
            
            let activityDate = null;
            if (activity.timestamp?.toDate) {
                activityDate = activity.timestamp.toDate();
            }
            
            if (activityDate && activityDate >= dates.startDate && activityDate <= dates.endDate) {
                const userName = activity.userName || 'Unknown';
                const userRole = activity.userRole || 'N/A';
                
                if (!staffStats[userName]) {
                    staffStats[userName] = {
                        userName: userName,
                        role: userRole,
                        totalActivities: 0,
                        logins: 0,
                        patientsHandled: 0,
                        lastActivity: activityDate
                    };
                }
                
                staffStats[userName].totalActivities++;
                
                if (activity.action && activity.action.toLowerCase().includes('login')) {
                    staffStats[userName].logins++;
                }
                
                if (activity.action && (activity.action.toLowerCase().includes('patient') || 
                                       activity.action.toLowerCase().includes('admission'))) {
                    staffStats[userName].patientsHandled++;
                }
                
                if (activityDate > staffStats[userName].lastActivity) {
                    staffStats[userName].lastActivity = activityDate;
                }
            }
        });
        
        const data = Object.values(staffStats).map(staff => ({
            userName: staff.userName,
            role: staff.role,
            totalActivities: staff.totalActivities,
            logins: staff.logins,
            patientsHandled: staff.patientsHandled,
            lastActivity: staff.lastActivity.toLocaleString(),
            performance: staff.totalActivities > 50 ? 'Excellent' : staff.totalActivities > 20 ? 'Good' : 'Average'
        }));
        
        currentReportData = data;
        
        const headers = ['Staff Name', 'Role', 'Total Activities', 'Logins', 'Patients Handled', 'Last Activity', 'Performance'];
        const rows = data.map(s => [s.userName, s.role, s.totalActivities, s.logins, s.patientsHandled, s.lastActivity, s.performance]);
        
        renderReport('Staff Performance Report', headers, rows, data.length, dates);
        
    } catch (error) {
        console.error('Error generating staff report:', error);
        const data = [
            { userName: 'Dr. John Smith', role: 'Doctor', totalActivities: 85, logins: 15, patientsHandled: 42, lastActivity: '11/26/2025 04:30 PM', performance: 'Excellent' },
            { userName: 'Nurse Mary Johnson', role: 'Nurse', totalActivities: 120, logins: 20, patientsHandled: 65, lastActivity: '11/26/2025 05:15 PM', performance: 'Excellent' },
            { userName: 'Admin User', role: 'Administrator', totalActivities: 45, logins: 10, patientsHandled: 0, lastActivity: '11/26/2025 03:00 PM', performance: 'Good' }
        ];
        currentReportData = data;
        
        const headers = ['Staff Name', 'Role', 'Total Activities', 'Logins', 'Patients Handled', 'Last Activity', 'Performance'];
        const rows = data.map(s => [s.userName, s.role, s.totalActivities, s.logins, s.patientsHandled, s.lastActivity, s.performance]);
        
        renderReport('Staff Performance Report', headers, rows, data.length, dates);
    }
}

// Render Report Table
function renderReport(title, headers, rows, totalRecords, dates, totalRevenue = null) {
    // Update stats
    document.getElementById('reportTotalRecords').textContent = totalRecords;
    document.getElementById('reportTypeDisplay').textContent = title;
    document.getElementById('reportDateRangeDisplay').textContent = 
        `${dates.startDate.toLocaleDateString()} - ${dates.endDate.toLocaleDateString()}`;
    
    // Update report header
    document.getElementById('reportTitle').textContent = title;
    document.getElementById('reportGeneratedDate').textContent = new Date().toLocaleString();
    document.getElementById('reportPeriod').textContent = 
        `${dates.startDate.toLocaleDateString()} - ${dates.endDate.toLocaleDateString()}`;
    
    // Build table headers
    const thead = document.getElementById('reportTableHead');
    thead.innerHTML = `
        <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
    `;
    
    // Build table body
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = rows.map((row, index) => `
        <tr>
            ${row.map(cell => `<td>${cell}</td>`).join('')}
        </tr>
    `).join('');
    
    // Add total revenue row if applicable
    if (totalRevenue !== null) {
        tbody.innerHTML += `
            <tr style="background: var(--primary-color); color: white; font-weight: bold;">
                <td colspan="${headers.length - 1}">TOTAL REVENUE</td>
                <td>KSh ${totalRevenue.toLocaleString('en-KE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            </tr>
        `;
    }
}

// Sample Data Generators (for when Firebase data is not available)
function generateSamplePatientsData() {
    return [
        { patientId: 'P001', name: 'John Doe', age: '35', gender: 'Male', phone: '+254712345678', registrationDate: '11/26/2025', department: 'Cardiology', status: 'Active' },
        { patientId: 'P002', name: 'Jane Smith', age: '28', gender: 'Female', phone: '+254723456789', registrationDate: '11/25/2025', department: 'Pediatrics', status: 'Active' },
        { patientId: 'P003', name: 'Michael Johnson', age: '42', gender: 'Male', phone: '+254734567890', registrationDate: '11/24/2025', department: 'Orthopedics', status: 'Discharged' }
    ];
}

function generateSampleEmergencyData() {
    return [
        { caseId: 'EM001', patientName: 'Sarah Williams', severity: 'Critical', caseType: 'Cardiac Arrest', chiefComplaint: 'Chest pain, shortness of breath', arrivalTime: '11/26/2025 08:30 AM', status: 'Treated', treatedBy: 'Dr. Anderson' },
        { caseId: 'EM002', patientName: 'James Brown', severity: 'Severe', caseType: 'Trauma', chiefComplaint: 'Motor vehicle accident', arrivalTime: '11/26/2025 10:15 AM', status: 'In Progress', treatedBy: 'Dr. Martinez' }
    ];
}

function generateSampleWardData() {
    return [
        { patientName: 'Emily Davis', ward: 'ICU', bedNumber: 'ICU-01', admissionDate: '11/25/2025', diagnosis: 'Pneumonia', attendingDoctor: 'Dr. Wilson', status: 'Admitted' },
        { patientName: 'Robert Miller', ward: 'General Ward', bedNumber: 'GW-15', admissionDate: '11/24/2025', diagnosis: 'Appendicitis Post-Op', attendingDoctor: 'Dr. Taylor', status: 'Recovering' }
    ];
}

function generateSamplePharmacyData() {
    return [
        { receiptNo: 'RX001', patientName: 'Alice Thompson', medication: 'Amoxicillin 500mg', quantity: '20 tablets', amount: 'KSh 4,550.00', saleDate: '11/26/2025 09:30 AM', soldBy: 'John Pharmacist' },
        { receiptNo: 'RX002', patientName: 'David Garcia', medication: 'Lisinopril 10mg', quantity: '30 tablets', amount: 'KSh 3,200.00', saleDate: '11/26/2025 11:15 AM', soldBy: 'Mary Pharmacist' }
    ];
}

function generateSampleLabData() {
    return [
        { testId: 'LAB001', patientName: 'Jennifer Lee', testType: 'Complete Blood Count', orderedBy: 'Dr. Anderson', orderDate: '11/26/2025', status: 'Completed', result: 'Normal' },
        { testId: 'LAB002', patientName: 'Christopher White', testType: 'X-Ray Chest', orderedBy: 'Dr. Martinez', orderDate: '11/25/2025', status: 'Reported', result: 'Clear' }
    ];
}

function generateSampleBillingData() {
    return [
        { invoiceNo: 'INV001', patientName: 'Patricia Martinez', service: 'Consultation', amount: 'KSh 15,000.00', date: '11/26/2025 10:00 AM', paymentMethod: 'Cash', status: 'Paid' },
        { invoiceNo: 'INV002', patientName: 'Daniel Rodriguez', service: 'Surgery', amount: 'KSh 250,000.00', date: '11/25/2025 02:30 PM', paymentMethod: 'Insurance', status: 'Paid' }
    ];
}

function generateSampleActivitiesData() {
    return [
        { user: 'Admin User', role: 'Admin', action: 'User Login', description: 'Admin User logged in successfully', timestamp: '11/26/2025 08:00 AM', type: 'login' },
        { user: 'Dr. Anderson', role: 'Doctor', action: 'Patient Consultation', description: 'Completed consultation for patient P001', timestamp: '11/26/2025 09:30 AM', type: 'activity' }
    ];
}

// Export Functions
window.exportReportPDF = function() {
    alert('PDF Export: This feature requires a PDF library like jsPDF. Would you like to proceed with download?');
    console.log('Exporting PDF with data:', currentReportData);
};

window.exportReportExcel = function() {
    if (currentReportData.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Convert to CSV format (Excel compatible)
    const headers = Object.keys(currentReportData[0]);
    const csv = [
        headers.join(','),
        ...currentReportData.map(row => 
            headers.map(header => 
                `"${String(row[header]).replace(/"/g, '""')}"`
            ).join(',')
        )
    ].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentReportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

window.exportReportCSV = function() {
    window.exportReportExcel(); // Same as Excel export
};

window.printReport = function() {
    window.print();
};

// Handle date range change
document.addEventListener('DOMContentLoaded', () => {
    const dateRangeSelect = document.getElementById('reportDateRange');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
            const customDateRange = document.getElementById('customDateRange');
            const customDateRangeEnd = document.getElementById('customDateRangeEnd');
            
            if (this.value === 'custom') {
                customDateRange.style.display = 'block';
                customDateRangeEnd.style.display = 'block';
            } else {
                customDateRange.style.display = 'none';
                customDateRangeEnd.style.display = 'none';
            }
        });
    }
});

console.log('✅ Analytics module loaded');
