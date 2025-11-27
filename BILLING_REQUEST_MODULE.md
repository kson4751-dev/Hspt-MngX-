# Billing Request Module - Documentation

## Overview
The Billing Request module provides a real-time billing request queue system that allows all hospital departments to send billing requests to the billing department for processing. This creates a centralized, organized workflow for patient billing across the hospital.

## Features

### 🎯 Core Functionality
- **Real-time Request Queue** - Instant updates using Firebase listeners
- **Multi-Department Support** - Reception, Laboratory, Imaging, Pharmacy, Ward
- **Status Tracking** - New, Pending, Processed
- **Search & Filter** - Find requests by patient info or department
- **Automated Badge Notifications** - Shows count of new requests
- **Clean Card-Based UI** - Modern, responsive design
- **Processed History** - Complete audit trail with pagination
- **Export Functionality** - Export processed requests (PDF/CSV/Excel)

### 📊 Dashboard Stats
- **New Requests** - Incoming requests awaiting processing
- **Pending** - Requests currently being processed
- **Processed Today** - Completed requests for the day

## UI Components

### Request Queue Cards
Each request card displays:
- Request ID (auto-generated)
- Status badge (color-coded)
- Patient name and number
- Department with icon
- Service type
- Amount to bill
- Time since request (e.g., "15m ago")
- Requested by staff member
- Action buttons (Process Bill, View Details)

### Color Coding
- **Blue (#3498db)** - New requests
- **Orange (#f39c12)** - Pending requests  
- **Green (#27ae60)** - Processed requests

### Department Badges
- **Reception** - Blue (Consultation fees)
- **Laboratory** - Purple (Lab tests)
- **Imaging** - Orange (Scans/X-rays)
- **Pharmacy** - Green (Prescriptions)
- **Ward** - Red (Ward services)

## Integration Guide

### Creating Billing Requests

#### From Any Module (using global function):
```javascript
// Option 1: Global window function
const result = await window.createBillingRequest({
    patientNumber: 'P001',
    patientName: 'John Doe',
    patientId: 'abc123',
    department: 'Laboratory',
    serviceType: 'Complete Blood Count',
    amount: 1500,
    notes: 'Urgent test',
    requestedBy: 'Lab Technician'
});

console.log('Request created:', result.requestId);
```

#### From Module with Import:
```javascript
import { createBillingRequest } from './billing-request.js';

const result = await createBillingRequest({
    patientNumber: patient.patientNumber,
    patientName: patient.fullName,
    patientId: patient.id,
    department: 'Pharmacy',
    serviceType: 'Prescription Dispensing',
    amount: prescriptionTotal,
    notes: `Rx #${prescriptionNumber}`,
    requestedBy: userName
});
```

### Marking Requests as Processed

After billing processes a request and generates a receipt:

```javascript
await window.markRequestProcessed(
    requestId,      // The request ID
    receiptNumber,  // Generated receipt number (e.g., REC-001)
    receiptId       // Firebase document ID of the receipt
);
```

## Department Integration Examples

### Reception Module
```javascript
// When patient arrives for consultation
async function createConsultationRequest(patient) {
    return await window.createBillingRequest({
        patientNumber: patient.patientNumber,
        patientName: patient.fullName,
        patientId: patient.id,
        department: 'Reception',
        serviceType: 'Consultation Fee',
        amount: 500,
        notes: 'Initial consultation',
        requestedBy: currentUser.name
    });
}
```

### Laboratory Module
```javascript
// When lab test is ordered
async function createLabBillingRequest(patient, test) {
    return await window.createBillingRequest({
        patientNumber: patient.patientNumber,
        patientName: patient.fullName,
        patientId: patient.id,
        department: 'Laboratory',
        serviceType: `Lab Test: ${test.name}`,
        amount: test.cost,
        notes: `Test ID: ${test.id}, Ordered by: ${test.orderedBy}`,
        requestedBy: currentUser.name
    });
}
```

### Imaging Module
```javascript
// When imaging scan is scheduled
async function createImagingRequest(patient, scan) {
    return await window.createBillingRequest({
        patientNumber: patient.patientNumber,
        patientName: patient.fullName,
        patientId: patient.id,
        department: 'Imaging',
        serviceType: `${scan.type} Scan`,
        amount: scan.cost,
        notes: `Scan ID: ${scan.id}`,
        requestedBy: currentUser.name
    });
}
```

### Pharmacy Module
```javascript
// When prescription is ready
async function createPharmacyRequest(patient, prescription) {
    return await window.createBillingRequest({
        patientNumber: patient.patientNumber,
        patientName: patient.fullName,
        patientId: patient.id,
        department: 'Pharmacy',
        serviceType: 'Prescription Dispensing',
        amount: prescription.totalCost,
        notes: `Rx #${prescription.number}, Items: ${prescription.itemCount}`,
        requestedBy: currentUser.name
    });
}
```

### Ward Module
```javascript
// For daily ward charges or services
async function createWardRequest(patient, service) {
    return await window.createBillingRequest({
        patientNumber: patient.patientNumber,
        patientName: patient.fullName,
        patientId: patient.id,
        department: 'Ward',
        serviceType: service.name,
        amount: service.cost,
        notes: `Ward: ${patient.ward}, Bed: ${patient.bed}`,
        requestedBy: currentUser.name
    });
}
```

## User Workflow

### For Department Staff (Requesters)
1. Patient receives service in department
2. Staff creates billing request with amount and details
3. Request appears in billing queue immediately
4. Staff notifies patient to visit billing
5. Patient pays at billing counter

### For Billing Staff (Processors)
1. View incoming requests in real-time queue
2. Filter by status (New/Pending/Processed)
3. Search by patient name or number
4. Click "Process Bill" on a request
5. System opens billing module with pre-filled data
6. Complete payment processing
7. Generate receipt
8. Request automatically marked as processed

## Global Functions Reference

### `window.createBillingRequest(data)`
Creates a new billing request.

**Parameters:**
- `patientNumber` (string) - Patient number/ID
- `patientName` (string) - Full name of patient
- `patientId` (string) - Firebase patient document ID
- `department` (string) - Department name
- `serviceType` (string) - Description of service
- `amount` (number) - Amount to bill
- `notes` (string, optional) - Additional notes
- `requestedBy` (string, optional) - Staff name

**Returns:** `{ success: true, id: string, requestId: string }`

### `window.markRequestProcessed(requestId, receiptNumber, receiptId)`
Marks a billing request as processed.

**Parameters:**
- `requestId` (string) - Request document ID
- `receiptNumber` (string) - Generated receipt number
- `receiptId` (string) - Receipt document ID

**Returns:** `{ success: true }`

### `window.filterRequestQueue(status)`
Filters the request queue by status.

**Parameters:**
- `status` (string) - 'all', 'new', 'pending', or 'processed'

### `window.refreshBillingRequests()`
Manually refreshes the request list from Firebase.

### `window.viewRequestDetails(requestId)`
Shows details of a specific request.

**Parameters:**
- `requestId` (string) - Request document ID

### `window.processBillingRequest(requestId)`
Opens billing module to process a specific request.

**Parameters:**
- `requestId` (string) - Request document ID

## Firebase Collection Structure

### `billing_requests` Collection

```javascript
{
    requestId: "BR1732723200000",           // Auto-generated
    patientNumber: "P001",                  // Patient identifier
    patientName: "John Doe",                // Full name
    patientId: "firebase_doc_id",           // Firebase patient ID
    department: "Laboratory",               // Department name
    serviceType: "Complete Blood Count",    // Service description
    amount: 1500,                           // Amount in KSh
    notes: "Urgent test",                   // Optional notes
    status: "new",                          // new/pending/processed
    requestedBy: "Lab Technician",          // Staff name
    createdAt: Timestamp,                   // Firebase server timestamp
    dateTime: "2025-11-27T10:30:00.000Z",  // ISO string
    
    // Added when processed
    processedAt: Timestamp,                 // When processed
    processedBy: "Accountant Name",         // Who processed
    receiptNumber: "REC-001",               // Generated receipt
    receiptId: "firebase_receipt_id",       // Receipt document ID
    processedDateTime: "2025-11-27T11:00:00.000Z"
}
```

## Styling Classes

### Request Card Status Classes
- `.request-card.status-new` - New request styling
- `.request-card.status-pending` - Pending request styling
- `.request-card.status-processed` - Processed request styling

### Department Badge Classes
- `.dept-reception` - Reception department
- `.dept-laboratory` - Laboratory department
- `.dept-imaging` - Imaging department
- `.dept-pharmacy` - Pharmacy department
- `.dept-ward` - Ward department

## Best Practices

1. **Create requests immediately** when service is provided
2. **Include all relevant details** in the notes field
3. **Use correct department names** (Reception, Laboratory, Imaging, Pharmacy, Ward)
4. **Mark as processed** after generating receipt
5. **Handle errors gracefully** with try-catch blocks
6. **Log activities** for audit trail
7. **Validate amounts** before creating requests
8. **Notify patients** to visit billing after request is created

## Error Handling

```javascript
try {
    const result = await window.createBillingRequest({
        // ... request data
    });
    
    // Show success notification
    window.showNotification('Billing request created successfully', 'success');
    
} catch (error) {
    console.error('Failed to create billing request:', error);
    window.showNotification('Failed to create billing request', 'error');
    
    // Handle specific errors
    if (error.code === 'permission-denied') {
        window.showNotification('You do not have permission to create billing requests', 'error');
    }
}
```

## Performance Considerations

- Uses Firebase real-time listeners for instant updates
- Implements efficient filtering and search
- Pagination on processed requests table
- Optimized re-renders on state changes
- Debounced search input (300ms delay)

## Security & Permissions

Ensure Firebase security rules allow:
- All authenticated users can **read** billing_requests
- Only authorized departments can **create** billing_requests
- Only billing staff can **update** billing_requests to processed status

## Future Enhancements

- [ ] Email/SMS notifications to patients
- [ ] Request priority levels
- [ ] Batch processing
- [ ] Advanced analytics dashboard
- [ ] Payment reminders
- [ ] Request editing/cancellation
- [ ] Multi-service bundling
- [ ] Insurance claim integration

## Support

For issues or questions about the billing request module, contact the development team or check the main RxFlow documentation.

---

**Version:** 1.0.0  
**Last Updated:** November 27, 2025  
**Module:** billing-request.js  
**Dependencies:** firebase-config.js, firebase-helpers.js
