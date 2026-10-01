import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ErrorAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <AlertTitle>Errore</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
