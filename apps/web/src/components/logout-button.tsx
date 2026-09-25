'use client';

import { LogOut } from 'lucide-react';
import { logoutAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button
        variant="ghost"
        size="sm"
        type="submit"
        title="Esci dall'account"
        className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Esci</span>
      </Button>
    </form>
  );
}
