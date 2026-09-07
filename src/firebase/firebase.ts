// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ============================================
// PROJECT A — ordering-website-364c9
// Auth + Firestore (food data, orders, users)
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyD46Jdf3MHabPIk4FurkyGzzG2pQL8sBCI",
  authDomain: "ordering-website-364c9.firebaseapp.com",
  projectId: "ordering-website-364c9",
  storageBucket: "ordering-website-364c9.firebasestorage.app",
  messagingSenderId: "800411935596",
  appId: "1:800411935596:web:4af26df98780b3e712c949",
  measurementId: "G-6WJLRWCHE4"
};

// Initialize Firebase (default app)
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ============================================
// PROJECT B — bitepay-ad7d0
// Storage ONLY (food images)
// Named app so it doesn't clash with the default app above
// ============================================
const storageConfig = {
  apiKey: "AIzaSyDjBBLN-O2MTgUVk3EPSUyCtsyaU9_Qr5M",
  authDomain: "bitepay-ad7d0.firebaseapp.com",
  projectId: "bitepay-ad7d0",
  storageBucket: "bitepay-ad7d0.firebasestorage.app",
  messagingSenderId: "965626790061",
  appId: "1:965626790061:web:a90c33c2132432d0fac624"
};

const storageApp = initializeApp(storageConfig, "storageApp");

// NOTE: storageApp must be passed here.
// getStorage() with no argument would return Project A's bucket instead.
export const storage = getStorage(storageApp);

// Base folder inside Project B's bucket, kept separate
// from the other web app's existing files.
export const FOOD_IMAGES_FOLDER = "hotel-food-images";