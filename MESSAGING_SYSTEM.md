# Staff Internal Messaging System

## Overview
A complete internal messaging system for staff communication within the RxFlow Hospital Management System.

## Features

### 📬 Message Dropdown
- Real-time message notifications with badge counter
- Quick preview of recent messages (up to 20)
- Unread message indicators with visual highlighting
- Sender avatars with initials
- Message preview with subject and content snippet
- Urgent message markers
- One-click access to compose new messages
- Timestamp display (relative time: "5m ago", "2h ago", etc.)

### ✉️ Compose Message
- Send messages to individual staff members
- Send to groups (All Staff, All Doctors, All Nurses, etc.)
- Subject line (max 100 characters)
- Message content (max 1000 characters)
- Mark messages as urgent
- Pre-populated staff list from database
- Form validation

### 👁️ View Message
- Full message display modal
- Sender information
- Timestamp
- Urgent indicator (if applicable)
- Reply functionality
- Auto-mark as read when opened

### 🔔 Real-time Updates
- Firebase Firestore real-time listeners
- Instant message delivery
- Automatic badge count updates
- No page refresh required

## Technical Implementation

### Files Created/Modified

1. **js/messages.js** (NEW)
   - Complete messaging functionality
   - Firebase integration
   - Real-time listeners
   - Message CRUD operations

2. **index.html** (MODIFIED)
   - Added messages dropdown to top bar
   - Added compose message modal
   - Added view message modal
   - Script import for messages.js

3. **css/style.css** (MODIFIED)
   - Messages dropdown styling
   - Message item cards
   - Modal styling
   - Mobile responsive design
   - Unread indicators
   - Badge animations

### Firebase Collections

**messages** collection structure:
```javascript
{
  senderId: "user_id",
  senderName: "John Doe",
  recipients: ["user_id_1", "user_id_2", ...],
  subject: "Meeting Tomorrow",
  content: "Please remember...",
  isUrgent: false,
  timestamp: Firestore.Timestamp,
  readBy: ["user_id_1"],
  createdAt: "ISO_date_string"
}
```

### User Roles & Permissions
All authenticated staff members can:
- Send messages to any staff member
- Send messages to role-based groups
- Receive messages
- Reply to messages
- View message history

## Usage

### For Staff Members

#### Sending a Message
1. Click the message icon in the top navigation bar
2. Click the "Compose" button in the dropdown
3. Select recipient(s):
   - Individual staff member
   - All Staff
   - Role-based groups (Doctors, Nurses, etc.)
4. Enter subject and message content
5. Optionally mark as urgent
6. Click "Send Message"

#### Reading Messages
1. Click the message icon to view recent messages
2. Unread messages are highlighted with a blue accent
3. Click any message to view full content
4. Message is automatically marked as read

#### Replying to Messages
1. Open a message in the view modal
2. Click "Reply" button
3. Compose modal opens with recipient pre-filled
4. Subject is pre-filled with "Re: [original subject]"
5. Type response and send

### Recipient Options

- **All Staff** - Sends to everyone except sender
- **All Doctors** - Sends to all users with "doctor" role
- **All Nurses** - Sends to all users with "nurse" role
- **All Pharmacists** - Sends to all users with "pharmacist" role
- **All Lab Technicians** - Sends to all users with "lab-tech" role
- **All Administrators** - Sends to all users with "administrator" role
- **Individual Staff** - Select specific user from dropdown

## UI/UX Features

### Visual Indicators
- **Badge Counter**: Shows unread message count on message icon
- **Unread Highlight**: Light blue background for unread messages
- **Blue Accent Bar**: Left border on unread messages
- **Urgent Flag**: Red warning icon for urgent messages
- **Avatar Initials**: Colorful avatars with sender initials
- **Time Display**: Smart relative time formatting

### Animations & Transitions
- Smooth dropdown slide-in effect
- Fade transitions on hover
- Badge pulse animation
- Modal fade-in/out

### Mobile Responsive
- Full-width dropdown on mobile devices
- Touch-friendly tap targets
- Optimized spacing for small screens
- Scrollable message list

## Future Enhancements

Potential features for future development:
- [ ] Message threads/conversations
- [ ] File attachments
- [ ] Message search functionality
- [ ] Message filtering (Unread, Urgent, Starred)
- [ ] Delete messages
- [ ] Archive messages
- [ ] Draft messages
- [ ] Message templates
- [ ] Push notifications (web push)
- [ ] Email notifications for urgent messages
- [ ] Message scheduling
- [ ] Group conversations
- [ ] Message reactions (like, acknowledge)

## Troubleshooting

### Messages not loading
- Check Firebase console for active connection
- Verify Firestore security rules allow read access
- Check browser console for errors
- Ensure user is authenticated

### Badge not updating
- Check real-time listener is active
- Verify message query includes current user
- Check readBy array structure

### Cannot send messages
- Verify recipient selection
- Check required fields (subject, content)
- Ensure sender has valid user data
- Check Firestore write permissions

## Security Considerations

### Current Implementation
- Messages stored in Firestore
- Real-time listeners for instant updates
- Read tracking per user
- Sender authentication required

### Recommended Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /messages/{messageId} {
      // Allow users to read messages where they are recipients
      allow read: if request.auth != null && 
                     request.auth.uid in resource.data.recipients;
      
      // Allow authenticated users to create messages
      allow create: if request.auth != null && 
                       request.auth.uid == request.resource.data.senderId;
      
      // Allow recipients to update (mark as read)
      allow update: if request.auth != null && 
                       request.auth.uid in resource.data.recipients;
    }
  }
}
```

## Browser Compatibility

Tested and working on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Notes

- Message list limited to 20 most recent messages
- Real-time listener efficiently updates only changed messages
- Badge count calculated client-side for instant feedback
- Avatars generated with CSS (no image loading)
- Lazy loading for message content

---

**Version**: 1.0.0  
**Date**: November 24, 2025  
**Author**: RxFlow Development Team
