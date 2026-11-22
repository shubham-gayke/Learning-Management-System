import api from './axios';

export const getExams = (params) =>
  api.get('/api/exams', { params }).then((res) => res.data);

export const getExamById = (id) =>
  api.get(`/api/exams/${id}`).then((res) => res.data);

export const createExam = (data) =>
  api.post('/api/exams', data).then((res) => res.data);

export const updateExam = (id, data) =>
  api.put(`/api/exams/${id}`, data).then((res) => res.data);

export const toggleExamStatus = (id, status) =>
  api.patch(`/api/exams/${id}/status`, { status }).then((res) => res.data);

export const deleteExam = (id) =>
  api.delete(`/api/exams/${id}`).then((res) => res.data);

export const startExam = (id) =>
  api.post(`/api/exams/${id}/start`).then((res) => res.data);

export const submitExam = (id, data) =>
  api.post(`/api/exams/${id}/submit`, data).then((res) => res.data);

export const terminateExam = (id, data) =>
  api.post(`/api/exams/${id}/terminate`, data).then((res) => res.data);

export const getExamLeaderboard = (id, params) =>
  api.get(`/api/exams/${id}/leaderboard`, { params }).then((res) => res.data);

export const getExamSubmissions = (id) =>
  api.get(`/api/exams/${id}/submissions`).then((res) => res.data);

export const getMarksMatrix = (params) =>
  api.get('/api/exams/marks-matrix', { params }).then((res) => res.data);

export const getStudentProgress = (studentId) =>
  api.get(`/api/exams/student-progress/${studentId}`).then((res) => res.data);

export const getMyExamHistory = () =>
  api.get('/api/exams/my-history').then((res) => res.data);
