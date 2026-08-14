import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  FC,
} from "react";
import {
  User,
  UserCredential,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  AuthError,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../config/firebase";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<UserCredential | null>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to convert Firebase error codes to friendly messages
function getFriendlyErrorMessage(error: AuthError | any): string {
  if (!error) return "An unknown error occurred.";
  const code = error.code || "";

  switch (code) {
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid":
      return "Invalid Firebase API Key. Please verify your credentials in src/react-app/config/firebase.ts.";
    case "auth/app-not-authorized":
    case "auth/unauthorized-domain":
      return "Domain is not authorized. Add your domain in Firebase Console > Authentication > Settings > Authorized domains.";
    case "auth/popup-closed-by-user":
      return "Sign-in popup was closed before completing.";
    case "auth/popup-blocked":
      return "Sign-in popup was blocked by browser. Please allow popups for this site.";
    case "auth/operation-not-allowed":
      return "Google provider is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    default:
      return error.message || "Google sign-in failed. Please check your Firebase configuration.";
  }
}

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = isFirebaseConfigured();

  // Listen to Firebase auth state changes
  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        },
        (authErr) => {
          console.warn("Auth state observer error:", authErr);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch (err) {
      console.warn("Failed to attach auth state observer:", err);
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<UserCredential | null> => {
    if (!configured) {
      const msg = "Please configure your Firebase credentials in src/react-app/config/firebase.ts first.";
      setError(msg);
      alert(msg);
      return null;
    }
    setActionLoading(true);
    setError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred;
    } catch (err: any) {
      console.error("Google sign in error:", err);
      const friendlyMsg = getFriendlyErrorMessage(err);
      setError(friendlyMsg);
      return null;
    } finally {
      setActionLoading(false);
    }
  }, [configured]);

  const logout = useCallback(async (): Promise<void> => {
    setActionLoading(true);
    setError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Sign out error:", err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        actionLoading,
        error,
        isConfigured: configured,
        signInWithGoogle,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
