import { initializeApp } from 'firebase/app';
// @ts-ignore - getReactNativePersistence exists but types are missing
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyByBAVQqp4mqBpG2Cb6dYjmLXs6pBj2Nf4",
  authDomain: "filhosestoque.firebaseapp.com",
  projectId: "filhosestoque",
  storageBucket: "filhosestoque.firebasestorage.app",
  messagingSenderId: "771444527581",
  appId: "1:771444527581:web:b14cab6ac6cd849c3e2634"
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export default app;
