import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyChWWGyAWQFc7S0uguAhZH379NuU1gnXUg",
  authDomain: "siac-app.firebaseapp.com",
  projectId: "siac-app",
  storageBucket: "siac-app.firebasestorage.app",
  messagingSenderId: "361510244296",
  appId: "1:361510244296:web:a3eb03b6f7fac3856dfafd"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);