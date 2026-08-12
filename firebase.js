// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCoCCj8_uyq2Kj4wGX0BOhkcsHi1VkV5s8",
  authDomain: "reservex-581fc.firebaseapp.com",
  projectId: "reservex-581fc",
  storageBucket: "reservex-581fc.firebasestorage.app",
  messagingSenderId: "408426149723",
  appId: "1:408426149723:web:a542fb99d713ce49c84c7e",
  measurementId: "G-4J88LNKCXV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);