import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const createContext = (user?: { role?: string }): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
    jest.spyOn(reflector, 'getAllAndOverride');
  });

  it('пропускает запрос если роли не заданы', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('пропускает запрос если роль пользователя совпадает', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    expect(guard.canActivate(createContext({ role: 'ADMIN' }))).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, expect.any(Array));
  });

  it('выбрасывает ForbiddenException если роль не совпадает', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    expect(() => guard.canActivate(createContext({ role: 'DOCTOR' }))).toThrow(
      ForbiddenException,
    );
  });

  it('выбрасывает ForbiddenException если пользователь не аутентифицирован', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PHARMACIST']);

    expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
  });
});
