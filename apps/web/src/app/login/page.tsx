import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const user = await currentUser();
  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center text-4xl mb-2" aria-hidden="true">
            🧾
          </div>
          <CardTitle className="text-2xl">Accedi a OpenTax IT</CardTitle>
          <CardDescription>
            Inserisci le tue credenziali per accedere al tuo gestionale forfettario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
