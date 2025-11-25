// Notifications Module - Firebase Real-time Integration
// RxFlow Hospital Management System

import { db } from './firebase-config.js';
import { collection, addDoc, updateDoc, doc, query, where, orderBy, limit, onSnapshot, serverTimestamp, deleteDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let notificationsUnsubscribe = null;
let currentUserId = null;

// Initialize notifications system
export function initNotifications() {
    const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
    currentUserId = storageType.getItem('userId');
    
    if (!currentUserId) {
        console.warn('No user ID found for notifications');
        return;
    }
    
    // Start listening to real-time notifications
    subscribeToNotifications();
}

// Subscribe to real-time notifications from Firebase
function subscribeToNotifications() {
    if (notificationsUnsubscribe) {
        notificationsUnsubscribe();
    }
    
    try {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', currentUserId),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        
        notificationsUnsubscribe = onSnapshot(q, (snapshot) => {
            const notifications = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                notifications.push({
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate() || new Date()
                });
            });
            
            // Update the UI with real-time notifications
            if (window.updateNotificationUI) {
                window.updateNotificationUI(notifications);
            }
        }, (error) => {
            console.error('Error listening to notifications:', error);
        });
        
    } catch (error) {
        console.error('Error setting up notifications listener:', error);
    }
}

// Add a new notification
export async function addNotification(userId, type, title, message, icon = null, metadata = {}) {
    const iconMap = {
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle',
        info: 'fa-info-circle'
    };
    
    try {
        const notificationData = {
            userId: userId,
            type: type,
            icon: icon || iconMap[type] || 'fa-bell',
            title: title,
            message: message,
            read: false,
            timestamp: serverTimestamp(),
            metadata: metadata || {}
        };
        
        const docRef = await addDoc(collection(db, 'notifications'), notificationData);
        console.log('Notification added:', docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding notification:', error);
        return { success: false, error: error.message };
    }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId) {
    try {
        await updateDoc(doc(db, 'notifications', notificationId), {
            read: true
        });
        return { success: true };
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return { success: false, error: error.message };
    }
}

// Mark all notifications as read for current user
export async function markAllNotificationsAsRead() {
    try {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
            notificationsRef,
            where('userId', '==', currentUserId),
            where('read', '==', false)
        );
        
        const snapshot = await getDocs(q);
        const updatePromises = [];
        
        snapshot.forEach((docSnapshot) => {
            updatePromises.push(
                updateDoc(doc(db, 'notifications', docSnapshot.id), {
                    read: true
                })
            );
        });
        
        await Promise.all(updatePromises);
        return { success: true };
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false, error: error.message };
    }
}

// Delete a notification
export async function deleteNotification(notificationId) {
    try {
        await deleteDoc(doc(db, 'notifications', notificationId));
        return { success: true };
    } catch (error) {
        console.error('Error deleting notification:', error);
        return { success: false, error: error.message };
    }
}

// Clear all notifications for current user
export async function clearAllNotifications() {
    try {
        const notificationsRef = collection(db, 'notifications');
        const q = query(notificationsRef, where('userId', '==', currentUserId));
        
        const snapshot = await getDocs(q);
        const deletePromises = [];
        
        snapshot.forEach((docSnapshot) => {
            deletePromises.push(deleteDoc(doc(db, 'notifications', docSnapshot.id)));
        });
        
        await Promise.all(deletePromises);
        return { success: true };
    } catch (error) {
        console.error('Error clearing notifications:', error);
        return { success: false, error: error.message };
    }
}

// Cleanup function
export function cleanupNotifications() {
    if (notificationsUnsubscribe) {
        notificationsUnsubscribe();
        notificationsUnsubscribe = null;
    }
}

// Create test notification (for testing purposes)
export async function createTestNotification() {
    const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
    const userId = storageType.getItem('userId');
    
    if (!userId) {
        console.warn('No user ID found for creating test notification');
        return;
    }
    
    const testTypes = ['success', 'info', 'warning', 'error'];
    const testMessages = [
        { title: 'New Patient Registered', message: 'Patient John Doe has been registered successfully', type: 'success' },
        { title: 'Lab Results Ready', message: 'Blood test results are now available for Patient #12345', type: 'info' },
        { title: 'Low Stock Alert', message: 'Paracetamol 500mg is running low. Only 20 units remaining', type: 'warning' },
        { title: 'Emergency Case', message: 'Critical patient admitted to emergency ward', type: 'error' }
    ];
    
    const randomMsg = testMessages[Math.floor(Math.random() * testMessages.length)];
    
    await addNotification(userId, randomMsg.type, randomMsg.title, randomMsg.message);
    console.log('✅ Test notification created');
}

// Expose test function globally for console testing
window.createTestNotification = createTestNotification;

// Format timestamp to relative time
export function formatNotificationTime(timestamp) {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}

// Helper function to create notification for specific events
export async function createPatientNotification(userId, patientName, action) {
    const messages = {
        registered: `Patient ${patientName} has been successfully registered in the system.`,
        updated: `Patient ${patientName}'s information has been updated.`,
        admitted: `Patient ${patientName} has been admitted to the ward.`,
        discharged: `Patient ${patientName} has been discharged.`
    };
    
    return await addNotification(
        userId,
        'success',
        `Patient ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        messages[action] || `Action performed on patient ${patientName}.`,
        'fa-user-check',
        { patientName, action }
    );
}

export async function createInventoryNotification(userId, itemName, quantity, threshold) {
    return await addNotification(
        userId,
        'warning',
        'Low Stock Alert',
        `${itemName} stock is running low. Only ${quantity} units remaining (threshold: ${threshold}).`,
        'fa-exclamation-triangle',
        { itemName, quantity, threshold }
    );
}

export async function createAppointmentNotification(userId, patientName, doctorName, time) {
    return await addNotification(
        userId,
        'info',
        'Appointment Scheduled',
        `New appointment scheduled for ${patientName} with ${doctorName} at ${time}.`,
        'fa-calendar-check',
        { patientName, doctorName, time }
    );
}

export async function createLabResultNotification(userId, patientName, testName) {
    return await addNotification(
        userId,
        'success',
        'Lab Results Ready',
        `${testName} results for patient ${patientName} are now available.`,
        'fa-file-medical',
        { patientName, testName }
    );
}

export async function createPaymentNotification(userId, status, amount, transactionId) {
    const isSuccess = status === 'success';
    return await addNotification(
        userId,
        isSuccess ? 'success' : 'error',
        isSuccess ? 'Payment Successful' : 'Payment Failed',
        isSuccess 
            ? `Payment of $${amount} processed successfully (Transaction #${transactionId}).`
            : `Payment transaction #${transactionId} failed. Please review and retry.`,
        isSuccess ? 'fa-check-circle' : 'fa-times-circle',
        { status, amount, transactionId }
    );
}

// Make functions globally accessible
window.createNotification = addNotification;
window.createPatientNotification = createPatientNotification;
window.createInventoryNotification = createInventoryNotification;
window.createAppointmentNotification = createAppointmentNotification;
window.createLabResultNotification = createLabResultNotification;
window.createPaymentNotification = createPaymentNotification;
