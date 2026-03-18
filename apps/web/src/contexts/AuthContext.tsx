import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { authService } from "@/services/auth";
import { LS_KEYS } from "@/lib/constants";
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

  // Cache the admin-id so login() doesn't duplicate the request made by refreshUser()
  const adminIdRef = useRef<string | null | undefined>(undefined);

  const refreshUser = useCallback(async () => {
    if (!authService.isValid()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      await authService.refresh();
      const record = authService.getModel();
      if (record) {
        setUser(record);
        // Determine if user is admin (first registered user).
        // We use /api/auth/admin-id because the listRule on "users" is
        // "id = @request.auth.id" — the SDK can only see the current user,
        // so getList+sort would always return the current user as "first".
        const res = await fetch("/api/auth/admin-id");
        const json = res.ok ? await res.json() : { adminId: null };
        adminIdRef.current = json.adminId;
        setIsAdmin(record.id === json.adminId);
      }
    } catch {
      authService.clear();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const authData = await authService.loginWithPassword(email, password);

    // If the user has 2FA enabled, check for a "remember this device" entry.
    // If none (or expired), clear the session and redirect to TOTP challenge.
    if (authData.record.totp_enabled) {
      const trusted = localStorage.getItem(LS_KEYS.totpTrusted(authData.record.id));
      const isStillTrusted = trusted && Number(trusted) > Date.now();
      if (!isStillTrusted) {
        authService.clear();
        throw new Error("TOTP_REQUIRED");
      }
      // Trusted device — fall through and complete login normally
    }

    setUser(authData.record as unknown as User);

    // Re-use the admin-id already fetched by refreshUser() when possible
    let adminId = adminIdRef.current;
    if (adminId === undefined) {
      const res = await fetch("/api/auth/admin-id");
      const json = res.ok ? await res.json() : { adminId: null };
      adminId = json.adminId;
      adminIdRef.current = adminId;
    }
    setIsAdmin(authData.record.id === adminId);
  }, []);

  const logout = useCallback(() => {
    authService.clear();
    adminIdRef.current = undefined;
    setUser(null);
    setIsAdmin(false);
  }, []);

  const contextValue = useMemo(
    () => ({ user, isLoading, isAdmin, login, logout, refreshUser }),
    [user, isLoading, isAdmin, login, logout, refreshUser],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
