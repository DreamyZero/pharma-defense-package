import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const roles = Reflect.getMetadata('roles', context.getHandler()) || [];
    if (!roles.length) return true;
    const request = context.switchToHttp().getRequest();
    return roles.includes(request.user?.role);
  }
}
