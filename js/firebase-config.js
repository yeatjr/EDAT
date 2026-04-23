/**
 * EDAT Firebase Configuration
 * 
 * IMPORTANT: Replace the placeholders below with your actual Firebase project 
 * configuration from the Firebase Console (Project Settings > General).
 */

const firebaseConfig = {
  apiKey: "AIzaSyD_Mtj8eJm0zKx1lx1EFx_A7e9YGoOZ_04",
  authDomain: "edat-26e0e.firebaseapp.com",
  projectId: "edat-26e0e",
  storageBucket: "edat-26e0e.firebasestorage.app",
  messagingSenderId: "765487627859",
  appId: "1:765487627859:web:5edbf73f62435a945010a6",
  measurementId: "G-H8ZPZNZLK6"
};



// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

console.log("[FIREBASE] SDK Initialized.");
