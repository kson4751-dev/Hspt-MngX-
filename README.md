# RxFlow - Hospital Management System

A comprehensive, clean, and modern hospital management system built with HTML, CSS, JavaScript, and Firebase.

## 🆕 Latest Updates

### ✅ Authentication System (November 2025)
- **Professional Login Page** - Clean split-screen design with branding
- **Real-time Firebase Authentication** - Secure email/password login
- **Role-Based Access Control** - 8 user roles with granular permissions
- **Session Management** - Remember me functionality
- **Auth Guards** - Protected routes and module access
- **Multi-user System** - Separate access for different departments

**Quick Start:** Open `start.html` for setup instructions or `login.html` to login

## Features

### ✨ Core Features
- **🔐 Secure Authentication** with Firebase Auth and role-based access control
- **👥 Multi-user functionality** with 8 specialized roles
- **📊 13 specialized modules** for complete hospital operations
- **🎨 Clean, minimalist design** using Montserrat font
- **🌓 Fast theme switching** between light and dark modes
- **📱 Responsive layout** with collapsible sidebar
- **☁️ Firebase integration** for authentication and data management

### 🎨 User Interface
- **Top Bar Components:**
  - Hospital logo and title
  - Instant theme toggle (light/dark)
  - Notifications with badge counter
  - Messages with badge counter
  - User profile dropdown menu
  
- **Sidebar Navigation:**
  - Collapsible sidebar with smooth animations
  - 13 modules with intuitive icons
  - Emergency module highlighted in red
  - Active state indicators
  - Responsive mobile menu

### 🏥 Modules
1. **Dashboard** - Overview and analytics
2. **Reception** - Patient registration and check-in
3. **Triage** - Patient assessment and prioritization
4. **Doctor** - Medical consultations and records
5. **Ward & Nursing** - Inpatient management, bed allocation, patient care, and vital monitoring
6. **Laboratory** - Test orders and results
7. **Pharmacy** - Medication dispensing
8. **Billing** - Financial transactions
9. **Inventory** - Stock management
10. **Expenses** - Cost tracking
11. **Admin Panel** - System administration
12. **Settings** - User preferences
13. **Emergency** - Critical care management

## 🔐 Role-Based Access Control

The system supports the following user roles:
- **Admin** - Full system access
- **Doctor** - Medical modules access
- **Nurse** - Patient care modules
- **Receptionist** - Front desk operations
- **Pharmacist** - Pharmacy management
- **Lab Technician** - Laboratory operations
- **Billing Staff** - Financial operations
- **Inventory Manager** - Stock management

## 🚀 Quick Start

### Option 1: Quick Setup Guide
1. Open `start.html` in your browser for a visual setup guide
2. Follow the step-by-step instructions
3. Create your first admin user
4. Login at `login.html`

### Option 2: Manual Setup

#### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase account (already configured)
- Local web server (VS Code Live Server recommended)

#### Step 1: Create First User
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to Authentication → Users → Add User
3. Create admin user:
   - Email: `admin@rxflow.com`
   - Password: `Admin@123` (or your choice)
4. Copy the generated UID

#### Step 2: Set User Role in Firestore
1. In Firebase Console → Firestore Database
2. Create collection: `users`
3. Add document with ID = UID from Step 1
4. Add fields:
   ```
   email: "admin@rxflow.com"
   displayName: "System Administrator"
   role: "admin"
   permissions: []
   active: true
   createdAt: [current timestamp]
   ```

#### Step 3: Login
1. Open `login.html` in browser
2. Enter credentials from Step 1
3. You'll be redirected to dashboard with full access

### Detailed Documentation
- **`USER_SETUP_GUIDE.md`** - Complete user creation and role setup
- **`LOGIN_IMPLEMENTATION.md`** - Technical authentication details
- **`FIREBASE_SETUP.md`** - Firebase configuration guide

## 🔑 Default Test Users

After creating users in Firebase, you can set up:

| Role | Email | Recommended Password | Access |
|------|-------|---------------------|---------|
| Admin | admin@rxflow.com | Admin@123 | All modules |
| Pharmacist | pharmacist@rxflow.com | Pharma@123 | Pharmacy modules only |
| Doctor | doctor@rxflow.com | Doctor@123 | Medical modules |
| Receptionist | receptionist@rxflow.com | Reception@123 | Front desk & billing |

## 🏃 Running the Application

### Using VS Code Live Server
1. Install Live Server extension
2. Right-click `start.html` or `login.html`
3. Select "Open with Live Server"

### Using Python
```bash
python -m http.server 8000
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (http-server)
   npx http-server
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:8000`

## 📁 Project Structure

```
rx/
├── index.html              # Main HTML file
├── css/
│   └── style.css          # All styling with CSS variables
├── js/
│   ├── app.js             # Main application logic
│   ├── firebase-config.js # Firebase configuration
│   └── auth.js            # Authentication & role management
└── README.md              # This file
```

## 🎨 Customization

### Changing Theme Colors
Edit the CSS variables in `css/style.css`:
```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #0ea5e9;
    --success-color: #10b981;
    --danger-color: #ef4444;
    --warning-color: #f59e0b;
}
```

### Adding New Modules
1. Add navigation item in `index.html`:
```html
<a href="#module-name" class="nav-item" data-module="module-name">
    <i class="fas fa-icon"></i>
    <span class="nav-text">Module Name</span>
</a>
```

2. Add module container:
```html
<div class="module" id="module-name-module">
    <!-- Module content here -->
</div>
```

3. Add role permissions in `js/auth.js`:
```javascript
const MODULE_PERMISSIONS = {
    'module-name': ['admin', 'role1', 'role2'],
    // ...
};
```

## 🔧 Features in Detail

### Theme Toggle
- Instant switching between light and dark themes
- Theme preference saved in localStorage
- Smooth transitions for all elements

### Collapsible Sidebar
- Click the hamburger menu to collapse/expand
- Icons remain visible when collapsed
- Sidebar state persists across sessions
- Fully responsive on mobile devices

### Role-Based Access
- Automatic navigation filtering based on user role
- Module-level access control
- Easy to configure in `auth.js`

## 🌐 Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📱 Responsive Design
- Desktop: Full layout with sidebar
- Tablet: Collapsible sidebar
- Mobile: Slide-out sidebar menu

## 🔜 Future Enhancements
- Complete Firebase authentication integration
- Real-time data synchronization
- Patient management features
- Appointment scheduling
- Medical records system
- Reporting and analytics
- Print functionality
- Export to PDF/Excel
- Multi-language support
- Email notifications

## 📄 License
This project is open source and available for educational and commercial use.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome!

## 📞 Support
For support, please contact your system administrator or development team.

---

**Built with ❤️ for better healthcare management**
