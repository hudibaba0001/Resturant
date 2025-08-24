'use client';

import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function AuthSync() {
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      try {
        await fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event, session }),
        });
      } catch { /* ignore */ }
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}
