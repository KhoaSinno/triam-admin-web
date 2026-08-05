import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables."
  );
}

// In-memory token storage to avoid async locks in API calls
let clientToken: string | null = null;

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    // Decode base64 payload safely
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    const exp = payload.exp;
    if (!exp) return true;
    
    // Expiration check with a 15-second grace period buffer
    return (Date.now() / 1000) >= (exp - 15);
  } catch {
    return true;
  }
}

export function getClientToken(): string | null {
  return clientToken;
}

export function setClientToken(token: string | null) {
  clientToken = token;
}

export async function getValidToken(): Promise<string | null> {
  if (clientToken && !isTokenExpired(clientToken)) {
    return clientToken;
  }

  try {
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 3000)
    );

    const res = await Promise.race([sessionPromise, timeoutPromise]);
    if (res?.data?.session) {
      clientToken = res.data.session.access_token;
      return clientToken;
    }
  } catch (err) {
    console.error("Failed to retrieve valid session:", err);
  }

  return clientToken;
}

export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || "",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Disable navigator.locks to prevent tab-focus hangs in browsers
      lock: async (name, acquireTimeout, fn) => {
        return await fn();
      },
    },
  }
);
