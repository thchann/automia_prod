import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearAuthTokens,
  fetchMe,
  isAuthenticated,
  login as loginRequest,
  logoutRemote,
  register as registerRequest,
} from "@automia/api";
import type { UserMeResponse } from "@automia/api";

type AuthContextValue = {
  user: UserMeResponse | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, accessCode: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      setIsLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => {
        clearAuthTokens();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await loginRequest({ email, password });
    const u = await fetchMe();
    setUser(u);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, accessCode: string) => {
    await registerRequest({ name, email, password, access_code: accessCode });
    const u = await fetchMe();
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearAuthTokens();
    setUser(null);
    void logoutRemote().catch(() => {});
  }, []);

  const refreshUser = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const u = await fetchMe();
      setUser(u);
    } catch {
      clearAuthTokens();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, refreshUser }),
    [user, isLoading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
