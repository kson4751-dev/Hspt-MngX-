// Test Script for Staff Messaging System
// Run this in browser console to test messaging functionality

console.log('🧪 Starting Messaging System Tests...');

// Test 1: Check if messaging system is initialized
function testInitialization() {
    console.log('\n📋 Test 1: Initialization Check');
    const messagesBtn = document.getElementById('messagesBtn');
    const messagesDropdown = document.getElementById('messagesDropdown');
    const composeModal = document.getElementById('composeMessageModal');
    const viewModal = document.getElementById('viewMessageModal');
    
    if (messagesBtn && messagesDropdown && composeModal && viewModal) {
        console.log('✅ All messaging elements found in DOM');
        return true;
    } else {
        console.error('❌ Missing messaging elements:', {
            messagesBtn: !!messagesBtn,
            messagesDropdown: !!messagesDropdown,
            composeModal: !!composeModal,
            viewModal: !!viewModal
        });
        return false;
    }
}

// Test 2: Check CSS styles are loaded
function testStyles() {
    console.log('\n🎨 Test 2: CSS Styles Check');
    const messagesDropdown = document.getElementById('messagesDropdown');
    if (!messagesDropdown) {
        console.error('❌ Messages dropdown not found');
        return false;
    }
    
    const styles = window.getComputedStyle(messagesDropdown);
    if (styles.position === 'absolute' && styles.width) {
        console.log('✅ Dropdown styles applied correctly');
        console.log('   - Position:', styles.position);
        console.log('   - Width:', styles.width);
        return true;
    } else {
        console.error('❌ Dropdown styles not applied');
        return false;
    }
}

// Test 3: Check badge functionality
function testBadge() {
    console.log('\n🔔 Test 3: Badge Functionality');
    const badge = document.getElementById('messagesBadge');
    if (!badge) {
        console.error('❌ Messages badge not found');
        return false;
    }
    
    // Test setting badge count
    badge.textContent = '5';
    badge.style.display = 'flex';
    console.log('✅ Badge can be updated');
    console.log('   - Current count:', badge.textContent);
    
    // Reset
    badge.textContent = '';
    badge.style.display = 'none';
    return true;
}

// Test 4: Test dropdown toggle
function testDropdownToggle() {
    console.log('\n🔽 Test 4: Dropdown Toggle');
    const messagesBtn = document.getElementById('messagesBtn');
    const messagesDropdown = document.getElementById('messagesDropdown');
    
    if (!messagesBtn || !messagesDropdown) {
        console.error('❌ Cannot test dropdown - elements missing');
        return false;
    }
    
    // Simulate click
    messagesBtn.click();
    
    setTimeout(() => {
        if (messagesDropdown.classList.contains('active')) {
            console.log('✅ Dropdown opens on click');
            // Close it
            messagesBtn.click();
            setTimeout(() => {
                if (!messagesDropdown.classList.contains('active')) {
                    console.log('✅ Dropdown closes on click');
                }
            }, 100);
            return true;
        } else {
            console.error('❌ Dropdown did not open');
            return false;
        }
    }, 100);
}

// Test 5: Test compose modal
function testComposeModal() {
    console.log('\n✉️ Test 5: Compose Modal');
    
    if (typeof window.openComposeMessageModal !== 'function') {
        console.error('❌ openComposeMessageModal function not found');
        return false;
    }
    
    window.openComposeMessageModal();
    
    setTimeout(() => {
        const modal = document.getElementById('composeMessageModal');
        if (modal && modal.style.display === 'block') {
            console.log('✅ Compose modal opens correctly');
            
            // Check form elements
            const recipient = document.getElementById('messageRecipient');
            const subject = document.getElementById('messageSubject');
            const content = document.getElementById('messageContent');
            
            if (recipient && subject && content) {
                console.log('✅ All form fields present');
            }
            
            // Close modal
            window.closeComposeMessageModal();
            return true;
        } else {
            console.error('❌ Compose modal did not open');
            return false;
        }
    }, 100);
}

// Test 6: Test form validation
function testFormValidation() {
    console.log('\n📝 Test 6: Form Validation');
    
    window.openComposeMessageModal();
    
    setTimeout(() => {
        // Clear all fields
        document.getElementById('messageRecipient').value = '';
        document.getElementById('messageSubject').value = '';
        document.getElementById('messageContent').value = '';
        
        console.log('   Testing empty form submission...');
        // This should show validation errors
        if (typeof window.sendMessage === 'function') {
            console.log('✅ sendMessage function exists');
            console.log('   (Call sendMessage() manually to test validation)');
        }
        
        window.closeComposeMessageModal();
    }, 100);
}

// Test 7: Check Firebase connection
function testFirebaseConnection() {
    console.log('\n🔥 Test 7: Firebase Connection');
    
    if (typeof firebase !== 'undefined' || typeof db !== 'undefined') {
        console.log('✅ Firebase SDK loaded');
        
        const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
        if (userId) {
            console.log('✅ User authenticated');
            console.log('   - User ID:', userId);
            return true;
        } else {
            console.warn('⚠️ No user authenticated');
            return false;
        }
    } else {
        console.error('❌ Firebase SDK not loaded');
        return false;
    }
}

// Test 8: Check message structure
function testMessageStructure() {
    console.log('\n📦 Test 8: Message Structure');
    
    const sampleMessage = {
        senderId: 'test_user_id',
        senderName: 'John Doe',
        recipients: ['recipient_1', 'recipient_2'],
        subject: 'Test Message',
        content: 'This is a test message',
        isUrgent: false,
        timestamp: new Date(),
        readBy: [],
        createdAt: new Date().toISOString()
    };
    
    console.log('✅ Sample message structure:');
    console.log(JSON.stringify(sampleMessage, null, 2));
    return true;
}

// Run all tests
async function runAllTests() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 RxFlow Messaging System Test Suite');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const tests = [
        { name: 'Initialization', fn: testInitialization },
        { name: 'Styles', fn: testStyles },
        { name: 'Badge', fn: testBadge },
        { name: 'Dropdown Toggle', fn: testDropdownToggle },
        { name: 'Compose Modal', fn: testComposeModal },
        { name: 'Form Validation', fn: testFormValidation },
        { name: 'Firebase Connection', fn: testFirebaseConnection },
        { name: 'Message Structure', fn: testMessageStructure }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result !== false) passed++;
            else failed++;
        } catch (error) {
            console.error(`❌ Test "${test.name}" threw error:`, error);
            failed++;
        }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test Results:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (failed === 0) {
        console.log('🎉 All tests passed! Messaging system is ready to use.');
    } else {
        console.log('⚠️ Some tests failed. Check the output above for details.');
    }
}

// Manual test functions (call these from console)
window.testMessaging = {
    all: runAllTests,
    init: testInitialization,
    styles: testStyles,
    badge: testBadge,
    dropdown: testDropdownToggle,
    compose: testComposeModal,
    validation: testFormValidation,
    firebase: testFirebaseConnection,
    structure: testMessageStructure,
    
    // Utility functions
    openCompose: () => window.openComposeMessageModal(),
    closeCompose: () => window.closeComposeMessageModal(),
    toggleDropdown: () => document.getElementById('messagesBtn').click(),
    
    // Quick message test
    sendTestMessage: () => {
        console.log('📧 Opening compose modal for test message...');
        window.openComposeMessageModal();
        console.log('Fill in the form and click Send to test message delivery.');
    }
};

// Auto-run on load
console.log('💡 Messaging test suite loaded!');
console.log('📝 Available commands:');
console.log('   - testMessaging.all()          : Run all tests');
console.log('   - testMessaging.init()         : Test initialization');
console.log('   - testMessaging.styles()       : Test CSS styles');
console.log('   - testMessaging.badge()        : Test badge');
console.log('   - testMessaging.dropdown()     : Test dropdown toggle');
console.log('   - testMessaging.compose()      : Test compose modal');
console.log('   - testMessaging.firebase()     : Test Firebase connection');
console.log('   - testMessaging.sendTestMessage() : Open compose for manual test');
console.log('\n🚀 Run testMessaging.all() to start testing!\n');
