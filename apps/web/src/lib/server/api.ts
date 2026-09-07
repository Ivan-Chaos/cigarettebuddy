import { env } from '$env/dynamic/private';

/**
 * Server-side calls go straight to the API service. In the browser, requests
 * hit /api on the same origin (proxied by Vite in dev, by your reverse proxy
 * in production), so no base URL is needed there.
 */
const baseUrl = () => env.API_URL ?? 'http://127.0.0.1:3000';

export interface ApiFetchOptions extends RequestInit {
  /** Pass the `fetch` from a SvelteKit load/action so cookies are forwarded. */
  fetch?: typeof globalThis.fetch;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { fetch: fetchImpl = globalThis.fetch, headers, ...init } = options;

  const response = await fetchImpl(`${baseUrl()}/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...headers },
  });

  if (!response.ok) {
    const message = await response
      .json()
      .then((body: unknown) => extractMessage(body))
      .catch(() => response.statusText);

    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

function extractMessage(body: unknown): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'object' &&
    body.error !== null &&
    'message' in body.error &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message;
  }

  return 'Request failed';
}
