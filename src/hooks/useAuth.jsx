import { useState, useEffect, createContext, useContext } from "react";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  logout as authLogout,
  onAuthStateChange,
} from "../services/authService";
import { getUserProfile, createUserProfile } from "../services/userService";
import { getCompanyByOwner } from "../services/companyService";

// Create Auth Context
const AuthContext = createContext(null);

/**
 * AuthProvider component to wrap the app and provide auth context
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const AuthProvider = ({ children }) => {
  const auth = useAuthProvider();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to access auth context
 * @returns {Object} Authentication state and methods
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Internal hook to manage authentication state and operations
 * @returns {Object} Authentication state and methods
 */
const useAuthProvider = () => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Fetch user profile
          let profile = await getUserProfile(currentUser.uid);
          
          // Create profile if it doesn't exist
          if (!profile) {
            // Check for pending invitation
            const { getInvitationByEmail } = await import("../services/invitationService");
            let invitationData = null;
            
            try {
              console.log('🔍 Checking for invitation for email:', currentUser.email);
              
              // Check sessionStorage for invitation token
              const invitationToken = sessionStorage.getItem('invitationToken');
              
              if (invitationToken) {
                console.log('📋 Found invitation token in sessionStorage');
                
                try {
                  // Decode the base64 token
                  const decodedData = JSON.parse(atob(invitationToken));
                  console.log('✅ Decoded invitation data:', decodedData);
                  
                  // Security checks
                  const tokenAge = Date.now() - decodedData.timestamp;
                  const sevenDays = 7 * 24 * 60 * 60 * 1000;
                  
                  // Check if token expired (7 days)
                  if (tokenAge > sevenDays) {
                    console.error('❌ Invitation token expired');
                    sessionStorage.removeItem('invitationToken');
                    throw new Error('Invitation link has expired. Please request a new invitation.');
                  }
                  
                  // Verify email matches
                  if (decodedData.email === currentUser.email.toLowerCase()) {
                    // Trust the token and use its data
                    invitationData = {
                      email: decodedData.email,
                      fullName: decodedData.fullName,
                      phoneNumber: decodedData.phoneNumber,
                      location: decodedData.location,
                      role: decodedData.role,
                      companyId: decodedData.companyId,
                      invitationToken: invitationToken, // Store for later validation
                    };
                    
                    console.log('✅ Will create profile with company:', invitationData.companyId);
                    
                    // Clear sessionStorage
                    sessionStorage.removeItem('invitationToken');
                  } else {
                    console.log('⚠️ Email mismatch - Token:', decodedData.email, 'User:', currentUser.email);
                    throw new Error('Email does not match invitation. Please use the invited email address.');
                  }
                } catch (decodeErr) {
                  console.error('❌ Error processing invitation:', decodeErr);
                  sessionStorage.removeItem('invitationToken');
                  throw decodeErr;
                }
              } else {
                console.log('⚠️ No invitation token in sessionStorage');
              }
            } catch (err) {
              console.error('❌ Error checking invitations:', err);
            }
            
            // Create profile with invitation data if available
            const profileData = {
              email: currentUser.email,
              displayName: invitationData?.fullName || currentUser.displayName,
              photoURL: currentUser.photoURL,
              fullName: invitationData?.fullName || currentUser.displayName,
              phoneNumber: invitationData?.phoneNumber || null,
              location: invitationData?.location || null,
              role: invitationData?.role || null,
              companyId: invitationData?.companyId || null,
            };
            
            console.log('📝 Creating user profile with data:', profileData);
            
            await createUserProfile(currentUser.uid, profileData);
            
            profile = await getUserProfile(currentUser.uid);
            
            console.log('👤 User profile created:', profile);
            
            // Note: We don't update invitation status here to avoid permission issues
            // The company admin can see accepted invitations in their dashboard
          }
          
          setUserProfile(profile);
          
          try {
            const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
            const { db } = await import("../services/firebase");
            await updateDoc(doc(db, "users", currentUser.uid), {
              lastLoginAt: serverTimestamp(),
            });
          } catch (loginUpdateErr) {
            console.error("Error updating last login time:", loginUpdateErr);
          }
          
          // Fetch company if user has one
          if (profile?.companyId) {
            const { getCompany } = await import("../services/companyService");
            const companyData = await getCompany(profile.companyId);
            setCompany(companyData);
          } else {
            setCompany(null);
          }
        } catch (err) {
          console.error("Error loading user data:", err);
        }
      } else {
        setUserProfile(null);
        setCompany(null);
      }
      
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  /**
   * Login with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<void>}
   */
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      await signInWithEmail(email, password);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign up with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<void>}
   */
  const signup = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      await signUpWithEmail(email, password);
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login with Google OAuth
   * @returns {Promise<void>}
   */
  const loginWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout the current user
   * @returns {Promise<void>}
   */
  const logout = async () => {
    try {
      setError(null);
      await authLogout();
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  };

  /**
   * Refresh user profile and company data
   * @returns {Promise<void>}
   */
  const refreshUserData = async () => {
    if (!user) return;
    
    try {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
      
      if (profile?.companyId) {
        const { getCompany } = await import("../services/companyService");
        const companyData = await getCompany(profile.companyId);
        setCompany(companyData);
      } else if (profile?.role === 'company_owner') {
        const companyData = await getCompanyByOwner(user.uid);
        setCompany(companyData);
      } else {
        setCompany(null);
      }
    } catch (err) {
      console.error("Error refreshing user data:", err);
    }
  };

  return {
    user,
    userProfile,
    company,
    loading,
    error,
    login,
    signup,
    register: signup, // Alias for signup
    loginWithGoogle,
    logout,
    refreshUserData,
  };
};

/**
 * Convert Firebase error codes to user-friendly messages
 * @param {Error} error - Firebase error object
 * @returns {string} User-friendly error message
 */
const getErrorMessage = (error) => {
  switch (error.code) {
    case "auth/invalid-email":
      return "Invalid email address";
    case "auth/user-disabled":
      return "This account has been disabled";
    case "auth/user-not-found":
      return "Invalid email or password";
    case "auth/wrong-password":
      return "Invalid email or password";
    case "auth/email-already-in-use":
      return "Account already exists with this email";
    case "auth/weak-password":
      return "Password should be at least 6 characters";
    case "auth/network-request-failed":
      return "Connection failed. Please try again";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later";
    case "auth/popup-closed-by-user":
      return "Sign-in cancelled";
    case "auth/cancelled-popup-request":
      return "Sign-in cancelled";
    default:
      return error.message || "An error occurred. Please try again";
  }
};
