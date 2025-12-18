// src/config.js
// Configuration for Better Days Platform

export const API_BASE_URL = 'https://better-days-backend.onrender.com';

// Environment detection
export const IS_DEV = import.meta.env.DEV;
export const IS_PROD = import.meta.env.PROD;

// API Endpoints
export const API_ENDPOINTS = {
  REGISTER: `${API_BASE_URL}/api/register`,
  SIGN_IN: `${API_BASE_URL}/api/signin`,
  USER_PROFILE: `${API_BASE_URL}/api/me`,
  CREATE_FORUM: `${API_BASE_URL}/api/forums`,
  HEALTH_CHECK: `${API_BASE_URL}/health`
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'betterDaysToken',
  USER_DATA: 'betterDaysUser'
};

// Token Management
export const getAuthToken = () => localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
export const getUserData = () => {
  const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
  return data ? JSON.parse(data) : null;
};
export const clearAuthData = () => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER_DATA);
};

// Default Headers for Authenticated Requests
export const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};
