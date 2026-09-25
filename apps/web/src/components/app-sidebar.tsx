'use client';

import { BadgePercent, CalendarClock, CalendarDays, Calculator, FileText, Landmark, LayoutDashboard, Library, Receipt, Scale, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/invoices', label: 'Fatture', icon: FileText },
  { href: '/customers', label: 'Clienti', icon: Users },
  { href: '/deadlines', label: 'Scadenzario', icon: CalendarDays },
  { href: '/taxes', label: 'Imposte', icon: Calculator },
  { href: '/f24', label: 'F24 e rate', icon: Receipt },
  { href: '/credits', label: 'Crediti', icon: BadgePercent },
];

const CONFIG_NAV = [
  { href: '/banks', label: 'Banche', icon: Landmark },
  { href: '/payment-terms', label: 'Profili di scadenza', icon: CalendarClock },
];

const GROUPS = [
  { label: 'Gestione', items: NAV },
  { label: 'Configurazione', items: CONFIG_NAV },
  { label: 'Normativa', items: [{ href: '/rules', label: 'Regole fiscali', icon: Scale }, { href: '/sources', label: 'Fonti ufficiali', icon: Library }] },
];

export function AppSidebar({
  tenantName,
  userEmail,
}: {
  tenantName: string | null;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex size-8 items-center justify-center text-2xl" aria-hidden="true">🧾</div>
              <div className="flex flex-col leading-tight">
                <span className="font-semibold">OpenTax IT</span>
                <span className="text-xs text-muted-foreground">{tenantName ?? 'Nessuna partita IVA'}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)} tooltip={item.label} render={<Link href={item.href} />}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={pathname === '/setup'} tooltip="Impostazioni" render={<Link href="/setup" />}>
              <Settings />
              <span>Partita IVA</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
