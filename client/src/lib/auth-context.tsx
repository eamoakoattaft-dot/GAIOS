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
    // Wrap each query in a 6s timeout so a hanging fetch can't freeze boot.
    const withTimeout = <T,>(p: PromiseLike<T>, label: string): Promise<T> =>
      Promise.race([
        Promise.resolve(p),
        new Promise<T>((_, rej) =>
          setTimeout(() => rej(new Error(`${label} timed out after 6s`)), 6000)
        ),
      ]);

    let prof: any = null;
    let mem: any = null;
    try {
      const [pRes, mRes] = await Promise.all([
        withTimeout(
          supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
          "profiles query"
        ),
        withTimeout(
          supabase
            .from("memberships")
            .select("org_id, role, status, org:organizations(id, name, slug)")
            .eq("user_id", uid)
            .eq("status", "active"),
          "memberships query"
        ),
      ]);
      prof = (pRes as any).data;
      mem = (mRes as any).data;
      if ((pRes as any).error) console.error("[auth] profiles error", (pRes as any).error);
      if ((mRes as any).error) console.error("[auth] memberships error", (mRes as any).error);
    } catch (e) {
      console.error("[auth] loadProfileAndMemberships failed", e);
    }
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

    // Hard safety net: never leave the app in a permanent loading state.
    const failsafe = window.setTimeout(() => {
      if (mounted) {
        console.warn("[auth] initial load exceeded 8s, forcing loading=false");
        setLoading(false);
      }
    }, 8000);

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user) {
          await loadProfileAndMemberships(data.session.user.id);
        }
      } catch (e) {
        console.error("[auth] initial load failed", e);
      } finally {
        if (mounted) {
          window.clearTimeout(failsafe);
          setLoading(false);
        }
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (evt, s) => {
      setSession(s);
      if (s?.user) {
        await loadProfileAndMemberships(s.user.id);
        // If a pending invite token is stashed (from /accept-invite), resume the flow.
        if (evt === "SIGNED_IN") {
          const pending = localStorage.getItem("gaios-pending-invite");
          if (pending) {
            localStorage.removeItem("gaios-pending-invite");
            window.location.hash = `/accept-invite?token=${pending}`;
          }
        }
      } else {
        setProfile(null);
        setMemberships([]);
        setActiveOrgId(null);
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(failsafe);
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
