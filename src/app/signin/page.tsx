import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Wordmark } from "@/components/Wordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { authConfigured } from "@/lib/auth/config";
import { currentUser } from "@/lib/auth/server";
import { safeRedirect } from "@/lib/auth/routes";
import { SignInForm } from "./SignInForm";
import { SignInCopy } from "./SignInCopy";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Kavach with your email address and password.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Somebody already signed in has no business on this page; send them on.
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  if (user) redirect(safeRedirect(params.next));

  return (
    <>
      <header className="sticky top-0 z-40 px-3 sm:px-5 pt-3 sm:pt-4 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-md rounded-card border border-ink/15 bg-paper/85 backdrop-blur-xl shadow-[0_6px_24px_-18px_rgba(26,26,26,0.55)] px-3 sm:px-4 h-[60px] sm:h-[64px] flex items-center gap-4">
          <Wordmark />
          <div className="ms-auto">
            <LanguageSwitcher compact />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-md px-5 sm:px-8 py-12 sm:py-16">
        <SignInCopy />
        <div className="mt-8">
          <Suspense fallback={null}>
            <SignInForm configured={authConfigured()} />
          </Suspense>
        </div>
      </main>
    </>
  );
}
