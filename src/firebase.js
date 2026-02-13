// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD7c6JGttroyzbUmlYmadwR_QaR4GUiY8s",
  authDomain: "church-maintenance-app.firebaseapp.com",
  projectId: "church-maintenance-app",
  storageBucket: "church-maintenance-app.firebasestorage.app",
  messagingSenderId: "280486142922",
  appId: "1:280486142922:web:36d535226bdf08c14e2533"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
