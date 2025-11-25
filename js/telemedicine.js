// Telemedicine Module - Video/Audio Consultation with WebRTC
import { db, collection, addDoc, getDocs, doc, updateDoc, onSnapshot, query, where, orderBy } from './firebase-config.js';

let appointments = [];
let currentAppointment = null;
let currentFilter = 'all';
let selectedPatientForConsultation = null;
let unsubscribeTelemedicine = null;
let unsubscribeChat = null;

// Message tracking
let unreadMessages = {}; // Track unread count per appointment
let messageListeners = {}; // Track listeners for each appointment

// WebRTC variables
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let dataChannel = null;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

// Initialize Telemedicine Module
export function initTelemedicineModule() {
    console.log('🎥 Initializing Telemedicine Module...');
    
    if (!db) {
        console.error('❌ Firebase DB not initialized');
        return;
    }
    
    console.log('✅ Firebase connection verified');
    console.log('📊 Collections in use:');
    console.log('   - telemedicine_appointments (main appointments)');
    console.log('   - telemedicine_appointments/{id}/messages (chat messages)');
    console.log('   - telemedicine_appointments/{id}/doctor_notes (consultation notes)');
    console.log('   - patients (patient details)');
    
    // Set up real-time listener for appointments
    setupRealtimeListener();
    
    // Set up patient search
    setupPatientSearch();
    
    console.log('✅ Telemedicine Module initialized successfully');
    console.log('🔄 Real-time sync enabled for all data');
}

// Make functions globally available
window.initTelemedicineModule = initTelemedicineModule;

// Setup real-time listener for appointments
function setupRealtimeListener() {
    if (unsubscribeTelemedicine) {
        unsubscribeTelemedicine();
    }

    console.log('🔄 Setting up real-time listener for telemedicine_appointments...');
    
    try {
        const appointmentsRef = collection(db, 'telemedicine_appointments');
        
        unsubscribeTelemedicine = onSnapshot(appointmentsRef, 
            (snapshot) => {
                console.log('📥 Received real-time update from Firebase');
                console.log('📊 Total appointments in database:', snapshot.size);
                
                appointments = [];
                
                snapshot.forEach((docSnapshot) => {
                    const data = docSnapshot.data();
                    appointments.push({
                        id: docSnapshot.id,
                        ...data
                    });
                });
                
                console.log('✅ Appointments loaded:', appointments.length);
                
                // Sort by date (newest first)
                appointments.sort((a, b) => {
                    const dateA = new Date(a.scheduledDate || a.createdAt || 0);
                    const dateB = new Date(b.scheduledDate || b.createdAt || 0);
                    return dateB - dateA;
                });
                
                console.log('📊 Processed', appointments.length, 'appointments');
                
                renderStats();
                renderAppointmentsTable();
                
                // Setup message listeners for all appointments
                setupMessageListeners();
            },
            (error) => {
                console.error('❌ Listener error:', error);
            }
        );
        
        console.log('✅ Real-time listener active');
        
    } catch (error) {
        console.error('❌ Failed to setup listener:', error);
    }
}

// Setup message listeners for all appointments
function setupMessageListeners() {
    console.log('📨 Setting up message listeners for appointments...');
    
    appointments.forEach(appointment => {
        // Skip if already listening
        if (messageListeners[appointment.id]) {
            return;
        }
        
        // Initialize unread count
        if (!(appointment.id in unreadMessages)) {
            unreadMessages[appointment.id] = 0;
        }
        
        // Setup listener for this appointment's messages
        const messagesRef = collection(db, 'telemedicine_appointments', appointment.id, 'messages');
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'));
        
        const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const message = change.doc.data();
                    
                    // Only count patient messages (not from doctor)
                    if (message.sender === 'patient') {
                        // Increment unread count
                        unreadMessages[appointment.id] = (unreadMessages[appointment.id] || 0) + 1;
                        
                        // Update badge
                        updateChatBadge(appointment.id);
                        
                        console.log(`📬 New message from patient in appointment ${appointment.id}`);
                    }
                }
            });
        });
        
        messageListeners[appointment.id] = unsubscribe;
    });
}

// Update chat notification badge
function updateChatBadge(appointmentId) {
    const badge = document.getElementById(`chat-badge-${appointmentId}`);
    const count = unreadMessages[appointmentId] || 0;
    
    if (badge) {
        if (count > 0) {
            badge.style.display = 'flex';
            badge.textContent = count > 9 ? '9+' : count;
            
            // Add pulse animation
            badge.style.animation = 'pulse 1s ease-in-out';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Render statistics
function renderStats() {
    const total = appointments.length;
    const scheduled = appointments.filter(a => a.status === 'Scheduled').length;
    const inProgress = appointments.filter(a => a.status === 'In Progress').length;
    const completed = appointments.filter(a => a.status === 'Completed').length;

    const totalEl = document.getElementById('telemedicineTotalAppointments');
    const scheduledEl = document.getElementById('telemedicineScheduled');
    const inProgressEl = document.getElementById('telemedicineInProgress');
    const completedEl = document.getElementById('telemedicineCompleted');
    
    if (totalEl) totalEl.textContent = total;
    if (scheduledEl) scheduledEl.textContent = scheduled;
    if (inProgressEl) inProgressEl.textContent = inProgress;
    if (completedEl) completedEl.textContent = completed;
}

// Render appointments table
function renderAppointmentsTable() {
    const tbody = document.getElementById('telemedicineTableBody');
    
    if (!tbody) return;
    
    if (appointments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 60px 20px;">
                    <i class="fas fa-video-slash" style="font-size: 40px; color: var(--text-secondary); opacity: 0.3; display: block; margin-bottom: 12px;"></i>
                    <span style="color: var(--text-secondary); font-size: 14px;">No appointments scheduled</span>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    appointments.forEach(appointment => {
        const date = new Date(appointment.scheduledDate);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        const statusColor = {
            'Scheduled': '#3498db',
            'In Progress': '#f39c12',
            'Completed': '#2ecc71',
            'Cancelled': '#95a5a6'
        }[appointment.status] || '#3498db';
        
        // Debug: Log appointment status
        console.log('Appointment Status:', appointment.status, 'ID:', appointment.id);
        
        html += `
            <tr data-id="${appointment.id}">
                <td><strong style="font-size: 13px;">#${(appointment.id || '').substring(0, 6).toUpperCase()}</strong></td>
                <td>
                    <div style="font-weight: 500;">${appointment.patientName || 'Unknown'}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">${appointment.patientNumber || '-'}</div>
                </td>
                <td>${appointment.consultationType || 'General'}</td>
                <td>
                    <div style="font-size: 13px;">${dateStr}</div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${timeStr}</div>
                </td>
                <td>
                    <span style="padding: 6px 12px; background: ${statusColor}; color: white; border-radius: 6px; font-size: 12px; font-weight: 500; display: inline-block;">
                        ${appointment.status || 'Scheduled'}
                    </span>
                </td>
                <td>${appointment.doctorName || '-'}</td>
                <td>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                        <button class="telemedicine-video-btn" onclick="window.startVideoCall('${appointment.id}')" title="Start Video Call">
                            <i class="fas fa-video"></i> Video Call
                        </button>
                        <button class="btn btn-sm" onclick="window.addDoctorNote('${appointment.id}')" style="padding: 8px 12px; font-size: 12px; background: #e67e22; color: white; border: none; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Add Note">
                            <i class="fas fa-notes-medical"></i> Note
                        </button>
                        <button class="btn btn-sm" onclick="window.viewAppointmentDetails('${appointment.id}')" style="padding: 8px 12px; font-size: 12px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="View Details">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-sm chat-btn-${appointment.id}" onclick="window.openConsultationChat('${appointment.id}')" style="padding: 8px 12px; font-size: 12px; background: #9b59b6; color: white; border: none; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; position: relative;" title="Chat">
                            <i class="fas fa-comments"></i> Chat
                            <span class="chat-notification-badge" id="chat-badge-${appointment.id}" style="display: none; position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; background: #e74c3c; border-radius: 50%; border: 2px solid white; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center;">0</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Setup patient search
function setupPatientSearch() {
    const patientSearch = document.getElementById('telemedicinePatientSearch');
    if (patientSearch) {
        const newInput = patientSearch.cloneNode(true);
        patientSearch.parentNode.replaceChild(newInput, patientSearch);
        
        newInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.trim();
            searchPatientsForTelemedicine(searchTerm);
        });
    }
}

// Search patients
async function searchPatientsForTelemedicine(searchTerm) {
    const resultsContainer = document.getElementById('telemedicinePatientResults');
    
    if (!searchTerm || searchTerm.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    try {
        resultsContainer.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
        
        const patientsRef = collection(db, 'patients');
        const snapshot = await getDocs(patientsRef);
        
        const term = searchTerm.toLowerCase();
        const results = [];
        
        snapshot.forEach((docSnapshot) => {
            const patient = docSnapshot.data();
            const firstName = (patient.firstName || '').toLowerCase();
            const lastName = (patient.lastName || '').toLowerCase();
            const fullName = (patient.fullName || patient.name || '').toLowerCase();
            const patientNumber = (patient.patientNumber || '').toLowerCase();
            const phone = (patient.phone || '').toLowerCase();
            
            if (firstName.includes(term) || lastName.includes(term) || fullName.includes(term) || 
                patientNumber.includes(term) || phone.includes(term)) {
                results.push({
                    id: docSnapshot.id,
                    ...patient
                });
            }
        });

        if (results.length === 0) {
            resultsContainer.innerHTML = '<div style="padding: 12px; color: var(--text-secondary); font-size: 13px; text-align: center;">No patients found</div>';
            return;
        }

        resultsContainer.innerHTML = results.slice(0, 10).map(patient => {
            const patientName = patient.fullName || patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Unknown';
            const patientNumber = patient.patientNumber || 'N/A';
            const age = patient.age ? `${patient.age}y` : '';
            const gender = patient.gender || '';
            const phone = patient.phone || '';
            
            return `
                <div class="telemedicine-patient-result-item" onclick="window.selectPatientForTelemedicine('${patient.id}', '${patientName.replace(/'/g, "\\'")}', '${patientNumber}')" style="padding: 12px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                        <strong style="font-size: 14px; color: var(--text-primary);">${patientName}</strong>
                        <span style="background: var(--primary-color); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${patientNumber}</span>
                    </div>
                    <div style="display: flex; gap: 12px; font-size: 12px; color: var(--text-secondary);">
                        ${age ? `<span><i class="fas fa-birthday-cake" style="margin-right: 4px;"></i>${age}</span>` : ''}
                        ${gender ? `<span><i class="fas fa-${gender.toLowerCase() === 'male' ? 'mars' : gender.toLowerCase() === 'female' ? 'venus' : 'user'}" style="margin-right: 4px;"></i>${gender}</span>` : ''}
                        ${phone ? `<span><i class="fas fa-phone" style="margin-right: 4px;"></i>${phone}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('❌ Error searching patients:', error);
        resultsContainer.innerHTML = '<div style="padding: 12px; color: #e74c3c; font-size: 13px; text-align: center;">Error searching</div>';
    }
}

// Select patient
window.selectPatientForTelemedicine = function(id, name, number) {
    selectedPatientForConsultation = { id, name, number };
    document.getElementById('telemedicinePatientName').textContent = name;
    document.getElementById('telemedicinePatientNumber').textContent = number;
    document.getElementById('telemedicineSelectedPatient').style.display = 'block';
    document.getElementById('telemedicinePatientSearch').value = '';
    document.getElementById('telemedicinePatientResults').innerHTML = '';
};

// Clear selected patient
window.clearTelemedicinePatient = function() {
    selectedPatientForConsultation = null;
    document.getElementById('telemedicineSelectedPatient').style.display = 'none';
};

// Toggle patient mode
window.toggleTelemedicinePatientMode = function(mode) {
    const searchMode = document.getElementById('telemedicineSearchMode');
    const manualMode = document.getElementById('telemedicineManualMode');
    const searchBtn = document.getElementById('searchPatientTelemedicineBtn');
    const manualBtn = document.getElementById('manualPatientTelemedicineBtn');
    
    if (mode === 'search') {
        searchMode.style.display = 'block';
        manualMode.style.display = 'none';
        searchBtn.classList.add('active');
        manualBtn.classList.remove('active');
    } else {
        searchMode.style.display = 'none';
        manualMode.style.display = 'block';
        searchBtn.classList.remove('active');
        manualBtn.classList.add('active');
        
        selectedPatientForConsultation = null;
        document.getElementById('telemedicineSelectedPatient').style.display = 'none';
    }
};

// Show schedule appointment modal
window.showScheduleAppointmentModal = function() {
    document.getElementById('scheduleAppointmentModal').style.display = 'flex';
    
    // Reset form
    selectedPatientForConsultation = null;
    document.getElementById('telemedicineSelectedPatient').style.display = 'none';
    document.getElementById('telemedicinePatientSearch').value = '';
    document.getElementById('telemedicinePatientResults').innerHTML = '';
    document.getElementById('consultationType').value = '';
    document.getElementById('appointmentDate').value = '';
    document.getElementById('appointmentTime').value = '';
    document.getElementById('doctorName').value = '';
    document.getElementById('consultationNotes').value = '';
    
    // Clear manual fields
    document.getElementById('manualPatientName').value = '';
    document.getElementById('manualPatientPhone').value = '';
    document.getElementById('manualPatientAge').value = '';
    document.getElementById('manualPatientGender').value = '';
    
    setTimeout(() => {
        setupPatientSearch();
    }, 100);
};

// Close schedule appointment modal
window.closeScheduleAppointmentModal = function() {
    document.getElementById('scheduleAppointmentModal').style.display = 'none';
};

// Submit appointment
window.submitTelemedicineAppointment = async function() {
    try {
        let patientData = null;
        const mode = document.getElementById('telemedicineSearchMode').style.display !== 'none' ? 'search' : 'manual';
        
        if (mode === 'search') {
            if (!selectedPatientForConsultation) {
                alert('Please select a patient');
                return;
            }
            patientData = selectedPatientForConsultation;
        } else {
            const name = document.getElementById('manualPatientName').value.trim();
            if (!name) {
                alert('Please enter patient name');
                return;
            }
            patientData = {
                id: 'manual_' + Date.now(),
                name: name,
                number: 'TM-' + Date.now().toString().slice(-6),
                phone: document.getElementById('manualPatientPhone').value,
                age: document.getElementById('manualPatientAge').value,
                gender: document.getElementById('manualPatientGender').value
            };
        }

        const consultationType = document.getElementById('consultationType').value;
        const appointmentDate = document.getElementById('appointmentDate').value;
        const appointmentTime = document.getElementById('appointmentTime').value;
        const doctorName = document.getElementById('doctorName').value;
        const notes = document.getElementById('consultationNotes').value;

        if (!consultationType || !appointmentDate || !appointmentTime || !doctorName) {
            alert('Please fill in all required fields');
            return;
        }

        const scheduledDateTime = new Date(`${appointmentDate}T${appointmentTime}`);

        const appointmentData = {
            patientId: patientData.id,
            patientName: patientData.name,
            patientNumber: patientData.number,
            patientPhone: patientData.phone || '',
            patientAge: patientData.age || '',
            patientGender: patientData.gender || '',
            consultationType: consultationType,
            scheduledDate: scheduledDateTime.toISOString(),
            doctorName: doctorName,
            notes: notes,
            status: 'Scheduled',
            createdAt: new Date().toISOString(),
            callStarted: false,
            callEnded: false
        };

        console.log('📝 Scheduling appointment...');
        
        const appointmentsRef = collection(db, 'telemedicine_appointments');
        const docRef = await addDoc(appointmentsRef, appointmentData);
        
        // Generate patient consultation link
        const baseUrl = window.location.origin;
        const consultationLink = `${baseUrl}/patient-consultation.html?id=${docRef.id}`;
        
        // Update appointment with the link
        await updateDoc(docRef, {
            consultationLink: consultationLink
        });
        
        console.log('✅ Appointment scheduled successfully with ID:', docRef.id);
        console.log('🔗 Consultation link generated:', consultationLink);
        console.log('📊 Appointment data saved to Firebase:', appointmentData);
        
        closeScheduleAppointmentModal();
        
        // Store appointment data temporarily for modal
        currentAppointment = {
            ...appointmentData,
            id: docRef.id,
            consultationLink: consultationLink,
            patientNumber: patientData.number
        };
        
        // Show link to doctor
        showConsultationLink(consultationLink, patientData.name, patientData.phone);
        
    } catch (error) {
        console.error('❌ Error scheduling appointment:', error);
        alert('Error: ' + error.message);
    }
};

// Start video call
window.startVideoCall = async function(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) {
        alert('Appointment not found');
        return;
    }
    
    currentAppointment = appointment;
    
    // Show video call interface
    document.getElementById('videoCallModal').style.display = 'flex';
    document.getElementById('videoCallPatientName').textContent = appointment.patientName;
    document.getElementById('videoCallStatus').textContent = 'Connecting...';
    
    // Show chat panel by default
    document.getElementById('videoChatPanel').style.display = 'flex';
    
    try {
        // Update appointment status
        const appointmentRef = doc(db, 'telemedicine_appointments', appointmentId);
        await updateDoc(appointmentRef, {
            status: 'In Progress',
            callStartedAt: new Date().toISOString(),
            doctorJoined: true,
            doctorJoinedAt: new Date().toISOString()
        });
        
        // Initialize WebRTC with Firebase signaling
        await initializeWebRTC(appointmentId);
        
        // Setup real-time chat listener
        setupVideoCallChat(appointmentId);
        
        console.log('✅ Video call started');
        
    } catch (error) {
        console.error('❌ Error starting call:', error);
        alert('Error starting call: ' + error.message);
        closeVideoCall();
    }
};

// Initialize WebRTC with Firebase signaling
async function initializeWebRTC(appointmentId) {
    try {
        console.log('🎥 Initializing WebRTC for doctor...');
        
        // Get local media stream
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
        
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = localStream;
        
        // Create peer connection
        peerConnection = new RTCPeerConnection(configuration);
        
        // Add local tracks to peer connection
        localStream.getTracks().forEach(track => {
            console.log('Adding local track:', track.kind);
            peerConnection.addTrack(track, localStream);
        });
        
        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track.kind);
            if (!remoteStream) {
                remoteStream = new MediaStream();
                const remoteVideo = document.getElementById('remoteVideo');
                remoteVideo.srcObject = remoteStream;
            }
            remoteStream.addTrack(event.track);
            document.getElementById('videoCallStatus').textContent = 'Connected';
        };
        
        // ICE candidates - Store in Firebase
        peerConnection.onicecandidate = async (event) => {
            if (event.candidate) {
                console.log('New ICE candidate:', event.candidate.type);
                try {
                    const candidatesRef = collection(db, 'telemedicine_appointments', appointmentId, 'doctor_candidates');
                    await addDoc(candidatesRef, {
                        candidate: event.candidate.toJSON(),
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    console.error('Error saving ICE candidate:', error);
                }
            }
        };
        
        // Connection state
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection.connectionState);
            const statusText = {
                'connecting': 'Connecting...',
                'connected': 'Connected',
                'disconnected': 'Disconnected',
                'failed': 'Connection Failed',
                'closed': 'Call Ended'
            };
            document.getElementById('videoCallStatus').textContent = 
                statusText[peerConnection.connectionState] || peerConnection.connectionState;
        };
        
        // Create offer
        const offer = await peerConnection.createOffer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: true
        });
        
        await peerConnection.setLocalDescription(offer);
        
        // Save offer to Firebase
        const appointmentRef = doc(db, 'telemedicine_appointments', appointmentId);
        await updateDoc(appointmentRef, {
            doctorOffer: {
                type: offer.type,
                sdp: offer.sdp
            },
            offerTimestamp: new Date().toISOString()
        });
        
        console.log('✅ Doctor offer created and saved');
        
        // Listen for patient's answer
        listenForAnswer(appointmentId);
        
        // Listen for patient's ICE candidates
        listenForPatientCandidates(appointmentId);
        
    } catch (error) {
        console.error('❌ Error initializing WebRTC:', error);
        throw error;
    }
}

// Listen for patient's answer
function listenForAnswer(appointmentId) {
    const appointmentRef = doc(db, 'telemedicine_appointments', appointmentId);
    
    const unsubscribe = onSnapshot(appointmentRef, async (snapshot) => {
        const data = snapshot.data();
        
        if (data && data.patientAnswer && !peerConnection.currentRemoteDescription) {
            console.log('📩 Received patient answer');
            
            try {
                const answer = new RTCSessionDescription(data.patientAnswer);
                await peerConnection.setRemoteDescription(answer);
                console.log('✅ Remote description set');
            } catch (error) {
                console.error('Error setting remote description:', error);
            }
        }
    });
    
    // Store unsubscribe function
    if (!window.telemedicineUnsubscribers) window.telemedicineUnsubscribers = [];
    window.telemedicineUnsubscribers.push(unsubscribe);
}

// Listen for patient's ICE candidates
function listenForPatientCandidates(appointmentId) {
    const candidatesRef = collection(db, 'telemedicine_appointments', appointmentId, 'patient_candidates');
    
    const unsubscribe = onSnapshot(candidatesRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                try {
                    const candidate = new RTCIceCandidate(data.candidate);
                    await peerConnection.addIceCandidate(candidate);
                    console.log('✅ Added patient ICE candidate');
                } catch (error) {
                    console.error('Error adding ICE candidate:', error);
                }
            }
        });
    });
    
    if (!window.telemedicineUnsubscribers) window.telemedicineUnsubscribers = [];
    window.telemedicineUnsubscribers.push(unsubscribe);
}

// Setup video call chat with Firebase
function setupVideoCallChat(appointmentId) {
    console.log('💬 Setting up video call chat for appointment:', appointmentId);
    
    const messagesRef = collection(db, 'telemedicine_appointments', appointmentId, 'video_messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('📨 Chat snapshot received, messages:', snapshot.size);
        
        const messagesContainer = document.getElementById('videoChatMessages');
        if (!messagesContainer) {
            console.error('❌ videoChatMessages container not found!');
            return;
        }
        
        messagesContainer.innerHTML = '';
        
        snapshot.forEach((docSnapshot) => {
            const message = docSnapshot.data();
            console.log('💬 Displaying message:', message.text, 'from:', message.sender);
            displayVideoChatMessage(message);
        });
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, (error) => {
        console.error('❌ Error listening to chat:', error);
    });
    
    if (!window.telemedicineUnsubscribers) window.telemedicineUnsubscribers = [];
    window.telemedicineUnsubscribers.push(unsubscribe);
    
    console.log('✅ Video chat listener active');
}

// Display video chat message
function displayVideoChatMessage(message) {
    const messagesContainer = document.getElementById('videoChatMessages');
    if (!messagesContainer) {
        console.error('❌ videoChatMessages container not found!');
        return;
    }
    
    const messageDiv = document.createElement('div');
    const isSent = message.sender === 'doctor';
    messageDiv.className = `video-chat-message ${isSent ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-sender">${message.senderName || message.sender}</div>
        <div class="message-text">${message.text}</div>
        <div class="message-time">${time}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    console.log('✅ Message displayed in chat');
}

// Toggle video
window.toggleVideo = function() {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const btn = document.getElementById('toggleVideoBtn');
        btn.innerHTML = videoTrack.enabled ? 
            '<i class="fas fa-video"></i>' : 
            '<i class="fas fa-video-slash"></i>';
        btn.style.background = videoTrack.enabled ? '#27ae60' : '#e74c3c';
    }
};

// Toggle audio
window.toggleAudio = function() {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const btn = document.getElementById('toggleAudioBtn');
        btn.innerHTML = audioTrack.enabled ? 
            '<i class="fas fa-microphone"></i>' : 
            '<i class="fas fa-microphone-slash"></i>';
        btn.style.background = audioTrack.enabled ? '#27ae60' : '#e74c3c';
    }
};

// Toggle chat
window.toggleVideoChat = function() {
    const chatPanel = document.getElementById('videoChatPanel');
    chatPanel.style.display = chatPanel.style.display === 'none' ? 'flex' : 'none';
};

// Send chat message during call
window.sendVideoChatMessage = async function() {
    const input = document.getElementById('videoChatInput');
    const message = input.value.trim();
    
    if (!message || !currentAppointment) return;
    
    try {
        console.log('💬 Sending video chat message...');
        
        const messagesRef = collection(db, 'telemedicine_appointments', currentAppointment.id, 'video_messages');
        const messageData = {
            text: message,
            sender: 'doctor',
            senderName: currentAppointment.doctorName || 'Doctor',
            timestamp: new Date().toISOString()
        };
        
        await addDoc(messagesRef, messageData);
        input.value = '';
        
        console.log('✅ Message sent');
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        alert('Failed to send message');
    }
};

// Display chat message
function displayChatMessage(message, isSent) {
    const messagesContainer = document.getElementById('videoChatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `video-chat-message ${isSent ? 'sent' : 'received'}`;
    messageDiv.innerHTML = `
        <div class="message-text">${message.text}</div>
        <div class="message-time">${new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// End call
window.endVideoCall = async function() {
    const confirmed = confirm('Are you sure you want to end this call?');
    if (!confirmed) return;
    
    try {
        if (currentAppointment) {
            const appointmentRef = doc(db, 'telemedicine_appointments', currentAppointment.id);
            await updateDoc(appointmentRef, {
                status: 'Completed',
                callEndedAt: new Date().toISOString()
            });
        }
        
        closeVideoCall();
        alert('Call ended successfully');
        
    } catch (error) {
        console.error('❌ Error ending call:', error);
        closeVideoCall();
    }
};

// Close video call
function closeVideoCall() {
    // Unsubscribe from Firebase listeners
    if (window.telemedicineUnsubscribers) {
        window.telemedicineUnsubscribers.forEach(unsubscribe => {
            try {
                unsubscribe();
            } catch (error) {
                console.error('Error unsubscribing:', error);
            }
        });
        window.telemedicineUnsubscribers = [];
    }
    
    // Stop all tracks
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }
    
    // Close peer connection
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // Close data channel
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }
    
    // Hide modal
    document.getElementById('videoCallModal').style.display = 'none';
    currentAppointment = null;
}

// Open consultation chat
window.openConsultationChat = function(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) {
        alert('Appointment not found');
        return;
    }
    
    currentAppointment = appointment;
    
    // Reset unread count when chat is opened
    unreadMessages[appointmentId] = 0;
    updateChatBadge(appointmentId);
    
    console.log(`✅ Chat opened for appointment ${appointmentId}, unread count reset`);
    
    document.getElementById('consultationChatModal').style.display = 'flex';
    document.getElementById('chatPatientName').textContent = appointment.patientName;
    document.getElementById('chatPatientNumber').textContent = appointment.patientNumber;
    
    loadChatMessages(appointmentId);
};

// Close consultation chat
window.closeConsultationChat = function() {
    document.getElementById('consultationChatModal').style.display = 'none';
    if (unsubscribeChat) {
        unsubscribeChat();
    }
    currentAppointment = null;
};

// Load chat messages
function loadChatMessages(appointmentId) {
    const messagesRef = collection(db, 'telemedicine_appointments', appointmentId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    if (unsubscribeChat) {
        unsubscribeChat();
    }
    
    unsubscribeChat = onSnapshot(q, (snapshot) => {
        const messagesContainer = document.getElementById('consultationChatMessages');
        messagesContainer.innerHTML = '';
        
        snapshot.forEach((docSnapshot) => {
            const message = docSnapshot.data();
            displayConsultationMessage(message);
        });
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// Display consultation message
function displayConsultationMessage(message) {
    const messagesContainer = document.getElementById('consultationChatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `consultation-message ${message.sender === 'doctor' ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-sender">${message.senderName || message.sender}</div>
        <div class="message-text">${message.text}</div>
        <div class="message-time">${time}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
}

// Send consultation message
window.sendConsultationMessage = async function() {
    const input = document.getElementById('consultationChatInput');
    const message = input.value.trim();
    
    if (!message || !currentAppointment) return;
    
    try {
        console.log('💬 Sending consultation message to Firebase...');
        
        const messagesRef = collection(db, 'telemedicine_appointments', currentAppointment.id, 'messages');
        const messageData = {
            text: message,
            sender: 'doctor',
            senderName: currentAppointment.doctorName || 'Doctor',
            timestamp: new Date().toISOString()
        };
        
        const docRef = await addDoc(messagesRef, messageData);
        
        console.log('✅ Message saved to Firebase with ID:', docRef.id);
        console.log('📊 Message data:', messageData);
        
        input.value = '';
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        alert('Failed to send message. Please try again.');
    }
};

// View appointment details
window.viewAppointmentDetails = function(appointmentId) {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) {
        alert('Appointment not found');
        return;
    }
    
    currentAppointment = appointment;
    
    document.getElementById('viewAppointmentModal').style.display = 'flex';
    
    document.getElementById('viewAppointmentId').textContent = '#' + appointment.id.substring(0, 8).toUpperCase();
    document.getElementById('viewAppointmentPatient').textContent = appointment.patientName;
    document.getElementById('viewAppointmentNumber').textContent = appointment.patientNumber;
    document.getElementById('viewAppointmentType').textContent = appointment.consultationType;
    document.getElementById('viewAppointmentDoctor').textContent = appointment.doctorName;
    document.getElementById('viewAppointmentStatus').textContent = appointment.status;
    document.getElementById('viewAppointmentDate').textContent = new Date(appointment.scheduledDate).toLocaleString();
    document.getElementById('viewAppointmentNotes').textContent = appointment.notes || 'No notes';
    
    // Display consultation link
    const linkElement = document.getElementById('viewAppointmentLink');
    if (appointment.consultationLink) {
        linkElement.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="text" value="${appointment.consultationLink}" readonly 
                    style="flex: 1; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); font-size: 12px;">
                <button onclick="copyConsultationLink('${appointment.consultationLink}')" 
                    style="padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: nowrap;">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <button onclick="shareConsultationLink('${appointment.consultationLink}', '${appointment.patientPhone}')" 
                    style="padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; white-space: nowrap;">
                    <i class="fas fa-share"></i> Share
                </button>
            </div>
        `;
    } else {
        linkElement.textContent = 'Link not generated';
    }
};

// Copy consultation link
window.copyConsultationLink = function(link) {
    navigator.clipboard.writeText(link).then(() => {
        alert('✅ Link copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy link');
    });
};

// Share consultation link
window.shareConsultationLink = function(link, phone) {
    const message = `Your video consultation is scheduled. Join using this link: ${link}`;
    
    const options = [];
    
    if (phone) {
        options.push(`📱 SMS: sms:${phone}?body=${encodeURIComponent(message)}`);
    }
    
    options.push(`📧 Email: mailto:?subject=Video Consultation Link&body=${encodeURIComponent(message)}`);
    options.push(`💬 WhatsApp: https://wa.me/${phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`);
    
    const choice = confirm(`Link: ${link}\n\nCopied to clipboard! Choose how to share:\n\nOK = WhatsApp\nCancel = Copy only`);
    
    if (choice && phone) {
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    }
    
    // Copy anyway
    navigator.clipboard.writeText(link);
};

// Close appointment details
window.closeAppointmentDetailsModal = function() {
    document.getElementById('viewAppointmentModal').style.display = 'none';
};

// Add Doctor Note
window.addDoctorNote = async function(appointmentId) {
    console.log('📝 Opening doctor note modal for:', appointmentId);
    
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) {
        alert('Appointment not found');
        return;
    }
    
    currentAppointment = appointment;
    
    // Display modal
    document.getElementById('doctorNoteModal').style.display = 'flex';
    
    // Clear textarea
    document.getElementById('doctorNoteText').value = '';
    
    // Display appointment data immediately
    displayAppointmentDataInNote(appointment);
    
    // Then fetch additional patient details in real-time from Firestore
    fetchPatientDetailsRealtime(appointment.patientNumber, appointmentId);
};

// Display appointment data immediately in note modal
function displayAppointmentDataInNote(appointment) {
    // Display patient name immediately
    const initials = (appointment.patientName || 'P').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    
    document.getElementById('notePatientName').innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, var(--primary-color), #2874a6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 700;">
                ${initials}
            </div>
            <div>
                <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">
                    ${appointment.patientName || 'Unknown Patient'}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                    <i class="fas fa-id-card"></i> ${appointment.patientNumber || '-'} • 
                    <i class="fas fa-phone"></i> ${appointment.patientPhone || '-'}
                </div>
            </div>
        </div>
    `;
    
    // Display basic patient information from appointment
    document.getElementById('notePatientNumber').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px;">
            <div style="background: var(--bg-color); padding: 10px; border-radius: 6px;">
                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Gender</div>
                <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">
                    <i class="fas fa-${appointment.patientGender === 'Male' ? 'mars' : appointment.patientGender === 'Female' ? 'venus' : 'genderless'}"></i> 
                    ${appointment.patientGender || 'N/A'}
                </div>
            </div>
            <div style="background: var(--bg-color); padding: 10px; border-radius: 6px;">
                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Age</div>
                <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">
                    <i class="fas fa-birthday-cake"></i> ${appointment.patientAge || 'N/A'} years
                </div>
            </div>
            <div style="background: var(--bg-color); padding: 10px; border-radius: 6px;">
                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Patient Number</div>
                <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">
                    <i class="fas fa-hashtag"></i> ${appointment.patientNumber || 'N/A'}
                </div>
            </div>
            <div style="background: var(--bg-color); padding: 10px; border-radius: 6px;">
                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Phone</div>
                <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">
                    <i class="fas fa-phone"></i> ${appointment.patientPhone || 'N/A'}
                </div>
            </div>
        </div>
    `;
}

// Fetch patient details in real-time
async function fetchPatientDetailsRealtime(patientNumber, appointmentId) {
    try {
        console.log('🔍 Fetching additional patient details for:', patientNumber);
        
        // Query patients collection
        const patientsQuery = query(
            collection(db, 'patients'),
            where('patientNumber', '==', patientNumber)
        );
        
        const patientsSnapshot = await getDocs(patientsQuery);
        
        if (!patientsSnapshot.empty) {
            const patientData = patientsSnapshot.docs[0].data();
            
            // Update with complete patient information from database
            const initials = `${(patientData.firstName?.[0] || 'P').toUpperCase()}${(patientData.lastName?.[0] || '').toUpperCase()}`;
            
            document.getElementById('notePatientName').innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 50px; height: 50px; background: linear-gradient(135deg, var(--primary-color), #2874a6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 700;">
                        ${initials}
                    </div>
                    <div>
                        <div style="font-size: 16px; font-weight: 600; color: var(--text-primary);">
                            ${patientData.firstName || ''} ${patientData.lastName || ''}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                            <i class="fas fa-id-card"></i> ${patientData.patientNumber || '-'} • 
                            <i class="fas fa-phone"></i> ${patientData.phoneNumber || '-'}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('notePatientNumber').innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px;">
                    <div style="background: var(--bg-color); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Gender</div>
                        <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">
                            <i class="fas fa-${patientData.gender === 'Male' ? 'mars' : patientData.gender === 'Female' ? 'venus' : 'genderless'}"></i> 
                            ${patientData.gender || 'N/A'}
                        </div>
                    </div>
                    <div style="background: var(--bg-color); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Blood Group</div>
                        <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">
                            <i class="fas fa-tint"></i> ${patientData.bloodGroup || 'N/A'}
                        </div>
                    </div>
                    <div style="background: var(--bg-color); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Age</div>
                        <div style="font-size: 13px; font-weight: 500; color: var(--text-primary);">
                            <i class="fas fa-birthday-cake"></i> ${patientData.age || calculateAge(patientData.dateOfBirth) || 'N/A'} years
                        </div>
                    </div>
                    <div style="background: var(--bg-color); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Email</div>
                        <div style="font-size: 13px; font-weight: 500; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <i class="fas fa-envelope"></i> ${patientData.email || 'N/A'}
                        </div>
                    </div>
                </div>
                ${patientData.address ? `
                    <div style="background: var(--bg-color); padding: 10px; border-radius: 6px; margin-top: 12px;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Address</div>
                        <div style="font-size: 13px; color: var(--text-primary);">
                            <i class="fas fa-map-marker-alt"></i> ${patientData.address}
                        </div>
                    </div>
                ` : ''}
            `;
            
            console.log('✅ Patient details enhanced from database');
        } else {
            console.log('ℹ️ Using appointment data (patient not found in database)');
        }
        
        // Load existing notes after patient details
        await loadExistingNotes(appointmentId);
        
    } catch (error) {
        console.error('Error fetching patient details:', error);
        document.getElementById('notePatientName').textContent = currentAppointment.patientName || 'Error loading patient';
        document.getElementById('notePatientNumber').textContent = patientNumber || '-';
        
        // Still try to load notes
        await loadExistingNotes(appointmentId);
    }
}

// Calculate age from date of birth
function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// Load existing notes
async function loadExistingNotes(appointmentId) {
    try {
        const appointmentRef = doc(db, 'telemedicine_appointments', appointmentId);
        const notesQuery = query(
            collection(appointmentRef, 'doctor_notes'),
            orderBy('timestamp', 'desc')
        );
        
        const notesSnapshot = await getDocs(notesQuery);
        const existingNotesSection = document.getElementById('existingNotesSection');
        const existingNotesList = document.getElementById('existingNotesList');
        
        if (notesSnapshot.empty) {
            existingNotesSection.style.display = 'none';
        } else {
            existingNotesSection.style.display = 'block';
            
            let notesHtml = '';
            notesSnapshot.forEach(noteDoc => {
                const note = noteDoc.data();
                const noteDate = new Date(note.timestamp).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                notesHtml += `
                    <div style="background: var(--bg-color); border-left: 3px solid var(--primary-color); padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <span style="font-weight: 600; color: var(--text-primary); font-size: 13px;">${note.doctorName || 'Doctor'}</span>
                            <span style="font-size: 11px; color: var(--text-secondary);">${noteDate}</span>
                        </div>
                        <div style="font-size: 13px; color: var(--text-primary); line-height: 1.5; white-space: pre-wrap;">${note.note}</div>
                    </div>
                `;
            });
            
            existingNotesList.innerHTML = notesHtml;
        }
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

// Save Doctor Note
window.saveDoctorNote = async function() {
    const noteText = document.getElementById('doctorNoteText').value.trim();
    
    if (!noteText) {
        alert('Please enter a note');
        return;
    }
    
    if (!currentAppointment) {
        alert('No appointment selected');
        return;
    }
    
    try {
        // Get current user info (you can adjust this based on your auth system)
        const doctorName = localStorage.getItem('userName') || 'Doctor';
        
        console.log('📝 Saving doctor note to Firebase...');
        
        // Create note object
        const noteData = {
            note: noteText,
            doctorName: doctorName,
            timestamp: new Date().toISOString(),
            appointmentId: currentAppointment.id,
            patientName: currentAppointment.patientName,
            patientNumber: currentAppointment.patientNumber,
            createdAt: new Date().toISOString()
        };
        
        console.log('📊 Note data to save:', noteData);
        
        // Save to Firestore subcollection
        const appointmentRef = doc(db, 'telemedicine_appointments', currentAppointment.id);
        const docRef = await addDoc(collection(appointmentRef, 'doctor_notes'), noteData);
        
        console.log('✅ Doctor note saved successfully with ID:', docRef.id);
        console.log('📍 Saved to: telemedicine_appointments/' + currentAppointment.id + '/doctor_notes/' + docRef.id);
        
        alert('Note saved successfully!');
        
        // Close modal
        closeDoctorNoteModal();
        
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to save note. Please try again.');
    }
};

// Close Doctor Note Modal
window.closeDoctorNoteModal = function() {
    document.getElementById('doctorNoteModal').style.display = 'none';
    document.getElementById('doctorNoteText').value = '';
    currentAppointment = null;
};

// Show consultation link
function showConsultationLink(link, patientName, patientPhone) {
    // Store link data for sharing
    window.currentConsultationLink = link;
    window.currentPatientPhone = patientPhone;
    window.currentPatientName = patientName;
    
    // Display modal
    document.getElementById('consultationLinkModal').style.display = 'flex';
    
    // Fill in patient information
    document.getElementById('linkModalPatientName').textContent = patientName;
    document.getElementById('linkModalPatientNumber').textContent = currentAppointment?.patientNumber || 'N/A';
    document.getElementById('linkModalPatientPhone').textContent = patientPhone || 'N/A';
    
    if (currentAppointment?.scheduledDate) {
        const scheduledDate = new Date(currentAppointment.scheduledDate);
        document.getElementById('linkModalScheduledTime').textContent = scheduledDate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } else {
        document.getElementById('linkModalScheduledTime').textContent = 'Not specified';
    }
    
    // Set the consultation link
    document.getElementById('consultationLinkInput').value = link;
    
    // Auto-copy to clipboard
    copyLinkFromModal();
    
    console.log('📋 Consultation link modal displayed');
}

// Close consultation link modal
window.closeConsultationLinkModal = function() {
    document.getElementById('consultationLinkModal').style.display = 'none';
    window.currentConsultationLink = null;
    window.currentPatientPhone = null;
    window.currentPatientName = null;
};

// Copy link from modal
window.copyLinkFromModal = function() {
    const input = document.getElementById('consultationLinkInput');
    input.select();
    input.setSelectionRange(0, 99999); // For mobile devices
    
    navigator.clipboard.writeText(input.value).then(() => {
        // Change button text temporarily
        const btn = event.target.closest('button');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            btn.style.background = '#27ae60';
            
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.style.background = 'var(--primary-color)';
            }, 2000);
        }
        
        console.log('✅ Link copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy link. Please copy manually.');
    });
};

// Share via WhatsApp
window.shareViaWhatsApp = function() {
    const link = window.currentConsultationLink;
    const name = window.currentPatientName;
    const phone = window.currentPatientPhone;
    
    if (!link) return;
    
    const message = `Hello ${name},\n\nYour video consultation has been scheduled.\n\nJoin using this link:\n${link}\n\nPlease ensure you have a stable internet connection and allow camera/microphone permissions.\n\nThank you!`;
    
    const whatsappUrl = `https://wa.me/${phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    console.log('📱 Opening WhatsApp share');
};

// Share via SMS
window.shareViaSMS = function() {
    const link = window.currentConsultationLink;
    const name = window.currentPatientName;
    const phone = window.currentPatientPhone;
    
    if (!link) return;
    
    const message = `Hello ${name}, your video consultation is scheduled. Join here: ${link}`;
    
    const smsUrl = `sms:${phone}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
    
    console.log('💬 Opening SMS share');
};

// Share via Email
window.shareViaEmail = function() {
    const link = window.currentConsultationLink;
    const name = window.currentPatientName;
    
    if (!link) return;
    
    const subject = 'Your Video Consultation Link';
    const body = `Dear ${name},\n\nYour video consultation has been scheduled.\n\nPlease join the consultation using the link below:\n${link}\n\nImportant:\n- Ensure you have a stable internet connection\n- Allow camera and microphone permissions when prompted\n- Join a few minutes before the scheduled time\n\nIf you have any questions, please contact us.\n\nThank you!`;
    
    const emailUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(emailUrl, '_blank');
    
    console.log('📧 Opening email share');
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (unsubscribeTelemedicine) {
        unsubscribeTelemedicine();
    }
    if (unsubscribeChat) {
        unsubscribeChat();
    }
    
    // Cleanup all message listeners
    Object.values(messageListeners).forEach(unsubscribe => {
        if (unsubscribe) unsubscribe();
    });
    messageListeners = {};
    
    closeVideoCall();
});

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    const telemedicineModule = document.getElementById('telemedicine-module');
    if (telemedicineModule && telemedicineModule.classList.contains('active')) {
        initTelemedicineModule();
    }
});
