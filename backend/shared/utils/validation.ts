import * as Joi from 'joi';

// User validation schemas
export const userValidation = {
  signup: Joi.object({
    name: Joi.string()
      .min(2)
      .max(30)
      .pattern(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .required()
      .messages({
        'string.min': 'Le prénom doit contenir au moins 2 caractères',
        'string.max': 'Le prénom ne peut pas dépasser 30 caractères',
        'string.pattern.base': 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes'
      }),
    
    surname: Joi.string()
      .min(2)
      .max(30)
      .pattern(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .required()
      .messages({
        'string.min': 'Le nom doit contenir au moins 2 caractères',
        'string.max': 'Le nom ne peut pas dépasser 30 caractères',
        'string.pattern.base': 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'L\'adresse email n\'est pas valide'
      }),
    
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
        'string.max': 'Le mot de passe ne peut pas dépasser 128 caractères',
        'string.pattern.base': 'Le mot de passe doit contenir au moins une minuscule, une majuscule, un chiffre et un caractère spécial'
      })
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'L\'adresse email n\'est pas valide'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'string.empty': 'Le mot de passe est requis'
      })
  }),

  updateProfile: Joi.object({
    name: Joi.string()
      .min(2)
      .max(30)
      .pattern(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .optional()
      .messages({
        'string.min': 'Le prénom doit contenir au moins 2 caractères',
        'string.max': 'Le prénom ne peut pas dépasser 30 caractères',
        'string.pattern.base': 'Le prénom ne peut contenir que des lettres, espaces, tirets et apostrophes'
      }),
    
    surname: Joi.string()
      .min(2)
      .max(30)
      .pattern(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .optional()
      .messages({
        'string.min': 'Le nom doit contenir au moins 2 caractères',
        'string.max': 'Le nom ne peut pas dépasser 30 caractères',
        'string.pattern.base': 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes'
      })
  })
};

// Message validation schemas
export const messageValidation = {
  create: Joi.object({
    title: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Le titre doit contenir au moins 3 caractères',
        'string.max': 'Le titre ne peut pas dépasser 100 caractères'
      }),
    
    content: Joi.string()
      .min(5)
      .max(2000)
      .required()
      .messages({
        'string.min': 'Le contenu doit contenir au moins 5 caractères',
        'string.max': 'Le contenu ne peut pas dépasser 2000 caractères'
      })
  })
};

// Query validation schemas
export const queryValidation = {
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .optional(),
    
    size: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(10)
      .optional(),
    
    order: Joi.string()
      .pattern(/^[a-zA-Z]+:(ASC|DESC)$/)
      .default('createdAt:DESC')
      .optional(),
    
    fields: Joi.string()
      .pattern(/^(\*|[a-zA-Z,]+)$/)
      .default('*')
      .optional()
  })
};
