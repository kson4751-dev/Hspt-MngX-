// ===================================
// BILLING REQUEST INTEGRATION HELPER
// Example usage for other modules
// ===================================

/**
 * HOW TO CREATE BILLING REQUESTS FROM OTHER MODULES
 * 
 * Import the function in your module:
 * import { createBillingRequest } from './billing-request.js';
 * 
 * Then call it with the required data:
 */

// EXAMPLE 1: From Reception Module (Consultation Fee)
async function sendConsultationBillingRequest(patientData) {
    try {
        const result = await window.createBillingRequest({
            patientNumber: patientData.patientNumber,
            patientName: patientData.fullName,
            patientId: patientData.id,
            department: 'Reception',
            serviceType: 'Consultation Fee',
            amount: 500, // KSh 500
            notes: 'Initial consultation',
            requestedBy: 'Reception Desk'
        });
        
        console.log('Billing request created:', result.requestId);
        return result;
    } catch (error) {
        console.error('Failed to create billing request:', error);
        throw error;
    }
}

// EXAMPLE 2: From Laboratory Module
async function sendLabBillingRequest(patientData, testInfo) {
    try {
        const result = await window.createBillingRequest({
            patientNumber: patientData.patientNumber,
            patientName: patientData.fullName,
            patientId: patientData.id,
            department: 'Laboratory',
            serviceType: `Lab Test: ${testInfo.testName}`,
            amount: testInfo.cost,
            notes: `Test ID: ${testInfo.testId}`,
            requestedBy: 'Lab Technician'
        });
        
        return result;
    } catch (error) {
        console.error('Failed to create lab billing request:', error);
        throw error;
    }
}

// EXAMPLE 3: From Imaging Module
async function sendImagingBillingRequest(patientData, scanInfo) {
    try {
        const result = await window.createBillingRequest({
            patientNumber: patientData.patientNumber,
            patientName: patientData.fullName,
            patientId: patientData.id,
            department: 'Imaging',
            serviceType: `${scanInfo.scanType} Scan`,
            amount: scanInfo.cost,
            notes: `Scan ID: ${scanInfo.scanId}`,
            requestedBy: 'Radiologist'
        });
        
        return result;
    } catch (error) {
        console.error('Failed to create imaging billing request:', error);
        throw error;
    }
}

// EXAMPLE 4: From Pharmacy Module
async function sendPharmacyBillingRequest(patientData, prescriptionInfo) {
    try {
        const result = await window.createBillingRequest({
            patientNumber: patientData.patientNumber,
            patientName: patientData.fullName,
            patientId: patientData.id,
            department: 'Pharmacy',
            serviceType: 'Prescription Dispensing',
            amount: prescriptionInfo.totalCost,
            notes: `Rx #: ${prescriptionInfo.prescriptionNumber}`,
            requestedBy: 'Pharmacist'
        });
        
        return result;
    } catch (error) {
        console.error('Failed to create pharmacy billing request:', error);
        throw error;
    }
}

// EXAMPLE 5: From Ward Module
async function sendWardBillingRequest(patientData, serviceInfo) {
    try {
        const result = await window.createBillingRequest({
            patientNumber: patientData.patientNumber,
            patientName: patientData.fullName,
            patientId: patientData.id,
            department: 'Ward',
            serviceType: serviceInfo.serviceName,
            amount: serviceInfo.cost,
            notes: `Ward: ${serviceInfo.wardName}, Bed: ${serviceInfo.bedNumber}`,
            requestedBy: 'Ward Nurse'
        });
        
        return result;
    } catch (error) {
        console.error('Failed to create ward billing request:', error);
        throw error;
    }
}

/**
 * MARKING REQUESTS AS PROCESSED
 * 
 * After billing processes a request and generates a receipt,
 * mark it as processed:
 */
async function markBillingRequestProcessed(requestId, receiptNumber, receiptId) {
    try {
        const result = await window.markRequestProcessed(requestId, receiptNumber, receiptId);
        console.log('Request marked as processed');
        return result;
    } catch (error) {
        console.error('Failed to mark request as processed:', error);
        throw error;
    }
}

/**
 * INTEGRATION POINTS:
 * 
 * 1. Patient Consultation (Reception):
 *    - When patient arrives, create billing request for consultation
 *    - Receptionist or patient pays via billing module
 * 
 * 2. Lab Tests:
 *    - After test is ordered, create billing request
 *    - Patient pays before or after test
 * 
 * 3. Imaging/Radiology:
 *    - When scan is scheduled, create billing request
 *    - Payment before scan procedure
 * 
 * 4. Pharmacy:
 *    - After prescription is prepared, create billing request
 *    - Patient pays before receiving medication
 * 
 * 5. Ward Services:
 *    - Daily/service-based charges create billing requests
 *    - Patient pays during stay or at discharge
 */

// Export for other modules to use
export {
    sendConsultationBillingRequest,
    sendLabBillingRequest,
    sendImagingBillingRequest,
    sendPharmacyBillingRequest,
    sendWardBillingRequest,
    markBillingRequestProcessed
};
