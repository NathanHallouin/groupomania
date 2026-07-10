import { Router } from 'express';
import { ChannelController } from '../controllers/channelController';
import { authenticate } from '../middleware/auth';
import { body, query, param } from 'express-validator';

const router = Router();
const channelController = new ChannelController();

// Appliquer l'authentification à toutes les routes
router.use(authenticate);

/**
 * Validation pour la création de canal
 */
const createChannelValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le nom doit contenir entre 1 et 50 caractères')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Le nom ne peut contenir que des lettres, chiffres, espaces, tirets et underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La description ne peut pas dépasser 500 caractères'),
  body('type')
    .isIn(['public', 'private', 'direct', 'group'])
    .withMessage('Type de canal invalide'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate doit être un booléen'),
];

/**
 * Validation pour la mise à jour de canal
 */
const updateChannelValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Le nom doit contenir entre 1 et 50 caractères')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Le nom ne peut contenir que des lettres, chiffres, espaces, tirets et underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La description ne peut pas dépasser 500 caractères'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate doit être un booléen'),
];

/**
 * Validation pour l'ajout de membre
 */
const addMemberValidation = [
  body('userId')
    .isInt({ min: 1 })
    .withMessage('ID d\'utilisateur invalide'),
  body('role')
    .optional()
    .isIn(['member', 'moderator', 'admin', 'read_only'])
    .withMessage('Rôle invalide'),
];

/**
 * Validation pour la mise à jour de rôle
 */
const updateMemberRoleValidation = [
  body('role')
    .isIn(['member', 'moderator', 'admin', 'read_only'])
    .withMessage('Rôle invalide'),
];

/**
 * Validation des paramètres ID
 */
const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de canal invalide'),
];

/**
 * Validation des paramètres ID utilisateur
 */
const userIdValidation = [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('ID d\'utilisateur invalide'),
];

/**
 * Validation pour la recherche de canaux
 */
const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La requête de recherche doit contenir entre 2 et 100 caractères'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Numéro de page invalide'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limite invalide (1-50)'),
];

// Routes pour les canaux

/**
 * @route POST /api/channels
 * @desc Créer un nouveau canal
 * @access Privé
 */
router.post('/', createChannelValidation, channelController.createChannel);

/**
 * @route GET /api/channels
 * @desc Lister les canaux publics (découverte)
 * @access Privé
 */
router.get('/', channelController.getChannels);

/**
 * @route GET /api/channels/search
 * @desc Rechercher des canaux publics
 * @access Privé
 */
router.get('/search', searchValidation, channelController.searchChannels);

/**
 * @route GET /api/channels/user
 * @desc Obtenir les canaux de l'utilisateur connecté
 * @access Privé
 */
router.get('/user', channelController.getUserChannels);

/**
 * @route GET /api/channels/:id
 * @desc Obtenir un canal par ID
 * @access Privé
 */
router.get('/:id', idValidation, channelController.getChannelById);

/**
 * @route PUT /api/channels/:id
 * @desc Mettre à jour un canal
 * @access Privé
 */
router.put('/:id', [...idValidation, ...updateChannelValidation], channelController.updateChannel);

/**
 * @route DELETE /api/channels/:id
 * @desc Supprimer un canal
 * @access Privé
 */
router.delete('/:id', idValidation, channelController.deleteChannel);

/**
 * @route POST /api/channels/:id/join
 * @desc Rejoindre un canal public
 * @access Privé
 */
router.post('/:id/join', idValidation, channelController.joinChannel);

/**
 * @route POST /api/channels/:id/leave
 * @desc Quitter un canal
 * @access Privé
 */
router.post('/:id/leave', idValidation, channelController.leaveChannel);

/**
 * @route POST /api/channels/:id/members
 * @desc Ajouter un membre au canal
 * @access Privé
 */
router.post('/:id/members', [...idValidation, ...addMemberValidation], channelController.addMember);

/**
 * @route DELETE /api/channels/:id/members/:userId
 * @desc Retirer un membre du canal
 * @access Privé
 */
router.delete(
  '/:id/members/:userId',
  [...idValidation, ...userIdValidation],
  channelController.removeMember
);

/**
 * @route PUT /api/channels/:id/members/:userId/role
 * @desc Mettre à jour le rôle d'un membre
 * @access Privé
 */
router.put(
  '/:id/members/:userId/role',
  [...idValidation, ...userIdValidation, ...updateMemberRoleValidation],
  channelController.updateMemberRole
);

export default router;
