"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock } from "lucide-react";

export default function AdminLoginForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate inputs
      if (!email.trim() || !password) {
        setError("Fyll i e-post och lösenord.");
        setLoading(false);
        return;
      }

      console.log("[Login] Attempting to sign in with:", email.trim());

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        console.error("[Login] Auth error:", authError.message);
        // Show user-friendly error messages
        if (authError.message.includes("Invalid login credentials")) {
          setError("Felaktigt e-post eller lösenord.");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Din e-post måste bekräftas först.");
        } else {
          setError(`Inloggning misslyckades: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      console.log("[Login] ✓ Login successful");
      // Reload so the server component can pick up the new session cookie
      window.location.reload();
    } catch (err) {
      // This catches network errors like "Failed to fetch"
      console.error("[Login] Network/fetch error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Okänt fel vid förbindelse";
      setError(
        "Kunde inte kontakta servern. Kontrollera din internetanslutning och att Supabase URL är korrekt."
      );
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16 px-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-5 h-5 text-purple-600" />
          <h1 className="text-lg font-bold text-gray-900">Admin-inloggning</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Lösenord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Logga in"}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Endast admins kan logga in här. Din e-post måste finnas i ADMIN_EMAILS.
        </p>
      </div>
    </div>
  );
}
