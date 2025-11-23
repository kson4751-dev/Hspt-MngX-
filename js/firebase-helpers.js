// Firebase Helper Functions for RxFlow Hospital Management System
import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from './firebase-config.js';

// ==================== PATIENTS ====================

// Add new patient
export async function addPatient(patientData) {
    try {
        const patientsRef = collection(db, 'patients');
        const docRef = await addDoc(patientsRef, {
            ...patientData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        console.log('Patient added with ID:', docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding patient:', error);
        return { success: false, error: error.message };
    }
}

// Get all patients (realtime)
export function subscribeToPatients(callback) {
    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
        const patients = [];
        snapshot.forEach((doc) => {
            patients.push({ id: doc.id, ...doc.data() });
        });
        callback(patients);
    }, (error) => {
        console.error('Error fetching patients:', error);
    });
}

// Get single patient
export async function getPatient(patientId) {
    try {
        const patientRef = doc(db, 'patients', patientId);
        const patientSnap = await getDoc(patientRef);
        
        if (patientSnap.exists()) {
            return { success: true, data: { id: patientSnap.id, ...patientSnap.data() } };
        } else {
            return { success: false, error: 'Patient not found' };
        }
    } catch (error) {
        console.error('Error getting patient:', error);
        return { success: false, error: error.message };
    }
}

// Update patient
export async function updatePatient(patientId, updateData) {
    try {
        const patientRef = doc(db, 'patients', patientId);
        await updateDoc(patientRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating patient:', error);
        return { success: false, error: error.message };
    }
}

// Delete patient
export async function deletePatient(patientId) {
    try {
        const patientRef = doc(db, 'patients', patientId);
        await deleteDoc(patientRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting patient:', error);
        return { success: false, error: error.message };
    }
}

// ==================== TRIAGE ====================

// Add patient to triage queue
export async function addToTriageQueue(queueData) {
    try {
        const queueRef = collection(db, 'triage_queue');
        const docRef = await addDoc(queueRef, {
            ...queueData,
            queueTime: serverTimestamp(),
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding to triage queue:', error);
        return { success: false, error: error.message };
    }
}

// Subscribe to triage queue (realtime)
export function subscribeToTriageQueue(callback) {
    const queueRef = collection(db, 'triage_queue');
    const q = query(queueRef, orderBy('queueTime', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
        const queue = [];
        snapshot.forEach((doc) => {
            queue.push({ id: doc.id, ...doc.data() });
        });
        callback(queue);
    }, (error) => {
        console.error('Error fetching triage queue:', error);
    });
}

// Remove patient from triage queue
export async function removeFromTriageQueue(queueId) {
    try {
        const queueRef = doc(db, 'triage_queue', queueId);
        await deleteDoc(queueRef);
        return { success: true };
    } catch (error) {
        console.error('Error removing from triage queue:', error);
        return { success: false, error: error.message };
    }
}

// Add triage record
export async function addTriageRecord(recordData) {
    try {
        const recordsRef = collection(db, 'triage_records');
        const docRef = await addDoc(recordsRef, {
            ...recordData,
            triageDate: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding triage record:', error);
        return { success: false, error: error.message };
    }
}

// Subscribe to triage records (realtime)
export function subscribeToTriageRecords(callback) {
    const recordsRef = collection(db, 'triage_records');
    const q = query(recordsRef, orderBy('triageDate', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
        const records = [];
        snapshot.forEach((doc) => {
            records.push({ id: doc.id, ...doc.data() });
        });
        callback(records);
    }, (error) => {
        console.error('Error fetching triage records:', error);
    });
}

// Get single triage record
export async function getTriageRecord(recordId) {
    try {
        const recordRef = doc(db, 'triage_records', recordId);
        const recordSnap = await getDoc(recordRef);
        
        if (recordSnap.exists()) {
            return { success: true, data: { id: recordSnap.id, ...recordSnap.data() } };
        } else {
            return { success: false, error: 'Triage record not found' };
        }
    } catch (error) {
        console.error('Error getting triage record:', error);
        return { success: false, error: error.message };
    }
}

// Update triage record
export async function updateTriageRecord(recordId, updateData) {
    try {
        const recordRef = doc(db, 'triage_records', recordId);
        await updateDoc(recordRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating triage record:', error);
        return { success: false, error: error.message };
    }
}

// Delete triage record
export async function deleteTriageRecord(recordId) {
    try {
        const recordRef = doc(db, 'triage_records', recordId);
        await deleteDoc(recordRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting triage record:', error);
        return { success: false, error: error.message };
    }
}

// ==================== USER MANAGEMENT ====================

// Add pharmacy item
export async function addPharmacyItem(itemData) {
    try {
        const itemsRef = collection(db, 'pharmacy_inventory');
        const docRef = await addDoc(itemsRef, {
            ...itemData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding pharmacy item:', error);
        return { success: false, error: error.message };
    }
}

// Subscribe to pharmacy inventory (realtime)
export function subscribeToPharmacyInventory(callback) {
    const inventoryRef = collection(db, 'pharmacy_inventory');
    const q = query(inventoryRef, orderBy('name', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        callback(items);
    });
}

// Add pharmacy sale
export async function addPharmacySale(saleData) {
    try {
        const salesRef = collection(db, 'pharmacy_sales');
        const docRef = await addDoc(salesRef, {
            ...saleData,
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding sale:', error);
        return { success: false, error: error.message };
    }
}

// Subscribe to pharmacy sales (realtime)
export function subscribeToPharmacySales(callback) {
    const salesRef = collection(db, 'pharmacy_sales');
    const q = query(salesRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
        const sales = [];
        snapshot.forEach((doc) => {
            sales.push({ id: doc.id, ...doc.data() });
        });
        callback(sales);
    });
}

// ==================== EXPENSES ====================

// Add expense
export async function addExpense(expenseData) {
    try {
        const expensesRef = collection(db, 'expenses');
        const docRef = await addDoc(expensesRef, {
            ...expenseData,
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding expense:', error);
        return { success: false, error: error.message };
    }
}

// Subscribe to expenses (realtime)
export function subscribeToExpenses(callback) {
    const expensesRef = collection(db, 'expenses');
    const q = query(expensesRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
        const expenses = [];
        snapshot.forEach((doc) => {
            expenses.push({ id: doc.id, ...doc.data() });
        });
        callback(expenses);
    });
}

// ==================== INVENTORY ====================

// Add inventory item
export async function addInventoryItem(itemData) {
    try {
        const itemsRef = collection(db, 'inventory');
        const docRef = await addDoc(itemsRef, {
            ...itemData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding inventory item:', error);
        return { success: false, error: error.message };
    }
}

// Subscribe to inventory (realtime)
export function subscribeToInventory(callback) {
    const inventoryRef = collection(db, 'inventory');
    const q = query(inventoryRef, orderBy('name', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() });
        });
        callback(items);
    });
}

// Update inventory item
export async function updateInventoryItem(itemId, updateData) {
    try {
        const itemRef = doc(db, 'inventory', itemId);
        await updateDoc(itemRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating inventory item:', error);
        return { success: false, error: error.message };
    }
}

// ==================== DASHBOARD STATS ====================

// Get dashboard statistics (realtime)
export function subscribeToDashboardStats(callback) {
    const unsubscribers = [];
    const stats = {
        totalPatients: 0,
        activeDoctors: 0,
        occupiedBeds: 0,
        emergenciesToday: 0
    };
    
    // Subscribe to patients count
    const patientsRef = collection(db, 'patients');
    unsubscribers.push(onSnapshot(patientsRef, (snapshot) => {
        stats.totalPatients = snapshot.size;
        callback(stats);
    }));
    
    // Subscribe to active doctors
    const doctorsRef = collection(db, 'users');
    const doctorsQuery = query(doctorsRef, where('role', '==', 'doctor'), where('status', '==', 'active'));
    unsubscribers.push(onSnapshot(doctorsQuery, (snapshot) => {
        stats.activeDoctors = snapshot.size;
        callback(stats);
    }));
    
    // Subscribe to occupied beds
    const bedsRef = collection(db, 'beds');
    const bedsQuery = query(bedsRef, where('status', '==', 'occupied'));
    unsubscribers.push(onSnapshot(bedsQuery, (snapshot) => {
        stats.occupiedBeds = snapshot.size;
        callback(stats);
    }));
    
    // Subscribe to today's emergencies
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const emergenciesRef = collection(db, 'emergencies');
    const emergenciesQuery = query(emergenciesRef, where('date', '>=', today));
    unsubscribers.push(onSnapshot(emergenciesQuery, (snapshot) => {
        stats.emergenciesToday = snapshot.size;
        callback(stats);
    }));
    
    // Return unsubscribe function
    return () => {
        unsubscribers.forEach(unsubscribe => unsubscribe());
    };
}

// ==================== USERS ====================

// Create user profile
export async function createUserProfile(userId, userData) {
    try {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, {
            ...userData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error creating user profile:', error);
        return { success: false, error: error.message };
    }
}

// Get user profile
export async function getUserProfile(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            return { success: true, data: userSnap.data() };
        } else {
            return { success: false, error: 'User not found' };
        }
    } catch (error) {
        console.error('Error getting user profile:', error);
        return { success: false, error: error.message };
    }
}

// Update user profile
export async function updateUserProfile(userId, updateData) {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating user profile:', error);
        return { success: false, error: error.message };
    }
}

// ==================== DOCTOR MODULE ====================

// Add patient to doctor queue
export async function addToDoctorQueue(queueData) {
    try {
        const queueRef = collection(db, 'doctor_queue');
        const docRef = await addDoc(queueRef, {
            ...queueData,
            queueTime: serverTimestamp(),
            createdAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding to doctor queue:', error);
        return { success: false, error: error.message };
    }
}

// Subscribe to doctor queue (realtime)
export function subscribeToDoctorQueue(callback) {
    const queueRef = collection(db, 'doctor_queue');
    const q = query(queueRef, orderBy('queueTime', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
        const queue = [];
        snapshot.forEach((doc) => {
            queue.push({ id: doc.id, ...doc.data() });
        });
        callback(queue);
    }, (error) => {
        console.error('Error fetching doctor queue:', error);
    });
}

// Remove patient from doctor queue
export async function removeFromDoctorQueue(queueId) {
    try {
        const queueRef = doc(db, 'doctor_queue', queueId);
        await deleteDoc(queueRef);
        return { success: true };
    } catch (error) {
        console.error('Error removing from doctor queue:', error);
        return { success: false, error: error.message };
    }
}

// Add doctor consultation record
export async function addDoctorRecord(recordData) {
    try {
        const recordsRef = collection(db, 'doctor_records');
        const docRef = await addDoc(recordsRef, {
            ...recordData,
            consultationDate: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding doctor record:', error);
        return { success: false, error: error.message };
    }
}

// Subscribe to doctor records (realtime)
export function subscribeToDoctorRecords(callback) {
    const recordsRef = collection(db, 'doctor_records');
    const q = query(recordsRef, orderBy('consultationDate', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
        const records = [];
        snapshot.forEach((doc) => {
            records.push({ id: doc.id, ...doc.data() });
        });
        callback(records);
    }, (error) => {
        console.error('Error fetching doctor records:', error);
    });
}

// Get single doctor record
export async function getDoctorRecord(recordId) {
    try {
        const recordRef = doc(db, 'doctor_records', recordId);
        const recordSnap = await getDoc(recordRef);
        
        if (recordSnap.exists()) {
            return { success: true, data: { id: recordSnap.id, ...recordSnap.data() } };
        } else {
            return { success: false, error: 'Doctor record not found' };
        }
    } catch (error) {
        console.error('Error getting doctor record:', error);
        return { success: false, error: error.message };
    }
}

// Update doctor record
export async function updateDoctorRecord(recordId, updateData) {
    try {
        const recordRef = doc(db, 'doctor_records', recordId);
        await updateDoc(recordRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating doctor record:', error);
        return { success: false, error: error.message };
    }
}

// Delete doctor record
export async function deleteDoctorRecord(recordId) {
    try {
        const recordRef = doc(db, 'doctor_records', recordId);
        await deleteDoc(recordRef);
        return { success: true };
    } catch (error) {
        console.error('Error deleting doctor record:', error);
        return { success: false, error: error.message };
    }
}

// Get doctor stats
export async function getDoctorStats() {
    try {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get queue count
        const queueSnapshot = await getDocs(collection(db, 'doctor_queue'));
        const queueCount = queueSnapshot.size;
        
        // Get today's records
        const recordsRef = collection(db, 'doctor_records');
        const todayQuery = query(
            recordsRef,
            where('consultationDate', '>=', today)
        );
        const todaySnapshot = await getDocs(todayQuery);
        const patientsToday = todaySnapshot.size;
        
        // Get total records
        const totalSnapshot = await getDocs(recordsRef);
        const totalPatients = totalSnapshot.size;
        
        return {
            success: true,
            data: {
                queueCount,
                patientsToday,
                totalPatients
            }
        };
    } catch (error) {
        console.error('Error getting doctor stats:', error);
        return { success: false, error: error.message };
    }
}

// Subscribe to all doctor records (for All Consultations view)
export function subscribeToAllDoctorRecords(callback) {
    try {
        const recordsRef = collection(db, 'doctor_records');
        const q = query(recordsRef, orderBy('consultationDate', 'desc'));
        
        return onSnapshot(q, (snapshot) => {
            const records = [];
            snapshot.forEach((doc) => {
                records.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            callback(records);
        }, (error) => {
            console.error('Error in all doctor records subscription:', error);
            callback([]);
        });
    } catch (error) {
        console.error('Error subscribing to all doctor records:', error);
        callback([]);
        return null;
    }
}

// ========================================
// LABORATORY FUNCTIONS
// ========================================

// Add lab request
export async function addLabRequest(labData) {
    try {
        const labRef = collection(db, 'lab_requests');
        const docRef = await addDoc(labRef, {
            ...labData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        console.log('Lab request added with ID:', docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding lab request:', error);
        return { success: false, error: error.message };
    }
}

// Subscribe to lab requests
export function subscribeToLabRequests(callback) {
    try {
        const labRef = collection(db, 'lab_requests');
        const q = query(labRef, orderBy('createdAt', 'desc'));
        
        return onSnapshot(q, (snapshot) => {
            const requests = [];
            snapshot.forEach((doc) => {
                requests.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            callback(requests);
        }, (error) => {
            console.error('Error in lab requests subscription:', error);
            callback([]);
        });
    } catch (error) {
        console.error('Error subscribing to lab requests:', error);
        callback([]);
        return null;
    }
}

// Update lab request
export async function updateLabRequest(requestId, updates) {
    try {
        if (!requestId) {
            throw new Error('Request ID is required');
        }
        const requestRef = doc(db, 'lab_requests', requestId);
        await updateDoc(requestRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
        console.log('Lab request updated:', requestId);
        return { success: true };
    } catch (error) {
        console.error('Error updating lab request:', error);
        console.error('Request ID:', requestId);
        console.error('Updates:', updates);
        return { success: false, error: error.message };
    }
}

console.log('Firebase helper functions loaded');

