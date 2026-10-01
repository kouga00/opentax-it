import { api, ApiError } from '@/lib/api';

/**
 * Passes the PEC test events of the API through to the browser as they arrive (Server-Sent Events), so that the
 * browser never needs the tenant header. Closing the page aborts the request and the test on the API.
 */
export async function GET(req: Request) {
  try {
    const body = await api.pecTestStream(req.signal);
    return new Response(body, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', 'x-content-type-options': 'nosniff' } });
  } catch (e) {
    return new Response(null, { status: e instanceof ApiError ? e.status : 502 });
  }
}
