import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)

let signInPromise: Promise<string> | null = null

/** Signs the player in anonymously exactly once, reusing the in-flight attempt on repeat calls. */
export function ensureSignedIn(): Promise<string> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid)
  if (!signInPromise) {
    signInPromise = signInAnonymously(auth).then((credential) => credential.user.uid)
  }
  return signInPromise
}
