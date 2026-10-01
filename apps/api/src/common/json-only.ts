import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection: state-changing requests must declare `Content-Type: application/json`.
 * A page on another site can send a cross-site POST without a preflight only with a "simple"
 * content type (form, text); a JSON request needs a CORS preflight, which the API grants only
 * to WEB_ORIGIN.
 */
export function jsonOnly() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Read the header directly: req.is() returns null for requests without a body (DELETE, activate).
    const mediaType = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    if (SAFE_METHODS.has(req.method) || mediaType === 'application/json') return next();
    res.status(415).json({ statusCode: 415, message: 'State-changing requests must be application/json' });
  };
}
