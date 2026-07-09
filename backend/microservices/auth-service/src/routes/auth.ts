import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/authController';
import { validationMiddleware } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /api/auth/register
 * @desc    Inscrire un nouvel utilisateur
 * @access  Public
 */
router.post(
  '/register',
  [
    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Le prénom doit contenir entre 2 et 50 caractères')
      .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .withMessage('Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
    
    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Le nom doit contenir entre 2 et 50 caractères')
      .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .withMessage('Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'),
    
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Veuillez fournir un email valide'),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'),
    
    body('department')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Le département doit contenir entre 2 et 100 caractères'),
  ],
  validationMiddleware,
  asyncHandler(authController.register)
);

/**
 * @route   POST /api/auth/login
 * @desc    Connecter un utilisateur
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Veuillez fournir un email valide'),
    
    body('password')
      .notEmpty()
      .withMessage('Le mot de passe est requis'),
  ],
  validationMiddleware,
  asyncHandler(authController.login)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Rafraîchir les tokens d'authentification
 * @access  Public
 */
router.post(
  '/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Le token de rafraîchissement est requis'),
  ],
  validationMiddleware,
  asyncHandler(authController.refreshToken)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnecter un utilisateur
 * @access  Private
 */
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(authController.logout)
);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtenir le profil de l'utilisateur connecté
 * @access  Private
 */
router.get(
  '/profile',
  authMiddleware,
  asyncHandler(authController.getProfile)
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Changer le mot de passe de l'utilisateur connecté
 * @access  Private
 */
router.put(
  '/change-password',
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Le mot de passe actuel est requis'),
    
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Le nouveau mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'),
  ],
  authMiddleware,
  validationMiddleware,
  asyncHandler(authController.changePassword)
);

/**
 * @route   GET /api/auth/verify-token
 * @desc    Vérifier la validité d'un token
 * @access  Private
 */
router.get(
  '/verify-token',
  authMiddleware,
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Token valide',
      data: {
        user: (req as any).user,
      },
    });
  }
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Demander un lien de réinitialisation de mot de passe
 * @access  Public
 */
router.post(
  '/forgot-password',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Veuillez fournir un email valide'),
  ],
  validationMiddleware,
  asyncHandler(authController.forgotPassword)
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Réinitialiser le mot de passe avec un token valide
 * @access  Public
 */
router.post(
  '/reset-password',
  [
    body('token')
      .notEmpty()
      .withMessage('Le token de réinitialisation est requis'),

    body('password')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'),
  ],
  validationMiddleware,
  asyncHandler(authController.resetPassword)
);

export default router;
