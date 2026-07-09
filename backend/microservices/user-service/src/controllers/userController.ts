import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { User } from '../models';
import { ImageService } from '../services/imageService';
import { AppError } from '../middleware/auth';
import { UserFilters, QueryOptions, UserStats, PaginationMeta, UserPreferences } from '../types';

/**
 * User management controller
 */
export class UserController {
  private imageService: ImageService;

  constructor() {
    this.imageService = new ImageService();
  }

  /**
   * Get all users with pagination and filters
   */
  public getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        status,
        department,
        sort = 'createdAt',
        order = 'DESC'
      } = req.query as QueryOptions & { [key: string]: any };

      const offset = (Number(page) - 1) * Number(limit);

      // Build search conditions
      const whereConditions: any = {};

      if (search) {
        whereConditions[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { department: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (role) {
        whereConditions.role = role;
      }

      if (status) {
        whereConditions.status = status;
      }

      if (department) {
        whereConditions.department = { [Op.iLike]: `%${department}%` };
      }

      // Execute query with pagination
      const { count, rows: users } = await User.findAndCountAll({
        where: whereConditions,
        limit: Number(limit),
        offset,
        order: [[sort, order.toUpperCase()]],
        include: [
          {
            model: User,
            as: 'Manager',
            attributes: ['id', 'firstName', 'lastName', 'email'],
          },
        ],
      });

      // Pagination metadata
      const totalPages = Math.ceil(count / Number(limit));
      const meta: PaginationMeta = {
        page: Number(page),
        limit: Number(limit),
        total: count,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      };

      // Serialize users (public version for non-admins)
      const currentUser = req.user!;
      const serializedUsers = users.map(user => 
        currentUser.role === 'admin' || currentUser.userId === user.id
          ? user.toPrivateJSON()
          : user.toPublicJSON()
      );

      res.status(200).json({
        success: true,
        data: serializedUsers,
        meta,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };

  /**
   * Get a user by ID
   */
  public getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const currentUser = req.user!;

      const user = await User.findByPk(userId, {
        include: [
          {
            model: User,
            as: 'Manager',
            attributes: ['id', 'firstName', 'lastName', 'email', 'position'],
          },
          {
            model: User,
            as: 'DirectReports',
            attributes: ['id', 'firstName', 'lastName', 'email', 'position'],
          },
        ],
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Determine if we can view private data
      const canViewPrivate = currentUser.role === 'admin' || currentUser.userId === user.id;
      const userData = canViewPrivate ? user.toPrivateJSON() : user.toPublicJSON();

      res.status(200).json({
        success: true,
        data: { user: userData },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error('Error fetching user:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };

  /**
   * Update user profile
   */
  public updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const currentUser = req.user!;
      const updateData = req.body;

      // Check permissions
      if (currentUser.role !== 'admin' && currentUser.userId !== parseInt(userId)) {
        throw new AppError('Access denied', 403);
      }

      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Fields allowed for update by user
      const userFields = [
        'firstName', 'lastName', 'bio', 'phone', 'location',
        'birthDate', 'preferences'
      ];

      // Additional fields allowed for admins
      const adminFields = [
        'department', 'position', 'role', 'status', 'manager', 'isEmailVerified'
      ];

      const allowedFields = currentUser.role === 'admin' 
        ? [...userFields, ...adminFields]
        : userFields;

      // Filter update data
      const filteredData: any = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      // Special validation for preferences
      if (filteredData.preferences) {
        filteredData.preferences = {
          ...user.getPreferencesWithDefaults(),
          ...filteredData.preferences,
        };
      }

      // Update
      await user.update(filteredData);

      // Check and update profile completeness status
      user.checkProfileCompleteness();
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: user.toPrivateJSON() },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error('Error updating profile:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };

  /**
   * Upload user avatar
   */
  public uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const currentUser = req.user!;

      // Check permissions
      if (currentUser.role !== 'admin' && currentUser.userId !== parseInt(userId)) {
        throw new AppError('Access denied', 403);
      }

      if (!req.file) {
        throw new AppError('No file provided', 400);
      }

      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Validate image
      const isValidImage = await this.imageService.validateImage(req.file.buffer);
      if (!isValidImage) {
        throw new AppError('Invalid image file', 400);
      }

      // Delete old avatar if exists
      if (user.avatar) {
        await this.imageService.deleteAvatarSizes(user.avatar);
      }

      // Create new avatar sizes
      const avatarSizes = await this.imageService.createAvatarSizes(
        req.file.buffer,
        `user-${userId}-avatar`
      );

      // Update user
      await user.update({ avatar: avatarSizes });

      res.status(200).json({
        success: true,
        message: 'Avatar updated successfully',
        data: {
          avatar: {
            thumbnail: this.imageService.getAvatarUrl(avatarSizes, 'thumbnail'),
            medium: this.imageService.getAvatarUrl(avatarSizes, 'medium'),
            large: this.imageService.getAvatarUrl(avatarSizes, 'large'),
          },
        },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error('Error uploading avatar:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };

  /**
   * Delete user avatar
   */
  public deleteAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const currentUser = req.user!;

      // Check permissions
      if (currentUser.role !== 'admin' && currentUser.userId !== parseInt(userId)) {
        throw new AppError('Access denied', 403);
      }

      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Delete avatar files
      if (user.avatar) {
        await this.imageService.deleteAvatarSizes(user.avatar);
      }

      // Update user
      await user.update({ avatar: null });

      res.status(200).json({
        success: true,
        message: 'Avatar deleted successfully',
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error('Error deleting avatar:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };

  /**
   * Get user statistics (admin only)
   */
  public getUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUser = req.user!;

      if (currentUser.role !== 'admin') {
        throw new AppError('Access denied - admin required', 403);
      }

      // General statistics
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { status: 'active' } });

      // New users this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const newUsersThisMonth = await User.count({
        where: {
          createdAt: { [Op.gte]: startOfMonth },
        },
      });

      // Users by department
      const usersByDepartment = await User.findAll({
        attributes: [
          'department',
          [User.sequelize!.fn('COUNT', User.sequelize!.col('id')), 'count'],
        ],
        group: ['department'],
        raw: true,
      }) as any[];

      // Users by role
      const usersByRole = await User.findAll({
        attributes: [
          'role',
          [User.sequelize!.fn('COUNT', User.sequelize!.col('id')), 'count'],
        ],
        group: ['role'],
        raw: true,
      }) as any[];

      const stats: UserStats = {
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        usersByDepartment: usersByDepartment.reduce((acc, item) => {
          acc[item.department] = parseInt(item.count);
          return acc;
        }, {} as Record<string, number>),
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = parseInt(item.count);
          return acc;
        }, {} as Record<string, number>),
      };

      res.status(200).json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };

  /**
   * Search users
   */
  public searchUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { q: query, limit = 10 } = req.query;

      if (!query || typeof query !== 'string') {
        throw new AppError('Search parameter required', 400);
      }

      const users = await User.findAll({
        where: {
          [Op.and]: [
            { status: 'active' },
            {
              [Op.or]: [
                { firstName: { [Op.iLike]: `%${query}%` } },
                { lastName: { [Op.iLike]: `%${query}%` } },
                { email: { [Op.iLike]: `%${query}%` } },
                { department: { [Op.iLike]: `%${query}%` } },
              ],
            },
          ],
        },
        limit: Number(limit),
        order: [['firstName', 'ASC']],
      });

      const results = users.map(user => user.toPublicJSON());

      res.status(200).json({
        success: true,
        data: { users: results },
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        console.error('Error searching users:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };

  /**
   * Get available departments
   */
  public getDepartments = async (req: Request, res: Response): Promise<void> => {
    try {
      const departments = await User.findAll({
        attributes: [
          'department',
          [User.sequelize!.fn('COUNT', User.sequelize!.col('id')), 'userCount'],
        ],
        group: ['department'],
        order: [['department', 'ASC']],
        raw: true,
      }) as any[];

      res.status(200).json({
        success: true,
        data: { departments },
      });
    } catch (error) {
      console.error('Error fetching departments:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
}
