import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { jsonOnly } from './json-only.js';

const run = (method: string, contentType?: string) => {
  const next = vi.fn() as NextFunction;
  const status = vi.fn().mockReturnValue({ json: vi.fn() });
  const res = { status } as unknown as Response;
  const req = { method, headers: contentType ? { 'content-type': contentType } : {} } as unknown as Request;
  jsonOnly()(req, res, next);
  return { next, status };
};

describe('jsonOnly', () => {
  it('lets safe methods through without a content type', () => {
    expect(run('GET').next).toHaveBeenCalled();
  });

  it('lets JSON requests through', () => {
    expect(run('POST', 'application/json').next).toHaveBeenCalled();
    expect(run('DELETE', 'application/json').next).toHaveBeenCalled(); // no body
    expect(run('POST', 'Application/JSON; charset=utf-8').next).toHaveBeenCalled();
  });

  it('rejects a cross-site form POST or a request without content type with 415', () => {
    for (const ct of ['application/x-www-form-urlencoded', 'text/plain', undefined]) {
      const { next, status } = run('POST', ct);
      expect(next).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(415);
    }
  });
});
