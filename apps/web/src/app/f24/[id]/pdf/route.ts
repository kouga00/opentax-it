import { api } from '@/lib/api';

/** Proxies the PDF so the browser never needs the tenant header; `?inline=1` opens it in the browser instead of downloading. */
export async function GET(req: Request, { params }: RouteContext<'/f24/[id]/pdf'>) {
  const { id } = await params;
  const { fileName, content } = await api.f24Pdf(id);
  const disposition = new URL(req.url).searchParams.has('inline') ? 'inline' : 'attachment';
  return new Response(content, {
    headers: { 'content-type': 'application/pdf', 'content-disposition': `${disposition}; filename="${fileName}"` },
  });
}
