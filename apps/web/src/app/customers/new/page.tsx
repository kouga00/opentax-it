import { Card, CardContent } from '@/components/ui/card';
import { CustomerForm } from '../customer-form';

export default function NewCustomerPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Nuovo cliente</h1>
      <Card>
        <CardContent><CustomerForm /></CardContent>
      </Card>
    </main>
  );
}
