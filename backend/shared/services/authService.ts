import jwt, { SignOptions } from 'jsonwebtoken';

interface UserInfo {
  userId: number;
  email: string;
  admin: boolean;
  iat?: number;
  exp?: number;
}

interface TokenPayload {
  userId: number;
  email: string;
  admin: boolean;
}

class AuthService {
  /**
   * Validates JWT token and returns user information
   * @param token - JWT token to validate
   * @returns Promise<UserInfo> - User information from token
   * @throws Error if token is invalid or expired
   */
  static async validateToken(token: string): Promise<UserInfo> {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as TokenPayload;
      
      return {
        userId: decoded.userId,
        email: decoded.email,
        admin: decoded.admin
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw new Error('Token validation failed');
    }
  }

  /**
   * Generates JWT token for user
   * @param payload - User data to encode in token
   * @returns string - JWT token
   */
  static generateToken(payload: TokenPayload): string {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const options: SignOptions = {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'groupomania-app'
    };

    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      options
    );
  }
}

export default AuthService;
