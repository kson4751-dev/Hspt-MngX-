# Firebase Setup Instructions for RxFlow

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or "Create a project"
3. Enter project name: **RxFlow** (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create Project"

## Step 2: Set Up Authentication

1. In Firebase Console, go to **Build** > **Authentication**
2. Click "Get Started"
3. Enable **Email/Password** sign-in method
4. Click "Save"

## Step 3: Set Up Firestore Database

1. In Firebase Console, go to **Build** > **Firestore Database**
2. Click "Create database"
3. Start in **Production mode** (we'll set up rules next)
4. Choose a location (select closest to your users)
5. Click "Enable"

## Step 4: Set Up Firestore Security Rules

Click on the **Rules** tab and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Allow authenticated users to read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Patients - role-based access
    match /patients/{patientId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'receptionist', 'doctor', 'nurse'];
      allow update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'receptionist'];
    }
    
    // Triage Queue
    match /triage_queue/{queueId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'receptionist', 'nurse'];
      allow update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'nurse'];
    }
    
    // Triage Records
    match /triage_records/{recordId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'nurse'];
      allow update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'nurse'];
    }
    
    // Doctor Queue
    match /doctor_queue/{queueId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'nurse', 'doctor'];
      allow update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'doctor'];
    }
    
    // Doctor Records (Consultations)
    match /doctor_records/{recordId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'doctor'];
      allow update, delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'doctor'];
    }
    
    // Pharmacy Inventory
    match /pharmacy_inventory/{itemId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'pharmacist'];
    }
    
    // Pharmacy Sales
    match /pharmacy_sales/{saleId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'pharmacist'];
    }
    
    // Inventory
    match /inventory/{itemId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'inventory_manager'];
    }
    
    // Expenses
    match /expenses/{expenseId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'billing'];
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'billing'];
    }
    
    // Beds
    match /beds/{bedId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'nurse'];
    }
    
    // Emergencies
    match /emergencies/{emergencyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'doctor', 'nurse'];
    }
  }
}
```

## Step 5: Set Up Storage (Optional)

1. In Firebase Console, go to **Build** > **Storage**
2. Click "Get Started"
3. Start in **Production mode**
4. Click "Next" and "Done"

## Step 6: Get Your Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the **Web** icon (`</>`)
4. Register your app with a nickname (e.g., "RxFlow Web App")
5. Copy the `firebaseConfig` object

## Step 7: Configure RxFlow

1. Open `js/firebase-config.js`
2. Replace the placeholder values with your Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:xxxxxxxxxxxxx"
};
```

## Step 8: Create Initial Admin User

You can create your first admin user in two ways:

### Option A: Firebase Console
1. Go to **Authentication** > **Users**
2. Click "Add user"
3. Enter email and password
4. Go to **Firestore Database**
5. Create a new document in the `users` collection:
   - Document ID: Use the UID from Authentication
   - Fields:
     ```
     email: "admin@rxflow.com"
     displayName: "Admin User"
     role: "admin"
     status: "active"
     createdAt: (timestamp)
     ```

### Option B: Using Console
1. Open browser console (F12)
2. After logging in, run:
```javascript
import { createUserProfile } from './js/firebase-helpers.js';
import { auth } from './js/firebase-config.js';

createUserProfile(auth.currentUser.uid, {
    email: auth.currentUser.email,
    displayName: "Admin User",
    role: "admin",
    status: "active"
});
```

## Firestore Collections Structure

The system uses these collections:

```
/patients
  - id (auto-generated)
  - firstName
  - lastName
  - dateOfBirth
  - gender
  - phone
  - email
  - address
  - createdAt
  - updatedAt

/pharmacy_inventory
  - id (auto-generated)
  - name
  - description
  - quantity
  - price
  - expiryDate
  - supplier
  - createdAt
  - updatedAt

/pharmacy_sales
  - id (auto-generated)
  - items (array)
  - totalAmount
  - paymentMethod
  - customerId
  - createdAt

/inventory
  - id (auto-generated)
  - name
  - category
  - quantity
  - unit
  - reorderLevel
  - supplier
  - createdAt
  - updatedAt

/expenses
  - id (auto-generated)
  - title
  - amount
  - category
  - description
  - date
  - approvedBy
  - createdAt

/users
  - uid (from Auth)
  - email
  - displayName
  - role
  - status
  - createdAt
  - updatedAt

/beds
  - id (auto-generated)
  - number
  - ward
  - status (available/occupied)
  - patientId

/emergencies
  - id (auto-generated)
  - patientId
  - severity
  - description
  - date
  - status
```

## Testing the Connection

1. Open `index.html` in your browser
2. Open the browser console (F12)
3. You should see: "Firebase initialized with realtime database support"
4. Any errors will be displayed in the console

## Realtime Updates

The system now supports realtime updates for:
- **Dashboard statistics** - Updates automatically when data changes
- **Patient lists** - New patients appear instantly
- **Pharmacy inventory** - Stock levels update in realtime
- **Sales records** - New transactions appear immediately
- **Expenses** - New expenses show up instantly
- **Inventory items** - Stock changes reflect immediately

## Next Steps

1. Create test users with different roles
2. Test role-based access by logging in with different accounts
3. Start building out the module functionality
4. Customize Firestore rules based on your specific requirements

## Important Notes

- Keep your `firebaseConfig` secure (don't commit to public repos)
- Regularly backup your Firestore data
- Monitor Firebase usage in the console
- Set up billing alerts to avoid unexpected charges
- Use Firebase Emulator Suite for local development and testing

## Support

For issues or questions about Firebase setup, refer to:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
