'use client';

import { useActionState } from 'react';
import { saveUserMemberships } from '@/lib/actions';
import type { Tenant, UserAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/error-alert';
import { NativeSelect } from '@/components/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ACCESS_LABEL } from './labels';

/** One row per VAT number: no access, read-only or read and write. */
export function MembershipsForm({ account, tenants }: { account: UserAccount; tenants: Tenant[] }) {
  const [state, action, pending] = useActionState(saveUserMemberships, undefined);
  const current = new Map(account.memberships.map((m) => [m.tenantId, m.role]));
  return (
    <form action={action} className="space-y-4">
      <ErrorAlert message={state?.error} />
      <input type="hidden" name="id" value={account.id} />
      <Table>
        <TableHeader><TableRow><TableHead>Partita IVA</TableHead><TableHead className="w-56">Accesso</TableHead></TableRow></TableHeader>
        <TableBody>
          {tenants.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.name}</TableCell>
              <TableCell>
                <NativeSelect name={`access:${t.id}`} defaultValue={current.get(t.id) ?? ''} aria-label={`Accesso a ${t.name}`}>
                  <option value="">Nessun accesso</option>
                  {Object.entries(ACCESS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </TableCell>
            </TableRow>
          ))}
          {tenants.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">Nessuna partita IVA.</TableCell></TableRow>}
        </TableBody>
      </Table>
      <Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : 'Salva accessi'}</Button>
    </form>
  );
}
