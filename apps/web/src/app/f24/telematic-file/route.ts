import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

/** Proxies the File Internet file of a payment date; on an API refusal goes back to the F24 page with its message. */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const date = params.get('date') ?? '';
  const year = params.get('year') ?? '';
  let file: { fileName: string; content: ArrayBuffer };
  try {
    file = await api.f24TelematicFile(date);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status >= 500) throw e;
    if (e.status === 401) redirect('/session-expired');
    redirect(`/f24?year=${encodeURIComponent(year)}&error=${encodeURIComponent(e.message)}`);
  }
  return new Response(file.content, {
    headers: { 'content-type': 'text/plain; charset=us-ascii', 'content-disposition': `attachment; filename="${file.fileName}"` },
  });
}
