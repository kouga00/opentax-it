import { Card, CardContent } from '@/components/ui/card';

export function AdminOnly() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <Card><CardContent className="text-sm text-muted-foreground">Solo l&apos;amministratore gestisce gli utenti.</CardContent></Card>
    </main>
  );
}
