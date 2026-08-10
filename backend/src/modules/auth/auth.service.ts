import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../config/database';
import { env } from '../../config/env';
import { JwtPayload } from '../../types';
import { AppError } from '../../middleware/errorHandler';

export class AuthService {
  async login(email: string, password: string) {
    const result = await query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid email or password.', 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new AppError('Account is deactivated. Contact admin.', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string | number,
    } as jwt.SignOptions);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const result = await query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found.', 404);
    }

    return result.rows[0];
  }
}
