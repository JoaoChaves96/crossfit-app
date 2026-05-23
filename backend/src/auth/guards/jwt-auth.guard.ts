import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  sub: string;
  email: string;
  gymId: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      if (process.env.NODE_ENV === 'development') {
        const userId = request.headers['x-user-id'] as string | undefined;
        const gymId = request.headers['x-gym-id'] as string | undefined;
        (request as any).user = { id: userId, gymId };
        return true;
      }
      throw new UnauthorizedException('Missing authorization header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = parts[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT secret not configured');
    }

    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      (request as any).user = {
        id: decoded.sub,
        email: decoded.email,
        gymId: decoded.gymId,
        role: decoded.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
