"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Session, User } from "@supabase/supabase-js";
import { supabase, setClientToken } from "@/lib/supabase";
import { adminFetch, AdminMeResponse, getErrorMessage } from "@/lib/api";

type AuthContextType = {
  user: User | null;
  profile: AdminMeResponse | null;
  loading: boolean;
  error: string | null;
  isForbidden: boolean;
  logout: () => Promise<void>;
  checkAdminStatus: () => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const stateRef = useRef({ user, profile });
  const mountedRef = useRef(true);
  const validationRef = useRef<{ token: string; promise: Promise<void> } | null>(null);

  useEffect(() => {
    stateRef.current = { user, profile };
  }, [user, profile]);

  const clearAuthState = useCallback(() => {
    setClientToken(null);
    setUser(null);
    setProfile(null);
    setIsForbidden(false);
  }, []);

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      clearAuthState();
      setError(null);
      router.push("/login");
    } catch (err: unknown) {
      console.error("Error during sign out:", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const validateSession = useCallback((session: Session, showLoader: boolean) => {
    const existing = validationRef.current;
    if (existing?.token === session.access_token) {
      return existing.promise;
    }

    const promise = (async () => {
      if (showLoader) setLoading(true);
      setClientToken(session.access_token);
      setUser(session.user);
      setError(null);

      try {
        let activeSession = session;
        let data: AdminMeResponse;

        try {
          data = await adminFetch<AdminMeResponse>("/me", undefined, activeSession.access_token);
        } catch (firstError) {
          if (getErrorMessage(firstError) !== "UNAUTHORIZED") throw firstError;

          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshed.session) throw firstError;

          activeSession = refreshed.session;
          setClientToken(activeSession.access_token);
          setUser(activeSession.user);
          data = await adminFetch<AdminMeResponse>("/me", undefined, activeSession.access_token);
        }

        if (!mountedRef.current) return;
        setProfile(data);
        setIsForbidden(false);
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        const message = getErrorMessage(err);

        if (message === "ADMIN_FORBIDDEN" || message === "Admin permission required.") {
          setIsForbidden(true);
          setProfile(null);
        } else if (message === "UNAUTHORIZED" || message === "NO_SESSION") {
          clearAuthState();
          await supabase.auth.signOut({ scope: "local" });
        } else {
          setError(message || "Không thể kiểm tra quyền quản trị.");
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    validationRef.current = { token: session.access_token, promise };
    void promise.finally(() => {
      if (validationRef.current?.promise === promise) {
        validationRef.current = null;
      }
    });
    return promise;
  }, [clearAuthState]);

  const checkAdminStatus = useCallback(async () => {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !data.session) {
      clearAuthState();
      setLoading(false);
      return;
    }
    await validateSession(data.session, false);
  }, [clearAuthState, validateSession]);

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setLoading(false);
      throw signInError;
    }
    if (!data.session) {
      setLoading(false);
      throw new Error("NO_SESSION");
    }

    await validateSession(data.session, true);
  }, [validateSession]);

  useEffect(() => {
    mountedRef.current = true;
    const fallbackTimer = window.setTimeout(() => {
      if (mountedRef.current && !stateRef.current.user) setLoading(false);
    }, 6000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (session) {
        window.clearTimeout(fallbackTimer);
        setClientToken(session.access_token);
        setUser(session.user);

        if (event === "TOKEN_REFRESHED" && stateRef.current.profile) {
          setLoading(false);
          return;
        }

        window.setTimeout(() => {
          if (mountedRef.current) {
            void validateSession(session, !stateRef.current.profile);
          }
        }, 0);
      } else {
        clearAuthState();
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      window.clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, [clearAuthState, validateSession]);

  // Route Guard Logic
  useEffect(() => {
    if (loading) return;

    const publicRoutes = ["/login", "/no-access"];
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!user && !isPublicRoute) {
      // Not logged in and trying to access admin pages -> redirect to login
      router.push("/login");
    } else if (user) {
      if (isForbidden) {
        // User logged in but not an admin -> redirect to no-access screen
        if (pathname !== "/no-access") {
          router.push("/no-access");
        }
      } else if (profile) {
        // User logged in and is admin -> if on login/no-access, redirect to dashboard
        if (isPublicRoute) {
          router.push("/dashboard");
        }
      }
    }
  }, [user, profile, loading, isForbidden, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        isForbidden,
        logout,
        checkAdminStatus,
        loginWithPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
