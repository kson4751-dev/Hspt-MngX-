// Patient Consultation - WebRTC Video/Audio with Real-time Chat
import { db, collection, addDoc, getDocs, doc, updateDoc, onSnapshot, query, where, orderBy, getDoc } from './firebase-config.js';

let appointmentId = null;
let appointmentData = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let unsubscribeChat = null;
let isVideoEnabled = true;
let isAudioEnabled = true;
let isChatOpen = false;
let callStartTime = null;
let timerInterval = null;
let unreadCount = 0;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Free TURN servers for NAT traversal
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ],
    iceCandidatePoolSize: 10
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎥 Patient Consultation Page Loaded');
    
    // Get appointment ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    appointmentId = urlParams.get('id');
    
    if (!appointmentId) {
        showError('Invalid consultation link. Please contact your doctor.');
        return;
    }
    
    console.log('📋 Appointment ID:', appointmentId);
    loadAppointmentDetails();
    
    // Setup chat toggle
    setupChatToggle();
});

// Setup chat panel toggle
function setupChatToggle() {
    const toggleChatBtn = document.getElementById('toggleChat');
    const chatPanel = document.getElementById('chatPanel');
    const closeChat = document.getElementById('closeChat');
    
    if (toggleChatBtn) {
        toggleChatBtn.addEventListener('click', () => {
            isChatOpen = !isChatOpen;
            chatPanel.classList.toggle('open', isChatOpen);
            toggleChatBtn.classList.toggle('active', isChatOpen);
            
            // Reset unread count when opening chat
            if (isChatOpen) {
                unreadCount = 0;
                updateChatBadge();
            }
        });
    }
    
    if (closeChat) {
        closeChat.addEventListener('click', () => {
            isChatOpen = false;
            chatPanel.classList.remove('open');
            toggleChatBtn.classList.remove('active');
        });
    }
}

// Load appointment details
async function loadAppointmentDetails() {
    try {
        console.log('📥 Loading appointment details...');
        
        const appointmentRef = doc(db, 'telemedicine_appointments', appointmentId);
        const appointmentSnap = await getDoc(appointmentRef);
        
        if (!appointmentSnap.exists()) {
            showError('Appointment not found. Please check your link.');
            return;
        }
        
        appointmentData = appointmentSnap.data();
        console.log('✅ Appointment loaded:', appointmentData);
        
        displayAppointmentDetails();
        setupRealtimeListeners();
        
    } catch (error) {
        console.error('❌ Error loading appointment:', error);
        showError('Failed to load appointment details. Please try again.');
    }
}

// Display appointment details
function displayAppointmentDetails() {
    const detailsContainer = document.getElementById('patientDetails');
    const scheduledDate = new Date(appointmentData.scheduledDate);
    
    const dateStr = scheduledDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const timeStr = scheduledDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    detailsContainer.innerHTML = `
        <div class="info-row">
            <label>Patient</label>
            <span>${appointmentData.patientName}</span>
        </div>
        <div class="info-row">
            <label>Patient No.</label>
            <span>${appointmentData.patientNumber}</span>
        </div>
        <div class="info-row">
            <label>Doctor</label>
            <span>${appointmentData.doctorName}</span>
        </div>
        <div class="info-row">
            <label>Type</label>
            <span>${appointmentData.consultationType}</span>
        </div>
        <div class="info-row">
            <label>Date</label>
            <span>${dateStr}</span>
        </div>
        <div class="info-row">
            <label>Time</label>
            <span>${timeStr}</span>
        </div>
    `;
    
    // Show join button
    document.getElementById('joinBtn').style.display = 'flex';
    
    // Set doctor info in chat header
    const doctorNameEl = document.getElementById('doctorName');
    const chatDoctorName = document.getElementById('chatDoctorName');
    const consultationType = document.getElementById('consultationType');
    
    if (doctorNameEl) doctorNameEl.textContent = appointmentData.doctorName;
    if (chatDoctorName) chatDoctorName.textContent = appointmentData.doctorName;
    if (consultationType) consultationType.textContent = appointmentData.consultationType;
}

// Call timer functions
function startCallTimer() {
    callStartTime = new Date();
    timerInterval = setInterval(updateCallTimer, 1000);
}

function updateCallTimer() {
    if (!callStartTime) return;
    
    const now = new Date();
    const diff = Math.floor((now - callStartTime) / 1000);
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    const callDurationEl = document.getElementById('callDuration');
    if (callDurationEl) {
        if (hours > 0) {
            callDurationEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            callDurationEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }
}

function stopCallTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Setup real-time listeners
function setupRealtimeListeners() {
    console.log('🔄 Setting up real-time listeners...');
    
    // Listen for chat messages during consultation - using video_messages collection
    const messagesRef = collection(db, 'telemedicine_appointments', appointmentId, 'video_messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    unsubscribeChat = onSnapshot(messagesQuery, (snapshot) => {
        console.log('📨 Patient chat snapshot received, messages:', snapshot.size);
        
        const messagesContainer = document.getElementById('messages');
        if (!messagesContainer) {
            console.error('❌ messages container not found!');
            return;
        }
        
        messagesContainer.innerHTML = '';
        
        snapshot.forEach((docSnapshot) => {
            const message = docSnapshot.data();
            console.log('💬 Patient displaying message:', message.text, 'from:', message.sender);
            displayMessage(message);
        });
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Show notification for new doctor messages
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const message = change.doc.data();
                if (message.sender === 'doctor' && Date.now() - new Date(message.timestamp).getTime() < 5000) {
                    // Increment unread if chat is closed
                    if (!isChatOpen) {
                        unreadCount++;
                        updateChatBadge();
                    }
                    showNotification('New Message', message.text);
                    playNotificationSound();
                }
            }
        });
    }, (error) => {
        console.error('❌ Error listening to chat:', error);
    });
    
    console.log('✅ Real-time listeners active');
}

// Update chat badge
function updateChatBadge() {
    const badge = document.getElementById('chatBadge');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.classList.add('show');
        } else {
            badge.classList.remove('show');
        }
    }
}

// Join video call
document.getElementById('joinBtn').addEventListener('click', async () => {
    console.log('📞 Joining video call...');
    
    document.getElementById('waitingRoom').style.display = 'none';
    document.getElementById('consultationRoom').classList.add('active');
    
    // Start call timer
    startCallTimer();
    
    await initializeMedia();
    await updateAppointmentStatus('In Progress');
});

// Initialize media (camera and microphone)
async function initializeMedia() {
    try {
        console.log('🎥 Requesting camera and microphone access...');
        
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Your browser does not support video calls. Please use Chrome, Firefox, or Safari.');
        }
        
        // First check permissions
        const permissions = await checkMediaPermissions();
        console.log('Permission status:', permissions);
        
        localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        console.log('✅ Media access granted');
        
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.srcObject = localStream;
            localVideo.muted = true; // Mute local video to prevent feedback
            await localVideo.play().catch(e => console.log('Local video autoplay:', e));
        }
        
        const statusBadge = document.getElementById('statusBadge');
        if (statusBadge) {
            statusBadge.textContent = 'Connected';
            statusBadge.classList.add('connected');
        }
        
        // Setup WebRTC peer connection
        setupPeerConnection();
        
    } catch (error) {
        console.error('❌ Error accessing media:', error);
        
        let errorMessage = 'Unable to access camera/microphone.';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Camera/microphone permission denied. Please allow access in your browser settings and refresh the page.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = 'No camera or microphone found. Please connect a device and try again.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage = 'Camera/microphone is already in use by another application. Please close other apps and try again.';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = 'Camera settings not supported. Trying with basic settings...';
            // Try with basic constraints
            try {
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                const localVideo = document.getElementById('localVideo');
                if (localVideo) {
                    localVideo.srcObject = localStream;
                    localVideo.muted = true;
                }
                setupPeerConnection();
                return;
            } catch (e) {
                errorMessage = 'Camera not compatible. Please try a different device.';
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        // Show error to user
        showMediaError(errorMessage);
    }
}

// Check media permissions
async function checkMediaPermissions() {
    try {
        const camera = await navigator.permissions.query({ name: 'camera' });
        const microphone = await navigator.permissions.query({ name: 'microphone' });
        return { camera: camera.state, microphone: microphone.state };
    } catch (e) {
        return { camera: 'unknown', microphone: 'unknown' };
    }
}

// Show media error with helpful message
function showMediaError(message) {
    const statusBadge = document.getElementById('statusBadge');
    if (statusBadge) {
        statusBadge.textContent = 'Permission Error';
        statusBadge.style.background = 'rgba(239, 68, 68, 0.3)';
    }
    
    // Create error overlay
    const consultationRoom = document.getElementById('consultationRoom');
    const errorOverlay = document.createElement('div');
    errorOverlay.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        padding: 30px;
        border-radius: 16px;
        text-align: center;
        max-width: 400px;
        z-index: 1000;
        border: 1px solid rgba(255, 255, 255, 0.1);
    `;
    errorOverlay.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ffc107; margin-bottom: 20px;"></i>
        <h3 style="color: white; margin-bottom: 15px;">Camera/Microphone Access Required</h3>
        <p style="color: rgba(255,255,255,0.7); margin-bottom: 20px; line-height: 1.6;">${message}</p>
        <button onclick="location.reload()" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
        ">
            <i class="fas fa-redo"></i> Try Again
        </button>
        <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 15px;">
            <i class="fas fa-info-circle"></i> Make sure to click "Allow" when prompted for camera and microphone access.
        </p>
    `;
    
    if (consultationRoom) {
        consultationRoom.appendChild(errorOverlay);
    }
    
    showNotification('Permission Error', message);
}

// Setup WebRTC peer connection with Firebase signaling
async function setupPeerConnection() {
    console.log('🔗 Setting up peer connection with Firebase signaling...');
    
    peerConnection = new RTCPeerConnection(configuration);
    
    // Add local stream tracks
    localStream.getTracks().forEach(track => {
        console.log('Adding local track:', track.kind);
        peerConnection.addTrack(track, localStream);
    });
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
        console.log('📥 Received remote track:', event.track.kind, event.streams);
        
        const remoteVideo = document.getElementById('remoteVideo');
        
        // Use the stream directly if available
        if (event.streams && event.streams[0]) {
            console.log('📺 Using stream directly');
            remoteVideo.srcObject = event.streams[0];
            remoteStream = event.streams[0];
        } else {
            // Fallback: create stream and add tracks
            if (!remoteStream) {
                remoteStream = new MediaStream();
                remoteVideo.srcObject = remoteStream;
            }
            remoteStream.addTrack(event.track);
        }
        
        // Ensure video plays
        remoteVideo.play().catch(e => console.log('Remote video play error:', e));
        
        // Hide placeholder when doctor connects
        const placeholder = document.getElementById('videoPlaceholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        console.log('✅ Remote stream attached, tracks:', remoteStream.getTracks().length);
    };
    
    // Handle ICE candidates - Save to Firebase
    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            console.log('🧊 New ICE candidate:', event.candidate.type);
            try {
                const candidatesRef = collection(db, 'telemedicine_appointments', appointmentId, 'patient_candidates');
                await addDoc(candidatesRef, {
                    candidate: event.candidate.toJSON(),
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error saving ICE candidate:', error);
            }
        }
    };
    
    // ICE connection state - important for debugging
    peerConnection.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'connected' || peerConnection.iceConnectionState === 'completed') {
            console.log('✅ ICE connection established!');
            const placeholder = document.getElementById('videoPlaceholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        }
    };
    
    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        updateConnectionStatus(peerConnection.connectionState);
    };
    
    // Update appointment with patient joined status
    const appointmentRef = doc(db, 'telemedicine_appointments', appointmentId);
    await updateDoc(appointmentRef, {
        patientJoined: true,
        patientJoinedAt: new Date().toISOString()
    });
    
    // Listen for doctor's offer
    listenForDoctorOffer();
    
    // Listen for doctor's ICE candidates
    listenForDoctorCandidates();
    
    console.log('✅ Peer connection ready, waiting for doctor...');
}

// Listen for doctor's offer
function listenForDoctorOffer() {
    const appointmentRef = doc(db, 'telemedicine_appointments', appointmentId);
    
    onSnapshot(appointmentRef, async (snapshot) => {
        const data = snapshot.data();
        
        if (data && data.doctorOffer && !peerConnection.currentRemoteDescription) {
            console.log('📩 Received doctor offer');
            
            try {
                const offer = new RTCSessionDescription(data.doctorOffer);
                await peerConnection.setRemoteDescription(offer);
                console.log('✅ Remote description set');
                
                // Create answer
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                // Save answer to Firebase
                await updateDoc(appointmentRef, {
                    patientAnswer: {
                        type: answer.type,
                        sdp: answer.sdp
                    },
                    answerTimestamp: new Date().toISOString()
                });
                
                console.log('✅ Answer sent to doctor');
                
            } catch (error) {
                console.error('❌ Error handling offer:', error);
            }
        }
    });
}

// Listen for doctor's ICE candidates
function listenForDoctorCandidates() {
    const candidatesRef = collection(db, 'telemedicine_appointments', appointmentId, 'doctor_candidates');
    
    onSnapshot(candidatesRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                try {
                    const candidate = new RTCIceCandidate(data.candidate);
                    await peerConnection.addIceCandidate(candidate);
                    console.log('✅ Added doctor ICE candidate');
                } catch (error) {
                    console.error('Error adding ICE candidate:', error);
                }
            }
        });
    });
}

// Update connection status
function updateConnectionStatus(state) {
    const statusBadge = document.getElementById('statusBadge');
    
    switch(state) {
        case 'connected':
            statusBadge.textContent = 'Connected';
            statusBadge.classList.add('connected');
            break;
        case 'connecting':
            statusBadge.textContent = 'Connecting...';
            statusBadge.classList.remove('connected');
            break;
        case 'disconnected':
        case 'failed':
            statusBadge.textContent = 'Disconnected';
            statusBadge.classList.remove('connected');
            break;
    }
}

// Toggle video
document.getElementById('toggleVideo').addEventListener('click', () => {
    if (localStream) {
        isVideoEnabled = !isVideoEnabled;
        localStream.getVideoTracks()[0].enabled = isVideoEnabled;
        
        const btn = document.getElementById('toggleVideo');
        btn.classList.toggle('active', isVideoEnabled);
        btn.querySelector('i').className = isVideoEnabled ? 'fas fa-video' : 'fas fa-video-slash';
    }
});

// Toggle audio
document.getElementById('toggleAudio').addEventListener('click', () => {
    if (localStream) {
        isAudioEnabled = !isAudioEnabled;
        localStream.getAudioTracks()[0].enabled = isAudioEnabled;
        
        const btn = document.getElementById('toggleAudio');
        btn.classList.toggle('active', isAudioEnabled);
        btn.querySelector('i').className = isAudioEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
    }
});

// Toggle chat
document.getElementById('toggleChat').addEventListener('click', () => {
    const chatSection = document.getElementById('chatSection');
    const isVisible = chatSection.style.display !== 'none';
    chatSection.style.display = isVisible ? 'none' : 'flex';
});

// Leave call
document.getElementById('leaveCall').addEventListener('click', async () => {
    if (confirm('Are you sure you want to leave the consultation?')) {
        await endCall();
        window.location.reload();
    }
});

// End call
async function endCall() {
    console.log('📞 Ending call...');
    
    // Stop local stream
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
    }
    
    // Update appointment status
    await updateAppointmentStatus('Completed');
    
    // Unsubscribe from listeners
    if (unsubscribeChat) {
        unsubscribeChat();
    }
}

// Send message
window.sendMessage = async function() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    try {
        console.log('💬 Sending message...');
        
        const messagesRef = collection(db, 'telemedicine_appointments', appointmentId, 'video_messages');
        await addDoc(messagesRef, {
            text: message,
            sender: 'patient',
            senderName: appointmentData.patientName,
            timestamp: new Date().toISOString()
        });
        
        input.value = '';
        console.log('✅ Message sent');
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        showNotification('Error', 'Failed to send message');
    }
};

// Display message
function displayMessage(message) {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) {
        console.error('❌ messages container not found!');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.sender}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageDiv.innerHTML = `
        <div class="message-content" style="color: white !important;">${message.text}</div>
        <div class="message-meta" style="color: rgba(255,255,255,0.6) !important;">${message.senderName || message.sender} • ${time}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    console.log('✅ Patient message displayed');
}

// Update appointment status
async function updateAppointmentStatus(status) {
    try {
        const appointmentRef = doc(db, 'telemedicine_appointments', appointmentId);
        await updateDoc(appointmentRef, {
            status: status,
            lastUpdated: new Date().toISOString()
        });
        
        console.log('✅ Status updated to:', status);
        
    } catch (error) {
        console.error('❌ Error updating status:', error);
    }
}

// Show notification
function showNotification(title, message) {
    const notification = document.getElementById('notification');
    document.getElementById('notificationTitle').textContent = title;
    document.getElementById('notificationMessage').textContent = message;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

// Play notification sound
function playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKnn77RgGwU7k9nyz3ooBSl+zPLajDoJHW7A8eSZTQ0OT6jn8LdfGgU6ktjy0XsrBSV6y/DajjoJHm7A8eSaTg0NTqnp8LhgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGgU7lNnzz3wrBSh8zfDbjDoJHG/A8eWZTg0PTqfp77VgGg==');
    audio.play().catch(() => {}); // Ignore errors if audio playback is blocked
}

// Show error
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.innerHTML = `<div class="error-message" style="color: #ffc107;"><i class="fas fa-exclamation-triangle"></i> ${message}</div>`;
    document.getElementById('patientDetails').style.display = 'none';
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
    if (unsubscribeChat) {
        unsubscribeChat();
    }
});
