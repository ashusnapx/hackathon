import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { authConfigured } from "@/lib/auth/config";
import { currentUser } from "@/lib/auth/server";
import { safeRedirect } from "@/lib/auth/routes";
import { SignInArt } from "./SignInArt";
import { SignInFoot } from "./SignInFoot";
import { SignInForm } from "./SignInForm";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Kavach, or create an account, with your email address and a password.",
};

/**
 * Two halves above `lg`: what this is for on the left, what to do about it on
 * the right. Below `lg` the illustration is dropped rather than stacked, so the
 * email field stays where a thumb already is.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Somebody already signed in has no business on this page; send them on.
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  if (user) redirect(safeRedirect(params.next));

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-2">
      <SignInArt />
      <div className="flex min-h-dvh flex-col">
        <SiteHeader width="md" />
        <main
          id="main"
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 sm:px-8 py-10 sm:py-14"
        >
          <Suspense fallback={null}>
            <SignInForm configured={authConfigured()} />
          </Suspense>
          <SignInFoot />
        </main>
      </div>
    </div>
  );
}
