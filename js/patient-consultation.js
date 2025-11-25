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

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
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
});

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
    
    detailsContainer.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Patient Name</span>
            <span class="detail-value">${appointmentData.patientName}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Patient Number</span>
            <span class="detail-value">${appointmentData.patientNumber}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Doctor</span>
            <span class="detail-value">${appointmentData.doctorName}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Consultation Type</span>
            <span class="detail-value">${appointmentData.consultationType}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Scheduled Time</span>
            <span class="detail-value">${scheduledDate.toLocaleString()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="detail-value" style="color: ${appointmentData.status === 'Scheduled' ? '#3498db' : '#27ae60'}">${appointmentData.status}</span>
        </div>
    `;
    
    // Show join button
    document.getElementById('joinBtn').style.display = 'inline-flex';
    
    // Set doctor info in chat
    document.getElementById('doctorName').textContent = appointmentData.doctorName;
    document.getElementById('consultationType').textContent = appointmentData.consultationType;
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
                    showNotification('New Message from Doctor', message.text);
                    playNotificationSound();
                }
            }
        });
    }, (error) => {
        console.error('❌ Error listening to chat:', error);
    });
    
    console.log('✅ Real-time listeners active');
}

// Join video call
document.getElementById('joinBtn').addEventListener('click', async () => {
    console.log('📞 Joining video call...');
    
    document.getElementById('waitingRoom').style.display = 'none';
    document.getElementById('consultationRoom').style.display = 'block';
    document.getElementById('statusBadge').textContent = 'Connecting...';
    
    await initializeMedia();
    await updateAppointmentStatus('In Progress');
});

// Initialize media (camera and microphone)
async function initializeMedia() {
    try {
        console.log('🎥 Requesting camera and microphone access...');
        
        localStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        console.log('✅ Media access granted');
        
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = localStream;
        
        document.getElementById('statusBadge').textContent = 'Connected';
        document.getElementById('statusBadge').classList.add('connected');
        
        // Setup WebRTC peer connection
        setupPeerConnection();
        
    } catch (error) {
        console.error('❌ Error accessing media:', error);
        showNotification('Camera Error', 'Unable to access camera/microphone. Please check permissions.');
    }
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
        console.log('📥 Received remote track:', event.track.kind);
        
        if (!remoteStream) {
            remoteStream = new MediaStream();
            document.getElementById('remoteVideo').srcObject = remoteStream;
        }
        
        remoteStream.addTrack(event.track);
        document.getElementById('noVideoPlaceholder').style.display = 'none';
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
        <div class="sender-name">${message.senderName || message.sender}</div>
        <div>${message.text}</div>
        <div class="time">${time}</div>
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
    errorDiv.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> ${message}</div>`;
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
