"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@supabase/supabase-js";
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

  // Keep track of current user and profile values to avoid stale closure in useEffect
  const stateRef = useRef({ user, profile });

  useEffect(() => {
    stateRef.current = { user, profile };
  }, [user, profile]);

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setClientToken(null);
      setUser(null);
      setProfile(null);
      setIsForbidden(false);
      setError(null);
      router.push("/login");
    } catch (err: unknown) {
      console.error("Error during sign out:", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      setError(null);
      const data = await adminFetch<AdminMeResponse>("/me");
      setProfile(data);
      setIsForbidden(false);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      console.error("Failed /me check:", message);
      if (message === "ADMIN_FORBIDDEN" || message === "Admin permission required.") {
        setIsForbidden(true);
        setProfile(null);
      } else if (message === "UNAUTHORIZED" || message === "NO_SESSION") {
        setIsForbidden(false);
        setProfile(null);
        await supabase.auth.signOut();
      } else {
        setError(message || "An error occurred checking permissions.");
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const isAuthCallback = typeof window !== "undefined" && (
      window.location.hash.includes("access_token=") ||
      window.location.hash.includes("id_token=") ||
      window.location.hash.includes("error=") ||
      window.location.hash.includes("recovery_token=") ||
      window.location.search.includes("code=")
    );

    if (isAuthCallback) {
      // Set a fallback timer in case the auth callback parsing fails or hangs
      fallbackTimer = setTimeout(() => {
        if (mounted) {
          console.warn("Auth callback fallback timeout reached. Forcing loading state to false.");
          setLoading(false);
        }
      }, 5000);
    }

    // Check current session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      if (session) {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        setClientToken(session.access_token);
        setUser(session.user);
        await checkAdminStatus();
        setLoading(false);
      } else {
        // If there's an auth callback, don't set loading to false yet; let onAuthStateChange handle it.
        if (!isAuthCallback) {
          setClientToken(null);
          setUser(null);
          setProfile(null);
          setIsForbidden(false);
          setLoading(false);
        }
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session) {
        if (fallbackTimer) clearTimeout(fallbackTimer);
        setClientToken(session.access_token);
        setUser(session.user);
        
        // Only trigger full-screen loading spinner if we don't already have an active admin session.
        // For background token refreshes, perform a silent validation.
        const hasCurrentUser = !!stateRef.current.user;
        const hasProfile = !!stateRef.current.profile;
        if (!hasCurrentUser || !hasProfile) {
          setLoading(true);
        }
        
        await checkAdminStatus();
        setLoading(false);
      } else {
        // If we are currently processing a callback, don't immediately set loading to false.
        // Let the fallback timer handle the failure, or wait for SIGNED_IN.
        if (!isAuthCallback || event === "SIGNED_OUT") {
          setClientToken(null);
          setUser(null);
          setProfile(null);
          setIsForbidden(false);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

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
