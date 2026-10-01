import { describe, expect, it } from 'vitest';
import { parseTrustProxy } from './trust-proxy.js';

describe('parseTrustProxy', () => {
  it('defaults to loopback when undefined or empty', () => {
    expect(parseTrustProxy(undefined)).toBe('loopback');
    expect(parseTrustProxy('')).toBe('loopback');
    expect(parseTrustProxy('   ')).toBe('loopback');
  });

  it('parses boolean strings', () => {
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('TRUE')).toBe(true);
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('FALSE')).toBe(false);
  });

  it('parses numeric hop counts', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('2')).toBe(2);
    expect(parseTrustProxy('  3  ')).toBe(3);
  });

  it('passes through IP addresses, subnets and predefined names', () => {
    expect(parseTrustProxy('loopback')).toBe('loopback');
    expect(parseTrustProxy('127.0.0.1')).toBe('127.0.0.1');
    expect(parseTrustProxy('10.0.0.0/8, 192.168.0.0/16')).toBe('10.0.0.0/8, 192.168.0.0/16');
  });
});
