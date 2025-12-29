import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface User {
  id: string;
  username: string;
  email: string;
  recruiterId: string;
  lastLoginAt: string | null;
}

interface Recruiter {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  recruiter: Recruiter | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthRefreshing, setIsAuthRefreshing] = useState(false);

  // Check if user is authenticated
  const { data: authData, isLoading, refetch } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (!isLoading) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('[AuthContext] Login mutation starting for:', email);
      try {
        const response = await apiRequest('POST', '/api/auth/login', { email, password });
        const data = await response.json();
        console.log('[AuthContext] Login successful, user:', data.user?.email);
        return data;
      } catch (error: any) {
        console.error('[AuthContext] Login mutation failed:', {
          email,
          error: error?.message || error,
          stack: error?.stack
        });
        throw error;
      }
    },
    onSuccess: async (data) => {
      console.log('[AuthContext] Login success handler triggered');
      // Set auth refreshing flag to prevent ProtectedRoute from redirecting
      setIsAuthRefreshing(true);
      
      // Optimistically update the auth query data with the login response
      queryClient.setQueryData(['/api/auth/me'], {
        user: data.user,
        recruiter: data.recruiter
      });
      
      // Also refetch to ensure consistency
      await refetch();
      
      // Clear the refreshing flag
      setIsAuthRefreshing(false);
      
      console.log('[AuthContext] Navigating to dashboard');
      // Now navigate - auth state is guaranteed to be updated
      setLocation('/');
    },
    onError: (error: any) => {
      console.error('[AuthContext] Login mutation error handler:', {
        message: error?.message,
        fullError: error
      });
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/logout', {});
      return await response.json();
    },
    onSuccess: () => {
      refetch();
      setLocation('/login');
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const value: AuthContextType = {
    user: (authData as any)?.user || null,
    recruiter: (authData as any)?.recruiter || null,
    isLoading: !isInitialized || isAuthRefreshing,
    isAuthenticated: !!(authData as any)?.user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
