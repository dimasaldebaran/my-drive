// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔥 Gunakan konfigurasi dari Firebase Console kamu
const firebaseConfig = {
  apiKey: "AIzaSyBtyJGAenPJwapTVmXMJTyU0EQsvutzZog",
  authDomain: "my-drive-demo-f081e.firebaseapp.com",
  projectId: "my-drive-demo-f081e",
  storageBucket: "my-drive-demo-f081e.appspot.com", // ✅ ubah jadi .appspot.com
  messagingSenderId: "559638434083",
  appId: "1:559638434083:web:bf9d173818619b84ff3c96",
  measurementId: "G-FNEHBSBQT1"
};

// 🚀 Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// ✅ Ekspor Firestore & Storage (dipakai di App.js)
export const db = getFirestore(app);
export const storage = getStorage(app);
