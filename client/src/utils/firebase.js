// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getAuth, GoogleAuthProvider} from "firebase/auth"

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "interviewiq-f2d1a.firebaseapp.com",
  projectId: "interviewiq-f2d1a",
  storageBucket: "interviewiq-f2d1a.firebasestorage.app",
  messagingSenderId: "792880024922",
  appId: "1:792880024922:web:9387884a8ea48f0da97763",
  measurementId: "G-VTLJYYEQN1"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app)
const provider = new GoogleAuthProvider()

export{auth , provider}