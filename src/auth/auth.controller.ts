import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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

  @Post(paths.refresh)
  @LogController(paths.refresh)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(paths.logout)
  @HttpCode(HttpStatus.NO_CONTENT)
  @LogController(paths.logout)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Headers('authorization') authHeader: string,
  ) {
    const accessToken = authHeader?.split(' ')[1];
    return this.authService.logout(refreshTokenDto.refreshToken, accessToken);
  }
}
