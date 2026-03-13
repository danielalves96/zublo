import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import pb from "@/lib/pb";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshUser = useCallback(async () => {
    if (!pb.authStore.isValid) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      await pb.collection("users").authRefresh();
      const record = pb.authStore.model;
      if (record) {
        setUser(record as unknown as User);
        // Determine if user is admin (first registered user).
        // We use /api/auth/admin-id because the listRule on "users" is
        // "id = @request.auth.id" — the SDK can only see the current user,
        // so getList+sort would always return the current user as "first".
        const res = await fetch("/api/auth/admin-id");
        const json = res.ok ? await res.json() : { adminId: null };
        setIsAdmin(record.id === json.adminId);
      }
    } catch {
      pb.authStore.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const authData = await pb
      .collection("users")
      .authWithPassword(email, password);

    // If the user has 2FA enabled, check for a "remember this device" entry.
    // If none (or expired), clear the session and redirect to TOTP challenge.
    if (authData.record.totp_enabled) {
      const rememberKey = `totp_trusted_${authData.record.id}`;
      const trusted = localStorage.getItem(rememberKey);
      const isStillTrusted = trusted && Number(trusted) > Date.now();
      if (!isStillTrusted) {
        pb.authStore.clear();
        throw new Error("TOTP_REQUIRED");
      }
      // Trusted device — fall through and complete login normally
    }

    setUser(authData.record as unknown as User);

    // Check admin status
    const res = await fetch("/api/auth/admin-id");
    const json = res.ok ? await res.json() : { adminId: null };
    setIsAdmin(authData.record.id === json.adminId);
  };

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAdmin, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
