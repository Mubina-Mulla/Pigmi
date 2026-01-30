// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Firebase configuration (YOUR SAME KEYS)
const firebaseConfig = {
  apiKey: "AIzaSyCsIVsmRX8ov6mq8TqVAGUk-OF0pd5gqjc",
  authDomain: "pigmi-846f4.firebaseapp.com",
  databaseURL: "https://pigmi-846f4-default-rtdb.firebaseio.com",
  projectId: "pigmi-846f4",
  storageBucket: "pigmi-846f4.firebasestorage.app",
  messagingSenderId: "744498982173",
  appId: "1:744498982173:web:7ca00b52b6a4d29d5e45f4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const database = getDatabase(app);

// Set auth persistence to LOCAL (survives browser refresh)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Auth persistence error:", error);
});

export default app;
