'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/field';
import { ErrorAlert } from '@/components/error-alert';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="space-y-4">
      <ErrorAlert message={state?.error} />

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="nome@esempio.it"
        />
      </Field>

      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Accesso in corso...' : 'Accedi'}
      </Button>

      <div className="text-center text-sm text-muted-foreground pt-2">
        Non hai ancora un account?{' '}
        <Link href="/register" className="underline text-primary hover:text-primary/80">
          Registrati
        </Link>
      </div>
    </form>
  );
}
