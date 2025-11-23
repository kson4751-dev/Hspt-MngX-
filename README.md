# RxFlow - Hospital Management System

A comprehensive, clean, and modern hospital management system built with HTML, CSS, JavaScript, and Firebase.

## Features

### ✨ Core Features
- **Multi-user functionality** with role-based access control
- **14 specialized modules** for complete hospital operations
- **Clean, minimalist design** using Montserrat font
- **Fast theme switching** between light and dark modes
- **Responsive layout** with collapsible sidebar
- **Firebase integration** for authentication and data management

### 🎨 User Interface
- **Top Bar Components:**
  - Hospital logo and title
  - Instant theme toggle (light/dark)
  - Notifications with badge counter
  - Messages with badge counter
  - User profile dropdown menu
  
- **Sidebar Navigation:**
  - Collapsible sidebar with smooth animations
  - 14 modules with intuitive icons
  - Emergency module highlighted in red
  - Active state indicators
  - Responsive mobile menu

### 🏥 Modules
1. **Dashboard** - Overview and analytics
2. **Reception** - Patient registration and check-in
3. **Triage** - Patient assessment and prioritization
4. **Doctor** - Medical consultations and records
5. **Nursing** - Patient care management
6. **Laboratory** - Test orders and results
7. **Ward** - Inpatient management
8. **Pharmacy** - Medication dispensing
9. **Billing** - Financial transactions
10. **Inventory** - Stock management
11. **Expenses** - Cost tracking
12. **Admin Panel** - System administration
13. **Settings** - User preferences
14. **Emergency** - Critical care management

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

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A Firebase account (for backend services)
- A local web server or live server extension

### Installation

1. **Clone or download the project**
   ```bash
   cd c:\Users\user\Desktop\rx
   ```

2. **Set up Firebase**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Get your Firebase configuration

3. **Configure Firebase**
   - Open `js/firebase-config.js`
   - Replace the placeholder values with your Firebase credentials:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

4. **Enable Firebase modules**
   - Uncomment the import statements in `js/firebase-config.js`
   - The Firebase SDK is loaded from CDN

5. **Run the application**
   - Open `index.html` in your browser
   - Or use a local server:
   ```bash
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
