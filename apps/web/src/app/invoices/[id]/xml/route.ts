import { api } from '@/lib/api';

/** Proxies the XML download so the browser never needs the tenant header. */
export async function GET(_req: Request, { params }: RouteContext<'/invoices/[id]/xml'>) {
  const { id } = await params;
  const { fileName, content } = await api.invoiceXml(id);
  return new Response(content, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'content-disposition': `attachment; filename="${fileName}"` },
  });
}
