// Staff Internal Messaging System
// RxFlow Hospital Management System

import { db, auth } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    getDocs, 
    doc, 
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global state
let currentUserId = null;
let currentUserData = null;
let messagesListener = null;
let previousMessageCount = 0;

// Notification sound - using Web Audio API for a "ting" sound
function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Create a pleasant "ting" sound (higher pitch, short duration)
        oscillator.frequency.value = 800; // Higher frequency for "ting" sound
        oscillator.type = 'sine';
        
        // Envelope for the sound
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        console.log('🔔 Ting! Message notification sound played');
    } catch (error) {
        console.error('Error playing notification sound:', error);
    }
}

// Initialize messaging system
export function initMessagingSystem() {
    console.log('🔧 Initializing messaging system...');
    
    // Get current user
    currentUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    
    if (!currentUserId) {
        console.error('❌ No user logged in');
        return;
    }

    // Load user data
    loadCurrentUserData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load messages
    loadMessages();
    
    // Load staff list for compose
    loadStaffList();
    
    console.log('✅ Messaging system initialized');
}

// Load current user data
async function loadCurrentUserData() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        if (userDoc.exists()) {
            currentUserData = { id: userDoc.id, ...userDoc.data() };
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Messages dropdown toggle
    const messagesBtn = document.getElementById('messagesBtn');
    const messagesDropdown = document.getElementById('messagesDropdown');
    
    messagesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        messagesDropdown.classList.toggle('active');
        
        // Close notifications if open
        const notificationDropdown = document.getElementById('notificationDropdown');
        if (notificationDropdown) {
            notificationDropdown.classList.remove('active');
        }
        
        // Mark messages as read when opened
        if (messagesDropdown.classList.contains('active')) {
            markMessagesAsRead();
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!messagesDropdown.contains(e.target) && !messagesBtn.contains(e.target)) {
            messagesDropdown.classList.remove('active');
        }
    });
    
    // Compose message button
    const composeBtn = document.getElementById('composeMessageBtn');
    if (composeBtn) {
        composeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openComposeMessageModal();
        });
    }
    
    // Clear all messages button
    const clearMessagesBtn = document.getElementById('clearMessagesBtn');
    if (clearMessagesBtn) {
        clearMessagesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearAllMessages();
        });
    }
    
    // View all messages
    const viewAllMessages = document.getElementById('viewAllMessages');
    if (viewAllMessages) {
        viewAllMessages.addEventListener('click', (e) => {
            e.preventDefault();
            messagesDropdown.classList.remove('active');
            openAllMessagesModal();
        });
    }
}

// Load messages for current user
function loadMessages() {
    if (!currentUserId) return;
    
    // Unsubscribe from previous listener
    if (messagesListener) {
        messagesListener();
    }
    
    try {
        // Query messages where current user is recipient OR sender (to see sent messages)
        const messagesQuery = query(
            collection(db, 'messages'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );
        
        // Real-time listener with live updates
        messagesListener = onSnapshot(messagesQuery, (snapshot) => {
            const messages = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                // Include if user is recipient or sender
                if (data.recipients?.includes(currentUserId) || data.senderId === currentUserId) {
                    messages.push({ id: doc.id, ...data });
                }
            });
            
            // Sort by timestamp (most recent first)
            messages.sort((a, b) => {
                const aTime = a.timestamp?.toMillis?.() || new Date(a.createdAt).getTime();
                const bTime = b.timestamp?.toMillis?.() || new Date(b.createdAt).getTime();
                return bTime - aTime;
            });
            
            // Limit to 20 most recent
            const recentMessages = messages.slice(0, 20);
            
            // Check for new messages and play sound
            const newMessageCount = messages.filter(msg => 
                msg.recipients?.includes(currentUserId) && 
                (!msg.readBy || !msg.readBy.includes(currentUserId))
            ).length;
            
            // Play sound if there are new unread messages (but not on initial load)
            if (previousMessageCount > 0 && newMessageCount > previousMessageCount) {
                playNotificationSound();
                console.log('🔔 New message received! Playing notification sound');
            }
            
            previousMessageCount = newMessageCount;
            
            displayMessages(recentMessages);
            updateMessagesBadge(recentMessages);
            
            console.log('📬 Messages updated in real-time:', messages.length, 'total,', recentMessages.length, 'displayed');
        }, (error) => {
            console.error('Error loading messages:', error);
            // Show empty state on error
            displayMessages([]);
        });
    } catch (error) {
        console.error('Error setting up messages listener:', error);
        displayMessages([]);
    }
}

// Display messages in dropdown
function displayMessages(messages) {
    const messagesList = document.getElementById('messagesList');
    
    if (!messages || messages.length === 0) {
        messagesList.innerHTML = `
            <div class="messages-empty">
                <i class="fas fa-inbox"></i>
                <p>No messages yet</p>
            </div>
        `;
        return;
    }
    
    messagesList.innerHTML = messages.map(message => {
        const isUnread = !message.readBy || !message.readBy.includes(currentUserId);
        const time = formatMessageTime(message.timestamp);
        const senderInitials = getInitials(message.senderName);
        
        // Determine read status
        let readStatus = '';
        if (message.senderId === currentUserId) {
            // This is a sent message, show read receipts
            const readCount = message.readBy ? message.readBy.length : 0;
            const totalRecipients = message.recipients ? message.recipients.length : 0;
            
            if (readCount === 0) {
                readStatus = `<div class="read-receipt sent"><i class="fas fa-check"></i> Sent</div>`;
            } else if (readCount < totalRecipients) {
                readStatus = `<div class="read-receipt delivered"><i class="fas fa-check-double"></i> Read by ${readCount}/${totalRecipients}</div>`;
            } else {
                readStatus = `<div class="read-receipt read"><i class="fas fa-check-double"></i> Read by all</div>`;
            }
        }
        
        return `
            <div class="message-item ${isUnread ? 'unread' : ''}" onclick="viewMessage('${message.id}')">
                <div class="message-avatar">${senderInitials}</div>
                <div class="message-details">
                    <div class="message-header">
                        <span class="message-sender">${message.senderName}</span>
                        <span class="message-time">${time}</span>
                    </div>
                    <div class="message-subject">${message.subject}</div>
                    <div class="message-preview">${message.content}</div>
                    ${message.isUrgent ? '<div class="message-urgent"><i class="fas fa-exclamation-triangle"></i> Urgent</div>' : ''}
                    ${readStatus}
                </div>
            </div>
        `;
    }).join('');
}

// Update messages badge count
function updateMessagesBadge(messages) {
    const badge = document.getElementById('messagesBadge');
    if (!badge) return;
    
    const unreadCount = messages.filter(msg => 
        !msg.readBy || !msg.readBy.includes(currentUserId)
    ).length;
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Mark messages as read
async function markMessagesAsRead() {
    if (!currentUserId) return;
    
    try {
        const messagesQuery = query(
            collection(db, 'messages'),
            where('recipients', 'array-contains', currentUserId),
            where('readBy', 'not-in', [[currentUserId]])
        );
        
        const snapshot = await getDocs(messagesQuery);
        
        snapshot.forEach(async (messageDoc) => {
            const messageRef = doc(db, 'messages', messageDoc.id);
            const messageData = messageDoc.data();
            const readBy = messageData.readBy || [];
            
            if (!readBy.includes(currentUserId)) {
                await updateDoc(messageRef, {
                    readBy: [...readBy, currentUserId]
                });
            }
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

// Open compose message modal
window.openComposeMessageModal = function() {
    const modal = document.getElementById('composeMessageModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        // Clear form
        document.getElementById('messageRecipient').value = '';
        document.getElementById('messageSubject').value = '';
        document.getElementById('messageContent').value = '';
        document.getElementById('messagePriority').checked = false;
        
        // Focus on first field
        setTimeout(() => {
            document.getElementById('messageRecipient').focus();
        }, 100);
    }
};

// Close compose message modal
window.closeComposeMessageModal = function() {
    const modal = document.getElementById('composeMessageModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
};

// Load staff list for recipient selection
async function loadStaffList() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const staffList = document.getElementById('individualStaffList');
        
        if (!staffList) return;
        
        staffList.innerHTML = '';
        
        usersSnapshot.forEach((doc) => {
            const user = doc.data();
            // Don't include current user
            if (doc.id !== currentUserId) {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${user.displayName || user.email} - ${user.role || 'Staff'}`;
                staffList.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading staff list:', error);
    }
}

// Send message
window.sendMessage = async function() {
    const recipientValue = document.getElementById('messageRecipient').value;
    const subject = document.getElementById('messageSubject').value.trim();
    const content = document.getElementById('messageContent').value.trim();
    const isUrgent = document.getElementById('messagePriority').checked;
    
    // Validation
    if (!recipientValue) {
        alert('Please select a recipient');
        return;
    }
    
    if (!subject) {
        alert('Please enter a subject');
        return;
    }
    
    if (!content) {
        alert('Please enter a message');
        return;
    }
    
    // Show loading state
    const sendBtn = event.target;
    const originalText = sendBtn.innerHTML;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        // Determine recipients
        let recipients = [];
        
        if (recipientValue === 'all') {
            // Get all staff
            const usersSnapshot = await getDocs(collection(db, 'users'));
            recipients = usersSnapshot.docs
                .map(doc => doc.id)
                .filter(id => id !== currentUserId);
        } else if (recipientValue.startsWith('all-')) {
            // Get all staff of specific role
            const role = recipientValue.replace('all-', '');
            const usersQuery = query(
                collection(db, 'users'),
                where('role', '==', role)
            );
            const usersSnapshot = await getDocs(usersQuery);
            recipients = usersSnapshot.docs
                .map(doc => doc.id)
                .filter(id => id !== currentUserId);
        } else if (['doctors', 'nurses', 'pharmacists', 'lab-techs', 'administrators'].includes(recipientValue)) {
            // Map to actual role names
            const roleMap = {
                'doctors': 'doctor',
                'nurses': 'nurse',
                'pharmacists': 'pharmacist',
                'lab-techs': 'lab-tech',
                'administrators': 'administrator'
            };
            const usersQuery = query(
                collection(db, 'users'),
                where('role', '==', roleMap[recipientValue])
            );
            const usersSnapshot = await getDocs(usersQuery);
            recipients = usersSnapshot.docs
                .map(doc => doc.id)
                .filter(id => id !== currentUserId);
        } else {
            // Single recipient
            recipients = [recipientValue];
        }
        
        if (recipients.length === 0) {
            alert('No recipients found');
            sendBtn.disabled = false;
            sendBtn.innerHTML = originalText;
            return;
        }
        
        // Create message with real-time timestamp
        const messageData = {
            senderId: currentUserId,
            senderName: currentUserData?.displayName || currentUserData?.email || 'Unknown User',
            recipients: recipients,
            subject: subject,
            content: content,
            isUrgent: isUrgent,
            timestamp: serverTimestamp(),
            readBy: [], // Track who has read the message
            deliveredTo: recipients, // Track delivery
            createdAt: new Date().toISOString()
        };
        
        // Save to Firebase with real-time confirmation
        const docRef = await addDoc(collection(db, 'messages'), messageData);
        
        // Verify the document was created
        const savedDoc = await getDoc(docRef);
        
        if (savedDoc.exists()) {
            console.log('✅ Message saved to Firebase with ID:', docRef.id);
            
            // Play notification sound for successful send
            playNotificationSound();
            
            // Close modal
            closeComposeMessageModal();
            
            // Show success notification with checkmark
            showSuccessNotification(`Message sent successfully to ${recipients.length} recipient(s)! ✓`);
            
            // Reset form
            document.getElementById('messageRecipient').value = '';
            document.getElementById('messageSubject').value = '';
            document.getElementById('messageContent').value = '';
            document.getElementById('messagePriority').checked = false;
        } else {
            throw new Error('Failed to verify message was saved');
        }
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        if (window.showToast) window.showToast('Failed to send message. Please try again.', 'error');
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalText;
    }
};

// Show success notification - uses global toast system
function showSuccessNotification(message) {
    if (window.showToast) {
        window.showToast(message, 'success');
    }
}

// View message
window.viewMessage = async function(messageId) {
    try {
        const messageDoc = await getDoc(doc(db, 'messages', messageId));
        
        if (!messageDoc.exists()) {
            alert('Message not found');
            return;
        }
        
        const message = messageDoc.data();
        
        // Populate modal
        document.getElementById('viewMessageSubject').textContent = message.subject;
        document.getElementById('viewMessageFrom').textContent = message.senderName;
        document.getElementById('viewMessageDate').textContent = formatFullDate(message.timestamp);
        document.getElementById('viewMessageContent').textContent = message.content;
        
        const priorityDiv = document.getElementById('viewMessagePriority');
        if (message.isUrgent) {
            priorityDiv.style.display = 'block';
        } else {
            priorityDiv.style.display = 'none';
        }
        
        // Show read receipt information if user is sender
        let readReceiptHTML = '';
        if (message.senderId === currentUserId) {
            const readCount = message.readBy ? message.readBy.length : 0;
            const totalRecipients = message.recipients ? message.recipients.length : 0;
            
            readReceiptHTML = `
                <div class="message-read-status" style="margin-top: 12px;">
                    <strong>Delivery Status:</strong>
                    ${readCount === 0 ? 
                        '<span class="read-receipt sent"><i class="fas fa-check"></i> Sent to ' + totalRecipients + ' recipient(s)</span>' :
                        readCount < totalRecipients ?
                        '<span class="read-receipt delivered"><i class="fas fa-check-double"></i> Read by ' + readCount + ' of ' + totalRecipients + ' recipient(s)</span>' :
                        '<span class="read-receipt read"><i class="fas fa-check-double"></i> Read by all recipients ✓</span>'
                    }
                </div>
            `;
        }
        
        // Append read receipt info to meta section
        const metaDiv = document.querySelector('#viewMessageModal .message-meta');
        if (metaDiv) {
            // Remove old read receipt if exists
            const oldReceipt = metaDiv.querySelector('.message-read-status');
            if (oldReceipt) oldReceipt.remove();
            
            if (readReceiptHTML) {
                metaDiv.insertAdjacentHTML('beforeend', readReceiptHTML);
            }
        }
        
        // Store current message ID for reply
        window.currentMessageId = messageId;
        window.currentMessageSender = message.senderId;
        
        // Show modal
        const modal = document.getElementById('viewMessageModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
        
        // Mark as read (with real-time update)
        const readBy = message.readBy || [];
        if (!readBy.includes(currentUserId)) {
            await updateDoc(doc(db, 'messages', messageId), {
                readBy: [...readBy, currentUserId]
            });
            console.log('✓ Message marked as read in real-time');
        }
        
        // Close messages dropdown
        const messagesDropdown = document.getElementById('messagesDropdown');
        if (messagesDropdown) {
            messagesDropdown.classList.remove('active');
        }
        
    } catch (error) {
        console.error('Error viewing message:', error);
        alert('Failed to load message');
    }
};

// Close view message modal
window.closeViewMessageModal = function() {
    const modal = document.getElementById('viewMessageModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
};

// Reply to message
window.replyToMessage = function() {
    closeViewMessageModal();
    openComposeMessageModal();
    
    // Pre-fill recipient with sender
    if (window.currentMessageSender) {
        document.getElementById('messageRecipient').value = window.currentMessageSender;
    }
    
    // Pre-fill subject with Re:
    const originalSubject = document.getElementById('viewMessageSubject').textContent;
    document.getElementById('messageSubject').value = `Re: ${originalSubject}`;
};

// Clear all messages function
window.clearAllMessages = async function() {
    if (!currentUserId) {
        alert('You must be logged in to clear messages');
        return;
    }
    
    const confirmed = confirm('Are you sure you want to clear all messages? This will delete all messages where you are a recipient. This action cannot be undone.');
    
    if (!confirmed) {
        return;
    }
    
    try {
        // Show loading state
        const clearBtn = document.getElementById('clearMessagesBtn');
        if (clearBtn) {
            clearBtn.disabled = true;
            clearBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        
        // Query all messages where current user is recipient
        const messagesQuery = query(
            collection(db, 'messages'),
            where('recipients', 'array-contains', currentUserId)
        );
        
        const snapshot = await getDocs(messagesQuery);
        
        if (snapshot.empty) {
            alert('No messages to clear');
            if (clearBtn) {
                clearBtn.disabled = false;
                clearBtn.innerHTML = '<i class="fas fa-times"></i>';
            }
            return;
        }
        
        // Delete messages in batches
        let deleteCount = 0;
        const deletePromises = [];
        
        snapshot.forEach((doc) => {
            deletePromises.push(deleteDoc(doc.ref));
            deleteCount++;
        });
        
        await Promise.all(deletePromises);
        
        console.log(`✅ Cleared ${deleteCount} messages`);
        
        // Show success notification
        showSuccessNotification(`${deleteCount} message(s) cleared successfully! ✓`);
        
        // Close dropdown
        const messagesDropdown = document.getElementById('messagesDropdown');
        if (messagesDropdown) {
            messagesDropdown.classList.remove('active');
        }
        
        // Reset button
        if (clearBtn) {
            clearBtn.disabled = false;
            clearBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
        
    } catch (error) {
        console.error('Error clearing messages:', error);
        alert('Failed to clear messages. Please try again.');
        
        // Reset button
        const clearBtn = document.getElementById('clearMessagesBtn');
        if (clearBtn) {
            clearBtn.disabled = false;
            clearBtn.innerHTML = '<i class="fas fa-times"></i>';
        }
    }
};

// Utility functions
function getInitials(name) {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function formatMessageTime(timestamp) {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(timestamp) {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Open all messages modal
window.openAllMessagesModal = async function() {
    const modal = document.getElementById('viewAllMessagesModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        
        // Load all messages
        await loadAllMessages();
    }
};

// Close all messages modal
window.closeAllMessagesModal = function() {
    const modal = document.getElementById('viewAllMessagesModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
};

// Load all messages for the modal
let allMessagesData = [];
let currentFilter = 'all';

async function loadAllMessages() {
    try {
        const messagesQuery = query(
            collection(db, 'messages'),
            orderBy('timestamp', 'desc')
        );
        
        const snapshot = await getDocs(messagesQuery);
        allMessagesData = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Include if user is recipient or sender
            if (data.recipients?.includes(currentUserId) || data.senderId === currentUserId) {
                allMessagesData.push({ id: doc.id, ...data });
            }
        });
        
        // Display with current filter
        filterAllMessages(currentFilter);
        
        console.log('📬 Loaded', allMessagesData.length, 'messages for modal view');
    } catch (error) {
        console.error('Error loading all messages:', error);
        document.getElementById('allMessagesList').innerHTML = `
            <div class="messages-empty">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading messages</p>
            </div>
        `;
    }
}

// Filter all messages
window.filterAllMessages = function(filter) {
    currentFilter = filter;
    
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === filter) {
            tab.classList.add('active');
        }
    });
    
    // Filter messages
    let filteredMessages = allMessagesData;
    
    if (filter === 'unread') {
        filteredMessages = allMessagesData.filter(msg => 
            msg.recipients?.includes(currentUserId) &&
            (!msg.readBy || !msg.readBy.includes(currentUserId))
        );
    } else if (filter === 'sent') {
        filteredMessages = allMessagesData.filter(msg => 
            msg.senderId === currentUserId
        );
    }
    
    displayAllMessages(filteredMessages);
};

// Search all messages
window.searchAllMessages = function() {
    const searchTerm = document.getElementById('allMessagesSearch').value.toLowerCase();
    
    let filteredMessages = allMessagesData;
    
    // Apply current filter
    if (currentFilter === 'unread') {
        filteredMessages = filteredMessages.filter(msg => 
            msg.recipients?.includes(currentUserId) &&
            (!msg.readBy || !msg.readBy.includes(currentUserId))
        );
    } else if (currentFilter === 'sent') {
        filteredMessages = filteredMessages.filter(msg => 
            msg.senderId === currentUserId
        );
    }
    
    // Apply search
    if (searchTerm) {
        filteredMessages = filteredMessages.filter(msg => {
            const subject = msg.subject?.toLowerCase() || '';
            const content = msg.content?.toLowerCase() || '';
            const sender = msg.senderName?.toLowerCase() || '';
            
            return subject.includes(searchTerm) || 
                   content.includes(searchTerm) || 
                   sender.includes(searchTerm);
        });
    }
    
    displayAllMessages(filteredMessages);
};

// Display all messages
function displayAllMessages(messages) {
    const messagesList = document.getElementById('allMessagesList');
    
    if (!messages || messages.length === 0) {
        messagesList.innerHTML = `
            <div class="messages-empty">
                <i class="fas fa-inbox"></i>
                <p>No messages found</p>
            </div>
        `;
        return;
    }
    
    messagesList.innerHTML = messages.map(message => {
        const isUnread = message.recipients?.includes(currentUserId) && 
                        (!message.readBy || !message.readBy.includes(currentUserId));
        const time = formatFullDate(message.timestamp);
        const senderInitials = getInitials(message.senderName);
        const isSent = message.senderId === currentUserId;
        
        // Read receipt for sent messages
        let readStatus = '';
        if (isSent) {
            const readCount = message.readBy ? message.readBy.length : 0;
            const totalRecipients = message.recipients ? message.recipients.length : 0;
            
            if (readCount === 0) {
                readStatus = `<div class="read-receipt sent"><i class="fas fa-check"></i> Sent</div>`;
            } else if (readCount < totalRecipients) {
                readStatus = `<div class="read-receipt delivered"><i class="fas fa-check-double"></i> ${readCount}/${totalRecipients}</div>`;
            } else {
                readStatus = `<div class="read-receipt read"><i class="fas fa-check-double"></i> All read</div>`;
            }
        }
        
        return `
            <div class="message-item-full ${isUnread ? 'unread' : ''}" onclick="viewMessageFromModal('${message.id}')">
                <div class="message-avatar">${senderInitials}</div>
                <div class="message-details-full">
                    <div class="message-header-full">
                        <span class="message-sender-full">
                            ${isSent ? '→ ' : ''}${message.senderName}
                            ${message.isUrgent ? '<i class="fas fa-exclamation-triangle" style="color: var(--error-color); margin-left: 8px;"></i>' : ''}
                        </span>
                        <span class="message-time-full">${time}</span>
                    </div>
                    <div class="message-subject-full">${message.subject}</div>
                    <div class="message-preview-full">${message.content}</div>
                    ${readStatus}
                </div>
            </div>
        `;
    }).join('');
}

// View message from modal
window.viewMessageFromModal = async function(messageId) {
    closeAllMessagesModal();
    await viewMessage(messageId);
};

// Open compose from all messages modal
window.openComposeFromAllMessages = function() {
    closeAllMessagesModal();
    setTimeout(() => {
        openComposeMessageModal();
    }, 300);
};

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    const composeModal = document.getElementById('composeMessageModal');
    const viewModal = document.getElementById('viewMessageModal');
    const allMessagesModal = document.getElementById('viewAllMessagesModal');
    
    if (e.target === composeModal) {
        closeComposeMessageModal();
    }
    
    if (e.target === viewModal) {
        closeViewMessageModal();
    }
    
    if (e.target === allMessagesModal) {
        closeAllMessagesModal();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to be ready
    setTimeout(() => {
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        if (userId) {
            initMessagingSystem();
        }
    }, 1000);
});
