import type { ReactNode } from 'react';
import Link from 'next/link';
import { api, currentUser, fetchOrNull } from '@/lib/api';
import { AppSidebar } from '@/components/app-sidebar';
import { Clock } from '@/components/clock';
import { LogoutButton } from '@/components/logout-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await currentUser();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-2xl" aria-hidden="true">🧾</span>
            <span>OpenTax IT</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/rules" className="text-sm text-muted-foreground hover:text-foreground">
              Regole fiscali
            </Link>
            <Link href="/sources" className="text-sm text-muted-foreground hover:text-foreground">
              Fonti
            </Link>
            <Button size="sm" render={<Link href="/login" />}>
              Accedi
            </Button>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t px-6 py-4 text-xs text-muted-foreground text-center">
          OpenTax IT è uno strumento di supporto, non consulenza fiscale. Nessuna garanzia sulla correttezza di dati e calcoli: la responsabilità del loro uso è esclusivamente dell&apos;utilizzatore (AGPL-3.0 sez. 15-16).
        </footer>
      </div>
    );
  }

  const tenants = (await fetchOrNull(() => api.tenants())) ?? [];
  const tenant = tenants.find((t) => t.id === user.activeTenantId) ?? null;

  return (
    <SidebarProvider>
      <AppSidebar tenantName={tenant?.name ?? null} userEmail={user.email} />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4 print:hidden">
          <SidebarTrigger />
          <Separator orientation="vertical" className="data-vertical:h-4 data-vertical:self-center" />
          <span className="text-sm font-medium">{tenant ? tenant.name : 'Nessuna partita IVA selezionata'}</span>
          {user.role === 'PLATFORM_ADMIN' && (
            <Badge variant="secondary" className="text-[10px] uppercase">
              Admin
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden md:inline">
              {user.email}
            </span>
            <LogoutButton />
            <Separator orientation="vertical" className="data-vertical:h-4 data-vertical:self-center" />
            <Clock />
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t px-6 py-3 text-xs text-muted-foreground print:hidden">
          OpenTax IT è uno strumento di supporto, non consulenza fiscale. Nessuna garanzia sulla correttezza di dati e calcoli: la responsabilità del loro uso è esclusivamente dell&apos;utilizzatore (AGPL-3.0 sez. 15-16).
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
