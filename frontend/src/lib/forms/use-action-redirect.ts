"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { isActionRedirect, type ActionState } from "@/lib/forms/action-state";

export function useActionRedirect(state: ActionState) {
  const router = useRouter();

  useEffect(() => {
    if (isActionRedirect(state)) {
      router.push(state.redirectTo);
    }
  }, [state, router]);
}
