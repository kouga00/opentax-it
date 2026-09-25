import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { hostAllowlist } from './common/host-allowlist.js';
import { jsonOnly } from './common/json-only.js';
import { validationPipe } from './common/validation.pipe.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.set('trust proxy', process.env.TRUST_PROXY ?? 'loopback');
  app.use(hostAllowlist());
  app.use(helmet());
  app.use(jsonOnly());
  // Large bodies only where XML files are uploaded; a request already parsed is skipped by the next parser.
  app.use('/api/invoices/import', json({ limit: '50mb' }));
  app.use(json({ limit: '1mb' }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(validationPipe);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3001' });
  // Localhost only by default: there is no authentication yet (see TODO.md).
  await app.listen(process.env.API_PORT ?? 3000, process.env.API_HOST ?? '127.0.0.1');
}
await bootstrap();
