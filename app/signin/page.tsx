"use client";

import { signIn } from "next-auth/react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";

function SignInInner() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";
  const error = params.get("error");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* ambient gradient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, #6366f1 0%, #22c55e 60%, transparent 75%)" }}
      />

      <div className="relative w-full max-w-[420px] rounded-[20px] border border-line bg-panel p-9 text-center shadow-cardhover">
        <div className="mb-5 flex justify-center">
          <Logo size={52} />
        </div>

        <h1 className="m-0 text-[26px] font-extrabold tracking-[-0.02em]">
          Open<span className="text-green">Roles</span>
        </h1>
        <p className="mx-auto mt-2 max-w-[300px] text-[13.5px] leading-relaxed text-muted">
          Live LinkedIn backend &amp; platform roles, scored against your profile. Sign in to get
          started.
        </p>

        {error && (
          <div className="mt-5 rounded-[10px] border border-line bg-red-soft px-3 py-2 text-[12.5px] font-semibold text-red-ink">
            Sign-in failed. Please try again.
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-[12px] border border-line bg-panel-2 px-4 py-[13px] text-[14.5px] font-semibold text-ink shadow-card transition hover:border-brand hover:shadow-cardhover"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-[11.5px] leading-relaxed text-muted">
          By continuing you agree to use this tool for personal job searching. We store only your
          basic profile and saved jobs.
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInInner />
    </Suspense>
  );
}
