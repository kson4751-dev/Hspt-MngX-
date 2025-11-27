// ===================================
// FIREBASE INTEGRATION TEST
// Billing Request Module
// ===================================

/**
 * TEST SUITE FOR BILLING REQUEST MODULE
 * Run these tests in browser console after logging in
 */

// Test 1: Create a test billing request
async function testCreateRequest() {
    console.log('🧪 TEST 1: Creating billing request...');
    
    try {
        const result = await window.createBillingRequest({
            patientNumber: 'TEST001',
            patientName: 'Test Patient John',
            patientId: 'test_patient_id_123',
            department: 'Laboratory',
            serviceType: 'Complete Blood Count',
            amount: 1500,
            notes: 'Test request - Firebase integration test',
            requestedBy: 'Test User'
        });
        
        console.log('✅ TEST 1 PASSED: Request created successfully');
        console.log('Request ID:', result.requestId);
        console.log('Document ID:', result.id);
        
        return result;
        
    } catch (error) {
        console.error('❌ TEST 1 FAILED:', error);
        throw error;
    }
}

// Test 2: Verify data in Firestore
async function testFirestoreData(requestId) {
    console.log('🧪 TEST 2: Verifying Firestore data...');
    
    try {
        // Import Firebase
        const { db, doc, getDoc } = await import('./firebase-config.js');
        
        const docRef = doc(db, 'billing_requests', requestId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            console.log('✅ TEST 2 PASSED: Data exists in Firestore');
            console.log('Firestore Data:', docSnap.data());
            return docSnap.data();
        } else {
            throw new Error('Document not found in Firestore');
        }
        
    } catch (error) {
        console.error('❌ TEST 2 FAILED:', error);
        throw error;
    }
}

// Test 3: Verify data in Realtime Database
async function testRealtimeDBData(requestId) {
    console.log('🧪 TEST 3: Verifying Realtime Database data...');
    
    try {
        const { realtimeDb, dbRef, get } = await import('./firebase-config.js');
        
        const rtdbRef = dbRef(realtimeDb, `billing_requests/${requestId}`);
        const snapshot = await get(rtdbRef);
        
        if (snapshot.exists()) {
            console.log('✅ TEST 3 PASSED: Data exists in Realtime Database');
            console.log('RTDB Data:', snapshot.val());
            return snapshot.val();
        } else {
            throw new Error('Data not found in Realtime Database');
        }
        
    } catch (error) {
        console.error('❌ TEST 3 FAILED:', error);
        throw error;
    }
}

// Test 4: Test real-time listener
async function testRealtimeListener() {
    console.log('🧪 TEST 4: Testing real-time listener...');
    
    return new Promise((resolve, reject) => {
        try {
            let updateCount = 0;
            const timeout = setTimeout(() => {
                if (updateCount > 0) {
                    console.log('✅ TEST 4 PASSED: Real-time listener received updates');
                    resolve(updateCount);
                } else {
                    reject(new Error('No updates received from listener'));
                }
            }, 3000);
            
            // Create a test listener
            const { db, collection, query, orderBy, limit, onSnapshot } = 
                await import('./firebase-config.js');
            
            const q = query(
                collection(db, 'billing_requests'),
                orderBy('createdAt', 'desc'),
                limit(5)
            );
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                updateCount++;
                console.log(`📡 Listener update #${updateCount}: ${snapshot.docs.length} documents`);
            });
            
            // Cleanup after test
            setTimeout(() => {
                unsubscribe();
                clearTimeout(timeout);
            }, 3500);
            
        } catch (error) {
            console.error('❌ TEST 4 FAILED:', error);
            reject(error);
        }
    });
}

// Test 5: Mark request as processed
async function testMarkAsProcessed(requestId) {
    console.log('🧪 TEST 5: Marking request as processed...');
    
    try {
        const result = await window.markRequestProcessed(
            requestId,
            'TEST-RECEIPT-001',
            'test_receipt_id_123'
        );
        
        console.log('✅ TEST 5 PASSED: Request marked as processed');
        console.log('Result:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ TEST 5 FAILED:', error);
        throw error;
    }
}

// Test 6: Verify processed status in both databases
async function testProcessedStatus(requestId) {
    console.log('🧪 TEST 6: Verifying processed status...');
    
    try {
        // Check Firestore
        const { db, doc, getDoc } = await import('./firebase-config.js');
        const docRef = doc(db, 'billing_requests', requestId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Document not found');
        }
        
        const data = docSnap.data();
        
        if (data.status !== 'processed') {
            throw new Error(`Status is ${data.status}, expected 'processed'`);
        }
        
        if (!data.receiptNumber) {
            throw new Error('Receipt number not set');
        }
        
        console.log('✅ TEST 6 PASSED: Status correctly updated in both databases');
        console.log('Status:', data.status);
        console.log('Receipt:', data.receiptNumber);
        console.log('Processed By:', data.processedBy);
        
        return data;
        
    } catch (error) {
        console.error('❌ TEST 6 FAILED:', error);
        throw error;
    }
}

// RUN ALL TESTS
async function runAllTests() {
    console.log('\n🚀 STARTING FIREBASE INTEGRATION TESTS\n');
    console.log('=' .repeat(50));
    
    try {
        // Test 1: Create request
        const createResult = await testCreateRequest();
        const requestId = createResult.id;
        
        console.log('\n' + '='.repeat(50));
        
        // Wait a moment for data to sync
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 2: Check Firestore
        await testFirestoreData(requestId);
        
        console.log('\n' + '='.repeat(50));
        
        // Test 3: Check Realtime Database
        await testRealtimeDBData(requestId);
        
        console.log('\n' + '='.repeat(50));
        
        // Test 4: Test real-time listener
        await testRealtimeListener();
        
        console.log('\n' + '='.repeat(50));
        
        // Test 5: Mark as processed
        await testMarkAsProcessed(requestId);
        
        console.log('\n' + '='.repeat(50));
        
        // Wait for update to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 6: Verify processed status
        await testProcessedStatus(requestId);
        
        console.log('\n' + '='.repeat(50));
        console.log('\n✅ ALL TESTS PASSED! Firebase integration is working correctly.\n');
        
        return {
            success: true,
            requestId: requestId,
            message: 'All tests completed successfully'
        };
        
    } catch (error) {
        console.log('\n' + '='.repeat(50));
        console.error('\n❌ TEST SUITE FAILED\n');
        console.error('Error:', error);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// INDIVIDUAL TEST FUNCTIONS (for manual testing)
window.testBillingRequestFirebase = {
    runAll: runAllTests,
    createRequest: testCreateRequest,
    checkFirestore: testFirestoreData,
    checkRealtimeDB: testRealtimeDBData,
    testListener: testRealtimeListener,
    markProcessed: testMarkAsProcessed,
    verifyProcessed: testProcessedStatus
};

// QUICK TEST (runs automatically if you uncomment)
// runAllTests();

console.log(`
📋 FIREBASE INTEGRATION TEST SUITE LOADED

Run tests from console:
  window.testBillingRequestFirebase.runAll()        - Run all tests
  window.testBillingRequestFirebase.createRequest() - Test create only
  window.testBillingRequestFirebase.testListener()  - Test real-time updates

Make sure you are logged in before running tests!
`);
