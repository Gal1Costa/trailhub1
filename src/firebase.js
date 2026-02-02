import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

// Web app's Firebase configuration (from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyAeHOfUDSuWxWLgLy8KNzXiN0y-NR98dbU",
  authDomain: "trailhub-82d1c.firebaseapp.com",
  projectId: "trailhub-82d1c",
  storageBucket: "trailhub-82d1c.firebasestorage.app",
  messagingSenderId: "283528215556",
  appId: "1:283528215556:web:73c3558e91fdad5ce34951",
  measurementId: "G-HNS6CEZNK9",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Auth
const auth = getAuth(app);

// Re-export helpers we'll use
export { 
  auth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updatePassword,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
};
