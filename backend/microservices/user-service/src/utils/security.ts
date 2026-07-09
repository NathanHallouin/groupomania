import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Security utilities
 */
export class SecurityUtils {
  /**
   * Generate a secure hash
   */
  public static generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a random salt
   */
  public static generateSalt(rounds: number = 12): string {
    return bcrypt.genSaltSync(rounds);
  }

  /**
   * Hash a password
   */
  public static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify a password
   */
  public static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Sanitize a string
   */
  public static sanitizeString(input: string): string {
    return input
      .replace(/[<>\"'%;()&+]/g, '') // Remove dangerous characters
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate an email
   */
  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate a random token
   */
  public static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Validate password strength
   */
  public static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 0;

    // Minimum length
    if (password.length < 8) {
      errors.push('Password must contain at least 8 characters');
    } else {
      score += 1;
    }

    // Lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 1;
    }

    // Uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 1;
    }

    // Digit
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit');
    } else {
      score += 1;
    }

    // Special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 1;
    }

    return {
      isValid: errors.length === 0,
      errors,
      score,
    };
  }
}
