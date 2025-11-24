// ================================
// WARD QUEUE TESTING SCRIPT
// Copy and paste this into browser console (F12)
// ================================

console.log('🧪 Starting Ward Queue Test...');

// Test 1: Check if Firebase is loaded
console.log('\n📋 TEST 1: Check Firebase Connection');
import('./js/firebase-config.js').then(({db}) => {
    console.log('✅ Firebase db object:', db);
}).catch(err => {
    console.error('❌ Firebase import failed:', err);
});

// Test 2: Check current wardQueue collection
console.log('\n📋 TEST 2: Fetch all wardQueue documents');
import('./js/firebase-config.js').then(async ({db, collection, getDocs}) => {
    const querySnapshot = await getDocs(collection(db, 'wardQueue'));
    console.log('📊 Total wardQueue documents:', querySnapshot.size);
    querySnapshot.forEach((doc) => {
        console.log('📄 Document ID:', doc.id);
        console.log('   Data:', doc.data());
    });
    if (querySnapshot.size === 0) {
        console.log('⚠️ Ward queue is empty');
    }
}).catch(err => {
    console.error('❌ Failed to fetch wardQueue:', err);
});

// Test 3: Subscribe to realtime updates
console.log('\n📋 TEST 3: Subscribe to realtime wardQueue updates');
import('./js/firebase-helpers.js').then(({subscribeToWardQueue}) => {
    console.log('🔔 Setting up realtime listener...');
    const unsubscribe = subscribeToWardQueue((queue) => {
        console.log('🔔 REALTIME UPDATE RECEIVED!');
        console.log('   Queue length:', queue.length);
        console.log('   Queue data:', queue);
    });
    console.log('✅ Listener active. Try sending a patient from Rx module now.');
    
    // Store unsubscribe function globally
    window.testUnsubscribe = unsubscribe;
    console.log('💡 To stop listening, run: window.testUnsubscribe()');
}).catch(err => {
    console.error('❌ Failed to subscribe:', err);
});

// Test 4: Manually add a test patient
console.log('\n📋 TEST 4: Manually add test patient to queue');
console.log('💡 To manually add a test patient, run: addTestPatient()');
window.addTestPatient = async function() {
    console.log('➕ Adding test patient...');
    const { db, collection, addDoc, serverTimestamp } = await import('./js/firebase-config.js');
    
    try {
        const docRef = await addDoc(collection(db, 'wardQueue'), {
            patientId: 'TEST-' + Date.now(),
            patientName: 'Test Patient',
            age: 35,
            gender: 'Male',
            diagnosis: 'Test Diagnosis',
            referringDoctor: 'Dr. Test',
            treatmentPlan: 'Test treatment plan',
            medications: [],
            priority: 'normal',
            status: 'pending',
            timestamp: serverTimestamp(),
            type: 'nursing-care'
        });
        console.log('✅ Test patient added with ID:', docRef.id);
        console.log('🔍 Check your Ward & Nursing module - patient should appear!');
    } catch (error) {
        console.error('❌ Failed to add test patient:', error);
    }
};

// Test 5: Check if ward module is initialized
console.log('\n📋 TEST 5: Check Ward Module Status');
setTimeout(() => {
    const wardModule = document.getElementById('ward-nursing-module');
    const wardContainer = document.getElementById('wardQueueContainer');
    const queueBadge = document.getElementById('queueBadge');
    
    console.log('🏥 Ward Module Element:', wardModule ? '✅ Found' : '❌ Not Found');
    console.log('📦 Ward Container Element:', wardContainer ? '✅ Found' : '❌ Not Found');
    console.log('🏷️ Queue Badge Element:', queueBadge ? '✅ Found' : '❌ Not Found');
    
    if (queueBadge) {
        console.log('   Badge current value:', queueBadge.textContent);
    }
}, 1000);

console.log('\n✅ Test script loaded!');
console.log('📝 Available test functions:');
console.log('   - addTestPatient() - Manually add a test patient');
console.log('   - window.testUnsubscribe() - Stop the realtime listener');
console.log('\n🎯 Now try sending a patient from Rx module and watch the console!');
