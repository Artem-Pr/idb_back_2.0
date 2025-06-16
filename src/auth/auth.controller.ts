import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { RefreshToken } from './decorators/refresh-token.decorator';
import { AccessToken } from './decorators/access-token.decorator';
import { LogController } from 'src/logger/logger.decorator';
import { ControllerPrefix, Paths } from 'src/common/constants';

const paths = Paths[ControllerPrefix.auth];

@Controller(ControllerPrefix.auth)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post(paths.login)
  @HttpCode(HttpStatus.OK)
  @LogController(paths.login)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(paths.register)
  @LogController(paths.register)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(RefreshTokenGuard)
  @Get(paths.refresh)
  @LogController(paths.refresh)
  async refresh(@RefreshToken() refreshToken: string) {
    return this.authService.refreshToken({ refreshToken });
  }

  @UseGuards(JwtAuthGuard)
  @Post(paths.logout)
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogController(paths.logout)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @AccessToken() accessToken: string,
  ) {
    return this.authService.logout(refreshTokenDto.refreshToken, accessToken);
  }
}
