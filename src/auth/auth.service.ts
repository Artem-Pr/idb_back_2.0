import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConfigService } from 'src/config/config.service';
import { ObjectId } from 'mongodb';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(BlacklistedToken)
    private blacklistedTokenRepository: Repository<BlacklistedToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { username } });

    if (user && (await this.comparePasswords(password, user.password))) {
      const { password: _password, ...result } = user;
      return result;
    }

    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async register(registerDto: RegisterDto) {
    // Check if username or email already exists
    const existingUser = await this.userRepository.findOne({
      where: {
        $or: [{ username: registerDto.username }, { email: registerDto.email }],
      },
    } as any);

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(registerDto.password);

    // Create new user
    const newUser = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(newUser);
    const { password: _password, ...result } = savedUser;

    return result;
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    // First try to find the token without checking isRevoked
    const tokenDoc = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    } as any);

    // If token is not found or is revoked/expired, throw error
    if (!tokenDoc || tokenDoc.isRevoked || new Date() > tokenDoc.expiresAt) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Find the user
    const user = await this.userRepository.findOne({
      where: { _id: new ObjectId(tokenDoc.userId) },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Revoke the old refresh token
    await this.refreshTokenRepository.update(
      { _id: tokenDoc._id },
      { isRevoked: true },
    );

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
    };
  }

  async logout(refreshToken: string, accessToken: string) {
    // Find and revoke the refresh token
    await this.refreshTokenRepository.update(
      { token: refreshToken },
      { isRevoked: true },
    );

    // Decode the access token to get its expiration
    const decodedToken = this.jwtService.decode<{ exp: number }>(accessToken);
    const expiresAt = new Date(decodedToken.exp * 1000);

    // Add the access token to blacklist
    const blacklistedToken = this.blacklistedTokenRepository.create({
      token: accessToken,
      expiresAt,
    });
    await this.blacklistedTokenRepository.save(blacklistedToken);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistedToken = await this.blacklistedTokenRepository.findOne({
      where: { token },
    });
    return !!blacklistedToken;
  }

  private async generateTokens(user: User) {
    const payload = { username: user.username, sub: user._id, role: user.role };

    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.jwtSecret,
      expiresIn: this.configService.jwtExpiresIn,
    });

    // Generate refresh token
    const refreshToken = this.jwtService.sign(
      { sub: user._id },
      {
        secret: this.configService.jwtRefreshSecret,
        expiresIn: this.configService.jwtRefreshExpiresIn,
      },
    );

    // Save refresh token to database
    const refreshTokenDoc = this.refreshTokenRepository.create({
      token: refreshToken,
      userId: user._id.toString(),
      expiresAt: new Date(
        Date.now() +
          this.parseExpiresIn(this.configService.jwtRefreshExpiresIn),
      ),
      isRevoked: false,
    });

    await this.refreshTokenRepository.save(refreshTokenDoc);

    return {
      accessToken,
      refreshToken,
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }

  private async comparePasswords(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }
}
