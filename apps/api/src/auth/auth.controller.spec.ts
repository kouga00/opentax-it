import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authServiceMock: any;

  beforeEach(() => {
    authServiceMock = {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      getMe: vi.fn(),
      selectTenant: vi.fn(),
    };
    controller = new AuthController(authServiceMock as unknown as AuthService);
  });

  it('delegates register to service', async () => {
    const dto = { email: 'test@example.com', password: 'password123', name: 'Test' };
    const req = { ip: '1.2.3.4', header: vi.fn().mockReturnValue('Agent/1.0') } as any;

    await controller.register(dto, req);
    expect(authServiceMock.register).toHaveBeenCalledWith(dto, '1.2.3.4', 'Agent/1.0');
  });

  it('delegates login to service', async () => {
    const dto = { email: 'test@example.com', password: 'password123' };
    const req = { ip: '1.2.3.4', header: vi.fn().mockReturnValue('Agent/1.0') } as any;

    await controller.login(dto, req);
    expect(authServiceMock.login).toHaveBeenCalledWith(dto, '1.2.3.4', 'Agent/1.0');
  });

  it('delegates logout to service when token is present', async () => {
    await controller.logout('some_token');
    expect(authServiceMock.logout).toHaveBeenCalledWith('some_token');
  });

  it('delegates me to service', async () => {
    const user = { id: 'u1' } as any;
    const req = { tenantId: 't1' } as any;
    await controller.me(user, req);
    expect(authServiceMock.getMe).toHaveBeenCalledWith('u1', 't1');
  });

  it('delegates selectTenant to service', async () => {
    const user = { id: 'u1' } as any;
    await controller.selectTenant(user, 'token', { tenantId: 't2' });
    expect(authServiceMock.selectTenant).toHaveBeenCalledWith('u1', 'token', 't2');
  });
});
