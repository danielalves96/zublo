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
import { api } from "@/lib/api";

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

  // Cache the admin status so login() doesn't duplicate the request made by refreshUser()
  const isAdminRef = useRef<boolean | undefined>(undefined);
  const didBootstrapRef = useRef(false);

  const fetchIsAdmin = useCallback(async () => {
    const res = await api.get<{ isAdmin: boolean }>("/api/auth/is-admin", {
      cache: "no-store",
    });
    isAdminRef.current = !!res.isAdmin;
    return !!res.isAdmin;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!authService.isValid()) {
      setUser(null);
      isAdminRef.current = undefined;
      setIsLoading(false);
      return;
    }
    try {
      await authService.refresh();
      const record = authService.getModel();
      if (record) {
        setUser(record);
        setIsAdmin(await fetchIsAdmin());
      }
    } catch {
      authService.clear();
      setUser(null);
      isAdminRef.current = undefined;
    } finally {
      setIsLoading(false);
    }
  }, [fetchIsAdmin]);

  useEffect(() => {
    if (!didBootstrapRef.current) {
      didBootstrapRef.current = true;
      refreshUser();
    }

    // Listen to changes in the authStore (e.g. token expiration, manual clear)
    const unsubscribe = authService.onChange((token, model) => {
      if (!token || !model) {
        setUser(null);
        setIsAdmin(false);
      } else {
        setUser(model as User);
      }
    });

    return () => {
      unsubscribe();
    };
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

    // Re-use the admin status already fetched by refreshUser() when possible
    let nextIsAdmin = isAdminRef.current;
    if (nextIsAdmin === undefined) {
      nextIsAdmin = await fetchIsAdmin();
    }
    setIsAdmin(nextIsAdmin);
  }, [fetchIsAdmin]);

  const logout = useCallback(() => {
    authService.clear();
    isAdminRef.current = undefined;
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
