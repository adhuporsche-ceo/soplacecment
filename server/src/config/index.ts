import dotenv from 'dotenv';
dotenv.config();

const getEnvValue = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
};

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET?.trim() || '',
  jwtExpiresIn: '12h',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  mongoUri: process.env.MONGODB_URI || '',
  mongoDbName: process.env.MONGODB_DB_NAME || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  defaultOrgId: 'org_apex_global',
  loginAccounts: [
    {
      id: 'env_super_admin',
      email: getEnvValue('INITIAL_ADMIN_EMAIL', 'ADMIN_LOGIN_EMAIL').toLowerCase(),
      password: getEnvValue('INITIAL_ADMIN_PASSWORD', 'ADMIN_LOGIN_PASSWORD'),
      name: getEnvValue('INITIAL_ADMIN_NAME') || 'Administrator',
      role: 'SUPER_ADMIN' as const,
    },
    {
      id: 'env_faculty',
      email: getEnvValue('FACULTY_EMAIL', 'FACULTY_LOGIN_EMAIL').toLowerCase(),
      password: getEnvValue('FACULTY_LOGIN_PASSWORD'),
      name: 'Faculty',
      role: 'FACULTY' as const,
    },
  ].filter(account => account.email && account.password),
};
