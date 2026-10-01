import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// The .env file lives at the monorepo root; the local one is a fallback.
config({ path: ['.env', '../../.env'] });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
