/**
 * Profile & Settings Module
 * Real-time profile management with image upload
 * 
 * STORAGE STRATEGY:
 * - Profile images: Stored PERMANENTLY in Firebase Storage (cloud)
 * - Image URLs: Cached in localStorage for instant loading
 * - Profile data: Stored in Firestore users collection (permanent)
 * - On page load: Instantly shows cached image, then syncs with Firebase
 * - On upload: Saves to Firebase Storage → Updates Firestore → Updates localStorage → Updates UI
 * - Cross-device: Images sync across all devices via Firebase
 * - Offline: Shows cached image from localStorage until online
 */

import { db, storage, auth } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Get current user info
function getCurrentUser() {
    const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
    return {
        uid: storageType.getItem('userId'),
        email: storageType.getItem('userEmail'),
        displayName: storageType.getItem('userName'),
        role: storageType.getItem('userRole'),
        department: storageType.getItem('userDepartment'),
        photoURL: storageType.getItem('userPhotoURL') || 'https://via.placeholder.com/150'
    };
}

// Initialize settings module
function initProfileSettings() {
    console.log('🔧 Initializing Profile & Settings...');
    
    // Load cached theme immediately for instant application
    loadCachedTheme();
    
    // Wait for DOM to be fully ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupModule();
        });
    } else {
        setupModule();
    }
}

// Load cached theme from localStorage immediately (before Firebase loads)
function loadCachedTheme() {
    const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
    const cachedTheme = storageType.getItem('userTheme');
    
    if (cachedTheme) {
        console.log('⚡ Applying cached theme immediately:', cachedTheme);
        applyTheme(cachedTheme);
    }
}

function setupModule() {
    // Load cached photo immediately for instant display
    loadCachedPhoto();
    
    // Setup tab switching
    setupTabs();
    
    // Load user profile
    loadUserProfile();
    
    // Setup form handlers
    setupProfileForm();
    setupPreferencesForm();
    setupSecurityForm();
    setupPhotoUpload();
    
    console.log('✅ Profile & Settings module initialized');
}

// Load cached photo from localStorage immediately (before Firebase loads)
function loadCachedPhoto() {
    const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
    const cachedPhotoURL = storageType.getItem('userPhotoURL');
    
    if (cachedPhotoURL && cachedPhotoURL !== 'null' && cachedPhotoURL !== 'undefined') {
        console.log('⚡ Loading cached photo for instant display:', cachedPhotoURL);
        
        // Update preview image
        const previewImg = document.getElementById('profilePhotoPreview');
        if (previewImg) {
            previewImg.src = cachedPhotoURL;
        }
        
        // Update top bar immediately
        const topBarPhoto = document.querySelector('.profile-img');
        if (topBarPhoto) {
            topBarPhoto.src = cachedPhotoURL;
        }
        
        console.log('✅ Cached photo loaded instantly');
    }
}

// Setup tab switching
function setupTabs() {
    const tabs = document.querySelectorAll('.settings-tab');
    const tabContents = document.querySelectorAll('.settings-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Add active to clicked tab
            tab.classList.add('active');
            document.getElementById(`${targetTab}Tab`).classList.add('active');
        });
    });
}

// Load user profile from Firebase and sync with localStorage
async function loadUserProfile() {
    try {
        const user = getCurrentUser();
        if (!user.uid) {
            console.error('No user ID found');
            return;
        }
        
        console.log('☁️ Loading profile from Firebase Firestore...');
        
        // Load from Firestore (permanent storage)
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Populate profile fields
            document.getElementById('profileDisplayName').value = userData.displayName || user.displayName || '';
            document.getElementById('profileEmail').value = userData.email || user.email || '';
            document.getElementById('profileRole').value = userData.role || user.role || '';
            document.getElementById('profileDepartment').value = userData.department || user.department || '';
            document.getElementById('profilePhone').value = userData.phone || '';
            document.getElementById('profileBio').value = userData.bio || '';
            
            // Set profile photo and cache to localStorage
            const photoURL = userData.photoURL || user.photoURL;
            if (photoURL) {
                console.log('🖼️ Loading profile photo from Firebase:', photoURL);
                document.getElementById('profilePhotoPreview').src = photoURL;
                updateTopBarPhoto(photoURL); // This also caches to localStorage
            }
            
            // Populate preferences with proper IDs
            const emailNotifEl = document.getElementById('prefEmailNotifications');
            const pushNotifEl = document.getElementById('prefPushNotifications');
            const soundAlertsEl = document.getElementById('prefSoundAlerts');
            const themeEl = document.getElementById('prefTheme');
            
            if (emailNotifEl) emailNotifEl.checked = userData.preferences?.emailNotifications ?? true;
            if (pushNotifEl) pushNotifEl.checked = userData.preferences?.pushNotifications ?? true;
            if (soundAlertsEl) soundAlertsEl.checked = userData.preferences?.soundAlerts ?? true;
            if (themeEl) themeEl.value = userData.preferences?.theme || 'light';
            
            // Apply preferences immediately
            if (userData.preferences) {
                if (userData.preferences.theme) {
                    applyTheme(userData.preferences.theme);
                }
                if (typeof userData.preferences.soundAlerts !== 'undefined') {
                    applySoundSettings(userData.preferences.soundAlerts);
                }
            }
            
            // Show session info
            const lastLoginEl = document.getElementById('lastLoginTime');
            const sessionStartEl = document.getElementById('sessionStartTime');
            
            if (lastLoginEl) {
                lastLoginEl.textContent = userData.lastLogin ? 
                    new Date(userData.lastLogin.toDate()).toLocaleString() : 'N/A';
            }
            if (sessionStartEl) {
                sessionStartEl.textContent = 
                    sessionStorage.getItem('sessionStartTime') || new Date().toLocaleString();
            }
            
            console.log('✅ User profile loaded');
        } else {
            // Create initial profile document
            await createInitialProfile(user);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Load Error', 'Failed to load profile data', 'error');
    }
}

// Create initial profile
async function createInitialProfile(user) {
    try {
        const initialData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            department: user.department,
            photoURL: user.photoURL,
            phone: '',
            bio: '',
            preferences: {
                emailNotifications: true,
                pushNotifications: true,
                soundAlerts: false,
                theme: 'light'
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        };
        
        await setDoc(doc(db, 'users', user.uid), initialData);
        console.log('✅ Initial profile created');
        
        // Reload to populate fields
        loadUserProfile();
    } catch (error) {
        console.error('Error creating initial profile:', error);
    }
}

// Setup profile form
function setupProfileForm() {
    const form = document.getElementById('profileForm');
    
    if (!form) {
        console.warn('⚠️ Profile form not found');
        return;
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        try {
            // Disable button and show loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            const user = getCurrentUser();
            if (!user.uid) {
                throw new Error('No user ID found');
            }
            
            const displayName = document.getElementById('profileDisplayName').value.trim();
            const phone = document.getElementById('profilePhone').value.trim();
            const bio = document.getElementById('profileBio').value.trim();
            
            if (!displayName) {
                showNotification('Validation Error', 'Display name is required', 'warning');
                return;
            }
            
            console.log('💾 Saving profile data...');
            
            // Update Firestore
            await updateDoc(doc(db, 'users', user.uid), {
                displayName: displayName,
                phone: phone,
                bio: bio,
                updatedAt: serverTimestamp()
            });
            
            // Update localStorage
            const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
            storageType.setItem('userName', displayName);
            
            // Update top bar display name
            const profileNameEl = document.getElementById('profileName');
            if (profileNameEl) {
                profileNameEl.textContent = displayName;
                console.log('✅ Top bar name updated to:', displayName);
            }
            
            showNotification('Profile Updated', 'Your profile has been saved successfully', 'success');
            console.log('✅ Profile updated successfully');
            
        } catch (error) {
            console.error('❌ Error updating profile:', error);
            showNotification('Update Error', 'Failed to save profile: ' + error.message, 'error');
        } finally {
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
    
    console.log('✅ Profile form handler attached');
}

// Setup preferences form with real-time updates
function setupPreferencesForm() {
    const form = document.getElementById('preferencesForm');
    
    if (!form) {
        console.warn('⚠️ Preferences form not found');
        return;
    }
    
    // Get preference elements
    const emailNotifEl = document.getElementById('prefEmailNotifications');
    const pushNotifEl = document.getElementById('prefPushNotifications');
    const soundAlertsEl = document.getElementById('prefSoundAlerts');
    const themeEl = document.getElementById('prefTheme');
    
    // Apply theme immediately on change
    if (themeEl) {
        themeEl.addEventListener('change', async (e) => {
            const theme = e.target.value;
            console.log('🎨 Applying theme:', theme);
            applyTheme(theme);
            await savePreferencesToFirebase({ theme });
            showNotification('Theme Changed', `Switched to ${theme} theme`, 'success');
        });
    }
    
    // Apply notification settings immediately on change
    if (emailNotifEl) {
        emailNotifEl.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            console.log('📧 Email notifications:', enabled ? 'enabled' : 'disabled');
            await savePreferencesToFirebase({ emailNotifications: enabled });
            showNotification('Setting Updated', `Email notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
        });
    }
    
    if (pushNotifEl) {
        pushNotifEl.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            console.log('🔔 Push notifications:', enabled ? 'enabled' : 'disabled');
            await savePreferencesToFirebase({ pushNotifications: enabled });
            showNotification('Setting Updated', `Push notifications ${enabled ? 'enabled' : 'disabled'}`, 'success');
        });
    }
    
    if (soundAlertsEl) {
        soundAlertsEl.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            console.log('🔊 Sound alerts:', enabled ? 'enabled' : 'disabled');
            applySoundSettings(enabled);
            await savePreferencesToFirebase({ soundAlerts: enabled });
            showNotification('Setting Updated', `Sound alerts ${enabled ? 'enabled' : 'disabled'}`, 'success');
        });
    }
    
    // Keep the submit button for manual save if needed
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            const preferences = {
                emailNotifications: emailNotifEl?.checked ?? true,
                pushNotifications: pushNotifEl?.checked ?? true,
                soundAlerts: soundAlertsEl?.checked ?? true,
                theme: themeEl?.value ?? 'light'
            };
            
            console.log('💾 Saving all preferences...', preferences);
            await savePreferencesToFirebase(preferences, true); // true = full save
            
            showNotification('Preferences Saved', 'All preferences have been updated', 'success');
            console.log('✅ All preferences saved');
            
        } catch (error) {
            console.error('❌ Error updating preferences:', error);
            showNotification('Update Error', 'Failed to save preferences: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
    
    // Load current preferences and apply them
    loadAndApplyPreferences();
    
    console.log('✅ Preferences form handler attached with real-time updates');
}

// Save preferences to Firebase (partial or full update)
async function savePreferencesToFirebase(preferences, fullUpdate = false) {
    try {
        const user = getCurrentUser();
        
        if (fullUpdate) {
            // Full preferences object update
            await updateDoc(doc(db, 'users', user.uid), {
                preferences: preferences,
                updatedAt: serverTimestamp()
            });
        } else {
            // Partial update - merge with existing preferences
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const currentPrefs = userDoc.exists() ? (userDoc.data().preferences || {}) : {};
            const updatedPrefs = { ...currentPrefs, ...preferences };
            
            await updateDoc(doc(db, 'users', user.uid), {
                preferences: updatedPrefs,
                updatedAt: serverTimestamp()
            });
        }
        
        // Cache in localStorage for persistence
        const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
        storageType.setItem('userPreferences', JSON.stringify(preferences));
        
        console.log('✅ Preferences saved to Firebase');
    } catch (error) {
        console.error('❌ Error saving preferences:', error);
        throw error;
    }
}

// Load preferences and apply them immediately
async function loadAndApplyPreferences() {
    try {
        const user = getCurrentUser();
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists() && userDoc.data().preferences) {
            const prefs = userDoc.data().preferences;
            console.log('⚡ Loading and applying preferences:', prefs);
            
            // Apply theme
            if (prefs.theme) {
                applyTheme(prefs.theme);
            }
            
            // Apply sound settings
            if (typeof prefs.soundAlerts !== 'undefined') {
                applySoundSettings(prefs.soundAlerts);
            }
            
            console.log('✅ Preferences loaded and applied');
        }
    } catch (error) {
        console.error('❌ Error loading preferences:', error);
    }
}

// Apply theme to the application - instant, no animation
function applyTheme(theme) {
    console.log('🎨 Applying theme:', theme);
    
    // Disable transitions for instant switch
    document.body.style.transition = 'none';
    
    // Remove existing theme classes
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-blue', 'theme-green', 'dark-theme');
    
    // Add new theme class immediately
    document.body.classList.add(`theme-${theme}`);
    
    // Also add dark-theme for backward compatibility
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Force immediate reflow
    void document.body.offsetHeight;
    
    // Re-enable transitions
    setTimeout(() => {
        document.body.style.transition = '';
    }, 0);
    
    // Cache theme preference
    const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
    storageType.setItem('userTheme', theme);
    storageType.setItem('theme', theme);
    
    console.log('✅ Theme applied instantly:', theme);
}

// Apply sound settings
function applySoundSettings(enabled) {
    console.log('🔊 Sound alerts:', enabled ? 'enabled' : 'disabled');
    
    // Store in global variable for notification system to use
    window.soundAlertsEnabled = enabled;
    
    // Cache setting
    const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
    storageType.setItem('soundAlerts', enabled.toString());
    
    console.log('✅ Sound settings applied');
}

// Setup security form with real-time password change
function setupSecurityForm() {
    const form = document.getElementById('securityForm');
    
    if (!form) {
        console.warn('⚠️ Security form not found');
        return;
    }
    
    // Update session info in real-time
    updateSessionInfo();
    setInterval(updateSessionInfo, 60000); // Update every minute
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        try {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                showNotification('Validation Error', 'All password fields are required', 'warning');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showNotification('Validation Error', 'New passwords do not match', 'warning');
                return;
            }
            
            if (newPassword.length < 6) {
                showNotification('Validation Error', 'Password must be at least 6 characters', 'warning');
                return;
            }
            
            if (currentPassword === newPassword) {
                showNotification('Validation Error', 'New password must be different from current password', 'warning');
                return;
            }
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing Password...';
            
            console.log('🔐 Attempting password change with Firebase Auth...');
            
            // Get current Firebase user
            const user = auth.currentUser;
            
            if (!user) {
                throw new Error('No authenticated user found. Please log in again.');
            }
            
            // Re-authenticate user with current password
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            console.log('🔑 Re-authenticating user...');
            await reauthenticateWithCredential(user, credential);
            console.log('✅ Re-authentication successful');
            
            // Update password
            console.log('🔄 Updating password...');
            await updatePassword(user, newPassword);
            console.log('✅ Password updated successfully');
            
            // Update Firestore with password change timestamp
            const userLocalData = getCurrentUser();
            await updateDoc(doc(db, 'users', userLocalData.uid), {
                passwordChangedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            // Log security activity
            await logSecurityActivity('password_changed');
            
            // Clear form
            form.reset();
            
            showNotification('Password Changed', 'Your password has been updated successfully', 'success');
            console.log('✅ Password change completed');
            
        } catch (error) {
            console.error('❌ Error changing password:', error);
            
            let errorMessage = 'Failed to change password';
            
            // Handle specific Firebase Auth errors
            if (error.code === 'auth/wrong-password') {
                errorMessage = 'Current password is incorrect';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Use a stronger password';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Please log out and log back in before changing password';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            showNotification('Password Change Failed', errorMessage, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
    
    console.log('✅ Security form handler attached with real-time features');
}

// Update session info in real-time
function updateSessionInfo() {
    try {
        const lastLoginEl = document.getElementById('lastLoginTime');
        const sessionStartEl = document.getElementById('sessionStartTime');
        const sessionDurationEl = document.getElementById('sessionDuration');
        
        // Last login time
        if (lastLoginEl) {
            const lastLogin = sessionStorage.getItem('lastLoginTime');
            if (lastLogin) {
                lastLoginEl.textContent = new Date(lastLogin).toLocaleString();
            } else {
                lastLoginEl.textContent = 'Current session';
            }
        }
        
        // Session start time
        if (sessionStartEl) {
            const sessionStart = sessionStorage.getItem('sessionStartTime');
            if (sessionStart) {
                sessionStartEl.textContent = new Date(sessionStart).toLocaleString();
            } else {
                const now = new Date().toISOString();
                sessionStorage.setItem('sessionStartTime', now);
                sessionStartEl.textContent = new Date(now).toLocaleString();
            }
        }
        
        // Calculate and display session duration
        if (sessionDurationEl) {
            const sessionStart = sessionStorage.getItem('sessionStartTime');
            if (sessionStart) {
                const duration = Date.now() - new Date(sessionStart).getTime();
                const hours = Math.floor(duration / (1000 * 60 * 60));
                const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
                sessionDurationEl.textContent = `${hours}h ${minutes}m`;
            }
        }
        
        console.log('🕐 Session info updated');
    } catch (error) {
        console.error('❌ Error updating session info:', error);
    }
}

// Log security-related activities
async function logSecurityActivity(activityType) {
    try {
        const user = getCurrentUser();
        await setDoc(doc(db, 'security_logs', `${user.uid}_${Date.now()}`), {
            userId: user.uid,
            userEmail: user.email,
            activityType: activityType,
            timestamp: serverTimestamp(),
            ipAddress: 'N/A', // Would need backend for real IP
            userAgent: navigator.userAgent
        });
        console.log('📝 Security activity logged:', activityType);
    } catch (error) {
        console.error('❌ Error logging security activity:', error);
    }
}

// Setup photo upload
function setupPhotoUpload() {
    const input = document.getElementById('profilePhotoInput');
    
    if (!input) {
        console.warn('⚠️ Photo input not found');
        return;
    }
    
    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file
        if (!file.type.startsWith('image/')) {
            showNotification('Invalid File', 'Please select an image file', 'warning');
            input.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('File Too Large', 'Image must be less than 5MB', 'warning');
            input.value = '';
            return;
        }
        
        try {
            const user = getCurrentUser();
            
            console.log('📤 Uploading profile photo...');
            showNotification('Uploading...', 'Please wait while your photo is being uploaded', 'info');
            
            // Show preview immediately
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewImg = document.getElementById('profilePhotoPreview');
                if (previewImg) {
                    previewImg.src = e.target.result;
                }
                // Also update top bar immediately with preview
                updateTopBarPhoto(e.target.result);
            };
            reader.readAsDataURL(file);
            
            // Upload to Firebase Storage (permanent cloud storage)
            const storageRef = ref(storage, `profile_photos/${user.uid}/${Date.now()}_${file.name}`);
            const uploadResult = await uploadBytes(storageRef, file);
            console.log('☁️ File uploaded to Firebase Storage (permanent)');
            
            const downloadURL = await getDownloadURL(storageRef);
            console.log('🔗 Permanent download URL obtained:', downloadURL);
            
            // Update Firestore with permanent URL
            await updateDoc(doc(db, 'users', user.uid), {
                photoURL: downloadURL,
                updatedAt: serverTimestamp()
            });
            console.log('💾 Firestore updated with permanent URL');
            
            // Update top bar photo (this also caches to localStorage)
            updateTopBarPhoto(downloadURL);
            
            showNotification('Photo Updated', 'Your profile photo has been updated successfully', 'success');
            console.log('✅ Profile photo uploaded and saved');
            
        } catch (error) {
            console.error('❌ Error uploading photo:', error);
            showNotification('Upload Error', 'Failed to upload photo: ' + error.message, 'error');
        } finally {
            // Clear input so same file can be selected again
            input.value = '';
        }
    });
    
    console.log('✅ Photo upload handler attached');
}

// Remove profile photo
window.removeProfilePhoto = async function() {
    if (!confirm('Are you sure you want to remove your profile photo?')) {
        return;
    }
    
    try {
        const user = getCurrentUser();
        const defaultPhoto = 'https://via.placeholder.com/150';
        
        console.log('🗑️ Removing profile photo (file stays in Firebase Storage for recovery)');
        
        // Update Firestore (note: file stays in Firebase Storage permanently)
        await updateDoc(doc(db, 'users', user.uid), {
            photoURL: defaultPhoto,
            updatedAt: serverTimestamp()
        });
        console.log('💾 Firestore updated to default photo');
        
        // Update UI
        document.getElementById('profilePhotoPreview').src = defaultPhoto;
        updateTopBarPhoto(defaultPhoto); // This also updates localStorage
        
        showNotification('Photo Removed', 'Your profile photo has been removed', 'success');
        
    } catch (error) {
        console.error('Error removing photo:', error);
        showNotification('Error', 'Failed to remove photo', 'error');
    }
};

// Update top bar photo and cache to localStorage for instant loading
function updateTopBarPhoto(photoURL) {
    console.log('🖼️ Updating top bar photo:', photoURL);
    
    // Cache in localStorage for instant loading on next page load
    const storageType = localStorage.getItem('userId') ? localStorage : sessionStorage;
    storageType.setItem('userPhotoURL', photoURL);
    console.log('💾 Photo URL cached in storage');
    
    // Update main profile image in top bar
    const topBarPhoto = document.querySelector('.profile-img');
    if (topBarPhoto) {
        topBarPhoto.src = photoURL;
        topBarPhoto.onerror = () => {
            console.warn('Failed to load profile image, using placeholder');
            topBarPhoto.src = 'https://via.placeholder.com/40';
        };
        console.log('✅ Top bar photo updated');
    } else {
        console.warn('⚠️ Top bar photo element not found');
    }
    
    // Also update profile button image if it exists
    const profileBtn = document.querySelector('#profileBtn .profile-img');
    if (profileBtn) {
        profileBtn.src = photoURL;
    }
}

// Show notification (use existing function from app.js)
function showNotification(title, message, type) {
    if (window.showNotification) {
        window.showNotification(title, message, type);
    } else {
        alert(`${title}: ${message}`);
    }
}

// Initialize on module load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileSettings);
} else {
    initProfileSettings();
}

// Export functions for use by other modules
export { initProfileSettings, loadUserProfile, applyTheme, savePreferencesToFirebase };

// Make functions available globally for backward compatibility
window.savePreferencesToFirebase = savePreferencesToFirebase;
window.applyTheme = applyTheme;
