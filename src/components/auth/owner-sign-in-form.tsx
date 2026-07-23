"use client";

import { useState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";

export function OwnerSignInForm({
  label,
  loadingLabel,
  nextPath,
}: {
  label: string;
  loadingLabel: string;
  nextPath: string;
}) {
  const [pending, setPending] = useState(false);

  function startSignIn() {
    if (pending) return;
    setPending(true);
    const parameters = new URLSearchParams({ next: nextPath });
    window.location.assign(`/auth/login?${parameters.toString()}`);
  }

  return (
    <Button
      type="button"
      size="lg"
      variant="outline"
      className="h-13 w-full min-w-48 px-6 text-base"
      disabled={pending}
      aria-busy={pending}
      onClick={startSignIn}
    >
      {pending ? (
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        <LogIn className="size-5" aria-hidden="true" />
      )}
      {pending ? loadingLabel : label}
    </Button>
  );
}
