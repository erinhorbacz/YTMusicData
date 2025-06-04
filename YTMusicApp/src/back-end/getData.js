// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase, onValue, ref, set } from "firebase/database";
import listeningData from "../data/listening_data.csv";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB4ZdDK5yXR9jf-nyDWgYJueUdW1H32TMU",
  authDomain: "tymusicdata.firebaseapp.com",
  projectId: "tymusicdata",
  storageBucket: "tymusicdata.firebasestorage.app",
  messagingSenderId: "754174469868",
  appId: "1:754174469868:web:7c18157418565303fa67c9",
  measurementId: "G-PRJPMF4TBE",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase();
const reference = ref(db, "data");
listeningData.map((entry) => {
  set(reference, {
    song: entry[1],
    songURL: entry[2],
    date: entry[3],
    artist: entry[4],
  });
});
