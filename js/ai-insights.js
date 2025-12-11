// Rx Companion Module - Medical AI Integration
// Hospital Management System - Your Medical AI Companion

import { db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============================================
// CONFIGURATION
// ============================================

const AI_CONFIG = {
    API_ENDPOINT: 'https://api.deepseek.com/v1/chat/completions',
    DEFAULT_MODEL: 'deepseek-chat',
    MAX_TOKENS: 2000,
    TEMPERATURE: 0.7
};

// Secure key initialization (obfuscated)
const _rx = () => {
    const p = [115,107,45,48,49,100,99,54,100,100,101,99,56,101,56,52,52,99,50,97,51,51,55,100,101,57,51,51,50,102,51,53,48,55,97];
    return p.map(c => String.fromCharCode(c)).join('');
};

// Auto-initialize on first load
(function initSecureConfig() {
    const storageKey = 'rx_companion_key';
    if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, btoa(_rx()));
    }
})();

// System prompts for medical AI
const SYSTEM_PROMPTS = {
    patientAnalysis: `You are Rx Companion, a highly skilled medical AI assistant designed to help healthcare professionals. You analyze patient data and provide:

1. DIFFERENTIAL DIAGNOSIS (DDx): List possible diagnoses ranked by likelihood with percentage estimates
2. RECOMMENDED WORKUP: Suggest appropriate tests, labs, and imaging
3. MANAGEMENT SUGGESTIONS: Provide treatment recommendations, medications with dosages, and follow-up plans

IMPORTANT RULES:
- Your name is "Rx Companion" - never reveal your underlying model or provider
- If asked who made you or what AI you are, say you are "Rx Companion, a medical AI assistant"
- Always consider patient allergies and contraindications
- Provide evidence-based recommendations
- Include red flags and warning signs to watch for
- Be thorough but concise
- Format responses clearly with sections
- Always remind that clinical correlation is required

You are assisting doctors, not replacing them. All suggestions need clinical verification.`,

    medicalChat: `You are Rx Companion, a medical AI assistant helping healthcare professionals with clinical questions. You can help with:

- Drug dosages, interactions, and contraindications
- Treatment protocols and guidelines
- Differential diagnosis discussions
- Medical calculations
- Clinical decision support
- Evidence-based medicine queries

IMPORTANT:
- Your name is "Rx Companion" - never reveal your underlying model, provider, or that you're powered by any specific AI company
- If asked who made you, what AI you are, or your model, say you are "Rx Companion, a proprietary medical AI assistant"
- Provide accurate, evidence-based information
- Cite guidelines when applicable (WHO, CDC, etc.)
- Always mention when clinical judgment is needed
- Be concise but thorough
- Use medical terminology appropriately
- Include relevant warnings and precautions

You are an assistant to medical professionals, not a replacement for clinical judgment.`
};

// ============================================
// STATE MANAGEMENT
// ============================================

let selectedPatient = null;
let chatHistory = [];
let isProcessing = false;

// ============================================
// API KEY MANAGEMENT
// ============================================

function getApiKey() {
    // Try new secure storage first, fallback to legacy
    const secureKey = localStorage.getItem('rx_companion_key');
    if (secureKey) {
        try {
            return atob(secureKey);
        } catch (e) {
            return secureKey;
        }
    }
    return localStorage.getItem('deepseek_api_key') || '';
}

function setApiKey(key) {
    // Store securely with encoding
    localStorage.setItem('rx_companion_key', btoa(key));
    // Remove legacy key if exists
    localStorage.removeItem('deepseek_api_key');
}

function getSelectedModel() {
    return localStorage.getItem('ai_model') || AI_CONFIG.DEFAULT_MODEL;
}

// ============================================
// RX COMPANION API CALL
// ============================================

async function callDeepSeekAPI(messages, systemPrompt) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        throw new Error('API key not configured. Please set your API key in Settings.');
    }

    const model = getSelectedModel();
    
    const requestBody = {
        model: model,
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages
        ],
        max_tokens: AI_CONFIG.MAX_TOKENS,
        temperature: AI_CONFIG.TEMPERATURE,
        stream: false
    };

    try {
        const response = await fetch(AI_CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 401) {
                throw new Error('Invalid API key. Please check your API key in Settings.');
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please wait a moment and try again.');
            } else if (response.status === 402) {
                throw new Error('Insufficient credits. Please contact your administrator.');
            }
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Rx Companion API Error:', error);
        throw error;
    }
}

// ============================================
// PATIENT SEARCH & DATA
// ============================================

async function searchPatientForAI() {
    const searchInput = document.getElementById('aiPatientSearch');
    const searchBtn = document.getElementById('aiPatientSearchBtn');
    const resultsContainer = document.getElementById('aiPatientSearchResults');
    
    const searchTerm = searchInput.value.trim();
    
    if (!searchTerm) {
        showNotification('Please enter a patient ID, name, or phone number', 'warning');
        return;
    }

    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    resultsContainer.style.display = 'block';
    resultsContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Searching...</p>';

    try {
        const patientsRef = collection(db, 'patients');
        const snapshot = await getDocs(patientsRef);
        
        const searchLower = searchTerm.toLowerCase();
        const matches = [];
        
        snapshot.forEach(doc => {
            const patient = { id: doc.id, ...doc.data() };
            const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
            const patientId = (patient.patientId || '').toLowerCase();
            const phone = (patient.phone || '').toLowerCase();
            
            if (fullName.includes(searchLower) || 
                patientId.includes(searchLower) || 
                phone.includes(searchLower)) {
                matches.push(patient);
            }
        });

        if (matches.length === 0) {
            resultsContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No patients found matching your search.</p>';
        } else {
            resultsContainer.innerHTML = matches.slice(0, 5).map(patient => `
                <div class="ai-patient-result" onclick="selectPatientForAI('${patient.id}')" 
                     style="padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; background: var(--card-bg);"
                     onmouseover="this.style.borderColor='var(--primary-color)'" 
                     onmouseout="this.style.borderColor='var(--border-color)'">
                    <div style="font-weight: 600; color: var(--text-primary);">${patient.firstName} ${patient.lastName}</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">
                        ${patient.patientId} • ${calculateAge(patient.dateOfBirth)} yrs • ${patient.gender || 'N/A'}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Patient search error:', error);
        resultsContainer.innerHTML = '<p style="color: #ef4444; padding: 10px;">Error searching patients. Please try again.</p>';
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search"></i>';
    }
}

async function selectPatientForAI(patientDocId) {
    try {
        const patientsRef = collection(db, 'patients');
        const snapshot = await getDocs(patientsRef);
        
        let patientData = null;
        snapshot.forEach(doc => {
            if (doc.id === patientDocId) {
                patientData = { id: doc.id, ...doc.data() };
            }
        });

        if (!patientData) {
            showNotification('Patient not found', 'error');
            return;
        }

        selectedPatient = patientData;

        // Update UI
        document.getElementById('aiPatientSearchResults').style.display = 'none';
        document.getElementById('aiSelectedPatient').style.display = 'block';
        
        document.getElementById('aiPatientName').textContent = `${patientData.firstName} ${patientData.lastName}`;
        document.getElementById('aiPatientId').textContent = patientData.patientId || 'N/A';
        document.getElementById('aiPatientAge').textContent = `${calculateAge(patientData.dateOfBirth)} years`;
        document.getElementById('aiPatientGender').textContent = patientData.gender || 'N/A';
        document.getElementById('aiPatientBlood').textContent = patientData.bloodGroup || 'Unknown';
        document.getElementById('aiPatientPhone').textContent = patientData.phone || 'N/A';
        document.getElementById('aiPatientAllergies').textContent = patientData.allergies || 'None reported';
        document.getElementById('aiPatientHistory').textContent = truncateText(patientData.medicalHistory || 'No history', 50);

        // Try to load consultation history
        await loadPatientConsultations(patientDocId);

        showNotification('Patient selected successfully', 'success');
    } catch (error) {
        console.error('Error selecting patient:', error);
        showNotification('Error loading patient data', 'error');
    }
}

async function loadPatientConsultations(patientDocId) {
    try {
        // Try to get recent consultations for more context
        const consultationsRef = collection(db, 'consultations');
        const q = query(
            consultationsRef,
            where('patientId', '==', patientDocId),
            orderBy('date', 'desc'),
            limit(5)
        );
        
        const snapshot = await getDocs(q);
        selectedPatient.recentConsultations = [];
        
        snapshot.forEach(doc => {
            selectedPatient.recentConsultations.push(doc.data());
        });
    } catch (error) {
        console.log('Could not load consultations:', error);
        selectedPatient.recentConsultations = [];
    }
}

function clearSelectedPatient() {
    selectedPatient = null;
    document.getElementById('aiSelectedPatient').style.display = 'none';
    document.getElementById('aiPatientSearch').value = '';
    document.getElementById('aiPatientSearchResults').style.display = 'none';
}

// ============================================
// AI PATIENT ANALYSIS
// ============================================

async function analyzePatientWithAI() {
    const symptoms = document.getElementById('aiCurrentSymptoms').value.trim();
    const clinicalNotes = document.getElementById('aiClinicalNotes').value.trim();
    const analyzeBtn = document.getElementById('aiAnalyzeBtn');

    if (!symptoms) {
        showNotification('Please enter current symptoms or chief complaint', 'warning');
        return;
    }

    if (!getApiKey()) {
        showNotification('Please configure your API key in Settings', 'warning');
        openAISettingsModal();
        return;
    }

    if (isProcessing) return;
    isProcessing = true;

    // Update button state
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `
        <svg style="width: 20px; height: 20px; animation: spin 1s linear infinite;" viewBox="0 0 24 24" fill="none">
            <path fill="currentColor" d="M12 3L13.5 9.5L20 11L13.5 12.5L12 19L10.5 12.5L4 11L10.5 9.5L12 3Z"/>
        </svg>
        Analyzing...
    `;

    try {
        // Build patient context
        let patientContext = '';
        if (selectedPatient) {
            patientContext = `
PATIENT INFORMATION:
- Name: ${selectedPatient.firstName} ${selectedPatient.lastName}
- Age: ${calculateAge(selectedPatient.dateOfBirth)} years
- Gender: ${selectedPatient.gender || 'Not specified'}
- Blood Group: ${selectedPatient.bloodGroup || 'Unknown'}
- Known Allergies: ${selectedPatient.allergies || 'None reported'}
- Medical History: ${selectedPatient.medicalHistory || 'No significant history'}
- Insurance: ${selectedPatient.insurance?.provider || 'None'}
`;
            
            if (selectedPatient.recentConsultations?.length > 0) {
                patientContext += '\nRECENT CONSULTATIONS:\n';
                selectedPatient.recentConsultations.forEach((c, i) => {
                    patientContext += `${i + 1}. ${c.date || 'Unknown date'}: ${c.diagnosis || c.notes || 'No details'}\n`;
                });
            }
        } else {
            patientContext = 'PATIENT INFORMATION: Not provided (general analysis requested)';
        }

        const userMessage = `
${patientContext}

CURRENT PRESENTATION:
Chief Complaint / Symptoms: ${symptoms}

${clinicalNotes ? `Additional Clinical Notes: ${clinicalNotes}` : ''}

Please provide:
1. DIFFERENTIAL DIAGNOSIS (DDx) - List top 5 possible diagnoses with probability percentages
2. RECOMMENDED WORKUP - Tests, labs, imaging to order
3. MANAGEMENT SUGGESTIONS - Treatment plan, medications with dosages, follow-up
4. RED FLAGS / WARNINGS - Any concerning signs to watch for

Format your response clearly with these sections.`;

        const aiResponse = await callDeepSeekAPI(
            [{ role: 'user', content: userMessage }],
            SYSTEM_PROMPTS.patientAnalysis
        );

        // Display results
        displayAnalysisResults(aiResponse);
        
        showNotification('Analysis complete', 'success');

    } catch (error) {
        console.error('AI Analysis Error:', error);
        showNotification(error.message || 'Error analyzing patient data', 'error');
    } finally {
        isProcessing = false;
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = `
            <svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none">
                <path fill="currentColor" d="M12 3L13.5 9.5L20 11L13.5 12.5L12 19L10.5 12.5L4 11L10.5 9.5L12 3Z"/>
            </svg>
            Analyze with AI
        `;
    }
}

function displayAnalysisResults(response) {
    const resultsSection = document.getElementById('aiAnalysisResults');
    resultsSection.style.display = 'block';
    
    // Set timestamp
    document.getElementById('aiAnalysisTimestamp').textContent = 
        `Generated on ${new Date().toLocaleString()}`;
    
    // Parse response into sections
    const sections = parseAIResponse(response);
    
    // Populate sections
    document.getElementById('aiDDxResults').innerHTML = sections.ddx || 'No differential diagnosis provided';
    document.getElementById('aiWorkupResults').innerHTML = sections.workup || 'No workup recommendations provided';
    document.getElementById('aiManagementResults').innerHTML = sections.management || 'No management suggestions provided';
    
    // Handle warnings
    const warningsSection = document.getElementById('aiWarningsSection');
    if (sections.warnings) {
        warningsSection.style.display = 'block';
        document.getElementById('aiWarningsContent').innerHTML = sections.warnings;
    } else {
        warningsSection.style.display = 'none';
    }
    
    // Store full response
    document.getElementById('aiFullResponse').textContent = response;
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function parseAIResponse(response) {
    const sections = {
        ddx: '',
        workup: '',
        management: '',
        warnings: ''
    };
    
    // Try to parse sections from response
    const text = response.toLowerCase();
    
    // Extract DDx section
    const ddxMatch = response.match(/(?:differential diagnosis|ddx)[:\s]*\n?([\s\S]*?)(?=(?:recommended workup|workup|management|red flag|warning|$))/i);
    if (ddxMatch) {
        sections.ddx = formatAISection(ddxMatch[1]);
    }
    
    // Extract Workup section
    const workupMatch = response.match(/(?:recommended workup|workup|investigations|tests)[:\s]*\n?([\s\S]*?)(?=(?:management|treatment|red flag|warning|$))/i);
    if (workupMatch) {
        sections.workup = formatAISection(workupMatch[1]);
    }
    
    // Extract Management section
    const mgmtMatch = response.match(/(?:management|treatment|plan)[:\s]*\n?([\s\S]*?)(?=(?:red flag|warning|follow|$))/i);
    if (mgmtMatch) {
        sections.management = formatAISection(mgmtMatch[1]);
    }
    
    // Extract Warnings section
    const warnMatch = response.match(/(?:red flag|warning|caution|alert)[s]?[:\s]*\n?([\s\S]*?)$/i);
    if (warnMatch) {
        sections.warnings = formatAISection(warnMatch[1]);
    }
    
    // If parsing failed, put everything in DDx
    if (!sections.ddx && !sections.workup && !sections.management) {
        sections.ddx = formatAISection(response);
    }
    
    return sections;
}

function formatAISection(text) {
    if (!text) return '';
    
    // Clean up and format
    let formatted = text.trim();
    
    // Convert markdown-style lists to HTML
    formatted = formatted
        .replace(/^\d+\.\s+/gm, '<li>')
        .replace(/^[-•*]\s+/gm, '<li>')
        .replace(/\n/g, '</li>\n');
    
    // Wrap in list if contains list items
    if (formatted.includes('<li>')) {
        formatted = '<ol style="margin: 0; padding-left: 20px;">' + formatted + '</ol>';
    }
    
    // Bold percentages and important terms
    formatted = formatted.replace(/(\d+%)/g, '<strong style="color: var(--primary-color);">$1</strong>');
    
    return formatted;
}

// ============================================
// MEDICAL AI CHAT
// ============================================

async function sendAIChatMessage() {
    const input = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('aiChatSendBtn');
    const messagesContainer = document.getElementById('aiChatMessages');
    
    const message = input.value.trim();
    
    if (!message) return;
    
    if (!getApiKey()) {
        showNotification('Please configure your API key in Settings', 'warning');
        openAISettingsModal();
        return;
    }

    if (isProcessing) return;
    isProcessing = true;

    // Clear input
    input.value = '';
    
    // Add user message to chat
    addChatMessage('user', message);
    
    // Add loading indicator
    const loadingId = 'loading-' + Date.now();
    messagesContainer.innerHTML += `
        <div id="${loadingId}" class="ai-message" style="display: flex; gap: 12px; margin-bottom: 16px;">
            <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg style="width: 18px; height: 18px; animation: spin 1s linear infinite;" viewBox="0 0 24 24" fill="white">
                    <path d="M12 3L13.5 9.5L20 11L13.5 12.5L12 19L10.5 12.5L4 11L10.5 9.5L12 3Z"/>
                </svg>
            </div>
            <div style="background: var(--card-bg); border-radius: 12px; padding: 12px 16px; border: 1px solid var(--border-color);">
                <p style="margin: 0; color: var(--text-secondary);">Thinking...</p>
            </div>
        </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    sendBtn.disabled = true;

    try {
        // Build chat context
        const messages = chatHistory.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        messages.push({ role: 'user', content: message });

        const aiResponse = await callDeepSeekAPI(messages, SYSTEM_PROMPTS.medicalChat);

        // Remove loading indicator
        document.getElementById(loadingId)?.remove();

        // Add AI response
        addChatMessage('assistant', aiResponse);

        // Save to history
        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: aiResponse });

        // Save chat history if enabled
        if (document.getElementById('aiSaveHistory')?.checked) {
            saveChatHistory();
        }

    } catch (error) {
        console.error('AI Chat Error:', error);
        document.getElementById(loadingId)?.remove();
        addChatMessage('error', error.message || 'Error getting AI response');
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
    }
}

function addChatMessage(role, content) {
    const messagesContainer = document.getElementById('aiChatMessages');
    
    if (role === 'user') {
        messagesContainer.innerHTML += `
            <div class="ai-message" style="display: flex; gap: 12px; margin-bottom: 16px; flex-direction: row-reverse;">
                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-user" style="color: white; font-size: 14px;"></i>
                </div>
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; padding: 12px 16px; max-width: 75%; color: white;">
                    <p style="margin: 0; line-height: 1.5;">${escapeHtml(content)}</p>
                </div>
            </div>
        `;
    } else if (role === 'assistant') {
        messagesContainer.innerHTML += `
            <div class="ai-message" style="display: flex; gap: 12px; margin-bottom: 16px;">
                <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="white">
                        <path d="M12 3L13.5 9.5L20 11L13.5 12.5L12 19L10.5 12.5L4 11L10.5 9.5L12 3Z"/>
                    </svg>
                </div>
                <div style="background: var(--card-bg); border-radius: 12px; padding: 12px 16px; max-width: 85%; border: 1px solid var(--border-color);">
                    <div style="margin: 0; color: var(--text-primary); line-height: 1.6;">${formatChatResponse(content)}</div>
                </div>
            </div>
        `;
    } else if (role === 'error') {
        messagesContainer.innerHTML += `
            <div class="ai-message" style="display: flex; gap: 12px; margin-bottom: 16px;">
                <div style="width: 36px; height: 36px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-exclamation" style="color: white;"></i>
                </div>
                <div style="background: rgba(239, 68, 68, 0.1); border-radius: 12px; padding: 12px 16px; border: 1px solid rgba(239, 68, 68, 0.3);">
                    <p style="margin: 0; color: #ef4444;">${escapeHtml(content)}</p>
                </div>
            </div>
        `;
    }
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatChatResponse(text) {
    // Convert markdown to HTML
    let formatted = escapeHtml(text);
    
    // Bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Bullet points
    formatted = formatted.replace(/^[-•]\s+(.*)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul style="margin: 10px 0; padding-left: 20px;">$&</ul>');
    
    // Numbered lists
    formatted = formatted.replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>');
    
    // Line breaks
    formatted = formatted.replace(/\n\n/g, '</p><p style="margin-top: 10px;">');
    formatted = formatted.replace(/\n/g, '<br>');
    
    return `<p>${formatted}</p>`;
}

function askQuickQuestion(question) {
    document.getElementById('aiChatInput').value = question;
    sendAIChatMessage();
}

function clearAIChat() {
    chatHistory = [];
    const messagesContainer = document.getElementById('aiChatMessages');
    messagesContainer.innerHTML = `
        <div class="ai-message ai-welcome" style="display: flex; gap: 12px; margin-bottom: 16px;">
            <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg style="width: 18px; height: 18px;" viewBox="0 0 24 24" fill="white">
                    <path d="M12 3L13.5 9.5L20 11L13.5 12.5L12 19L10.5 12.5L4 11L10.5 9.5L12 3Z"/>
                </svg>
            </div>
            <div style="background: var(--card-bg); border-radius: 12px; padding: 12px 16px; max-width: 85%; border: 1px solid var(--border-color);">
                <p style="margin: 0; color: var(--text-primary); line-height: 1.5;">
                    👋 Hello! I'm <strong>Rx Companion</strong>, your intelligent medical assistant. I can help you with:
                </p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: var(--text-secondary); font-size: 14px;">
                    <li>Drug dosages & interactions</li>
                    <li>Treatment protocols</li>
                    <li>Medical guidelines</li>
                    <li>Clinical questions</li>
                </ul>
            </div>
        </div>
    `;
    localStorage.removeItem('ai_chat_history');
    showNotification('Chat cleared', 'success');
}

function saveChatHistory() {
    localStorage.setItem('ai_chat_history', JSON.stringify(chatHistory.slice(-50)));
}

function loadChatHistory() {
    const saved = localStorage.getItem('ai_chat_history');
    if (saved) {
        try {
            chatHistory = JSON.parse(saved);
        } catch (e) {
            chatHistory = [];
        }
    }
}

// ============================================
// SETTINGS MODAL
// ============================================

function openAISettingsModal() {
    const modal = document.getElementById('aiSettingsModal');
    modal.classList.add('show');
    
    // Load current settings - show masked key for security
    const currentKey = getApiKey();
    const keyInput = document.getElementById('deepseekApiKey');
    if (currentKey) {
        // Show only last 4 characters
        keyInput.value = '••••••••••••••••••••••••••••' + currentKey.slice(-4);
        keyInput.dataset.hasKey = 'true';
    } else {
        keyInput.value = '';
        keyInput.dataset.hasKey = 'false';
    }
    document.getElementById('aiModelSelect').value = getSelectedModel();
    document.getElementById('aiSaveHistory').checked = 
        localStorage.getItem('ai_save_history') !== 'false';
}

// Clear masked key on focus to allow new entry
document.addEventListener('DOMContentLoaded', () => {
    const keyInput = document.getElementById('deepseekApiKey');
    if (keyInput) {
        keyInput.addEventListener('focus', function() {
            if (this.dataset.hasKey === 'true' && this.value.startsWith('••••')) {
                this.value = '';
            }
        });
    }
});

function closeAISettingsModal() {
    document.getElementById('aiSettingsModal').classList.remove('show');
}

function saveAISettings() {
    const apiKeyInput = document.getElementById('deepseekApiKey');
    const apiKey = apiKeyInput.value.trim();
    const model = document.getElementById('aiModelSelect').value;
    const saveHistory = document.getElementById('aiSaveHistory').checked;
    
    // Only save if user entered a new key (not the masked placeholder)
    if (apiKey && !apiKey.startsWith('••••')) {
        setApiKey(apiKey);
    }
    
    localStorage.setItem('ai_model', model);
    localStorage.setItem('ai_save_history', saveHistory);
    
    closeAISettingsModal();
    showNotification('Settings saved successfully', 'success');
}

function toggleApiKeyVisibility() {
    const input = document.getElementById('deepseekApiKey');
    const icon = document.getElementById('apiKeyToggleIcon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateAge(dateOfBirth) {
    if (!dateOfBirth) return 'Unknown';
    
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Use global toast system
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

function copyAnalysisResults() {
    const fullResponse = document.getElementById('aiFullResponse').textContent;
    navigator.clipboard.writeText(fullResponse).then(() => {
        showNotification('Results copied to clipboard', 'success');
    }).catch(() => {
        showNotification('Failed to copy results', 'error');
    });
}

function printAnalysisResults() {
    const resultsSection = document.getElementById('aiAnalysisResults');
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <html>
        <head>
            <title>AI Analysis Results - RxFlow</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                h1 { color: #6366f1; }
                h4 { color: #333; margin-top: 20px; }
                .section { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; }
                .warning { background: #fef2f2; border-left: 4px solid #ef4444; }
                .disclaimer { color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
            </style>
        </head>
        <body>
            <h1>🤖 AI Medical Analysis Results</h1>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            ${selectedPatient ? `<p><strong>Patient:</strong> ${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.patientId})</p>` : ''}
            
            <div class="section">
                <h4>Differential Diagnosis</h4>
                ${document.getElementById('aiDDxResults').innerHTML}
            </div>
            
            <div class="section">
                <h4>Recommended Workup</h4>
                ${document.getElementById('aiWorkupResults').innerHTML}
            </div>
            
            <div class="section">
                <h4>Management Suggestions</h4>
                ${document.getElementById('aiManagementResults').innerHTML}
            </div>
            
            <p class="disclaimer">
                ⚠️ DISCLAIMER: This AI analysis is for reference purposes only and must be verified by qualified healthcare professionals. 
                Do not use for diagnosis or treatment without clinical validation.
            </p>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

// ============================================
// CSS ANIMATION (Add to page)
// ============================================

const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    #aiChatMessages::-webkit-scrollbar {
        width: 6px;
    }
    
    #aiChatMessages::-webkit-scrollbar-track {
        background: transparent;
    }
    
    #aiChatMessages::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 3px;
    }
    
    #aiChatMessages::-webkit-scrollbar-thumb:hover {
        background: var(--text-secondary);
    }
    
    @media (max-width: 1200px) {
        .ai-insights-grid {
            grid-template-columns: 1fr !important;
        }
    }
`;
document.head.appendChild(styleSheet);

// ============================================
// INITIALIZE & EXPORT
// ============================================

// Load chat history on module load
loadChatHistory();

// Make functions globally available
window.searchPatientForAI = searchPatientForAI;
window.selectPatientForAI = selectPatientForAI;
window.clearSelectedPatient = clearSelectedPatient;
window.analyzePatientWithAI = analyzePatientWithAI;
window.sendAIChatMessage = sendAIChatMessage;
window.askQuickQuestion = askQuickQuestion;
window.clearAIChat = clearAIChat;
window.openAISettingsModal = openAISettingsModal;
window.closeAISettingsModal = closeAISettingsModal;
window.saveAISettings = saveAISettings;
window.toggleApiKeyVisibility = toggleApiKeyVisibility;
window.copyAnalysisResults = copyAnalysisResults;
window.printAnalysisResults = printAnalysisResults;

// Export for module use
export {
    searchPatientForAI,
    analyzePatientWithAI,
    sendAIChatMessage,
    openAISettingsModal
};

console.log('✨ Rx Companion Module loaded successfully');
