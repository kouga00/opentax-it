import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/api';

export default async function HomePage() {
  const user = await currentUser();
  if (user) {
    redirect('/dashboard');
  }
  redirect('/login');
}
