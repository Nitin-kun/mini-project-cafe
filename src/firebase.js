import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUddFts7Yg6Qp2v9RVVrP3cw0UY-HRQvw",
  authDomain: "mini-project-website-b1e02.firebaseapp.com",
  projectId: "mini-project-website-b1e02",
  storageBucket: "mini-project-website-b1e02.appspot.com",
  messagingSenderId: "90701846986",
  appId: "1:90701846986:web:2206865bd25219ee979733",
  measurementId: "G-0F3DEL0BEZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Collection reference
const ordersCollection = collection(db, "orders");

export { 
  auth, 
  db,
  app, 
  googleProvider,
  ordersCollection,
  signInWithPopup, 
  signOut,
  addDoc,
  serverTimestamp
};
