import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  query, where, orderBy, deleteDoc, writeBatch 
} from 'firebase/firestore';
import { db, auth } from '../firebase';

interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

const handleFirestoreError = (error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) => {
  if (error.code === 'permission-denied' || error.message?.includes('insufficient permissions')) {
    const user = auth.currentUser;
    const errorInfo: FirestoreErrorInfo = {
      error: error.message || 'Missing or insufficient permissions',
      operationType,
      path,
      authInfo: {
        userId: user?.uid || 'unauthenticated',
        email: user?.email || '',
        emailVerified: user?.emailVerified || false,
        isAnonymous: user?.isAnonymous || false,
        providerInfo: user?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    throw new Error(JSON.stringify(errorInfo));
  }
  throw error;
};

// Profiles Schema
export const getProfile = async (uid: string) => {
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return { username: 'User', fullName: '', dob: '', address: '', phone: '' };
  } catch (error) {
    return handleFirestoreError(error, 'get', `users/${uid}`);
  }
};

export const updateProfile = async (uid: string, data: any) => {
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'update', `users/${uid}`);
  }
};

// Settings Schema
export const getSettings = async (uid: string) => {
  try {
    const docRef = doc(db, 'settings', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return { systemInstruction: '' };
  } catch (error) {
    return handleFirestoreError(error, 'get', `settings/${uid}`);
  }
};

export const updateSettings = async (uid: string, data: any) => {
  try {
    const docRef = doc(db, 'settings', uid);
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, 'update', `settings/${uid}`);
  }
};

// Sessions Schema
export const getSessions = async (uid: string) => {
  try {
    const q = query(collection(db, 'sessions'), where('userId', '==', uid), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    return handleFirestoreError(error, 'list', 'sessions');
  }
};

export const createSession = async (uid: string, title: string) => {
  try {
    const docRef = await addDoc(collection(db, 'sessions'), {
      userId: uid,
      title,
      createdAt: Date.now()
    });
    return docRef.id;
  } catch (error) {
    return handleFirestoreError(error, 'create', 'sessions');
  }
};

export const deleteSession = async (uid: string, sessionId: string) => {
  try {
    // 1. Delete messages first while session still exists
    const q = query(collection(db, 'history'), 
      where('userId', '==', uid),
      where('sessionId', '==', sessionId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    
    // 2. Delete session
    await deleteDoc(doc(db, 'sessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, 'delete', `sessions/${sessionId}`);
  }
};

export const deleteSelectedSessions = async (uid: string, sessionIds: string[]) => {
  try {
    for (const sessionId of sessionIds) {
      // 1. Check if session belongs to user (this is implicitly handled by security rules but explicit check is safer)
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      
      if (!sessionSnap.exists() || sessionSnap.data()?.userId !== uid) {
        console.warn(`Session ${sessionId} not found or not owned by user. Skipping.`);
        continue;
      }
      
      const batch = writeBatch(db);
      
      // 2. Queue deletion of messages
      const q = query(collection(db, 'history'), 
        where('userId', '==', uid),
        where('sessionId', '==', sessionId)
      );
      const snap = await getDocs(q);
      snap.docs.forEach(d => batch.delete(d.ref));
      
      // 3. Queue deletion of session
      batch.delete(sessionRef);
      
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, 'delete', 'sessions');
  }
};

export const deleteAllSessions = async (uid: string) => {
  try {
    // 1. Delete all history for this user
    const qHistory = query(collection(db, 'history'), where('userId', '==', uid));
    const snapHistory = await getDocs(qHistory);
    const batchHistory = writeBatch(db);
    snapHistory.docs.forEach(d => batchHistory.delete(d.ref));
    await batchHistory.commit();

    // 2. Delete all sessions for this user
    const qSessions = query(collection(db, 'sessions'), where('userId', '==', uid));
    const snapSessions = await getDocs(qSessions);
    const batchSessions = writeBatch(db);
    snapSessions.docs.forEach(d => batchSessions.delete(d.ref));
    await batchSessions.commit();
  } catch (error) {
    handleFirestoreError(error, 'delete', 'sessions');
  }
};


// History Schema
export const getHistory = async (uid: string, sessionId: string) => {
  try {
    const q = query(collection(db, 'history'), 
      where('userId', '==', uid),
      where('sessionId', '==', sessionId), 
      orderBy('timestamp', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    return handleFirestoreError(error, 'list', 'history');
  }
};

export const addHistory = async (uid: string, sessionId: string, message: any) => {
  try {
    const docRef = await addDoc(collection(db, 'history'), {
      userId: uid,
      sessionId,
      ...message,
      timestamp: Date.now()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, 'create', 'history');
    return null;
  }
};

export const updateHistory = async (uid: string, historyId: string, messageUpdate: any) => {
  try {
    const docRef = doc(db, 'history', historyId);
    await updateDoc(docRef, messageUpdate);
  } catch (error) {
    handleFirestoreError(error, 'update', 'history');
  }
};
