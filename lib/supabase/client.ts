import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Debug: Log environment variables (without exposing the full key)
  if (typeof window !== "undefined") {
    console.log(
      "[Supabase] URL:",
      url ? `${url.substring(0, 20)}...` : "NOT SET"
    );
    console.log(
      "[Supabase] ANON_KEY:",
      key ? `${key.substring(0, 10)}...${key.slice(-5)}` : "NOT SET"
    );
    
    if (!url || url.includes("placeholder") || !url.startsWith("https://")) {
      console.error(
        "[Supabase] ❌ Invalid or placeholder URL. Check your .env.local file."
      );
    }
    if (!key || key === "placeholder") {
      console.error(
        "[Supabase] ❌ Invalid or placeholder ANON_KEY. Check your .env.local file."
      );
    }
  }

  if (!url || !key) {
    throw new Error(
      "Supabase environment variables are not set. Check your .env.local file."
    );
  }

  return createBrowserClient(url, key);
}
