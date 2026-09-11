import jwtDecode from 'jwt-decode';
import { STORAGE_KEYS } from '../../app/config/constants.js';

// Token management
export const getTokens = () => {
  try {
    const tokens = localStorage.getItem(STORAGE_KEYS.TOKENS);
    return tokens ? JSON.parse(tokens) : null;
  } catch (error) {
    console.error('Error getting tokens:', error);
    return null;
  }
};

export const setTokens = (tokens) => {
  try {
    localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
  } catch (error) {
    console.error('Error setting tokens:', error);
  }
};

export const removeTokens = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.TOKENS);
  } catch (error) {
    console.error('Error removing tokens:', error);
  }
};

export const getAccessToken = () => {
  const tokens = getTokens();
  return tokens?.accessToken || null;
};

export const getRefreshToken = () => {
  const tokens = getTokens();
  return tokens?.refreshToken || null;
};

export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

export const isAccessTokenValid = () => {
  const token = getAccessToken();
  return token && !isTokenExpired(token);
};

export const isRefreshTokenValid = () => {
  const token = getRefreshToken();
  return token && !isTokenExpired(token);
};

export const decodeToken = (token) => {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

export const getUserFromToken = (token) => {
  const decoded = decodeToken(token);
  return decoded?.user || decoded;
};

// User management
export const getUser = () => {
  try {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const setUser = (user) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (error) {
    console.error('Error setting user:', error);
  }
};

export const removeUser = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch (error) {
    console.error('Error removing user:', error);
  }
};

export const isAuthenticated = () => {
  return isAccessTokenValid() && getUser() !== null;
};

export const getUserId = () => {
  const user = getUser();
  return user?.id || null;
};

export const getUserRole = () => {
  const user = getUser();
  return user?.role || null;
};

export const getUserName = () => {
  const user = getUser();
  return user ? `${user.first_name} ${user.last_name}` : null;
};

// Auth headers
export const getAuthHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAuthHeader = () => {
  const token = getAccessToken();
  return token ? `Bearer ${token}` : null;
};

// Logout
export const clearAuthData = () => {
  removeTokens();
  removeUser();
};

// Session management
export const getSessionTimeout = () => {
  const token = getAccessToken();
  if (!token) return 0;
  
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    return Math.max(0, decoded.exp - currentTime);
  } catch (error) {
    return 0;
  }
};

export const isSessionExpired = () => {
  const timeout = getSessionTimeout();
  return timeout <= 0;
};

// Token refresh
export const shouldRefreshToken = () => {
  const token = getAccessToken();
  if (!token) return true;
  
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    const timeLeft = decoded.exp - currentTime;
    return timeLeft < 300; // Refresh if less than 5 minutes left
  } catch (error) {
    return true;
  }
};

// Role checks
export const isAdmin = () => {
  const role = getUserRole();
  return role === 'admin';
};

export const isLawyer = () => {
  const role = getUserRole();
  return role === 'lawyer';
};

export const isIntern = () => {
  const role = getUserRole();
  return role === 'intern';
};

export const isSecretary = () => {
  const role = getUserRole();
  return role === 'secretary';
};

export const hasRole = (role) => {
  const userRole = getUserRole();
  return userRole === role;
};

export const hasAnyRole = (roles) => {
  const userRole = getUserRole();
  return roles.includes(userRole);
};

export const hasPermission = (permission) => {
  const role = getUserRole();
  if (!role) return false;
  
  // Import permissions from constants
  const { ROLE_PERMISSIONS } = require('../../constants/roles.js');
  const permissions = ROLE_PERMISSIONS[role] || {};
  return permissions[permission] || false;
};

// Validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

export const isValidPhone = (phone) => {
  const phoneRegex = /^(\+90|0)?[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Password helpers
export const isStrongPassword = (password) => {
  if (!password || password.length < 8) return false;
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'Çok Zayıf', color: 'red' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  
  const levels = [
    { score: 0, label: 'Çok Zayıf', color: 'red' },
    { score: 2, label: 'Zayıf', color: 'orange' },
    { score: 4, label: 'Orta', color: 'yellow' },
    { score: 6, label: 'Güçlü', color: 'green' },
    { score: 8, label: 'Çok Güçlü', color: 'blue' },
  ];
  
  const level = levels.reduce((prev, curr) => {
    if (score >= curr.score) return curr;
    return prev;
  });
  
  return { score, ...level };
};

// Session storage helpers
export const setSessionItem = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting session item:', error);
  }
};

export const getSessionItem = (key) => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error('Error getting session item:', error);
    return null;
  }
};

export const removeSessionItem = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing session item:', error);
  }
};

// Remember me
export const setRememberMe = (email) => {
  try {
    localStorage.setItem('rememberMe', email);
  } catch (error) {
    console.error('Error setting remember me:', error);
  }
};

export const getRememberMe = () => {
  try {
    return localStorage.getItem('rememberMe') || '';
  } catch (error) {
    return '';
  }
};

export const clearRememberMe = () => {
  try {
    localStorage.removeItem('rememberMe');
  } catch (error) {
    console.error('Error clearing remember me:', error);
  }
};

// Auth events
export const emitAuthEvent = (event, data) => {
  try {
    const customEvent = new CustomEvent(`auth:${event}`, { detail: data });
    window.dispatchEvent(customEvent);
  } catch (error) {
    console.error('Error emitting auth event:', error);
  }
};

export const onAuthEvent = (event, callback) => {
  try {
    window.addEventListener(`auth:${event}`, callback);
    return () => window.removeEventListener(`auth:${event}`, callback);
  } catch (error) {
    console.error('Error adding auth event listener:', error);
    return () => {};
  }
};

export default {
  getTokens,
  setTokens,
  removeTokens,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  isAccessTokenValid,
  isRefreshTokenValid,
  decodeToken,
  getUserFromToken,
  getUser,
  setUser,
  removeUser,
  isAuthenticated,
  getUserId,
  getUserRole,
  getUserName,
  getAuthHeaders,
  getAuthHeader,
  clearAuthData,
  getSessionTimeout,
  isSessionExpired,
  shouldRefreshToken,
  isAdmin,
  isLawyer,
  isIntern,
  isSecretary,
  hasRole,
  hasAnyRole,
  hasPermission,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isStrongPassword,
  getPasswordStrength,
  setSessionItem,
  getSessionItem,
  removeSessionItem,
  setRememberMe,
  getRememberMe,
  clearRememberMe,
  emitAuthEvent,
  onAuthEvent,
};