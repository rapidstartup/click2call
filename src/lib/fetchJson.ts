import { supabase } from './supabase';

/**
 * Thrown by fetchJson / authenticatedFetchJson whenever a request to the API
 * does not come back as a usable JSON response — a non-2xx status, or a
 * response body that isn't JSON at all (e.g. the SPA's index.html, which is
 * what you get from `/api/*` when `npm run dev` is used without a functions
 * server or proxy in front of it — see README "Local development" section).
 */
export class ApiError extends Error {
  /** HTTP status code, or 0 if the request never reached a server (network error). */
  status: number;
  /** A short excerpt of the raw response body, for logs/debugging. */
  bodyExcerpt: string;

  constructor(message: string, status: number, bodyExcerpt: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.bodyExcerpt = bodyExcerpt;
  }
}

const UNREACHABLE_MESSAGE = "Couldn't reach the API — is the backend running?";
const EXCERPT_LENGTH = 200;

function excerptOf(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  return trimmed.length > EXCERPT_LENGTH ? `${trimmed.slice(0, EXCERPT_LENGTH)}…` : trimmed;
}

function messageFromJsonError(parsed: unknown, fallback: string): string {
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const error = (parsed as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return fallback;
}

/**
 * fetch() + JSON parsing with graceful, typed error handling.
 *
 * Every call site that expects a JSON API response should go through this
 * helper instead of calling `response.json()` directly. It guards against
 * the two ways that goes wrong in this app:
 *  - The request never reaches a server at all (dev server down, DNS, CORS).
 *  - The server responds with something that isn't JSON — most commonly
 *    Vite's SPA fallback returning `index.html` for an unproxied `/api/*`
 *    request in plain `npm run dev` (see README). Calling `.json()` on that
 *    throws a cryptic "Unexpected token '<' ... is not valid JSON".
 *
 * On success it resolves with the parsed JSON body. On failure it throws an
 * `ApiError` with a short, human-readable message plus the status code and a
 * body excerpt for debugging.
 */
export async function fetchJson<T = unknown>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (networkError) {
    throw new ApiError(
      UNREACHABLE_MESSAGE,
      0,
      networkError instanceof Error ? networkError.message : String(networkError),
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const looksLikeJson = contentType.toLowerCase().includes('application/json');

  if (!response.ok || !looksLikeJson) {
    const rawBody = await response.text().catch(() => '');
    const excerpt = excerptOf(rawBody);

    if (!looksLikeJson) {
      // Non-JSON body (typically HTML) — almost always means the request
      // never reached a real API handler.
      throw new ApiError(UNREACHABLE_MESSAGE, response.status, excerpt);
    }

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      // Claimed to be JSON but wasn't parseable — treat like unreachable.
      throw new ApiError(UNREACHABLE_MESSAGE, response.status, excerpt);
    }

    const fallback = `Request failed (${response.status})`;
    throw new ApiError(messageFromJsonError(parsed, fallback), response.status, excerpt);
  }

  return response.json() as Promise<T>;
}

/**
 * fetchJson, but with the Supabase session bearer token attached — the
 * shared replacement for the several copies of a local `authenticatedFetch`
 * that used to live in individual components/pages.
 */
export async function authenticatedFetchJson<T = unknown>(input: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new ApiError('Sign in required', 401, '');

  return fetchJson<T>(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers,
    },
  });
}

/** True for errors that mean "couldn't even talk to the API" (network/proxy/non-JSON). */
export function isUnreachableError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.message === UNREACHABLE_MESSAGE);
}
