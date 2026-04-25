import { Link } from "wouter";

export default function Cancel() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700">
          !
        </div>
        <h1 className="text-xl font-semibold text-slate-900">
          Payment cancelled
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          No worries — you weren't charged. You can try again anytime.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
        >
          Back to store
        </Link>
      </div>
    </div>
  );
}
