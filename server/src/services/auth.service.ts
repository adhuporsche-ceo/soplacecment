import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.ts';
import { db } from '../repositories/database.ts';
import { User, UserRole } from '../types/index.ts';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string;
  departmentId?: string;
  name: string;
}

const retiredSeedUserIds = new Set([
  'usr_super_admin',
  'usr_chief_auditor',
  'usr_fin_auditor',
  'usr_dept_manager',
  'usr_compliance',
]);

// Enterprise RBAC Permission Matrix
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: [
    'users:manage',
    'org:manage',
    'audit:read',
    'audit:write',
    'audit:approve',
    'reconcile:execute',
    'cases:manage',
    'actions:manage',
    'evidence:upload',
    'evidence:verify',
    'logs:view',
  ],
  CHIEF_AUDITOR: [
    'audit:read',
    'audit:write',
    'audit:approve',
    'reconcile:execute',
    'cases:manage',
    'cases:close',
    'actions:manage',
    'evidence:upload',
    'evidence:verify',
    'logs:view',
  ],
  FINANCIAL_AUDITOR: [
    'audit:read',
    'audit:write',
    'reconcile:execute',
    'cases:investigate',
    'actions:create',
    'evidence:upload',
    'evidence:verify',
    'logs:view',
  ],
  DEPARTMENT_MANAGER: [
    'audit:read_department',
    'cases:view_department',
    'actions:update_assigned',
    'evidence:upload',
    'transactions:view_department',
  ],
  COMPLIANCE_OFFICER: [
    'audit:read',
    'cases:monitor',
    'actions:manage',
    'actions:verify',
    'logs:view',
    'reports:export',
  ],
  FACULTY: ['placement:students:read', 'placement:students:review'],
  STUDENT: ['placement:profile:read', 'placement:profile:write'],
};

export class AuthService {
  public static generateToken(user: User): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      departmentId: user.departmentId,
      name: user.name,
    };

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: '12h',
    } as jwt.SignOptions);
  }

  public static verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, config.jwtSecret) as TokenPayload;
    } catch {
      return null;
    }
  }

  public static async authenticate(email: string, passwordPlain: string): Promise<{ token: string; user: Omit<User, 'passwordHash'> } | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await db.getUserByEmail(normalizedEmail);
    if (!user || !user.isActive || retiredSeedUserIds.has(user.id)) {
      return null;
    }

    if (!await bcrypt.compare(passwordPlain, user.passwordHash)) {
      return null;
    }

    await db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });

    const token = this.generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    return { token, user: safeUser };
  }

  public static async getUserById(userId: string): Promise<User | undefined> {
    if (retiredSeedUserIds.has(userId)) return undefined;
    return db.getUserById(userId);
  }

  public static hasPermission(role: UserRole, requiredPermission: string): boolean {
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(requiredPermission) || permissions.includes('*');
  }
}
