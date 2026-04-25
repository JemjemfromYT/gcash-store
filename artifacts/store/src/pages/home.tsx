import { useState } from "react";
import { Link } from "wouter";

const PREMIUM_PRICE = 20;
const PREMIUM_NAME = "Premium Item";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owned =
    typeof window !== "undefined" &&
    localStorage.getItem("premium") === "owned";

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: PREMIUM_NAME, amount: PREMIUM_PRICE }),
      });
      const data = (await res.json()) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? "Checkout failed");
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function reset() {
    localStorage.removeItem("premium");
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight">My Store</h1>
          <span className="text-xs text-slate-500">
            Powered by PayMongo · GCash
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-600">
              Featured
            </span>
            <h2 className="text-2xl font-semibold">{PREMIUM_NAME}</h2>
            <p className="text-slate-600">
              Unlock the premium content instantly after payment. Pay securely
              via GCash, card, or Maya.
            </p>
          </div>

          <div className="mt-6 flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold">₱{PREMIUM_PRICE}</div>
              <div className="text-xs text-slate-500">One-time purchase</div>
            </div>
            {owned ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                Owned
              </span>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {owned ? (
              <Link
                href="/premium"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Open premium content
              </Link>
            ) : (
              <button
                onClick={buy}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? "Redirecting to GCash..." : `Buy for ₱${PREMIUM_PRICE}`}
              </button>
            )}
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            {owned ? (
              <button
                onClick={reset}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Reset purchase (testing only)
              </button>
            ) : null}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          <h3 className="mb-2 font-semibold text-slate-900">How it works</h3>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Click Buy — we create a secure PayMongo checkout session.</li>
            <li>Pay with GCash, card, or Maya on PayMongo's hosted page.</li>
            <li>You get redirected back here and the premium content unlocks.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
