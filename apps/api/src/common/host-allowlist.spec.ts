import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { hostAllowlist, hostName } from './host-allowlist.js';

describe('hostName', () => {
  it('strips the port and the IPv6 brackets', () => {
    expect(hostName('localhost:3000')).toBe('localhost');
    expect(hostName('[::1]:3000')).toBe('::1');
    expect(hostName('Example.COM')).toBe('example.com');
    expect(hostName(undefined)).toBe('');
  });
});

describe('hostAllowlist', () => {
  const run = (host: string | undefined) => {
    const next = vi.fn() as NextFunction;
    const json = vi.fn();
    const res = { status: vi.fn().mockReturnValue({ json }) } as unknown as Response;
    hostAllowlist(new Set(['localhost', '127.0.0.1']))({ headers: { host } } as Request, res, next);
    return { next, res };
  };

  it('lets allowed hosts through', () => {
    expect(run('localhost:3000').next).toHaveBeenCalled();
    expect(run('127.0.0.1:3000').next).toHaveBeenCalled();
  });

  it('rejects other hosts with 421 (DNS rebinding)', () => {
    const { next, res } = run('attacker.example:3000');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(421);
  });

  it('rejects a missing Host header', () => {
    expect(run(undefined).next).not.toHaveBeenCalled();
  });
});
