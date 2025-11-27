# Firebase Integration Guide - Billing Request Module

## Overview
The Billing Request module is fully integrated with Firebase using both **Firestore** (primary) and **Realtime Database** (backup/sync) for maximum reliability and real-time performance.

## Database Architecture

### Primary: Firestore (`billing_requests` collection)
- **Advantages**: Complex queries, automatic indexing, offline support
- **Use Case**: Main data storage with serverTimestamp() support
- **Real-time**: Uses `onSnapshot()` for instant updates

### Secondary: Realtime Database (`billing_requests/` path)
- **Advantages**: Lower latency, simpler structure, cross-platform sync
- **Use Case**: Backup storage and fallback when Firestore fails
- **Real-time**: Uses `onValue()` for live data

## Data Flow

```
Department Module → createBillingRequest()
                    ↓
            [Firestore Write]
                    ↓
        [Realtime DB Sync] (parallel)
                    ↓
          [onSnapshot Listener]
                    ↓
            [UI Update in real-time]
                    ↓
        Billing Staff processes request
                    ↓
          markRequestProcessed()
                    ↓
    [Update both Firestore & RTDB]
```

## Firebase Operations

### 1. Create Billing Request
```javascript
// Saves to both Firestore and Realtime Database
const result = await window.createBillingRequest({
    patientNumber: 'P001',
    patientName: 'John Doe',
    patientId: 'abc123',
    department: 'Laboratory',
    serviceType: 'Blood Test',
    amount: 1500,
    notes: 'Urgent',
    requestedBy: 'Lab Tech'
});

// Operations performed:
// 1. addDoc() to Firestore 'billing_requests' collection
// 2. set() to Realtime DB 'billing_requests/{id}'
// 3. Logs activity to 'activity_logs' collection
// 4. Sends notification to billing staff
```

### 2. Real-time Listeners

#### Firestore Listener (Primary)
```javascript
onSnapshot(
    query(collection(db, 'billing_requests'), orderBy('createdAt', 'desc')),
    (snapshot) => {
        // Instant updates when data changes
        // Automatically syncs to Realtime Database
    }
);
```

#### Realtime Database Listener (Fallback)
```javascript
onValue(
    dbRef(realtimeDb, 'billing_requests'),
    (snapshot) => {
        // Activates if Firestore fails
        // Lower latency alternative
    }
);
```

### 3. Update Request Status
```javascript
// Updates both databases
await window.markRequestProcessed(
    requestId,
    'REC-12345',
    'receipt_doc_id'
);

// Operations performed:
// 1. updateDoc() in Firestore
// 2. set() in Realtime Database
// 3. Logs activity
```

## Firestore Structure

```javascript
billing_requests/{requestId}
{
    requestId: "BR1732723200000",           // String - Auto-generated
    patientNumber: "P001",                  // String - Patient identifier
    patientName: "John Doe",                // String - Full name
    patientId: "firebase_doc_id",           // String - Patient document ID
    department: "Laboratory",               // String - Department name
    serviceType: "Complete Blood Count",    // String - Service description
    amount: 1500,                           // Number - Amount in KSh
    notes: "Urgent test",                   // String - Optional notes
    status: "new",                          // String - new/pending/processed
    requestedBy: "Lab Technician",          // String - Staff name
    createdAt: Timestamp,                   // Timestamp - Server timestamp
    dateTime: "2025-11-27T10:30:00Z",      // String - ISO datetime
    
    // Added when status changes to pending
    pendingAt: Timestamp,                   // Timestamp
    pendingDateTime: "2025-11-27T10:35:00Z", // String
    
    // Added when status changes to processed
    processedAt: Timestamp,                 // Timestamp
    processedBy: "Accountant Name",         // String
    receiptNumber: "REC-12345",             // String
    receiptId: "receipt_doc_id",            // String
    processedDateTime: "2025-11-27T11:00:00Z" // String
}
```

## Realtime Database Structure

```javascript
billing_requests/
  └── {requestId}/
      ├── requestId: "BR1732723200000"
      ├── patientNumber: "P001"
      ├── patientName: "John Doe"
      ├── department: "Laboratory"
      ├── serviceType: "Complete Blood Count"
      ├── amount: 1500
      ├── status: "new"
      ├── createdAt: "2025-11-27T10:30:00Z"  // ISO string (not Timestamp)
      └── ... (same fields as Firestore)
```

## Security Rules

### Firestore Rules
```javascript
// In firestore.rules
match /billing_requests/{requestId} {
  // All authenticated users can read
  allow read: if request.auth != null;
  
  // Specific roles can create
  allow create: if request.auth != null 
    && request.auth.token.role in [
      'Admin', 'Receptionist', 'Lab Technician', 
      'Radiologist', 'Pharmacist', 'Nurse'
    ];
  
  // Only billing staff can update
  allow update: if request.auth != null 
    && request.auth.token.role in ['Admin', 'Accountant'];
}
```

### Realtime Database Rules
```json
{
  "rules": {
    "billing_requests": {
      ".indexOn": ["status", "department", "dateTime"],
      "$requestId": {
        ".read": "auth != null",
        ".write": "auth != null && 
          (root.child('users').child(auth.uid).child('role').val() == 'Admin' ||
           root.child('users').child(auth.uid).child('role').val() == 'Accountant')"
      }
    }
  }
}
```

## Indexes (Firestore)

### Required Indexes
```javascript
// Collection: billing_requests
// Indexes needed for queries:

1. Single field indexes (auto-created):
   - status (Ascending/Descending)
   - department (Ascending/Descending)
   - createdAt (Descending)

2. Composite indexes (create manually if needed):
   - status (Ascending) + createdAt (Descending)
   - department (Ascending) + createdAt (Descending)
   - status (Ascending) + department (Ascending) + createdAt (Descending)
```

### Create Indexes via Firebase Console:
1. Go to Firestore Database
2. Click "Indexes" tab
3. Click "Create Index"
4. Add the composite indexes listed above

## Real-time Features

### 1. Instant Updates
- When a department creates a request, it appears immediately in billing queue
- No page refresh needed
- Uses WebSocket connections

### 2. Badge Notifications
- Red badge shows count of new requests
- Updates in real-time
- Visible on billing module button

### 3. Sound Notifications
- Plays sound when new request arrives (if implemented)
- Visual notification popup

### 4. Cross-Tab Sync
- Changes in one tab reflect in all open tabs
- Powered by Firebase's multi-tab support

## Error Handling

### Firestore Errors
```javascript
try {
    await createBillingRequest(data);
} catch (error) {
    if (error.code === 'permission-denied') {
        // User doesn't have permission
    } else if (error.code === 'unavailable') {
        // Firestore is offline, fallback to RTDB
    }
}
```

### Offline Support
- Firestore caches data locally
- Works offline, syncs when online
- Realtime Database provides additional fallback

## Performance Optimization

### 1. Pagination
- Loads 25 requests at a time in table
- Uses Firestore `limit()` query

### 2. Efficient Queries
```javascript
// Only fetch recent requests
query(
    collection(db, 'billing_requests'),
    orderBy('createdAt', 'desc'),
    limit(100)
)
```

### 3. Selective Listening
- Queue only listens to new/pending requests
- Processed requests loaded on-demand

### 4. Debounced Search
- 300ms delay on search input
- Prevents excessive queries

## Integration Checklist

- [x] Firestore collection created
- [x] Realtime Database path created
- [x] Security rules configured
- [x] Indexes created (if needed)
- [x] Real-time listeners attached
- [x] Error handling implemented
- [x] Offline support enabled
- [x] Activity logging integrated
- [x] Notification system connected
- [x] Cross-database sync working

## Testing Firebase Integration

### Test Create Request
```javascript
// In browser console:
const result = await window.createBillingRequest({
    patientNumber: 'TEST001',
    patientName: 'Test Patient',
    patientId: 'test123',
    department: 'Laboratory',
    serviceType: 'Test Service',
    amount: 100,
    notes: 'Test request',
    requestedBy: 'Tester'
});

console.log('Created:', result);
```

### Test Real-time Updates
1. Open billing requests in two browser tabs
2. Create a request in one tab
3. Verify it appears instantly in other tab
4. Check Firebase Console for data

### Test Mark as Processed
```javascript
// Get a request ID from the UI
const requestId = 'your_request_id';
await window.markRequestProcessed(requestId, 'REC-001', 'receipt123');
```

## Monitoring

### Firebase Console Checks
1. **Firestore Database** → Check `billing_requests` collection
2. **Realtime Database** → Check `billing_requests/` path
3. **Usage** → Monitor read/write operations
4. **Rules** → Verify no security violations

### Browser Console Logs
```
BillingRequest: Initializing...
BillingRequest: Firestore real-time listener started
BillingRequest: Received 5 requests
BillingRequest: Synced to Realtime Database
BillingRequest: Ready ✓
```

## Common Issues & Solutions

### Issue: Requests not appearing
**Solution**: Check Firebase rules, verify authentication, check console for errors

### Issue: Permission denied
**Solution**: Update security rules to include user's role

### Issue: Slow updates
**Solution**: Check internet connection, verify indexes are created

### Issue: Data not syncing
**Solution**: Check both Firestore and RTDB are enabled in Firebase Console

## Best Practices

1. **Always use try-catch** when creating/updating requests
2. **Log all operations** for debugging and audit
3. **Validate data** before sending to Firebase
4. **Handle offline scenarios** gracefully
5. **Monitor usage** to stay within Firebase free tier limits
6. **Index frequently queried fields**
7. **Use serverTimestamp()** for accurate timestamps
8. **Keep Firestore and RTDB in sync**

## Firebase Pricing Considerations

### Firestore (Free Tier)
- 50K reads/day
- 20K writes/day
- 20K deletes/day
- 1 GiB storage

### Realtime Database (Free Tier)
- 1 GB storage
- 10 GB/month downloads
- 100 concurrent connections

### Cost Optimization
- Use pagination to reduce reads
- Cache data on client side
- Use Realtime DB for high-frequency updates
- Monitor usage in Firebase Console

## Support

For Firebase-related issues:
1. Check Firebase Console for errors
2. Review security rules
3. Verify authentication is working
4. Check browser console for error messages
5. Test with Firebase Emulator locally

---

**Module:** billing-request.js  
**Firebase Version:** 10.7.1  
**Last Updated:** November 27, 2025  
**Status:** ✅ Fully Integrated & Tested
