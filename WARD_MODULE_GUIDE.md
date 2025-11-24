# 🏥 Ward & Nursing Module - Quick Reference Guide

## 🚀 How to Use the Ward Module

### For Doctors (Rx Module):

1. **Sending Patients to Ward**:
   - Open patient consultation in Rx/Doctor module
   - Complete diagnosis and treatment plan
   - Click **"Refer to Ward & Nursing"** button
   - Patient instantly appears in Ward module queue

### For Nurses (Ward Module):

1. **Viewing Queue**:
   - Navigate to **Ward & Nursing** from sidebar
   - See all pending admissions in queue cards
   - **Red border** = Urgent/Emergency patient
   - Statistics show current queue count

2. **Admitting Patient from Queue**:
   - Click **"Admit to Ward"** button on queue card
   - Enter bed number (e.g., "B-12", "Ward A-5")
   - Click OK
   - Patient moves to admitted patients table

3. **Managing Ward Patients**:
   - Search by patient ID, name, or bed number
   - Filter by status (Admitted, Stable, Critical, Discharged)
   - Click action buttons:
     - **👁️ View** - See patient details
     - **✏️ Edit** - Update patient info
     - **🖨️ Print** - Print patient record
     - **⚙️ Manage** - Full management interface

4. **Refreshing Data**:
   - Data updates automatically in realtime
   - Manual refresh buttons available if needed

## 📊 Dashboard Statistics

| Stat | Description |
|------|-------------|
| **Queue Count** | Patients waiting for admission |
| **Total Patients** | Currently in ward (excluding discharged) |
| **Admitted Today** | Patients admitted today |
| **Occupied Beds** | Beds currently in use |

## 🎨 Visual Indicators

- **🔴 Red Border Card** = Urgent/Emergency priority
- **🟢 Green Badge** = Bed number assigned
- **Status Colors**:
  - 🟢 Green = Admitted/Stable
  - 🔴 Red = Critical
  - ⚪ Gray = Discharged

## ⚡ Keyboard Shortcuts

- `Ctrl + F` or click search box - Quick search
- `Enter` in search - Execute search
- `Esc` - Clear search results

## 🔧 Troubleshooting

### Queue not showing patients?
- ✅ Check Firebase connection
- ✅ Verify doctor sent patient to ward (not other modules)
- ✅ Click "Refresh Queue" button

### Patient not moving to table after admission?
- ✅ Ensure bed number was entered
- ✅ Check Firebase console for ward_admissions collection
- ✅ Click "Refresh Ward Patients" button

### Statistics not updating?
- ✅ Statistics update automatically every time queue/patients change
- ✅ Check browser console for errors (F12)

## 📱 Mobile/Tablet Support

- Fully responsive design
- Touch-friendly buttons
- Swipe-friendly table
- Sidebar auto-collapses on mobile

## 🔐 Security Notes

- Only authenticated users can access ward module
- All actions logged to Firebase
- Patient data encrypted in transit
- HIPAA-compliant data handling

## 💡 Pro Tips

1. **Batch Admissions**: Queue cards show most urgent patients first
2. **Quick Print**: Print button generates instant patient record
3. **Search Power**: Search works across all fields (ID, name, bed, diagnosis)
4. **Status Filters**: Use filters to focus on critical patients
5. **Realtime Updates**: No need to refresh - updates happen automatically

## 🎯 Common Workflows

### Workflow 1: Emergency Admission
```
Doctor marks urgent → Queue shows red border → Nurse admits immediately → Critical status monitoring
```

### Workflow 2: Routine Admission
```
Doctor refers → Appears in queue → Nurse assigns bed → Monitor until discharge
```

### Workflow 3: Patient Discharge
```
Update status to "Discharged" → Patient moves out of active list → Bed becomes available
```

## 📞 Support

If you encounter issues:
1. Check browser console (F12) for error messages
2. Verify Firebase connection status
3. Check WARD_MODULE_REBUILD.md for technical details
4. Review Recent Activities in Dashboard for action logs

---

**Module Version**: 2.0  
**Last Updated**: January 2024  
**Status**: ✅ Production Ready
