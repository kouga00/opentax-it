import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/**
 * The OpenAPI document of the API, built by @nestjs/swagger from the controllers and the decorated DTOs
 * (docs.nestjs.com, "OpenAPI"). The app must have the global prefix already set, so that the paths carry /api.
 */
export function buildOpenApiDocument(app: INestApplication, version: string): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('OpenTax IT API')
    .setDescription('API REST del gestionale per partite IVA in regime forfettario. Ascolta solo su 127.0.0.1. Ogni richiesta, tranne quelle pubbliche (stato, regole fiscali, fonti, cambi, sedi INPS, casse), vuole il token di sessione di /auth/login o /auth/register nell\'header `Authorization: Bearer`; la partita IVA attiva è quella scelta con /auth/select-tenant.')
    .setVersion(version)
    // The session token of /auth/login (common/auth.guard.ts); the active tenant comes from the session.
    .addBearerAuth({ type: 'http', scheme: 'bearer', description: 'Token di sessione' }, 'session')
    .addSecurityRequirements('session')
    .build();
  return SwaggerModule.createDocument(app, config);
}
