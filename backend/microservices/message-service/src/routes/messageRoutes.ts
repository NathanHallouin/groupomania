import { Router } from 'express';
import { MessageController } from '../controllers/messageController';
import { authenticate } from '../middleware/auth';
import { body, query, param } from 'express-validator';

const router = Router();
const messageController = new MessageController();

// Appliquer l'authentification à toutes les routes
router.use(authenticate);

/**
 * Validation pour la création de message
 */
const createMessageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Le contenu doit contenir entre 1 et 2000 caractères'),
  body('channelId')
    .isInt({ min: 1 })
    .withMessage('ID de canal invalide'),
  body('parentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de message parent invalide'),
];

/**
 * Validation pour la mise à jour de message
 */
const updateMessageValidation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Le contenu doit contenir entre 1 et 2000 caractères'),
];

/**
 * Validation pour les réactions
 */
const reactionValidation = [
  body('reactionType')
    .isIn(['like', 'love', 'laugh', 'wow', 'sad', 'angry'])
    .withMessage('Type de réaction invalide'),
];

/**
 * Validation des paramètres ID
 */
const idValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID invalide'),
];

/**
 * Validation pour la récupération des messages d'un canal
 */
const channelMessagesValidation = [
  param('channelId')
    .isInt({ min: 1 })
    .withMessage('ID de canal invalide'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Numéro de page invalide'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite invalide (1-100)'),
  query('before')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de message avant invalide'),
  query('after')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de message après invalide'),
];

/**
 * Validation pour la recherche de messages
 */
const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La requête de recherche doit contenir entre 2 et 100 caractères'),
  query('channelId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID de canal invalide'),
  query('authorId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ID d\'auteur invalide'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Numéro de page invalide'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limite invalide (1-50)'),
];

// Routes pour les messages

/**
 * @route POST /api/messages
 * @desc Créer un nouveau message
 * @access Privé
 */
router.post('/', createMessageValidation, messageController.createMessage);

/**
 * @route GET /api/messages/search
 * @desc Rechercher des messages
 * @access Privé
 */
router.get('/search', searchValidation, messageController.searchMessages);

/**
 * @route GET /api/messages/channel/:channelId
 * @desc Obtenir les messages d'un canal
 * @access Privé
 */
router.get('/channel/:channelId', channelMessagesValidation, messageController.getChannelMessages);

/**
 * @route GET /api/messages/:id
 * @desc Obtenir un message par ID
 * @access Privé
 */
router.get('/:id', idValidation, messageController.getMessageById);

/**
 * @route PUT /api/messages/:id
 * @desc Mettre à jour un message
 * @access Privé
 */
router.put('/:id', [...idValidation, ...updateMessageValidation], messageController.updateMessage);

/**
 * @route DELETE /api/messages/:id
 * @desc Supprimer un message
 * @access Privé
 */
router.delete('/:id', idValidation, messageController.deleteMessage);

/**
 * @route POST /api/messages/:id/reactions
 * @desc Ajouter une réaction à un message
 * @access Privé
 */
router.post('/:id/reactions', [...idValidation, ...reactionValidation], messageController.addReaction);

/**
 * @route DELETE /api/messages/:id/reactions/:reactionType
 * @desc Retirer une réaction d'un message
 * @access Privé
 */
router.delete(
  '/:id/reactions/:reactionType',
  [
    param('id').isInt({ min: 1 }).withMessage('ID de message invalide'),
    param('reactionType')
      .isIn(['like', 'love', 'laugh', 'wow', 'sad', 'angry'])
      .withMessage('Type de réaction invalide'),
  ],
  messageController.removeReaction
);

export default router;
