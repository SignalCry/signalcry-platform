"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { API_BASE } from "@/src/constants/app";

export interface AuthUser {
  email: string;
  username: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  requestSignupCode: (
    email: string,
    username: string,
    password: string,
  ) => Promise<AuthResult>;
  signup: (
    email: string,
    username: string,
    password: string,
    code: string,
  ) => Promise<AuthResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "signalcry_token";
const USER_KEY = "signalcry_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
          setLoading(false);
          return;
        }

        const data = await res.json();
        setUser(data.user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const saveSession = (user: AuthUser, token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setUser(user);
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: data.error || "Invalid credentials",
        };
      }

      saveSession(data.user, data.token);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        message: "Unable to contact auth server",
      };
    }
  };

  const requestSignupCode = async (
    email: string,
    username: string,
    password: string,
  ): Promise<AuthResult> => {
    try {
      const res = await fetch(`${API_BASE}/auth/request-signup-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: data.error || "Unable to send verification code",
        };
      }

      return {
        success: true,
        message: data.message || "Verification code sent to your email",
      };
    } catch (error) {
      return {
        success: false,
        message: "Unable to contact auth server",
      };
    }
  };

  const signup = async (
    email: string,
    username: string,
    password: string,
    code: string,
  ): Promise<AuthResult> => {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          username,
          password,
          code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: data.error || "Unable to sign up",
        };
      }

      saveSession(data.user, data.token);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        message: "Unable to contact auth server",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      requestSignupCode,
      signup,
      logout,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}