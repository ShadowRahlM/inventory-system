import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });
        
        const { access } = response.data;
        localStorage.setItem('access_token', access);
        
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username: string, password: string) =>
    api.post('/auth/token/', { username, password }),
  register: (username: string, password: string) =>
    api.post('/auth/register/', { username, password }),
  refreshToken: (refresh: string) =>
    api.post('/auth/token/refresh/', { refresh }),
  me: () =>
    api.get('/auth/me/').then(r => r.data),
};

export const inventoryAPI = {
  tiles: {
    list: () => api.get('/inventory/tiles/'),
    create: (data: any) => api.post('/inventory/tiles/', data),
    get: (id: string) => api.get(`/inventory/tiles/${id}/`),
    update: (id: string, data: any) => api.put(`/inventory/tiles/${id}/`, data),
    delete: (id: string) => api.delete(`/inventory/tiles/${id}/`),
  },
  batches: {
    list: () => api.get('/inventory/batches/'),
    create: (data: any) => api.post('/inventory/batches/', data),
    get: (id: string) => api.get(`/inventory/batches/${id}/`),
    update: (id: string, data: any) => api.put(`/inventory/batches/${id}/`, data),
    delete: (id: string) => api.delete(`/inventory/batches/${id}/`),
  },
  inventory: {
    list: () => api.get('/inventory/inventory/'),
    get: (id: string) => api.get(`/inventory/inventory/${id}/`),
    availableStock: (tileId: string) => api.get(`/inventory/inventory/available_stock/?tile_id=${tileId}`),
  },
  movements: {
    list: () => api.get('/inventory/movements/'),
    get: (id: string) => api.get(`/inventory/movements/${id}/`),
  },
  operations: {
    receive: (data: any) => api.post('/inventory/operations/receive/', data),
    dispatch: (data: any) => api.post('/inventory/operations/issue_dispatch/', data),
    adjust: (data: any) => api.post('/inventory/operations/adjust/', data),
    transfer: (data: any) => api.post('/inventory/operations/transfer/', data),
    stockTake: (data: any) => api.post('/inventory/operations/stock_take/', data),
  },
};

export default api;