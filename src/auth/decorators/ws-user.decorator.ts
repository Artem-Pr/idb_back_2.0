import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedWebSocket } from '../guards/ws-jwt-auth.guard';

export const WsUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const client = ctx.switchToWs().getClient<AuthenticatedWebSocket>();
    return client.user;
  },
);
