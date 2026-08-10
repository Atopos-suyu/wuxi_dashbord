"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { isDemoMode } from "@/lib/mode";
import {
  clearDemoSession,
  getDemoSession,
  loadDemoDB,
  setDemoSession,
  updateProfile,
} from "@/lib/demo/store";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface SessionContextValue {
  profile: Profile | null;
  loading: boolean;
  isDemo: boolean;
  isT0: boolean;
  refresh: () => Promise<void>;
  loginDemo: (profileId: string) => void;
  logout: () => Promise<void>;
  completeOnboarding: (data: {
    full_name: string;
    role: Profile["role"];
  }) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function subscribeDemo(cb: () => void) {
  window.addEventListener("wxu-demo-updated", cb);
  return () => window.removeEventListener("wxu-demo-updated", cb);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const demo = isDemoMode();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useSyncExternalStore(
    demo ? subscribeDemo : () => () => {},
    () => 0,
    () => 0,
  );

  const refresh = useCallback(async () => {
    if (demo) {
      setProfile(getDemoSession());
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
    setLoading(false);
  }, [demo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginDemo = (profileId: string) => {
    setDemoSession(profileId);
    setProfile(loadDemoDB().profiles.find((p) => p.id === profileId) ?? null);
  };

  const logout = async () => {
    if (demo) {
      clearDemoSession();
      setProfile(null);
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
  };

  const completeOnboarding = async (data: {
    full_name: string;
    role: Profile["role"];
  }) => {
    if (demo && profile) {
      updateProfile(profile.id, data);
      setProfile({ ...profile, ...data });
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: updated } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", user.id)
      .select("*")
      .single();
    setProfile(updated as Profile);
  };

  return (
    <SessionContext.Provider
      value={{
        profile,
        loading,
        isDemo: demo,
        isT0: profile?.role === "T0",
        refresh,
        loginDemo,
        logout,
        completeOnboarding,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
