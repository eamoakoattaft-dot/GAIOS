import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type Role =
  | "ed"
  | "rso"
  | "gm"
  | "fco"
  | "pi"
  | "reviewer"
  | "compliance"
  | "board"
  | "it";

type Membership = {
  org_id: string;
  role: Role;
  status: "pending" | "active" | "suspended";
  org: { id: string; name: string; slug: string };
};

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  memberships: Membership[];
  activeOrgId: string | null;
  activeRole: Membership["role"] | null;
  setActiveOrgId: (id: string | null) => void;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(() =>
    localStorage.getItem("gaios-active-org")
  );

  const user = session?.user ?? null;

  const setActiveOrgId = (id: string | null) => {
    setActiveOrgIdState(id);
    if (id) localStorage.setItem("gaios-active-org", id);
    else localStorage.removeItem("gaios-active-org");
  };

  async function loadProfileAndMemberships(uid: string) {
    const [{ data: prof }, { data: mem }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase
        .from("memberships")
        .select("org_id, role, status, org:organizations(id, name, slug)")
        .eq("user_id", uid)
        .eq("status", "active"),
    ]);
    setProfile((prof as Profile) ?? null);
    const list = (mem as unknown as Membership[]) ?? [];
    setMemberships(list);
    // If no active org selected or the stored one is stale, pick first membership.
    if (list.length > 0) {
      const stored = localStorage.getItem("gaios-active-org");
      const valid = list.find((m) => m.org_id === stored);
      if (!valid) setActiveOrgId(list[0].org_id);
    } else {
      setActiveOrgId(null);
    }
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) {
      await loadProfileAndMemberships(data.session.user.id);
    } else {
      setProfile(null);
      setMemberships([]);
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadProfileAndMemberships(data.session.user.id);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, s) => {
      setSession(s);
      if (s?.user) {
        await loadProfileAndMemberships(s.user.id);
      } else {
        setProfile(null);
        setMemberships([]);
        setActiveOrgId(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextValue = {
    loading,
    session,
    user,
    profile,
    memberships,
    activeOrgId,
    activeRole:
      memberships.find((m) => m.org_id === activeOrgId)?.role ?? null,
    setActiveOrgId,
    async signInWithPassword(email, password) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    async signUpWithPassword(email, password, displayName) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: displayName ? { display_name: displayName } : undefined,
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    },
    async signInWithGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Check if the current active role satisfies any of the given roles. */
export function useHasRole(...roles: Membership["role"][]): boolean {
  const { activeRole } = useAuth();
  if (!activeRole) return false;
  return roles.includes(activeRole);
}
