import api from './axios';

// Student self routes
export const getProfile = () =>
  api.get('/api/student/profile').then((res) => res.data);

export const updateBatch = (batchId) =>
  api.patch('/api/student/batch', { batchId }).then((res) => res.data);

// Trainer routes for student management
export const getStudents = (params) =>
  api.get('/api/trainer/students', { params }).then((res) => res.data);

export const updateStudent = (id, data) =>
  api.patch(`/api/trainer/students/${id}`, data).then((res) => res.data);

export const deleteStudent = (id) =>
  api.delete(`/api/trainer/students/${id}`).then((res) => res.data);

export const getTrainerStats = () =>
  api.get('/api/trainer/stats').then((res) => res.data);
