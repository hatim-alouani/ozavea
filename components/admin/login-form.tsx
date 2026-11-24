"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email or password is incorrect.");
      setLoading(false);
      return;
    }

    const next = searchParams.get("next");
    const destination =
      next && next.startsWith("/admin") && !next.startsWith("/admin/login")
        ? next
        : "/admin";

    router.replace(destination);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <p className="text-xs tracking-[0.35em] uppercase text-[#C5A46D] mb-4">
          OZAVEA
        </p>

        <h1 className="text-3xl text-[#103D31] font-serif">
          Admin Portal
        </h1>

        <p className="text-sm text-gray-500 mt-3">
          Sign in to manage your store
        </p>
      </div>

      <form
        onSubmit={handleLogin}
        className="bg-white border border-[#e9e5dc] rounded-2xl p-8 shadow-sm"
      >
        <div className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm text-[#103D31] mb-2"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ozavea.com"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-[#103D31] transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm text-[#103D31] mb-2"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-[#103D31] transition"
            />
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-7 rounded-lg bg-[#103D31] text-white py-3 font-medium hover:bg-[#174c3d] transition disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-xs text-gray-400 text-center mt-6">
          Authorized personnel only
        </p>
      </form>
    </div>
  );
}