import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RegisterForm } from './register-form';

export default async function RegisterPage() {
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
          <CardTitle className="text-2xl">Registrati a OpenTax IT</CardTitle>
          <CardDescription>
            Crea il tuo account per gestire la tua partita IVA forfettaria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </main>
  );
}
