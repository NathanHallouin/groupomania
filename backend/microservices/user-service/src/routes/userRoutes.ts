import { Router } from 'express';
import multer from 'multer';
import { UserController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { 
  validateRequest,
  updateProfileSchema, 
  getUsersQuerySchema, 
  searchUsersSchema 
} from '../middleware/validation';

/**
 * Multer configuration for avatar upload
 */
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Use JPEG, PNG, GIF or WebP.'));
    }
  },
});

/**
 * Main router for users
 */
const router = Router();
const userController = new UserController();

// Authentication middleware for all routes
router.use(authenticateToken);

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filters
 * @access  Private
 */
router.get(
  '/', 
  validateRequest(getUsersQuerySchema, 'query'),
  userController.getUsers
);

/**
 * @route   GET /api/users/search
 * @desc    Search users
 * @access  Private
 */
router.get(
  '/search',
  validateRequest(searchUsersSchema, 'query'),
  userController.searchUsers
);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/stats', userController.getUserStats);

/**
 * @route   GET /api/users/departments
 * @desc    Get list of departments
 * @access  Private
 */
router.get('/departments', userController.getDepartments);

/**
 * @route   GET /api/users/:userId
 * @desc    Get a user by ID
 * @access  Private
 */
router.get('/:userId', userController.getUserById);

/**
 * @route   PUT /api/users/:userId
 * @desc    Update user profile
 * @access  Private (Self or Admin)
 */
router.put(
  '/:userId',
  validateRequest(updateProfileSchema),
  userController.updateProfile
);

/**
 * @route   POST /api/users/:userId/avatar
 * @desc    Upload user avatar
 * @access  Private (Self or Admin)
 */
router.post(
  '/:userId/avatar',
  avatarUpload.single('avatar'),
  userController.uploadAvatar
);

/**
 * @route   DELETE /api/users/:userId/avatar
 * @desc    Delete user avatar
 * @access  Private (Self or Admin)
 */
router.delete('/:userId/avatar', userController.deleteAvatar);

export default router;
