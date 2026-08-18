// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD46Jdf3MHabPIk4FurkyGzzG2pQL8sBCI",
  authDomain: "ordering-website-364c9.firebaseapp.com",
  projectId: "ordering-website-364c9",
  storageBucket: "ordering-website-364c9.firebasestorage.app",
  messagingSenderId: "800411935596",
  appId: "1:800411935596:web:4af26df98780b3e712c949",
  measurementId: "G-6WJLRWCHE4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);