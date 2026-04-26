import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor - attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post(`${API_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken } = res.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getProfile: () => api.get('/auth/profile'),
};

export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  getBalance: () => api.get('/user/balance'),
  getNotifications: (params) => api.get('/user/notifications', { params }),
  markRead: () => api.put('/user/notifications/read'),
  getRisk: () => api.get('/user/risk'),
};

export const transactionAPI = {
  initiate: (data) => api.post('/transactions/initiate', data),
  verifyOtp: (data) => api.post('/transactions/verify-otp', data),
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  getPending: () => api.get('/transactions/manager/pending'),
  approve: (data) => api.post('/transactions/manager/approve', data),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
  toggleStatus: (userId) => api.put(`/admin/users/${userId}/status`),
  getFraudLogs: (params) => api.get('/admin/fraud-logs', { params }),
  getBlockchain: () => api.get('/admin/blockchain'),
  validateBlockchain: () => api.get('/admin/blockchain/validate'),
  getActivityLogs: (params) => api.get('/admin/activity-logs', { params }),
  getLoginAttempts: (params) => api.get('/admin/login-attempts', { params }),
};

export default api;
