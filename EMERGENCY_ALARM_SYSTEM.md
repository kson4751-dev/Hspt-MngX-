# 🚨 Emergency Alarm System - Real-Time Broadcasting

## Overview
The Emergency Alarm System broadcasts **real-time alerts to ALL logged-in users** with sound notifications and pop-up modals. The alarm can be triggered from:
1. **Top Navigation Bar** - Global "SOUND ALARM" button (accessible from anywhere)
2. **Emergency Module** - "Sound Alarm" button in the module header

## Quick Access

### 🔴 Top Navigation Bar Button
- **Location**: Top-right of the screen, left of theme toggle
- **Appearance**: Pulsing red button with bullhorn icon and "SOUND ALARM" text
- **Access**: Available on **every page** in the system
- **Animation**: Pulsing glow effect and shaking icon
- **Responsive**: Text hidden on smaller screens, icon-only button

This makes emergency alarms accessible from **any module** without navigating to Emergency Department first.

## How It Works

### 1. **Triggering the Alarm**
When any user clicks the "Sound Alarm" button in the Emergency module:
- Creates a new alarm document in Firebase `emergency_alarms` collection
- Broadcasts to **ALL logged-in users** simultaneously via real-time listeners
- Plays emergency siren sound (WIU WIU WIU ambulance style)
- Shows confirmation that alarm was sent to all users

### 2. **Real-Time Broadcasting**
- **Firebase Collection**: `emergency_alarms`
- **Real-Time Listener**: Active for ALL logged-in users
- **Trigger Type**: Firestore `onSnapshot` listener
- **Broadcast Scope**: Hospital-wide (all authenticated users)

### 3. **What Each User Receives**
When an alarm is triggered, every logged-in user automatically receives:

#### A. **Emergency Siren Sound** 🔊
- 4-second ambulance siren (WIU WIU WIU)
- European-style emergency alert
- Plays automatically when alarm is triggered
- Uses Web Audio API for consistent sound

#### B. **Pop-Up Modal** 📢
- Full-screen modal with red emergency theme
- Animated pulsing effect
- Cannot be ignored (requires acknowledgment)
- Contains:
  - Emergency alarm icon
  - "CODE RED - EMERGENCY ALARM ACTIVATED" message
  - Details: Who triggered it, time, severity
  - Instructions for staff
  - "ACKNOWLEDGE & CLOSE" button

#### C. **Browser Notification** 🔔
- Native browser notification (if permitted)
- Shows even when browser is in background
- Requires interaction to dismiss
- Vibration pattern on mobile devices

### 4. **Alarm Acknowledgment**
- Each user must click "ACKNOWLEDGE & CLOSE" button
- Records which users have acknowledged the alarm
- Prevents duplicate alerts for the same alarm
- Updates Firebase with acknowledgment status

## Technical Implementation

### Firebase Structure
```javascript
emergency_alarms (collection)
  └── {alarmId} (document)
      ├── triggeredBy: "user123"
      ├── triggeredByName: "Dr. Smith"
      ├── message: "🚨 CODE RED - EMERGENCY ALARM ACTIVATED"
      ├── description: "All staff report to emergency stations..."
      ├── severity: "critical"
      ├── timestamp: Timestamp
      ├── acknowledged: ["user1", "user2", "user3"]
      └── active: true
```

### Real-Time Listener
Every logged-in user has an active listener that:
- Monitors `emergency_alarms` collection
- Filters for `active: true` alarms
- Checks if user hasn't acknowledged yet
- Triggers sound + modal instantly when new alarm detected

### Key Functions

#### `soundEmergencyAlarm()` - Trigger Alarm
```javascript
// Located in: js/app.js
// Triggered by: Emergency module "Sound Alarm" button
// Action: Creates alarm document in Firebase
// Result: Broadcasts to ALL users via real-time listeners
```

#### `initEmergencyAlarmListener()` - Listen for Alarms
```javascript
// Located in: js/app.js
// Initialized: On page load for every user
// Action: Subscribes to emergency_alarms collection
// Result: Receives alarms in real-time
```

#### `showEmergencyAlarmModal()` - Display Pop-up
```javascript
// Located in: js/app.js
// Triggered by: New alarm received via listener
// Action: Creates and displays modal overlay
// Result: User sees emergency alarm pop-up
```

#### `acknowledgeEmergencyAlarm()` - Close Alarm
```javascript
// Located in: js/app.js
// Triggered by: User clicking "ACKNOWLEDGE & CLOSE"
// Action: Updates Firebase with user acknowledgment
// Result: Modal closes, alarm marked as acknowledged
```

## User Experience Flow

### For the Person Triggering the Alarm:
1. Clicks "Sound Alarm" button in Emergency module
2. Hears emergency siren sound immediately
3. Sees local emergency banner
4. Gets confirmation: "All logged-in staff have been alerted!"

### For All Other Logged-In Users:
1. **Instant alert** - No delay, real-time via Firebase
2. **Siren plays automatically** - 4-second emergency sound
3. **Pop-up modal appears** - Cannot miss it, full attention required
4. **Must acknowledge** - Click button to close and confirm receipt
5. **Browser notification** - Shows in system notifications

## Testing the System

### Test Scenario 1: Single User
1. Login to the system
2. Navigate to Emergency module
3. Click "Sound Alarm" button
4. You should hear siren and see pop-up (self-notification)

### Test Scenario 2: Multiple Users
1. Open system in **multiple browser tabs/windows** (different users)
2. Login as different users in each tab
3. In one tab, trigger the alarm
4. **All other tabs** should:
   - Play siren sound
   - Show emergency pop-up modal
   - Display browser notification

### Test Scenario 3: Real-World
1. Have multiple staff members login on different devices
2. One person triggers emergency alarm
3. Everyone gets instant notification
4. Each person acknowledges independently

## Features & Benefits

### ✅ Real-Time Broadcasting
- Uses Firebase Firestore real-time listeners
- No polling or page refresh needed
- Instant delivery (< 1 second latency)

### ✅ Sound Alerts
- Automatic emergency siren playback
- Attention-grabbing ambulance sound
- Works even if page is in background

### ✅ Visual Alerts
- Full-screen modal pop-up
- Pulsing red emergency theme
- Cannot be accidentally ignored

### ✅ Acknowledgment Tracking
- Records who acknowledged the alarm
- Prevents duplicate alerts
- Audit trail for compliance

### ✅ Multi-Device Support
- Works on desktop, tablet, mobile
- Browser notifications
- Vibration on mobile devices

## Firestore Security Rules

To ensure proper functionality, add these Firestore rules:

```javascript
// Emergency Alarms - All authenticated users can read
match /emergency_alarms/{alarmId} {
  // Anyone can read active alarms
  allow read: if request.auth != null;
  
  // Only authenticated users can create alarms
  allow create: if request.auth != null;
  
  // Users can update to acknowledge
  allow update: if request.auth != null;
}
```

## Browser Permissions

### Notification Permission
- System requests notification permission on first alarm
- Users should allow notifications for best experience
- Works without permission but less effective

### Audio Permission
- Modern browsers may require user interaction for audio
- First click enables audio playback
- No explicit permission needed

## Troubleshooting

### Issue: No sound playing
**Solution**: Check browser audio permissions and volume settings

### Issue: Modal not appearing
**Solution**: Check browser console for JavaScript errors, ensure Firebase connection active

### Issue: Only triggering user gets alert
**Solution**: Verify other users are logged in and Firebase listeners are initialized

### Issue: Delay in receiving alarm
**Solution**: Check internet connection, Firebase may have connectivity issues

## Future Enhancements (Optional)

- [ ] Add alarm categories (Fire, Medical, Security, etc.)
- [ ] Allow alarm cancellation/deactivation
- [ ] Show list of who has/hasn't acknowledged
- [ ] Add location-specific alarms (floor, department)
- [ ] Emergency alarm history and reporting
- [ ] SMS/Email notifications integration
- [ ] Custom alarm sounds for different emergency types

## Summary

The Emergency Alarm System is now a **fully functional, real-time broadcasting system** that:
- ✅ Alerts ALL logged-in users simultaneously
- ✅ Plays emergency siren sound automatically
- ✅ Shows mandatory pop-up modal
- ✅ Tracks acknowledgments
- ✅ Works across all devices and browser tabs
- ✅ Provides instant hospital-wide emergency communication

**Test it now by logging in with multiple users and clicking "Sound Alarm"!** 🚨
