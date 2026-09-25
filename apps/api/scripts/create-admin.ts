/**
 * CLI command to create a PLATFORM_ADMIN user or promote an existing user.
 *
 * Usage:
 *   node scripts/create-admin.ts <email> [password] [name]
 *   ADMIN_PASSWORD=secret pnpm admin:create <email> [name]
 *   pnpm admin:create <email>   (prompts for password interactively)
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { UserRole } from '../src/generated/prisma/enums.js';
import { PasswordService } from '../src/auth/password.service.js';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: [resolve(here, '../.env'), resolve(here, '../../../.env')], quiet: true });

async function main() {
  const args = process.argv.slice(2);
  const email = args[0]?.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    console.error('Uso: node scripts/create-admin.ts <email> [password] [nome]');
    console.error('     Oppure imposta ADMIN_PASSWORD nell\'ambiente per evitare password nella cronologia della shell.');
    process.exit(1);
  }

  let password = args[1]?.trim() || process.env.ADMIN_PASSWORD?.trim();
  const name = args[2]?.trim() || process.env.ADMIN_NAME?.trim();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL non impostata (vedi .env.example)');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const passwordService = new PasswordService();

  try {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (!password && input.isTTY) {
        const rl = readline.createInterface({ input, output });
        const inputPwd = (await rl.question('L\'utente esiste già. Inserisci una nuova password o premi INVIO per mantenere quella attuale: ')).trim();
        rl.close();
        if (inputPwd.length > 0) {
          password = inputPwd;
        }
      }

      const data: { role: UserRole; passwordHash?: string; name?: string } = {
        role: UserRole.PLATFORM_ADMIN,
      };
      if (password) {
        if (password.length < 8) {
          console.error('La nuova password deve contenere almeno 8 caratteri.');
          process.exit(1);
        }
        data.passwordHash = await passwordService.hash(password);
      }
      if (name) {
        data.name = name;
      }
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data,
      });
      console.log(`Utente ${updated.email} (${updated.id}) promosso a PLATFORM_ADMIN con successo.`);
    } else {
      if (!password && input.isTTY) {
        const rl = readline.createInterface({ input, output });
        password = (await rl.question('Inserisci la password per il nuovo amministratore: ')).trim();
        rl.close();
      }

      if (!password || password.length < 8) {
        console.error('Per creare un nuovo utente amministratore è richiesta una password di almeno 8 caratteri.');
        console.error('Puoi passarla come secondo argomento, impostare ADMIN_PASSWORD o inserirla al prompt.');
        process.exit(1);
      }

      const passwordHash = await passwordService.hash(password);
      const created = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: name ?? null,
          role: UserRole.PLATFORM_ADMIN,
        },
      });
      console.log(`Nuovo amministratore ${created.email} (${created.id}) creato con successo.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Errore durante la creazione dell\'amministratore:', err);
  process.exit(1);
});
