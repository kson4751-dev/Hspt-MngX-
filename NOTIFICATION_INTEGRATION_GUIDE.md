# Notification System Integration Guide

## Overview
The RxFlow notification system uses Firebase Firestore for real-time notifications across all modules. All demo data has been removed and replaced with Firebase real-time listeners.

## How It Works

### Real-time Updates
- Notifications are stored in Firebase Firestore collection `notifications`
- Each notification is associated with a `userId`
- Real-time listener updates the UI automatically when new notifications arrive
- Badge counter updates automatically based on unread count

### Notification Structure
```javascript
{
  userId: "user_firebase_uid",
  type: "success|warning|error|info",
  icon: "fa-icon-name",
  title: "Notification Title",
  message: "Notification message text",
  read: false,
  timestamp: ServerTimestamp,
  metadata: { /* optional additional data */ }
}
```

## Global Functions Available

### 1. Basic Notification
```javascript
// Add a simple notification
addNotification('success', 'Title', 'Message');
addNotification('warning', 'Alert Title', 'Warning message');
addNotification('error', 'Error Title', 'Error details');
addNotification('info', 'Info Title', 'Information message');

// With custom icon
addNotification('success', 'Title', 'Message', 'fa-custom-icon');
```

### 2. Patient Notifications
```javascript
// Patient registered
createPatientNotification(userId, 'John Smith', 'registered');

// Patient updated
createPatientNotification(userId, 'John Smith', 'updated');

// Patient admitted
createPatientNotification(userId, 'John Smith', 'admitted');

// Patient discharged
createPatientNotification(userId, 'John Smith', 'discharged');
```

### 3. Inventory Notifications
```javascript
// Low stock alert
createInventoryNotification(userId, 'Paracetamol', 50, 100);
// Parameters: userId, itemName, currentQuantity, threshold
```

### 4. Appointment Notifications
```javascript
// New appointment scheduled
createAppointmentNotification(
  userId,
  'Jane Doe',           // patient name
  'Dr. Johnson',        // doctor name
  '3:00 PM today'       // appointment time
);
```

### 5. Lab Result Notifications
```javascript
// Lab results ready
createLabResultNotification(
  userId,
  'Maria Garcia',       // patient name
  'Blood Test'          // test name
);
```

### 6. Payment Notifications
```javascript
// Payment successful
createPaymentNotification(userId, 'success', 250.00, 'TXN12345');

// Payment failed
createPaymentNotification(userId, 'error', 250.00, 'TXN12346');
```

### 7. Clear All Notifications
```javascript
// Remove all notifications for current user
clearAllNotifications();
```

## Integration Examples by Module

### Reception Module (Patient Registration)
```javascript
// After successfully registering a patient
const result = await addPatient(patientData);
if (result.success) {
  const userId = getCurrentUserId();
  await createPatientNotification(
    userId,
    `${patientData.firstName} ${patientData.lastName}`,
    'registered'
  );
}
```

### Inventory Module (Low Stock Detection)
```javascript
// When checking stock levels
function checkStockLevels(item) {
  if (item.quantity <= item.reorderLevel) {
    const userId = getCurrentUserId();
    createInventoryNotification(
      userId,
      item.name,
      item.quantity,
      item.reorderLevel
    );
  }
}

// When updating inventory
async function updateInventoryItem(itemId, newQuantity) {
  const item = await getItem(itemId);
  await updateStock(itemId, newQuantity);
  
  // Check if stock is now low
  if (newQuantity <= item.reorderLevel) {
    const userId = getCurrentUserId();
    createInventoryNotification(
      userId,
      item.name,
      newQuantity,
      item.reorderLevel
    );
  }
}
```

### Billing Module (Payment Processing)
```javascript
// After processing payment
async function processPayment(amount, method) {
  try {
    const result = await chargePayment(amount, method);
    const userId = getCurrentUserId();
    
    if (result.success) {
      await createPaymentNotification(
        userId,
        'success',
        amount,
        result.transactionId
      );
    } else {
      await createPaymentNotification(
        userId,
        'error',
        amount,
        result.transactionId
      );
    }
  } catch (error) {
    console.error('Payment error:', error);
  }
}
```

### Laboratory Module (Lab Results)
```javascript
// When lab results are ready
async function completeLabTest(testId) {
  const test = await getLabTest(testId);
  await updateLabTestStatus(testId, 'completed');
  
  const userId = test.requestedBy; // or relevant user
  await createLabResultNotification(
    userId,
    test.patientName,
    test.testName
  );
}
```

### Doctor Module (Appointments)
```javascript
// When scheduling an appointment
async function scheduleAppointment(appointmentData) {
  const result = await saveAppointment(appointmentData);
  
  if (result.success) {
    // Notify doctor
    await createAppointmentNotification(
      appointmentData.doctorId,
      appointmentData.patientName,
      appointmentData.doctorName,
      appointmentData.appointmentTime
    );
    
    // Optionally notify receptionist too
    const receptionistId = getReceptionistId();
    await createAppointmentNotification(
      receptionistId,
      appointmentData.patientName,
      appointmentData.doctorName,
      appointmentData.appointmentTime
    );
  }
}
```

### Ward Module (Admissions/Discharges)
```javascript
// Patient admission
async function admitPatient(patientData, wardData) {
  const result = await saveAdmission(patientData, wardData);
  
  if (result.success) {
    const userId = getCurrentUserId();
    await createPatientNotification(
      userId,
      `${patientData.firstName} ${patientData.lastName}`,
      'admitted'
    );
  }
}

// Patient discharge
async function dischargePatient(patientId) {
  const patient = await getPatient(patientId);
  await updatePatientStatus(patientId, 'discharged');
  
  const userId = getCurrentUserId();
  await createPatientNotification(
    userId,
    `${patient.firstName} ${patient.lastName}`,
    'discharged'
  );
}
```

### Pharmacy Module (Prescription Processing)
```javascript
// When prescription is filled
async function fillPrescription(prescriptionId) {
  const prescription = await getPrescription(prescriptionId);
  await updatePrescriptionStatus(prescriptionId, 'filled');
  
  // Notify patient's doctor
  addNotification(
    'success',
    'Prescription Filled',
    `Prescription #${prescriptionId} for ${prescription.patientName} has been filled.`
  );
}
```

### Admin Module (User Management)
```javascript
// When new user is created
async function createNewUser(userData) {
  const result = await saveUser(userData);
  
  if (result.success) {
    // Notify admin
    addNotification(
      'success',
      'New User Created',
      `User ${userData.displayName} (${userData.role}) has been added to the system.`
    );
  }
}
```

### Emergency Module
```javascript
// Emergency alert
function triggerEmergencyAlert(patientName, room, severity) {
  // Notify all emergency personnel
  const emergencyStaff = getEmergencyStaffIds();
  
  emergencyStaff.forEach(staffId => {
    addNotification(
      'error',
      '🚨 Emergency Alert',
      `${severity} emergency for ${patientName} in ${room}. Immediate attention required.`,
      'fa-ambulance'
    );
  });
}
```

## Helper Function: Get Current User ID
```javascript
function getCurrentUserId() {
  const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
  return storageType.getItem('userId');
}
```

## Custom Notifications
For any custom scenario not covered by the helper functions:
```javascript
import { addNotification } from './notifications.js';

// Create custom notification
await addNotification(
  userId,
  'custom-type',     // success, warning, error, info
  'Custom Title',
  'Custom message content',
  'fa-custom-icon',  // optional
  {                  // optional metadata
    customField1: 'value1',
    customField2: 'value2'
  }
);
```

## Real-time Features

### Automatic UI Updates
- New notifications appear instantly (no page refresh needed)
- Badge counter updates automatically
- Notification dropdown updates in real-time
- Bell icon shakes when new notification arrives

### Read Status
- Clicking a notification marks it as read
- "Mark all as read" button available
- Read/unread status synced across all devices

### Persistence
- Notifications persist across sessions
- Available on all devices where user logs in
- Stored in Firebase Firestore

## Best Practices

1. **Always get userId before creating notifications**
   ```javascript
   const userId = getCurrentUserId();
   if (!userId) return; // Don't create notification if no user
   ```

2. **Use appropriate notification types**
   - `success` - Completed actions, successful operations
   - `warning` - Warnings, low stock, approaching limits
   - `error` - Failed operations, critical issues
   - `info` - General information, appointments, schedules

3. **Keep messages concise but informative**
   - Include relevant names/IDs
   - Add context (patient name, item name, amount, etc.)
   - Use clear action words

4. **Don't spam notifications**
   - Batch related notifications when possible
   - Set reasonable thresholds for alerts
   - Allow users to mark as read

5. **Include metadata for complex notifications**
   ```javascript
   await addNotification(userId, 'info', 'Title', 'Message', null, {
     patientId: 'P12345',
     appointmentId: 'APT789',
     actionRequired: true
   });
   ```

## Testing

### Test notification creation
```javascript
// Open browser console on index.html
addNotification('success', 'Test Success', 'This is a test notification');
addNotification('warning', 'Test Warning', 'This is a warning');
addNotification('error', 'Test Error', 'This is an error');
addNotification('info', 'Test Info', 'This is info');
```

### Test Firebase integration
```javascript
// Check if module loaded
console.log('Notifications module:', window.createNotification ? 'Loaded ✓' : 'Not loaded ✗');

// Create test notification with Firebase
const userId = getCurrentUserId();
createPatientNotification(userId, 'Test Patient', 'registered');
```

## Troubleshooting

### Notifications not appearing
1. Check Firebase connection
2. Verify user is logged in (userId exists)
3. Check browser console for errors
4. Verify Firestore rules allow read/write to `notifications` collection

### Badge not updating
- Notifications module may not be initialized
- Check `initializeNotifications()` was called
- Verify real-time listener is active

### Old notifications not clearing
- Use `clearAllNotifications()` to reset
- Check Firestore for orphaned documents

---

**Version**: 1.0  
**Last Updated**: November 23, 2025  
**System**: RxFlow Hospital Management System
