import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface AdminJwtPayload {
  sub: string;
  email: string;
  type: string;
  role: string;
}

@Injectable()
export class JwtAdminStrategy extends PassportStrategy(Strategy, 'jwt-admin') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback_secret',
    });
  }

  async validate(payload: AdminJwtPayload) {
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Invalid token type');
    }
    return {
      id: payload.sub,
      email: payload.email,
      type: 'admin' as const,
      role: payload.role,
    };
  }
}
