import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyMockKeyForDevelopmentOnly",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "collabmind-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "collabmind-app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "collabmind-app.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456",
};

// Initialize Firebase safely for Next.js SSR / CSR
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

export default app;
