import api from './axios';

export const getBatches = () => api.get('/api/batches').then((res) => res.data);

export const createBatch = (data) => api.post('/api/batches', data).then((res) => res.data);

export const updateBatch = (id, data) => api.patch(`/api/batches/${id}`, data).then((res) => res.data);
