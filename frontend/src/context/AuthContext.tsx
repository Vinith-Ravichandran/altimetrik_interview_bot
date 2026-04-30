import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../api/client";
import type { TokenResponse, UserDto } from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

// Kept compatible with existing Dashboard / Layout usage
export type DemoUser = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  account: string;
  isAdmin: boolean;
  active: boolean;
  mockCount: number;
  mockScores: number[];
  realInterviews: [];
};

export type AuthContextType = {
  currentUser: DemoUser | null;
  users: DemoUser[];
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
  setUsers: React.Dispatch<React.SetStateAction<DemoUser[]>>;
  // legacy — no-ops kept so existing pages don't break
  managedRoles: string[];
  setManagedRoles: React.Dispatch<React.SetStateAction<string[]>>;
};

const TOKEN_KEY = "auth.token";
const USER_KEY  = "auth.user";

// ── Helpers ───────────────────────────────────────────────────────────────────

function apiUserToDemoUser(u: UserDto): DemoUser {
  return {
    id:             u.id,
    name:           u.name,
    email:          u.email ?? null,
    role:           u.roleName ?? "",
    account:        u.accountName ?? "",
    isAdmin:        u.admin,
    active:         u.active,
    mockCount:      u.mockCount,
    mockScores:     [],
    realInterviews: [],
  };
}

function tokenToPartialUser(t: TokenResponse): DemoUser {
  return {
    id:             t.userId,
    name:           t.name,
    email:          t.email ?? null,
    role:           t.roleName ?? "",
    account:        "",
    isAdmin:        t.admin,
    active:         true,
    mockCount:      0,
    mockScores:     [],
    realInterviews: [],
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken]               = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser]   = useState<DemoUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [users, setUsers]               = useState<DemoUser[]>([]);
  const [managedRoles, setManagedRoles] = useState<string[]>([]);

  // Fetch full user profile after token is set
  useEffect(() => {
    if (!token) return;
    api.me()
      .then(u => {
        const mapped = apiUserToDemoUser(u);
        setCurrentUser(mapped);
        localStorage.setItem(USER_KEY, JSON.stringify(mapped));
      })
      .catch(() => {
        // token expired or invalid
        clearSession();
      });
  }, [token]);

  // Fetch all users when current user is admin
  useEffect(() => {
    if (currentUser?.isAdmin) {
      api.listUsers()
        .then(list => setUsers(list.map(apiUserToDemoUser)))
        .catch(() => setUsers([]));
    }
  }, [currentUser?.isAdmin, currentUser?.id]);

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setCurrentUser(null);
    setUsers([]);
  }

  async function login(email: string, password: string) {
    const res = await api.login({ email, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    const partial = tokenToPartialUser(res);
    localStorage.setItem(USER_KEY, JSON.stringify(partial));
    setToken(res.token);
    setCurrentUser(partial);
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.register({ name, email, password });
    localStorage.setItem(TOKEN_KEY, res.token);
    const partial = tokenToPartialUser(res);
    localStorage.setItem(USER_KEY, JSON.stringify(partial));
    setToken(res.token);
    setCurrentUser(partial);
  }

  function logout() {
    clearSession();
  }

  async function refreshUsers() {
    if (!currentUser?.isAdmin) return;
    const list = await api.listUsers();
    setUsers(list.map(apiUserToDemoUser));
  }

  return (
    <AuthContext.Provider value={{
      currentUser, users, token,
      login, register, logout, refreshUsers,
      setUsers, managedRoles, setManagedRoles,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// legacy exports for backward compat
export function loadUsers() { return []; }
export function saveUsers(_: DemoUser[]) {}
