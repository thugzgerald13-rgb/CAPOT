import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

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

  // Hardcode the developer's email as superuser for now, 
  // until complete migration to firestore users collection happens.
  const DEVELOPER_EMAIL = 'thugz.gerald13@gmail.com';
  const isAdmin = user?.email === DEVELOPER_EMAIL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      if (usr) {
        const savedRole = localStorage.getItem(`user_role_${usr.uid}`);
        setUserRoleState(savedRole);
      } else {
        setUserRoleState(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const setUserRole = (role: string | null) => {
    if (user) {
      if (role) {
        localStorage.setItem(`user_role_${user.uid}`, role);
      } else {
        localStorage.removeItem(`user_role_${user.uid}`);
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
