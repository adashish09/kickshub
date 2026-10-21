import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  apiLogin,
  apiRegister,
  apiRefresh,
  apiLogout,
  apiGetMe,
  apiUpdateProfile,
  apiChangePassword,
  registerAuthFailureHandler,
  setAccessToken,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  // Handle background token failure triggered from Axios interceptor
  useEffect(() => {
    registerAuthFailureHandler(() => {
      setUser(null);
    });
  }, []);

  // Silent initial authentication check on application load
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        // Attempt silent refresh using HttpOnly cookie
        await apiRefresh();
        const meData = await apiGetMe();
        if (isMounted) {
          setUser(meData.user || meData);
        }
      } catch (_err) {
        // Logged-out visitors gracefully proceed without redirecting
        if (isMounted) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    setAuthLoading(true);
    setError(null);
    try {
      const data = await apiLogin({ email, password });
      const userProfile = data.user || data;
      setUser(userProfile);
      return userProfile;
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Unable to log in. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setAuthLoading(true);
    setError(null);
    try {
      const data = await apiRegister({ name, email, password });
      return data.user || data;
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Registration failed. Please check your inputs.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    setAuthLoading(true);
    try {
      await apiLogout();
    } catch (err) {
      // Clear client state even if network call fails
      console.warn('Logout network error:', err);
    } finally {
      setUser(null);
      setAccessToken(null);
      setAuthLoading(false);
    }
  };

  const updateProfile = async (name) => {
    setAuthLoading(true);
    setError(null);
    try {
      const data = await apiUpdateProfile({ name });
      const updatedUser = data.user || data;
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to update profile.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    setAuthLoading(true);
    setError(null);
    try {
      const data = await apiChangePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      // Changing password revokes server refresh sessions; user must re-authenticate
      setUser(null);
      setAccessToken(null);
      return data;
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to change password.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isInitialLoading,
    authLoading,
    error,
    clearError,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
