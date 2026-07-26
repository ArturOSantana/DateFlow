import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  type Auth,
  type UserCredential,
} from 'firebase/auth'

export function isNativeMobileAuth() {
  return Capacitor.isNativePlatform()
}

export async function signInWithGoogle(auth: Auth): Promise<UserCredential | void> {
  if (!isNativeMobileAuth()) {
    const provider = new GoogleAuthProvider()
    return signInWithPopup(auth, provider)
  }

  // skipNativeAuth: true — o plugin obtém o idToken via SDK nativo do Google
  // mas deixa o Firebase JS SDK fazer o signIn (necessário para persistência web)
  const result = await FirebaseAuthentication.signInWithGoogle({
    skipNativeAuth: true,
  })

  const idToken = result.credential?.idToken
  if (!idToken) {
    throw new Error('Google Sign-In não retornou idToken. Verifique a configuração do SHA-1 no Firebase Console.')
  }

  const credential = GoogleAuthProvider.credential(idToken)
  return signInWithCredential(auth, credential)
}
