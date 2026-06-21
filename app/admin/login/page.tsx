"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
      } else {
        router.push("/admin");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gold mb-8 text-center tracking-tight">
          DO:NUTS Admin
        </h1>
        <form
          onSubmit={handleSubmit}
          className="bg-glass border border-border rounded-card p-8 space-y-5"
        >
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm text-ink/60">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-ink placeholder:text-ink/30 focus:outline-none focus:ring-1 focus:ring-gold text-sm"
              placeholder="admin@do-nuts.kr"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm text-ink/60">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-ink placeholder:text-ink/30 focus:outline-none focus:ring-1 focus:ring-gold text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-coral-from" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-pill bg-coral-cta text-ink font-semibold text-sm disabled:opacity-50 transition-opacity"
          >
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
