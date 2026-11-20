import api from './axios';

export const register = (data) => api.post('/api/auth/register', data).then((res) => res.data);

export const login = (data) => api.post('/api/auth/login', data).then((res) => res.data);

export const logout = () => api.post('/api/auth/logout').then((res) => res.data);

export const getMe = () => api.get('/api/auth/me').then((res) => res.data);

export const generate2FA = () => api.post('/api/auth/2fa/generate').then((res) => res.data);

export const verifySetup2FA = (code) =>
  api.post('/api/auth/2fa/verify-setup', { code }).then((res) => res.data);

export const verifyLogin2FA = (twoFactorToken, code) =>
  api.post('/api/auth/2fa/verify-login', { twoFactorToken, code }).then((res) => res.data);

export const disable2FA = (code) =>
  api.post('/api/auth/2fa/disable', { code }).then((res) => res.data);

export const forgotPasswordVerifyEmail = (email) =>
  api.post('/api/auth/forgot-password/verify-email', { email }).then((res) => res.data);

export const forgotPasswordVerify2FA = (resetToken, code) =>
  api.post('/api/auth/forgot-password/verify-2fa', { resetToken, code }).then((res) => res.data);

export const forgotPasswordReset = (verifiedToken, newPassword, confirmPassword) =>
  api.post('/api/auth/forgot-password/reset', { verifiedToken, newPassword, confirmPassword }).then((res) => res.data);
