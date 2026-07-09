import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const config = require('../config/config');

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Hash an email using MD5 for unique identification
 * @param email - The email to hash
 * @returns The hashed email
 */
export const hashEmail = (email: string): string => {
  return crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');
};

/**
 * Encrypt an email using AES encryption
 * @param email - The email to encrypt
 * @param secretKey - The secret key for encryption
 * @returns The encrypted email
 */
export const encryptEmail = (email: string, secretKey: string = 'Secret Passphrase'): string => {
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(email.toLowerCase().trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt an email using AES decryption
 * @param encryptedEmail - The encrypted email
 * @param secretKey - The secret key for decryption
 * @returns The decrypted email
 */
export const decryptEmail = (encryptedEmail: string, secretKey: string = 'Secret Passphrase'): string => {
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const parts = encryptedEmail.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

/**
 * Hash a password using bcrypt
 * @param password - The password to hash
 * @returns The hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, config.security.bcryptRounds);
};

/**
 * Compare a password with its hash
 * @param password - The plain password
 * @param hashedPassword - The hashed password
 * @returns True if passwords match
 */
export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate a random token
 * @param length - The length of the token
 * @returns The generated token
 */
export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Sanitize a string to prevent XSS attacks
 * @param input - The input string to sanitize
 * @returns The sanitized string
 */
export const sanitizeInput = (input: any): any => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>\"']/g, (match: string) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return entities[match];
    })
    .trim();
};

/**
 * Check if account is locked based on lock_until timestamp
 * @param lockUntil - The lock until timestamp
 * @returns True if account is locked
 */
export const isAccountLocked = (lockUntil: Date | string | null | undefined): boolean => {
  if (!lockUntil) return false;
  const lockUntilDate = new Date(lockUntil);
  return lockUntilDate > new Date();
};

/**
 * Generate account lock timestamp
 * @returns The lock until timestamp
 */
export const generateLockUntil = (): Date => {
  return new Date(Date.now() + config.security.accountLockTime);
};

/**
 * Validate email format
 * @param email - The email to validate
 * @returns True if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param password - The password to validate
 * @returns Validation result with isValid and errors
 */
export const validatePasswordStrength = (password: string): PasswordValidation => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (password.length > 128) {
    errors.push('Password cannot exceed 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
