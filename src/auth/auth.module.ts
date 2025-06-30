import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from 'src/config/config.module';
import { ConfigService } from 'src/config/config.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, BlacklistedToken]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: { expiresIn: configService.jwtExpiresIn },
      }),
    }),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, WsJwtAuthGuard],
  exports: [AuthService, WsJwtAuthGuard],
})
export class AuthModule {}
