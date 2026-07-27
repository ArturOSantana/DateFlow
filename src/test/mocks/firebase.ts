import { vi } from 'vitest'

// ── Mock completo do Firebase ──────────────────────────────────────────────────

vi.mock('../../lib/firebase', () => ({
  db: {},
  auth: { currentUser: null },
  firebaseConfig: {},
  googleProvider: {},
  getMessagingInstance: vi.fn(),
}))

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual<typeof import('firebase/auth')>('firebase/auth')
  return {
    ...actual,
    getAuth: vi.fn(),
    onAuthStateChanged: vi.fn((_auth, cb) => { cb(null); return vi.fn() }),
    signOut: vi.fn(),
    GoogleAuthProvider: vi.fn(),
    indexedDBLocalPersistence: {},
    initializeAuth: vi.fn(),
  }
})

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDoc: vi.fn(),
}))

vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(),
  isSupported: vi.fn(() => Promise.resolve(false)),
}))

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}))

vi.mock('../../lib/mobileAuth', () => ({
  signInWithGoogle: vi.fn(),
}))
