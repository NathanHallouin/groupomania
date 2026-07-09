import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models';
import { TokenService } from '../services/tokenService';
import { AppError } from '../middleware/errorHandler';

/**
 * Interface for registration requests
 */
interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  department?: string;
}

/**
 * Interface for login requests
 */
interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Interface for token refresh requests
 */
interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Authentication controller
 */
export class AuthController {
  private tokenService: TokenService;

  constructor() {
    this.tokenService = new TokenService();
  }

  /**
   * Register a new user
   */
  public register = async (req: Request<{}, {}, RegisterRequest>, res: Response): Promise<void> => {
    try {
      const { firstName, lastName, email, password, department } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new AppError('A user with this email already exists', 409);
      }

      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create the new user
      const user = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        department: department || 'General',
        role: 'employee',
        isActive: true,
      });

      // Generate tokens
      const tokens = this.tokenService.generateTokenPair(user);

      // Response without the password
      const userResponse = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      };

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user: userResponse,
          tokens,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error('Error during registration:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };

  /**
   * User login
   */
  public login = async (req: Request<{}, {}, LoginRequest>, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new AppError('Incorrect email or password', 401);
      }

      // Check if account is active
      if (!user.isActive) {
        throw new AppError('Account disabled', 403);
      }

      // Check if account is locked
      if (user.isLocked()) {
        throw new AppError(
          `Account locked. Try again in ${Math.ceil((user.lockUntil!.getTime() - Date.now()) / 60000)} minutes`,
          423
        );
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        // Increment failed login attempts
        await user.incrementLoginAttempts();
        throw new AppError('Incorrect email or password', 401);
      }

      // Reset login attempts
      await user.resetLoginAttempts();

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const tokens = this.tokenService.generateTokenPair(user);

      // Response without the password
      const userResponse = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
      };

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          tokens,
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error('Error during login:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };

  /**
   * Token refresh
   */
  public refreshToken = async (req: Request<{}, {}, RefreshTokenRequest>, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token required', 400);
      }

      // Refresh tokens
      const tokens = await this.tokenService.refreshTokens(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: { tokens },
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error('Error during token refresh:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };

  /**
   * Logout (primarily client-side)
   */
  public logout = async (req: Request, res: Response): Promise<void> => {
    try {
      // In a complete implementation, we could blacklist the token
      // or store it in Redis with a TTL

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  /**
   * Get the logged-in user's profile
   */
  public getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;

      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const userResponse = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      };

      res.status(200).json({
        success: true,
        data: { user: userResponse },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error('Error while fetching profile:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };

  /**
   * Change password
   */
  public changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new AppError('Current password and new password required', 400);
      }

      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify current password
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        throw new AppError('Current password is incorrect', 401);
      }

      // Hash the new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update the password
      user.password = hashedPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error('Error while changing password:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };
}
