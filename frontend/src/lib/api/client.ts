export type ApiErrorBody = {
  code: string;
  message: string;
  details: Record<string, unknown>;
  request_id: string;
};

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: ApiErrorBody };

function apiBaseUrl(): string {
  return process.env.API_URL ?? "http://127.0.0.1:8000";
}

export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  const requestId = crypto.randomUUID();
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      cache: "no-store",
      headers: { "X-Request-ID": requestId },
    });
  } catch {
    return {
      ok: false,
      status: 0,
      error: {
        code: "NETWORK_ERROR",
        message: "Não foi possível contatar a API.",
        details: {},
        request_id: requestId,
      },
    };
  }

  const payload: unknown = await response.json().catch(() => null);
  if (response.ok) {
    return { ok: true, status: response.status, data: payload as T };
  }

  const errorPayload = payload as { error?: ApiErrorBody } | null;
  return {
    ok: false,
    status: response.status,
    error: errorPayload?.error ?? {
      code: "HTTP_ERROR",
      message: "A API retornou um erro.",
      details: {},
      request_id: requestId,
    },
  };
}
