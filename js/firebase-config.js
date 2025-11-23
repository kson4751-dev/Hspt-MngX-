// Firebase Configuration
// RxFlow Hospital Management System Firebase Configuration

// Import Firebase SDKs
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getDatabase, ref as dbRef, set, get, update, remove, onValue, push } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC-LH5UtO49VqfCM_mx5XtJUDWA-S17V9c",
    authDomain: "rxflow-bd167.firebaseapp.com",
    databaseURL: "https://rxflow-bd167-default-rtdb.firebaseio.com",
    projectId: "rxflow-bd167",
    storageBucket: "rxflow-bd167.firebasestorage.app",
    messagingSenderId: "749335799946",
    appId: "1:749335799946:web:dbbe557eef87939b91e573",
    measurementId: "G-X71QQKMFRV"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDb = getDatabase(app);

// Export Firebase functions for use throughout the app
export {
    // Auth functions
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    
    // Firestore functions
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    orderBy,
    limit,
    addDoc,
    serverTimestamp,
    
    // Storage functions
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    
    // Realtime Database functions
    dbRef,
    set,
    get,
    update,
    remove,
    onValue,
    push
};

console.log('Firebase initialized with realtime database support');
