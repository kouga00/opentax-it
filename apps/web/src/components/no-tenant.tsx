import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function NoTenant() {
  return (
    <main className="mx-auto w-full max-w-6xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Nessuna partita IVA selezionata</CardTitle>
          <CardDescription>Seleziona o crea la partita IVA da gestire.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button render={<Link href="/setup" />}>Vai alle impostazioni</Button>
          <Button variant="outline" render={<Link href="/setup/new" />}>Nuova partita IVA</Button>
        </CardContent>
      </Card>
    </main>
  );
}
