/**
 * CLI command to create a PLATFORM_ADMIN user or promote an existing user.
 * Standalone NestJS application executed from dist/ after build.
 *
 * Usage:
 *   pnpm admin:create <email> [password] [name]
 *   ADMIN_PASSWORD=secret ADMIN_NAME="Mario Rossi" pnpm admin:create <email>
 *   ADMIN_PASSWORD=secret pnpm admin:create <email> [name]
 *   pnpm admin:create <email>   (prompts for password interactively)
 */

import { fileURLToPath } from 'node:url';
import process, { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { PasswordService } from '../auth/services/password.service.js';
import { UserRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

export async function claimOrphanTenants(
  prisma: PrismaService,
  user: { id: string; email: string },
): Promise<number> {
  const orphanTenants = await prisma.tenant.findMany({
    where: { members: { none: {} } },
    select: { id: true, name: true },
  });

  if (orphanTenants.length === 0) {
    return 0;
  }

  for (const tenant of orphanTenants) {
    await prisma.tenantMember.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: UserRole.TENANT_ADMIN,
      },
    });
  }

  console.log(
    `Assegnate ${orphanTenants.length} partite IVA esistenti senza membri all'amministratore ${user.email}.`,
  );
  return orphanTenants.length;
}

export async function promote(
  prisma: PrismaService,
  passwordService: PasswordService,
  existing: { id: string; email: string },
  password?: string,
  name?: string,
): Promise<{ id: string; email: string }> {
  let effectivePassword = password;
  if (!effectivePassword && input.isTTY) {
    const rl = readline.createInterface({ input, output });
    const inputPwd = await rl.question(
      "L'utente esiste già. Inserisci una nuova password o premi INVIO per mantenere quella attuale: ",
    );
    rl.close();
    if (inputPwd.length > 0) {
      effectivePassword = inputPwd;
    }
  }

  const data: { role: UserRole; passwordHash?: string; name?: string } = {
    role: UserRole.PLATFORM_ADMIN,
  };

  if (effectivePassword) {
    if (effectivePassword.length < 8) {
      throw new Error('La nuova password deve contenere almeno 8 caratteri.');
    }
    data.passwordHash = await passwordService.hash(effectivePassword);
  }

  if (name) {
    data.name = name;
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data,
  });
  console.log(`Utente ${updated.email} (${updated.id}) promosso a PLATFORM_ADMIN con successo.`);

  await claimOrphanTenants(prisma, updated);
  return updated;
}

export async function create(
  prisma: PrismaService,
  passwordService: PasswordService,
  email: string,
  password?: string,
  name?: string,
): Promise<{ id: string; email: string }> {
  let effectivePassword = password;
  if (!effectivePassword && input.isTTY) {
    const rl = readline.createInterface({ input, output });
    effectivePassword = await rl.question("Inserisci la password per il nuovo amministratore: ");
    rl.close();
  }

  if (!effectivePassword || effectivePassword.length < 8) {
    throw new Error('Per creare un nuovo utente amministratore è richiesta una password di almeno 8 caratteri.');
  }

  const passwordHash = await passwordService.hash(effectivePassword);
  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name ?? null,
      role: UserRole.PLATFORM_ADMIN,
    },
  });
  console.log(`Nuovo amministratore ${created.email} (${created.id}) creato con successo.`);

  await claimOrphanTenants(prisma, created);
  return created;
}

export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const email = args[0]?.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    console.error('Uso: pnpm admin:create <email> [password] [nome]');
    console.error("     Oppure imposta ADMIN_PASSWORD e ADMIN_NAME nell'ambiente.");
    process.exit(1);
  }

  // If ADMIN_PASSWORD is in environment, args[1] is name; otherwise args[1] is password and args[2] is name.
  // Note: Password is kept as-is without trim(), matching registration behavior.
  const password = process.env.ADMIN_PASSWORD ?? args[1];
  const name = process.env.ADMIN_NAME?.trim() || (process.env.ADMIN_PASSWORD ? args[1]?.trim() : args[2]?.trim());

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const passwordService = app.get(PasswordService);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await promote(prisma, passwordService, existing, password, name);
      return;
    }

    await create(prisma, passwordService, email, password, name);
  } finally {
    await app.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err: unknown) => {
    console.error("Errore durante la creazione dell'amministratore:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
