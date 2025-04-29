import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCjuzeD-Z565tL7vNlBOuxOZpUYW2Az3ec",
  authDomain: "genai-radiology.firebaseapp.com",
  databaseURL: "https://genai-radiology-default-rtdb.firebaseio.com",
  projectId: "genai-radiology",
  storageBucket: "genai-radiology.appspot.com",
  messagingSenderId: "287363541296",
  appId: "1:287363541296:web:91f56424ab4294aeb480f5",
  measurementId: "G-M17DDMC85V"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const analytics = getAnalytics(app);
