'use client';

import { useActionState } from 'react';
import { createUser, updateUser } from '@/lib/actions';
import type { UserAccount } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';
import { Help } from '@/components/help';
import { NativeSelect } from '@/components/native-select';
import { ACCOUNT_ROLE_LABEL, PASSWORD_LIMITS } from './labels';

/** New user (email and password required) or changes to an existing one (empty password = unchanged). */
export function UserForm({ account, self }: { account?: UserAccount; self?: boolean }) {
  const [state, action, pending] = useActionState(account ? updateUser : createUser, undefined);
  const u = account;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <ErrorAlert message={state?.error} />
      {u && <input type="hidden" name="id" value={u.id} />}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required={!u} disabled={Boolean(u)} defaultValue={u?.email ?? ''} autoComplete="off" />
      </Field>
      <Field label="Nome" htmlFor="name"><Input id="name" name="name" defaultValue={u?.name ?? ''} placeholder="Studio Rossi" /></Field>
      <Field label={u ? 'Nuova password (vuota: invariata)' : 'Password'} htmlFor="password" help={<Help topic="userPassword" params={PASSWORD_LIMITS} />}>
        <Input id="password" name="password" type="password" required={!u} minLength={PASSWORD_LIMITS.min} maxLength={PASSWORD_LIMITS.max} autoComplete="new-password" />
      </Field>
      <Field label="Ruolo" htmlFor="role" help={<Help topic="userRole" />}>
        {/* The admin cannot demote itself: the API refuses it too. */}
        <NativeSelect id="role" name="role" defaultValue={u?.role ?? 'TENANT_USER'} disabled={self}>
          {Object.entries(ACCOUNT_ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </NativeSelect>
        {self && <input type="hidden" name="role" value={u?.role} />}
      </Field>
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? 'Salvataggio…' : u ? 'Salva modifiche' : 'Crea utente'}</Button></div>
    </form>
  );
}
