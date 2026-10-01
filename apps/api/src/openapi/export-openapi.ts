import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { buildOpenApiDocument } from './openapi-document.js';

/**
 * Writes the OpenAPI document to the file given as argument, for the documentation site. The app is created in preview
 * mode, which builds the module graph without instantiating providers: no database connection, no scheduled jobs.
 */
const target = process.argv[2];
if (!target) throw new Error('Usage: pnpm run openapi <output.json>');

const app = await NestFactory.create(AppModule, { preview: true, logger: ['error'] });
app.setGlobalPrefix('api');
const version = process.env.npm_package_version ?? '0.0.0';
writeFileSync(resolve(target), `${JSON.stringify(buildOpenApiDocument(app, version), null, 2)}\n`);
await app.close();
