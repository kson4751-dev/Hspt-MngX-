import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyC-LH5UtO49VqfCM_mx5XtJUDWA-S17V9c",
    authDomain: "rxflow-bd167.firebaseapp.com",
    databaseURL: "https://rxflow-bd167-default-rtdb.firebaseio.com",
    projectId: "rxflow-bd167",
    storageBucket: "rxflow-bd167.firebasestorage.app",
    messagingSenderId: "749335799946",
    appId: "1:749335799946:web:dbbe557eef87939b91e573"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearAllLabRequests() {
    try {
        console.log('Clearing all lab requests...');
        const labRef = collection(db, 'lab_requests');
        const snapshot = await getDocs(labRef);
        
        let deletedCount = 0;
        const deletePromises = [];
        
        snapshot.forEach((document) => {
            deletePromises.push(deleteDoc(doc(db, 'lab_requests', document.id)));
            deletedCount++;
        });
        
        await Promise.all(deletePromises);
        console.log(`Successfully cleared ${deletedCount} old lab requests`);
        alert(`Cleared ${deletedCount} lab requests. Page will reload.`);
        setTimeout(() => location.reload(), 1000);
    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    }
}

clearAllLabRequests();
