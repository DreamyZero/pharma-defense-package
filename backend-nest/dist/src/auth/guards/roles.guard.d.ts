import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare const Roles: (...roles: string[]) => import("@nestjs/common").CustomDecorator<string>;
export declare class RolesGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
