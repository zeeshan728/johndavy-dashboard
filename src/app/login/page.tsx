'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Login failed');
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-bg-primary flex items-center justify-center p-6 overflow-hidden">
      <div className="ambient-mesh" />

      {/* Faint watermark wordmark for scale/presence */}
      <span className="pointer-events-none select-none absolute -bottom-10 left-1/2 -translate-x-1/2 font-brush text-[min(30vw,320px)] leading-none text-text-primary/[0.03] whitespace-nowrap">
        John Davy
      </span>

      <motion.form
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm glass-card rounded-3xl shadow-2xl p-8 flex flex-col gap-6"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
            <Lock className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="font-brush text-3xl text-text-primary leading-none">
              John <span className="text-gold">Davy</span>
            </h1>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-text-muted uppercase mt-2">CEO Command Center</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs font-semibold text-text-secondary">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3.5 py-3 bg-bg-card border border-border-color rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 transition-shadow"
            required
          />
        </div>

        {error && <p className="text-xs text-red font-medium">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="group w-full py-3 bg-gold text-white hover:bg-gold/90 transition text-sm font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
          {!submitting && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
        </button>

        <p className="text-center text-[10px] text-text-muted tracking-wide">
          Real-time visibility across the entire ecosystem.
        </p>
      </motion.form>
    </div>
  );
}
