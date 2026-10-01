import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import helmet from 'helmet';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { hostAllowlist } from './common/host-allowlist.js';
import { jsonOnly } from './common/json-only.js';
import { parseTrustProxy } from './common/trust-proxy.js';
import { validationPipe } from './common/validation.pipe.js';
import { buildOpenApiDocument } from './openapi/openapi-document.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));
  app.use(hostAllowlist());
  app.use(helmet());
  app.use(jsonOnly());
  // Large bodies only where XML files are uploaded; a request already parsed is skipped by the next parser.
  app.use('/api/imports', json({ limit: '50mb' }));
  app.use(json({ limit: '1mb' }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(validationPipe);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3001' });
  // Interactive API reference (Swagger UI) at /api/docs, the same document the documentation site publishes; off in
  // production, where it would expose the API surface (OWASP API8:2023, Security Misconfiguration).
  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api/docs', app, buildOpenApiDocument(app, process.env.npm_package_version ?? '0.0.0'));
  }
  // Localhost only by default: there is no authentication yet (see TODO.md).
  await app.listen(process.env.API_PORT ?? 3000, process.env.API_HOST ?? '127.0.0.1');
}
await bootstrap();
