import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface MemberJwtPayload {
  sub: string;
  email: string;
  type: string;
  companyId?: string;
  storeId?: string;
  role?: string;
  permissions?: string[];
}

@Injectable()
export class JwtMemberStrategy extends PassportStrategy(Strategy, 'jwt-member') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback_secret',
    });
  }

  async validate(payload: MemberJwtPayload) {
    if (payload.type !== 'member' && payload.type !== 'employee') {
      throw new UnauthorizedException('Invalid token type');
    }
    if (!payload.sub) {
      throw new UnauthorizedException();
    }
    return {
      id: payload.sub,
      email: payload.email,
      type: payload.type,
      companyId: payload.companyId,
      company_id: payload.companyId,
      storeId: payload.storeId,
      role: payload.role,
      permissions: payload.permissions ?? [],
    };
  }
}
