import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

// Força localStorage como mecanismo de persistência.
// Evita o erro "missing initial state" causado pelo sessionStorage
// ser inacessível no Safari mobile / modo privado / WebViews.
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Se localStorage também falhar (muito raro), o auth ainda funciona
  // na sessão atual sem persistência — comportamento seguro.
})

export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
