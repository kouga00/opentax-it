import { api } from '@/lib/api';

/** Proxies the archived copy of a source (the browser does not reach the API); `?text=1` for the extracted text. */
export async function GET(req: Request, { params }: RouteContext<'/sources/[id]/file'>) {
  const { id } = await params;
  const { contentType, disposition, content } = await api.sourceFile(id, new URL(req.url).searchParams.has('text'));
  return new Response(content, { headers: { 'content-type': contentType, 'content-disposition': disposition } });
}
