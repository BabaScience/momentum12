import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env.js';
import { User, hashPassword, IUserDocument } from '../models/index.js';
import { ITokenPayload } from '../types/index.js';
import { 
  UnauthorizedError, 
  BadRequestError, 
  ConflictError,
  NotFoundError,
} from '../middleware/errorHandler.js';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  user: IUserDocument;
  tokens: TokenPair;
}

export class AuthService {
  /**
   * Generate access token
   */
  private generateAccessToken(userId: string, email: string): string {
    const payload: ITokenPayload = {
      userId,
      email,
      type: 'access',
    };
    
    return jwt.sign(payload, env.jwt.secret, {
      expiresIn: env.jwt.accessExpiry,
    });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(userId: string, email: string): string {
    const payload: ITokenPayload = {
      userId,
      email,
      type: 'refresh',
    };
    
    return jwt.sign(payload, env.jwt.refreshSecret, {
      expiresIn: env.jwt.refreshExpiry,
    });
  }

  /**
   * Generate token pair
   */
  private generateTokenPair(userId: string, email: string): TokenPair {
    return {
      accessToken: this.generateAccessToken(userId, email),
      refreshToken: this.generateRefreshToken(userId, email),
    };
  }

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    displayName: string
  ): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      displayName,
    });

    await user.save();

    // Generate tokens
    const tokens = this.generateTokenPair(
      user._id.toString(),
      user.email
    );

    // Store refresh token
    await user.addRefreshToken(tokens.refreshToken);

    return { user, tokens };
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last active
    user.lastActiveAt = new Date();
    await user.save();

    // Generate tokens
    const tokens = this.generateTokenPair(
      user._id.toString(),
      user.email
    );

    // Store refresh token
    await user.addRefreshToken(tokens.refreshToken);

    return { user, tokens };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        env.jwt.refreshSecret
      ) as ITokenPayload;

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Check if refresh token exists (for token rotation)
      if (!user.hasRefreshToken(refreshToken)) {
        // Potential token reuse attack - clear all tokens
        await user.clearAllRefreshTokens();
        throw new UnauthorizedError('Token has been revoked');
      }

      // Remove old refresh token
      await user.removeRefreshToken(refreshToken);

      // Generate new token pair
      const tokens = this.generateTokenPair(
        user._id.toString(),
        user.email
      );

      // Store new refresh token
      await user.addRefreshToken(tokens.refreshToken);

      return tokens;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    if (refreshToken) {
      // Remove specific refresh token
      await user.removeRefreshToken(refreshToken);
    } else {
      // Remove all refresh tokens (logout from all devices)
      await user.clearAllRefreshTokens();
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUserDocument> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): ITokenPayload {
    try {
      const decoded = jwt.verify(token, env.jwt.secret) as ITokenPayload;
      
      if (decoded.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters');
    }

    // Hash and save new password
    user.passwordHash = await hashPassword(newPassword);
    
    // Clear all refresh tokens to force re-login
    await user.clearAllRefreshTokens();
    
    await user.save();
  }

  /**
   * Request password reset (placeholder - would send email in production)
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await User.findByEmail(email);
    
    // Don't reveal if user exists
    if (!user) {
      return;
    }

    // In production, generate reset token and send email
    // For now, just log
    console.log(`Password reset requested for: ${email}`);
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    // Delete user
    await User.findByIdAndDelete(userId);
  }
}

export const authService = new AuthService();

