# Billing Module - Implementation Guide

## Overview
Complete billing and payment management system for RxFlow Hospital Management System.

## Features Implemented

### 1. **Patient Search & Selection**
- Real-time search by patient number, name, or phone
- Auto-complete search results
- Patient information display (number, name, age, gender)
- Loads patients from Firestore `patients` collection

### 2. **Billing Components**
- **Consultation Fee Section**
  - Toggle switch to enable/disable
  - Amount input field
  - Status selector (Paid/Pending)
  
- **Additional Services**
  - Dynamic add/remove service items
  - Service description and amount fields
  - Support for imaging, lab tests, etc.
  
- **Pharmacy Payment**
  - Toggle to enable pharmacy charges
  - Prescription number reference
  - Amount input field

### 3. **Bill Summary**
- Real-time calculation of totals
- Breakdown by: Consultation, Services, Pharmacy
- Grand total display
- Currency formatting (KSh)

### 4. **Payment Processing**
- Multiple payment methods:
  - Cash
  - M-Pesa
  - Credit/Debit Card
  - Bank Transfer
  - Insurance
- Payment reference field
- Notes field for additional information

### 5. **Receipt Generation**
- Auto-generated receipt numbers (RCP-timestamp)
- Professional receipt layout with:
  - Hospital header
  - Patient information
  - Itemized services
  - Payment details
  - Date and time
- Print functionality

### 6. **View & Manage Bills**
- Comprehensive billing table
- Search by patient name, number, or receipt
- Filter by:
  - Payment status (Paid/Pending/Cancelled)
  - Payment method
  - Date
- Pagination controls (25, 50, 100 items per page)
- Status badges with color coding

### 7. **Bill Actions**
- View bill/receipt
- Cancel bill (updates status to cancelled)
- Print receipt

### 8. **Statistics Dashboard**
- Today's revenue
- Today's payment count
- Pending bills count
- Monthly revenue

### 9. **Firebase Integration**
- Real-time Firestore sync
- Auto-save to `bills` collection
- onSnapshot listener for live updates
- Timestamp tracking (created, cancelled)

## File Structure

```
js/
  ├── billing.js          # Main billing module
  ├── firebase-config.js  # Firebase configuration
  └── app.js             # Main application

index.html              # Billing UI sections
css/style.css          # Billing styles
```

## Usage Instructions

### For Hospital Staff

#### Creating a New Bill:
1. Navigate to **Billing → Create Bill**
2. Search for patient using:
   - Patient number
   - Patient name
   - Phone number
3. Select patient from search results
4. Enable required sections:
   - ✅ Consultation Fee (if applicable)
   - ✅ Additional Services (add as needed)
   - ✅ Pharmacy Payment (if applicable)
5. Enter amounts and details
6. Check the bill summary
7. Select payment method
8. Add payment reference (if applicable)
9. Add notes (optional)
10. Click **Process Payment**
11. Receipt will be displayed automatically
12. Print receipt if needed

#### Viewing Bills:
1. Navigate to **Billing → View Bills**
2. Use search to find specific bills
3. Apply filters:
   - Status filter
   - Payment method filter
   - Date filter
4. Click **View** to see receipt
5. Click **Cancel** to cancel a bill

### For Developers

#### Initialize Module:
The module auto-initializes when the billing section becomes active using a MutationObserver.

#### Data Structure (Firestore):

**Collection: `bills`**
```javascript
{
  receiptNumber: "RCP-1234567890",
  patientId: "patient-id",
  patientNumber: "P001",
  patientName: "John Doe",
  patientAge: 35,
  patientGender: "Male",
  items: [
    {
      type: "consultation",
      description: "Consultation Fee",
      amount: 500,
      status: "paid"
    },
    {
      type: "service",
      description: "X-Ray",
      amount: 1500,
      status: "paid"
    },
    {
      type: "pharmacy",
      description: "Pharmacy Payment (PRX-123)",
      amount: 2500,
      status: "paid",
      prescriptionNumber: "PRX-123"
    }
  ],
  totalAmount: 4500,
  paymentMethod: "mpesa",
  paymentReference: "ABC123XYZ",
  notes: "Additional notes",
  status: "paid",
  createdAt: Timestamp,
  createdBy: "Current User",
  dateTime: "2024-01-15T10:30:00Z"
}
```

#### Key Functions:

- `initBillingModule()` - Initialize create bill interface
- `initViewBillsModule()` - Initialize view bills interface
- `selectPatient(patientId)` - Select patient for billing
- `processBilling()` - Process and save bill
- `showReceipt(billData)` - Display receipt modal
- `viewBill(billId)` - View existing bill
- `cancelBill(billId)` - Cancel a bill
- `updateBillSummary()` - Recalculate totals

#### Events:
- Patient search: Debounced 300ms
- Real-time sync: onSnapshot listener
- Form validation: Before submission
- Auto-calculation: On input changes

## Responsive Design

The billing module is fully responsive with breakpoints:
- **Desktop**: Full 3-column layout
- **Tablet (≤1024px)**: 2-column layout
- **Mobile (≤768px)**: Single column
- **Small Mobile (≤480px)**: Compact layout

## Integration Points

### From Reception Module:
- Patients registered in reception appear in billing search
- Consultation fees can be tracked from registration

### To Pharmacy Module:
- Pharmacy payments reference prescription numbers
- Links pharmacy transactions to billing

### From Doctor Module:
- Doctor consultations generate billing charges
- Treatment fees tracked

## Security Notes

- User authentication required (via Firebase Auth)
- All transactions timestamped
- Audit trail with `createdBy` and `cancelledBy` fields
- Receipt numbers are unique and sequential
- Cancellations are logged, not deleted

## Future Enhancements

- [ ] Insurance claim integration
- [ ] Batch billing export
- [ ] Email/SMS receipt delivery
- [ ] Payment installment plans
- [ ] Discount management
- [ ] Bill amendments history
- [ ] Advanced analytics dashboard
- [ ] Multi-currency support

## Troubleshooting

### Common Issues:

1. **No patients found in search**
   - Ensure patients are registered in `patients` collection
   - Check Firebase connection

2. **Bill not saving**
   - Verify Firebase rules allow writes to `bills` collection
   - Check browser console for errors

3. **Receipt not printing**
   - Allow pop-ups in browser settings
   - Check printer connection

4. **Real-time updates not working**
   - Verify onSnapshot listener is active
   - Check Firestore connection

## Support

For issues or questions, contact the development team or check the Firebase console logs.

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Module**: Billing & Payments
