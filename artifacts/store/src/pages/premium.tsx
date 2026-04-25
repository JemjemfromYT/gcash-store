import { useEffect, useState } from "react";
import { Link } from "wouter";

export default function Premium() {
  const [owned, setOwned] = useState<boolean | null>(null);

  useEffect(() => {
    setOwned(localStorage.getItem("premium") === "owned");
  }, []);

  if (owned === null) {
    return null;
  }

  if (!owned) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-500">
            🔒
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Locked</h1>
          <p className="mt-2 text-sm text-slate-600">
            Buy the premium item to unlock this content.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            Go to store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to store
          </Link>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            Premium unlocked
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">🔓 Premium Item</h1>
          <p className="mt-3 text-slate-600">
            Welcome! This is the content you unlocked. Replace this page with
            your real premium product — a download link, a course module, an
            invite code, or anything else you want to gate.
          </p>
          <div className="mt-6 rounded-xl bg-slate-900 p-6 font-mono text-sm text-emerald-300">
            ACCESS CODE: PREMIUM-{Math.random().toString(36).slice(2, 10).toUpperCase()}
          </div>
        </div>
      </main>
    </div>
  );
}
