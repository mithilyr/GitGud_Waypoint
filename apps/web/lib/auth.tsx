"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, get, getToken, isNetworkError, post, setToken } from "./api";

export type Role = "dispatcher" | "loader" | "driver" | "store";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  depot: string | null;
  dock: string | null;
  driver_code: string | null;
  vehicle_id: string | null;
  outlet: { id: string; name: string; brand: string; district: string } | null;
};

type Ctx = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  pinLogin: (userId: number, pin: string) => Promise<User>;
  adopt: (token: string, user: User) => void;
  logout: () => void;
};

const AuthCtx = createContext<Ctx | null>(null);
const USER_KEY = "wp_user";

function cachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export const HOME: Record<Role, string> = {
  dispatcher: "/dispatcher/orders",
  loader: "/loader",
  driver: "/driver",
  store: "/store",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Show the cached user at once (works offline), then confirm with the server when there is a connection.
    const cached = getToken() ? cachedUser() : null;
    if (cached) setUser(cached);
    if (!getToken()) {
      setReady(true);
      return;
    }
    get<User>("/auth/me")
      .then((u) => {
        setUser(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          setToken(null);
          setUser(null);
        } else if (!isNetworkError(e)) {
          setUser(cached);
        }
      })
      .finally(() => setReady(true));
  }, []);

  const adopt = useCallback((token: string, u: User) => {
    setToken(token);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      /* ignore */
    }
    setUser(u);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const r = await post<{ token: string; user: User }>("/auth/login", { email, password });
      adopt(r.token, r.user);
      return r.user;
    },
    [adopt],
  );

  const pinLogin = useCallback(
    async (userId: number, pin: string) => {
      const r = await post<{ token: string; user: User }>("/auth/pin-login", { user_id: userId, pin });
      adopt(r.token, r.user);
      return r.user;
    },
    [adopt],
  );

  const logout = useCallback(() => {
    setToken(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  return <AuthCtx.Provider value={{ user, ready, login, pinLogin, adopt, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}

/** Redirects to /login unless a user with the right role is signed in. Returns the user once ready. */
export function useRequireRole(role: Role, loginPath = "/login"): User | null {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace(`${loginPath}?role=${role}`);
    else if (user.role !== role) router.replace(HOME[user.role]);
  }, [ready, user, role, router, loginPath]);
  return ready && user?.role === role ? user : null;
}
