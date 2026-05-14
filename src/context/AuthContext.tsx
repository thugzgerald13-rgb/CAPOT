import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: string | null;
  setUserRole: (role: string | null) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  userRole: null,
  setUserRole: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRoleState] = useState<string | null>(null);

  // Hardcode the developer's email as superuser for now
  const DEVELOPER_EMAIL = 'thugz.gerald13@gmail.com';
  const isAdmin = user?.email === DEVELOPER_EMAIL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      setUser(usr);
      if (usr) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', usr.uid);
        const savedRole = localStorage.getItem(`user_role_${usr.uid}`);
        
        await setDoc(userRef, {
          uid: usr.uid,
          email: usr.email,
          displayName: usr.displayName,
          photoURL: usr.photoURL,
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...(savedRole ? { userRole: savedRole } : {})
        }, { merge: true });

        // Try to get role from Firestore OR fallback to local storage
        const userDoc = await getDoc(userRef);
        const firestoreRole = userDoc.data()?.userRole;
        
        if (firestoreRole) {
          setUserRoleState(firestoreRole);
          localStorage.setItem(`user_role_${usr.uid}`, firestoreRole);
        } else {
          setUserRoleState(savedRole);
        }
      } else {
        setUserRoleState(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const setUserRole = async (role: string | null) => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      if (role) {
        localStorage.setItem(`user_role_${user.uid}`, role);
        await setDoc(userRef, { userRole: role, updatedAt: serverTimestamp() }, { merge: true });
      } else {
        localStorage.removeItem(`user_role_${user.uid}`);
        // We might want to keep the role in Firestore or clear it.
        // For simplicity, let's just clear locally as well.
      }
    }
    setUserRoleState(role);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, userRole, setUserRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
