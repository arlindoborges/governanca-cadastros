import type { ApiResult } from "@/lib/api/client";

export type ActionRedirectState = {
  ok: true;
  redirectTo: string;
};

export type ActionState = ApiResult<unknown> | ActionRedirectState | null;

export function isActionRedirect(state: ActionState): state is ActionRedirectState {
  return state !== null && state.ok === true && "redirectTo" in state;
}

export function isActionError(
  state: ActionState,
): state is Extract<ApiResult<unknown>, { ok: false }> {
  return state !== null && "ok" in state && state.ok === false;
}
