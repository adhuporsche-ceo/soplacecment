import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  registerStudent: (input: { name: string; email: string; password: string; studentId: string }) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const token = api.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await api.getCurrentUser();
        if (active) setUser(currentUser);
      } catch {
        api.setToken(null);
        if (active) setError('Your session could not be verified. Please sign in again.');
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      setUser(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const registerStudent = async (input: {
    name: string;
    email: string;
    password: string;
    studentId: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.registerStudent(input);
      setUser(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account creation failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setError(null);
  };

  const hasRole = (...roles: UserRole[]) => Boolean(user && roles.includes(user.role));

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, registerStudent, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
