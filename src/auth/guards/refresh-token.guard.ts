import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    const refreshToken = authHeader?.split(' ')[1];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // Attach the token to the request for the controller to use
    request.refreshToken = refreshToken;

    return true;
  }
}
