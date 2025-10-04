// src/context/AuthProvider.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

// Endpoints expected by the frontend scaffolding I gave you
const ME_ENDPOINT = "/api/auth/me";
const LOGIN_ENDPOINT = "/api/auth/login";
const LOGOUT_ENDPOINT = "/api/auth/logout";

// Storage
const STORAGE_KEY = "auth_v2";

// Safer base64 decode for JWT payloads
function decodeJwt(token) {
  try {
    const [, payload] = token.split(".");
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    return json;
  } catch {
    return null;
  }
}

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Single source of truth for persisting auth
  const persistAuth = useCallback((nextUser, nextToken) => {
    setUser(nextUser || null);
    setToken(nextToken || null);

    if (nextUser) {
      // Save token only if present; cookie sessions won't have one
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: nextUser, token: nextToken || null })
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    // Nuke any legacy keys
    localStorage.removeItem("auth");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }, []);

  // Verify token locally, then hydrate from server.
  // If no token, still try cookie-based /auth/me.
  const verifyAndHydrate = useCallback(
    async (candidateToken) => {
      // If we have a token, check expiry before wasting a request
      if (candidateToken) {
        const decoded = decodeJwt(candidateToken);
        const nowSec = Math.floor(Date.now() / 1000);
        if (!decoded?.exp || decoded.exp <= nowSec) {
          persistAuth(null, null);
          return false;
        }
      }

      try {
        const headers = candidateToken
          ? { Authorization: `Bearer ${candidateToken}` }
          : {};

        const res = await fetch(ME_ENDPOINT, {
          method: "GET",
          headers,
          credentials: "include", // supports cookie sessions
        });

        if (!res.ok) {
          persistAuth(null, null);
          return false;
        }

        const me = await res.json();
        if (!me?.id) {
          persistAuth(null, null);
          return false;
        }

        persistAuth(me, candidateToken || null);
        return true;
      } catch {
        persistAuth(null, null);
        return false;
      }
    },
    [persistAuth]
  );

  // Bootstrap from storage and/or cookie session
  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : null;
        const savedToken = parsed?.token || null;

        // Try token path first if present; otherwise try cookie session
        const ok =
          (savedToken && (await verifyAndHydrate(savedToken))) ||
          (await verifyAndHydrate(null));

        if (!ok) persistAuth(null, null);
      } catch {
        persistAuth(null, null);
      } finally {
        setLoading(false);
      }
    })();
  }, [persistAuth, verifyAndHydrate]);

  // Public APIs expected by the rest of the app:
  // login(email, password) and logout()
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch(LOGIN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // cookie session support
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const msg = await safeMsg(res);
        throw new Error(msg || "Login failed");
      }

      // Backends vary: either return { token } or full user
      const body = await res.json().catch(() => ({}));
      const nextToken = body?.token || null;

      // Always verify/hydrate from /auth/me
      const ok = await verifyAndHydrate(nextToken);
      if (!ok) throw new Error("Unable to hydrate session");

      return true;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(LOGOUT_ENDPOINT, { method: "POST", credentials: "include" });
    } catch {
      // If the server sulks, we still clear client state.
    } finally {
      persistAuth(null, null);
    }
  };

  const value = { user, token, login, logout, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

async function safeMsg(res) {
  try {
    const j = await res.json();
    return j?.error || j?.message || null;
  } catch {
    return null;
  }
}

export const useAuth = () => useContext(AuthContext);
export default AuthProvider;
