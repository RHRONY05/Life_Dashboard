"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { Illustration } from "@/components/illustrations";

function LoginForm() {
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "1";
  const [email, setEmail] = useState("muhammadrony147@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Incorrect password. Try again.");
        setBusy(false);
        return;
      }

      const next = searchParams.get("next") || "/";
      window.location.href = next;
    } catch {
      setError("Connection error. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="login-card w-full max-w-[380px] bg-surface rounded-xl border border-frame shadow-card p-8">
      <div className="flex items-center justify-between mb-4">
        <Logo className="w-11 h-11 rounded-xl" />
        <div className="w-20">
          <Illustration name="login-desk" size="sm" />
        </div>
      </div>

      <h1 className="text-xl font-display font-extrabold tracking-tight text-ink mb-1">
        LIFE DASHBOARD
      </h1>
      <p className="text-sm text-ink-3 mb-6">
        Sign in with your owner account.
      </p>

      {isExpired && (
        <div className="mb-4">
          <Banner variant="info">
            You were signed out. Sign in again to continue.
          </Banner>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <Banner variant="danger">{error}</Banner>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs font-semibold text-ink-2 uppercase tracking-wide"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-line bg-surface-2 text-ink-3 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs font-semibold text-ink-2 uppercase tracking-wide"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full h-10 px-3 rounded-md border border-line-strong bg-surface text-ink text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="block"
          busy={busy}
          className="w-full mt-2"
        >
          Sign in
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="login-wrap min-h-screen flex items-center justify-center p-4 bg-bg">
      <Suspense fallback={<div className="login-card w-full max-w-[380px] h-[360px] bg-surface rounded-xl border border-frame" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
