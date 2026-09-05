import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { authConfigured } from "@/lib/auth/config";
import { currentUser } from "@/lib/auth/server";
import { safeRedirect } from "@/lib/auth/routes";
import { SignInForm } from "./SignInForm";
import { SignInCopy } from "./SignInCopy";
import { SiteHeader } from "@/components/SiteHeader";

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
      <SiteHeader width="md" />

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
