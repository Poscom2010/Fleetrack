import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const INVITATIONS_COLLECTION = 'invitations';

/**
 * Create a driver invitation
 * @param {string} companyId - Company ID
 * @param {Object} invitationData - Invitation data
 * @returns {Promise<string>} Invitation ID
 */
export const createDriverInvitation = async (companyId, invitationData) => {
  try {
    const { email, fullName, phoneNumber, role = 'company_user' } = invitationData;
    
    // Check if invitation already exists for this email and company
    const existingQuery = query(
      collection(db, INVITATIONS_COLLECTION),
      where('email', '==', email),
      where('companyId', '==', companyId),
      where('status', '==', 'pending')
    );
    
    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) {
      throw new Error('An invitation already exists for this email');
    }
    
    // Generate a temporary password (user will be prompted to change it)
    const tempPassword = generateTempPassword();
    
    const invitationRef = await addDoc(collection(db, INVITATIONS_COLLECTION), {
      companyId,
      email,
      fullName,
      phoneNumber: phoneNumber || null,
      role,
      tempPassword,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });
    
    return {
      id: invitationRef.id,
      tempPassword,
    };
  } catch (error) {
    console.error('Error creating invitation:', error);
    throw error;
  }
};

/**
 * Get pending invitations for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} List of invitations
 */
export const getCompanyInvitations = async (companyId) => {
  try {
    const q = query(
      collection(db, INVITATIONS_COLLECTION),
      where('companyId', '==', companyId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      expiresAt: doc.data().expiresAt?.toDate(),
    }));
  } catch (error) {
    console.error('Error getting invitations:', error);
    throw error;
  }
};

/**
 * Mark invitation as accepted
 * @param {string} invitationId - Invitation ID
 * @param {string} userId - User ID who accepted
 * @returns {Promise<void>}
 */
export const acceptInvitation = async (invitationId, userId) => {
  try {
    const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId);
    await updateDoc(invitationRef, {
      status: 'accepted',
      userId,
      acceptedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
};

/**
 * Cancel/delete an invitation
 * @param {string} invitationId - Invitation ID
 * @returns {Promise<void>}
 */
export const cancelInvitation = async (invitationId) => {
  try {
    const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId);
    await updateDoc(invitationRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    throw error;
  }
};

/**
 * Generate a temporary password
 * @returns {string} Temporary password
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Get invitation by email
 * @param {string} email - Email address
 * @param {string} companyId - Company ID
 * @returns {Promise<Object|null>} Invitation or null
 */
export const getInvitationByEmail = async (email, companyId) => {
  try {
    const q = query(
      collection(db, INVITATIONS_COLLECTION),
      where('email', '==', email),
      where('companyId', '==', companyId),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      expiresAt: doc.data().expiresAt?.toDate(),
    };
  } catch (error) {
    console.error('Error getting invitation:', error);
    throw error;
  }
};
