import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models';

/**
 * Interface for JWT tokens
 */
export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

/**
 * Interface for response tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * JWT token management service
 */
export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'access-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  /**
   * Generate an access token
   */
  public generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'groupomania-auth',
      audience: 'groupomania-app',
    } as jwt.SignOptions);
  }

  /**
   * Generate a refresh token
   */
  public generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'groupomania-auth',
      audience: 'groupomania-app',
    } as jwt.SignOptions);
  }

  /**
   * Generate a token pair
   */
  public generateTokenPair(user: User): AuthTokens {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Calculate expiration in seconds
    const expiresIn = this.parseExpiry(this.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Verify an access token
   */
  public verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Verify a refresh token
   */
  public verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.refreshTokenSecret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Generate an email verification token
   */
  public generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a password reset token
   */
  public generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Refresh tokens
   */
  public async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const payload = this.verifyRefreshToken(refreshToken);

    // Verify that user still exists
    const user = await User.findByPk(payload.userId);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    return this.generateTokenPair(user);
  }

  /**
   * Extract token from Authorization header
   */
  public extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Calculate expiration in seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 15 minutes by default

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 900;
    }
  }

  /**
   * Decode a token without verification (for debugging)
   */
  public decodeToken(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Get token expiration information
   */
  public getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}
