// ================================
// CLEANUP DUPLICATE WARD QUEUE ENTRIES
// Copy and paste this into browser console (F12)
// ================================

console.log('🧹 Starting Ward Queue Cleanup...');

window.cleanupDuplicateWardQueue = async function() {
    console.log('🔍 Fetching all wardQueue documents...');
    
    const { db, collection, getDocs, deleteDoc, doc } = await import('./js/firebase-config.js');
    
    try {
        const querySnapshot = await getDocs(collection(db, 'wardQueue'));
        console.log('📊 Total documents found:', querySnapshot.size);
        
        // Group by patientId
        const patientGroups = {};
        querySnapshot.forEach((document) => {
            const data = document.data();
            const patientId = data.patientId;
            
            if (!patientGroups[patientId]) {
                patientGroups[patientId] = [];
            }
            
            patientGroups[patientId].push({
                id: document.id,
                data: data,
                timestamp: data.timestamp?.toDate?.() || new Date(0)
            });
        });
        
        console.log('👥 Unique patients:', Object.keys(patientGroups).length);
        
        // Find and delete duplicates (keep most recent)
        let duplicatesFound = 0;
        let duplicatesDeleted = 0;
        
        for (const [patientId, documents] of Object.entries(patientGroups)) {
            if (documents.length > 1) {
                duplicatesFound += documents.length - 1;
                console.log(`\n⚠️ Patient ${patientId} has ${documents.length} entries`);
                
                // Sort by timestamp (most recent first)
                documents.sort((a, b) => b.timestamp - a.timestamp);
                
                // Keep first (most recent), delete rest
                console.log(`✅ Keeping: ${documents[0].id} (${documents[0].timestamp})`);
                
                for (let i = 1; i < documents.length; i++) {
                    console.log(`🗑️ Deleting: ${documents[i].id} (${documents[i].timestamp})`);
                    try {
                        await deleteDoc(doc(db, 'wardQueue', documents[i].id));
                        duplicatesDeleted++;
                        console.log(`   ✅ Deleted successfully`);
                    } catch (err) {
                        console.error(`   ❌ Failed to delete:`, err);
                    }
                }
            }
        }
        
        console.log('\n✅ Cleanup Complete!');
        console.log(`📊 Summary:`);
        console.log(`   - Total documents: ${querySnapshot.size}`);
        console.log(`   - Unique patients: ${Object.keys(patientGroups).length}`);
        console.log(`   - Duplicates found: ${duplicatesFound}`);
        console.log(`   - Duplicates deleted: ${duplicatesDeleted}`);
        console.log(`   - Remaining documents: ${querySnapshot.size - duplicatesDeleted}`);
        
        alert(`✅ Cleanup Complete!\n\nDuplicates deleted: ${duplicatesDeleted}\nRemaining patients: ${Object.keys(patientGroups).length}`);
        
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
        alert('❌ Cleanup failed: ' + error.message);
    }
};

console.log('✅ Cleanup script loaded!');
console.log('📝 To clean up duplicate entries, run: cleanupDuplicateWardQueue()');
