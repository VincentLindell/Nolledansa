"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { LogIn, LogOut, Loader2 } from "lucide-react";

export default function AuthButton() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = async () => {
    setAuthLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  const signOut = async () => {
    setAuthLoading(true);
    await supabase.auth.signOut();
    setAuthLoading(false);
  };

  if (loading) return <div className="w-8 h-8" />;

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600 hidden sm:block">{user.email}</span>
        <button
          onClick={signOut}
          disabled={authLoading}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
        >
          {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          <span className="hidden sm:block">Logga ut</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signIn}
      disabled={authLoading}
      className="flex items-center gap-1 text-sm text-gray-600 hover:text-purple-600 transition-colors"
    >
      {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
      <span className="hidden sm:block">Logga in</span>
    </button>
  );
}
