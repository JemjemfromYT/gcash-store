import { useEffect, useState } from "react";
import { Link } from "wouter";

export default function Success() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "true") {
      localStorage.setItem("premium", "owned");
      setUnlocked(true);
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h1 className="text-xl font-semibold text-slate-900">
          {unlocked ? "Payment successful" : "Thank you"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {unlocked
            ? "Your premium content has been unlocked on this device."
            : "We could not confirm the payment status. Please contact support if you were charged."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/premium"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Open premium content
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Back to store
          </Link>
        </div>
      </div>
    </div>
  );
}
