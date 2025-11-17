import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase";

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

/**
 * Sign up a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<UserCredential>} Firebase user credential
 */
export const signUpWithEmail = async (email, password) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential;
};

/**
 * Sign in an existing user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<UserCredential>} Firebase user credential
 */
export const signInWithEmail = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential;
};

/**
 * Sign in with Google OAuth
 * @returns {Promise<UserCredential>} Firebase user credential
 */
export const signInWithGoogle = async () => {
  const userCredential = await signInWithPopup(auth, googleProvider);
  return userCredential;
};

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export const logout = async () => {
  await signOut(auth);
};

/**
 * Subscribe to authentication state changes
 * @param {Function} callback - Callback function that receives the user object
 * @returns {Function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get the current authenticated user
 * @returns {User|null} Current user or null if not authenticated
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};
