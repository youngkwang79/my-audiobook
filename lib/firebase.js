// lib/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDm2lZLGl_GMDLHBjJOnb3vDLNeJMHal9g",
  authDomain: "murim-clicker.firebaseapp.com",
  projectId: "murim-clicker",
  storageBucket: "murim-clicker.firebasestorage.app",
  messagingSenderId: "146776285788",
  appId: "1:146776285788:web:e4f06af803a27ceb2bbc99"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// 기능 export
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();