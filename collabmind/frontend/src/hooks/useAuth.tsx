"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export interface CustomUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  token: string | null;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: (name: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check local guest session first
    const savedGuest = typeof window !== "undefined" ? localStorage.getItem("collabmind_guest") : null;
    if (savedGuest) {
      try {
        const guestData = JSON.parse(savedGuest);
        setUser(guestData);
        setToken(`dev-token-${guestData.uid}`);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem("collabmind_guest");
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
          photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
        });
        setToken(idToken);
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginAsGuest = (name: string) => {
    const guestId = "guest-" + Math.random().toString(36).substring(2, 8);
    const guestObj: CustomUser = {
      uid: guestId,
      email: `${guestId}@collabmind.local`,
      displayName: name || "Creative Collaborator",
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${guestId}`,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("collabmind_guest", JSON.stringify(guestObj));
    }
    setUser(guestObj);
    setToken(`dev-token-${guestId}`);
  };

  const logout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("collabmind_guest");
    }
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
