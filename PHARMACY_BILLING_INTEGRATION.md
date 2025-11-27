# Pharmacy → Billing Integration Guide

## Overview
The pharmacy module is now fully integrated with the billing request system. Every pharmacy sale automatically creates a real-time billing request that appears instantly in the billing queue.

## Integration Points

### 1. **Pharmacy POS (Point of Sale)**
**File:** `js/pharmacy-pos.js`

**When:** Automatically when checkout is completed

**What happens:**
```javascript
Complete Sale → Save to Firestore → Create Billing Request → Update Inventory → Print Receipt
```

**Billing Request Details:**
- **Patient Number:** Customer contact or 'WALK-IN'
- **Patient Name:** Customer name from sale
- **Department:** 'Pharmacy'
- **Service Type:** 'Prescription Dispensing (Rx: [number])'
- **Amount:** Total sale amount (after tax and discount)
- **Notes:** Sale number, item count, payment method
- **Requested By:** Pharmacist who processed the sale

**Code Location:** Lines 700-725 in `pharmacy-pos.js`

### 2. **Pharmacy Sales (Historical Sales)**
**File:** `js/pharmacy-sales.js`

**When:** Manual - when "Send to Billing" button is clicked

**What happens:**
```javascript
Click Billing Button → Confirm → Create Billing Request → Show Success → Update Button
```

**Features:**
- Loading state while sending
- Success confirmation with Request ID
- Button changes to "Sent" with checkmark
- Auto-resets after 3 seconds
- Error handling with retry option

**Code Location:** Lines 660-732 in `pharmacy-sales.js`

## Data Flow Diagram

```
┌─────────────────────────┐
│   Pharmacy POS Sale     │
│  (Customer purchases)   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Save to Firestore      │
│  pharmacy_sales/{id}    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ createBillingRequest()  │
│  (Real-time function)   │
└───────────┬─────────────┘
            │
            ├─────────────────────────┐
            │                         │
            ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐
│   Firestore DB      │   │  Realtime DB        │
│ billing_requests    │   │ billing_requests/   │
└──────────┬──────────┘   └──────────┬──────────┘
           │                         │
           └────────┬────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│  Real-time Listener (onSnapshot)    │
│  Updates billing queue instantly    │
└─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│   Billing Request Queue UI          │
│   Shows new request immediately     │
│   + Badge notification updates      │
└─────────────────────────────────────┘
```

## Billing Request Structure

```javascript
{
    requestId: "BR1732723500000",
    patientNumber: "0722123456", // or "WALK-IN"
    patientName: "John Doe",
    patientId: "pharmacy_sale_doc_id",
    department: "Pharmacy",
    serviceType: "Prescription Dispensing (Rx: RX-12345)",
    amount: 2500.00,
    notes: "Sale #SALE-1732723500000-A4B2, Items: 3, Payment: cash",
    status: "new",
    requestedBy: "Pharmacist Name",
    createdAt: Timestamp,
    dateTime: "2025-11-27T14:30:00.000Z"
}
```

## Features

### ✅ **Automatic Integration**
- Every sale automatically creates billing request
- No manual intervention needed
- Happens in background during checkout

### ✅ **Real-time Updates**
- Billing staff sees request instantly
- Badge notification updates immediately
- No page refresh needed

### ✅ **Dual Database Sync**
- Saves to Firestore (primary)
- Syncs to Realtime Database (backup)
- Maximum reliability

### ✅ **Error Handling**
- Sale completes even if billing fails
- Shows warning notification
- Logs error for debugging
- Manual retry option available

### ✅ **Receipt Notification**
- Printed receipt shows "Sent to Billing Department"
- Customer knows transaction is complete
- Professional appearance

### ✅ **Manual Sending**
- Historic sales can be sent to billing
- Useful for delayed billing
- "Send to Billing" button in sales table
- Visual feedback on success

## Testing the Integration

### Test 1: New Sale (Automatic)
```
1. Go to Pharmacy POS
2. Add items to cart
3. Fill customer details
4. Select payment method
5. Click "Complete Sale"
6. ✅ Check billing request appears in billing queue immediately
7. ✅ Check receipt mentions "Sent to Billing Department"
```

### Test 2: Historic Sale (Manual)
```
1. Go to Pharmacy Sales
2. Find any sale in the table
3. Click "Billing" button
4. Confirm the dialog
5. ✅ Check billing request appears in queue
6. ✅ Check button shows "Sent" with checkmark
```

### Test 3: Real-time Verification
```
1. Open Billing Request module in one tab
2. Open Pharmacy POS in another tab
3. Complete a sale in Pharmacy POS
4. ✅ Check billing request appears instantly in first tab
5. ✅ Check badge count updates
```

### Test 4: Error Handling
```
1. Temporarily disconnect internet
2. Try to complete a sale
3. ✅ Check sale still saves locally
4. ✅ Check warning notification shows
5. Reconnect internet
6. Use "Send to Billing" button to retry
```

## User Workflows

### Workflow 1: Cash Sale
```
Customer → Pharmacy → Select Medications → Checkout → Pay Cash
                                                         ↓
                                          Billing Request Created
                                                         ↓
                                          Billing Staff Notified
                                                         ↓
                                          (Already Paid - Mark Processed)
```

### Workflow 2: Credit/Insurance Sale
```
Customer → Pharmacy → Select Medications → Checkout → Pay Later
                                                         ↓
                                          Billing Request Created
                                                         ↓
                                          Billing Staff Processes
                                                         ↓
                                          Generate Invoice
                                                         ↓
                                          Customer Pays at Billing
```

### Workflow 3: Prescription with Consultation
```
Doctor Prescribes → Patient goes to Pharmacy → Medications Dispensed
                                                         ↓
                                          Billing Request Created
                                                         ↓
                                     Billing combines with Consultation Fee
                                                         ↓
                                          One Invoice for Both
```

## Configuration

### Enable/Disable Automatic Billing
If needed, you can add a toggle in pharmacy settings:

```javascript
// In pharmacy-pos.js
const AUTO_SEND_TO_BILLING = true; // Set to false to disable

// In checkout function:
if (AUTO_SEND_TO_BILLING && typeof window.createBillingRequest === 'function') {
    // Create billing request
}
```

### Customize Billing Request Data
Edit the `createBillingRequest` call in `pharmacy-pos.js` line 705:

```javascript
await window.createBillingRequest({
    patientNumber: saleData.customerContact || 'WALK-IN',
    patientName: saleData.customerName,
    patientId: saleDocRef.id,
    department: 'Pharmacy',
    serviceType: `Prescription Dispensing`, // Customize this
    amount: saleData.total,
    notes: `Custom notes here`, // Customize this
    requestedBy: saleData.soldBy || 'Pharmacist'
});
```

## Troubleshooting

### Issue: Billing requests not appearing
**Solution:**
1. Check browser console for errors
2. Verify `window.createBillingRequest` is available
3. Check Firebase permissions
4. Verify billing-request module is loaded

### Issue: Duplicate billing requests
**Solution:**
1. Don't click "Send to Billing" multiple times
2. Check if sale already has billing request
3. Add duplicate detection logic if needed

### Issue: Sale completes but billing fails
**Solution:**
1. This is expected behavior (sale priority)
2. Use "Send to Billing" button from sales list
3. Check error logs for root cause
4. Verify internet connection

### Issue: Badge count not updating
**Solution:**
1. Refresh billing module
2. Check real-time listener is active
3. Verify Firebase connection
4. Check browser console for errors

## Best Practices

### 1. Always Complete Sale First
- Sale completion is priority
- Billing request is secondary
- Don't block sale if billing fails

### 2. Handle Errors Gracefully
- Show user-friendly messages
- Log technical details to console
- Provide manual retry option

### 3. Maintain Data Consistency
- Keep sale ID in billing request
- Link back to original transaction
- Track payment status

### 4. Notify All Parties
- Customer gets receipt
- Pharmacist sees confirmation
- Billing staff gets notification
- System logs activity

## Future Enhancements

- [ ] Automatic receipt generation in billing module
- [ ] Link billing receipts back to pharmacy sales
- [ ] Batch billing for multiple sales
- [ ] Payment status sync back to pharmacy
- [ ] Insurance claim integration
- [ ] SMS notification to customer
- [ ] Email receipt with billing details

## Integration Checklist

- [x] Automatic billing request on sale completion
- [x] Manual "Send to Billing" from sales list
- [x] Real-time updates to billing queue
- [x] Dual database sync (Firestore + RTDB)
- [x] Error handling and recovery
- [x] Loading states and visual feedback
- [x] Receipt notification
- [x] Badge count updates
- [x] Activity logging
- [x] Console logging for debugging

## Support

For issues or questions:
1. Check browser console for errors
2. Review Firebase logs
3. Test with provided test cases
4. Check network connectivity
5. Verify module initialization order

---

**Integration Status:** ✅ COMPLETE  
**Last Updated:** November 27, 2025  
**Modules:** pharmacy-pos.js, pharmacy-sales.js  
**Dependencies:** billing-request.js, firebase-config.js
