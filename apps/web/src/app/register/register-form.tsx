'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <ErrorAlert message={state?.error} />

      <Field label="Nome e cognome" htmlFor="name" hint="Opzionale">
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Mario Rossi"
        />
      </Field>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="nome@esempio.it"
        />
      </Field>

      <Field label="Password" htmlFor="password" hint="Almeno 8 caratteri">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>

      <Field label="Conferma password" htmlFor="confirmPassword">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Registrazione in corso...' : 'Crea account'}
      </Button>

      <div className="text-center text-sm text-muted-foreground pt-2">
        Hai già un account?{' '}
        <Link href="/login" className="underline text-primary hover:text-primary/80">
          Accedi
        </Link>
      </div>
    </form>
  );
}
