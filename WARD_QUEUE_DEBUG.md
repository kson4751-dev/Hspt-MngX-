# 🔍 Ward Queue Debugging Guide

## Issues Fixed:

### 1. ✅ Function Name Mismatch
**Problem**: Button called `referToWard()` but function was named `referToWardNursing()`
**Solution**: Renamed function to match button onclick handler

### 2. ✅ Functions Not Exposed Globally
**Problem**: `sendToNurse()` and `referToWard()` weren't accessible from HTML onclick
**Solution**: Added `window.sendToNurse = sendToNurse` and `window.referToWard = referToWard`

### 3. ✅ Enhanced Debugging
**Problem**: No visibility into data flow
**Solution**: Added comprehensive console logging throughout the entire flow

## 🧪 Testing Steps:

### Step 1: Open Browser Console (F12)
You should see these logs when page loads:
```
🏥 Initializing Ward & Nursing Module...
🔧 Setting up ward queue listener...
✅ Ward queue listener active and waiting for data...
```

### Step 2: Send Patient to Ward
1. Navigate to **Rx/Doctor module**
2. Select a patient from Lab Reports
3. Click **"Rx Treatment"**
4. Add at least one diagnosis
5. Click **"Nurse"** or **"Ward"** button

**Expected Console Logs:**
```
🏥 sendToNurse() called
📋 Current Rx Report: {patientId: "PT-001", patientName: "John Doe", ...}
📦 Collected Rx Data: {...}
✅ Firebase imported successfully
📤 Sending to wardQueue: {...}
✅ Successfully added to wardQueue with ID: abc123
```

### Step 3: Check Ward Module
Navigate to **Ward & Nursing** module

**Expected Console Logs:**
```
📥 Ward queue updated: 1 patients
📋 Queue data: [{patientId: "PT-001", ...}]
🎨 Rendering queue with 1 patients
✅ wardQueueContainer found: <div id="wardQueueContainer">
✅ Queue badge updated: 1
✅ Rendering 1 queue cards
✅ Queue cards rendered successfully
```

## 🐛 Debugging Checklist:

### If No Logs Appear in Console:

- [ ] Check browser console is open (F12)
- [ ] Refresh page completely (Ctrl+F5)
- [ ] Check if JavaScript files are loading (Network tab)
- [ ] Look for any red error messages

### If "sendToNurse is not defined" Error:

- [ ] Check if `window.sendToNurse = sendToNurse;` is present in app.js
- [ ] Verify app.js is loading after ward-nursing.js
- [ ] Check browser console for "undefined function" errors

### If Firebase Error:

- [ ] Check Firebase config is correct in firebase-config.js
- [ ] Verify Firebase collection name is "wardQueue" (case-sensitive)
- [ ] Check Firebase authentication is working
- [ ] Review Firebase security rules allow writes to wardQueue

### If Queue Not Showing in Ward Module:

- [ ] Verify you navigated to Ward & Nursing module
- [ ] Check console for "📥 Ward queue updated" message
- [ ] Verify data has `status: "pending"` (only pending items show)
- [ ] Check Firebase console to see if data was written

### If Queue Shows But Cards Empty:

- [ ] Check `wardQueueContainer` exists in HTML
- [ ] Verify patient data has required fields (patientId, patientName, age, gender)
- [ ] Look for JavaScript errors in createQueueCard function

## 📊 Data Structure Verification:

### Ward Queue Document (Firebase):
```javascript
{
  patientId: "PT-001",
  patientName: "John Doe",
  age: 45,
  gender: "Male",
  diagnosis: "Hypertension, Diabetes",
  referringDoctor: "Dr. Smith",
  treatmentPlan: "Insulin therapy required",
  medications: [...],
  priority: "normal" | "urgent",
  status: "pending",
  timestamp: Firebase Timestamp,
  type: "nursing-care" | "admission"
}
```

## 🔧 Manual Testing Commands:

### Test Firebase Connection:
Open browser console on the app page and run:
```javascript
import('./js/firebase-config.js').then(({db, collection, getDocs}) => {
  getDocs(collection(db, 'wardQueue')).then(snap => {
    console.log('Ward Queue Count:', snap.size);
    snap.forEach(doc => console.log(doc.id, doc.data()));
  });
});
```

### Test Ward Queue Listener:
```javascript
import('./js/firebase-helpers.js').then(({subscribeToWardQueue}) => {
  subscribeToWardQueue((queue) => {
    console.log('Queue received:', queue);
  });
});
```

### Manually Add Test Patient:
```javascript
import('./js/firebase-config.js').then(async ({db, collection, addDoc, serverTimestamp}) => {
  await addDoc(collection(db, 'wardQueue'), {
    patientId: "TEST-001",
    patientName: "Test Patient",
    age: 30,
    gender: "Male",
    diagnosis: "Test Diagnosis",
    referringDoctor: "Dr. Test",
    treatmentPlan: "Test treatment",
    medications: [],
    priority: "normal",
    status: "pending",
    timestamp: serverTimestamp(),
    type: "nursing-care"
  });
  console.log('Test patient added!');
});
```

## 🎯 Expected Behavior:

### Normal Flow (Nurse Button):
1. Doctor adds diagnosis in Rx modal
2. Clicks "Nurse" button
3. Patient added to wardQueue with `priority: "normal"`, `type: "nursing-care"`
4. Alert shows success message with Queue ID
5. Ward module instantly shows patient in queue
6. Queue badge shows count (e.g., "1")
7. Queue card displays patient details

### Urgent Flow (Ward Button):
1. Doctor adds diagnosis in Rx modal
2. Clicks "Ward" button
3. Patient added to wardQueue with `priority: "urgent"`, `type: "admission"`
4. Alert shows URGENT admission message
5. Ward module instantly shows patient with RED BORDER
6. Urgent badge visible on card

## 📝 Key Files:

1. **index.html** (Line ~6535): Rx modal buttons
2. **js/app.js** (Line ~5401): `sendToNurse()` function
3. **js/app.js** (Line ~5448): `referToWard()` function
4. **js/firebase-helpers.js** (Line ~820): `subscribeToWardQueue()` function
5. **js/ward-nursing.js** (Line ~32): `setupQueueListener()` function
6. **js/ward-nursing.js** (Line ~53): `renderQueue()` function

## ✅ Success Indicators:

- [ ] No console errors
- [ ] Alert message appears after clicking Nurse/Ward button
- [ ] Firebase console shows new document in wardQueue collection
- [ ] Ward module shows patient card
- [ ] Queue badge shows correct count
- [ ] Patient details display correctly on card
- [ ] View and Admit buttons appear

## 🚨 Common Errors:

### "Cannot read property 'patientId' of null"
**Cause**: currentRxReport is null
**Fix**: Ensure patient is selected before opening Rx modal

### "validateRxData is not defined"
**Cause**: Function not in scope
**Fix**: Check function is defined before sendToNurse/referToWard

### "Firebase: Missing or insufficient permissions"
**Cause**: Firebase security rules blocking write
**Fix**: Update Firestore rules to allow authenticated writes to wardQueue

### "Cannot find module './firebase-config.js'"
**Cause**: Import path incorrect
**Fix**: Verify firebase-config.js exists in js/ folder

---

**Last Updated**: November 24, 2025
**Status**: All fixes applied ✅
