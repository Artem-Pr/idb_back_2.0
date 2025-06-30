import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { User } from '../entities/user.entity';
import { AuthService } from '../auth.service';
import { ConfigService } from 'src/config/config.service';
import { JwtPayload } from '../strategies/jwt.strategy';
import * as WebSocket from 'ws';
import * as url from 'url';

export interface AuthenticatedWebSocket extends WebSocket {
  user?: {
    userId: string;
    username: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient<AuthenticatedWebSocket>();
      const token = this.extractTokenFromClient(client);

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Check if token is blacklisted
      if (await this.authService.isTokenBlacklisted(token)) {
        throw new UnauthorizedException('Token has been revoked');
      }

      // Verify and decode the token
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.jwtSecret,
      });

      // Find the user
      const user = await this.userRepository.findOne({
        where: { _id: new ObjectId(payload.sub) },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Attach user info to the WebSocket client
      client.user = {
        userId: payload.sub,
        username: user.username,
        email: user.email,
        role: user.role,
      };

      return true;
    } catch (error) {
      return false;
    }
  }

  private extractTokenFromClient(
    client: AuthenticatedWebSocket,
  ): string | null {
    // Get the request object (different WebSocket libraries use different properties)
    const request =
      (client as any).upgradeReq ||
      (client as any).request ||
      (client as any)._socket?.upgradeReq;

    console.log('🔍 WebSocket Token Extraction Debug:');
    console.log('  Request object exists:', !!request);
    console.log('  Request URL:', request?.url);
    console.log('  Request headers:', request?.headers);

    // Method 1: Extract token from query parameters
    if (request && request.url) {
      const query = url.parse(request.url, true).query;
      console.log('  Query parameters:', query);
      if (query.token && typeof query.token === 'string') {
        console.log('  ✅ Token found in query params');
        return query.token;
      }
    }

    // Method 2: Extract token from Authorization header (multiple attempts)
    const authHeader =
      request?.headers?.authorization ||
      request?.headers?.Authorization ||
      request?.headers?.authentication || // Postman uses this for WebSocket
      request?.headers?.Authentication ||
      (client as any).handshake?.headers?.authorization ||
      (client as any).request?.headers?.authorization;

    console.log('  Authorization header:', authHeader);

    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      const token = authHeader.split(' ')[1];
      console.log('  ✅ Token found in Authorization header');
      return token;
    }

    // Method 3: Check if token is passed directly in headers
    const directToken =
      request?.headers?.token ||
      request?.headers?.Token ||
      (client as any).handshake?.headers?.token;

    if (directToken && typeof directToken === 'string') {
      console.log('  ✅ Token found in direct header');
      return directToken;
    }

    console.log('  ❌ No token found in any location');
    return null;
  }

  static async validateWebSocketConnection(
    client: AuthenticatedWebSocket,
    guard: WsJwtAuthGuard,
  ): Promise<boolean> {
    try {
      const token = guard.extractTokenFromClient(client);

      if (!token) {
        return false;
      }

      // Check if token is blacklisted
      if (await guard.authService.isTokenBlacklisted(token)) {
        return false;
      }

      // Verify and decode the token
      const payload = guard.jwtService.verify<JwtPayload>(token, {
        secret: guard.configService.jwtSecret,
      });

      // Find the user
      const user = await guard.userRepository.findOne({
        where: { _id: new ObjectId(payload.sub) },
      });

      if (!user) {
        return false;
      }

      // Attach user info to the WebSocket client
      client.user = {
        userId: payload.sub,
        username: user.username,
        email: user.email,
        role: user.role,
      };

      return true;
    } catch (error) {
      return false;
    }
  }
}
