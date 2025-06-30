import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const WS_ROLES_KEY = 'ws_roles';
export const WsRoles = (...roles: Role[]) => SetMetadata(WS_ROLES_KEY, roles);
