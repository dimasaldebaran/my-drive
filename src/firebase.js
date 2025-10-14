// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtyJGAenPJwapTVmXMJTyU0EQsvutzZog",
  authDomain: "my-drive-demo-f081e.firebaseapp.com", // ✅ corrected domain
  projectId: "my-drive-demo-f081e",
  storageBucket: "my-drive-demo-f081e.appspot.com", // ✅ correct storage bucket
  messagingSenderId: "559638434083",
  appId: "1:559638434083:web:bf9d173818619b84ff3c96",
  measurementId: "G-FNEHBSBQT1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export these for use in App.js
export const db = getFirestore(app);
export const storage = getStorage(app);
