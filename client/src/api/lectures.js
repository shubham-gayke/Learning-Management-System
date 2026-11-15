import api from './axios';

export const getLectures = (params) =>
  api.get('/api/lectures', { params }).then((res) => res.data);

export const getLecture = (id) =>
  api.get(`/api/lectures/${id}`).then((res) => res.data);

export const uploadLecture = (data) =>
  api.post('/api/lectures', data).then((res) => res.data);

export const updateLecture = (id, data) =>
  api.patch(`/api/lectures/${id}`, data).then((res) => res.data);

export const deleteLecture = (id) =>
  api.delete(`/api/lectures/${id}`).then((res) => res.data);

export const retryLecture = (id) =>
  api.post(`/api/lectures/${id}/retry`).then((res) => res.data);

// Playback progress
export const getProgress = (lectureId) =>
  api.get(`/api/lectures/${lectureId}/progress`).then((res) => res.data);

export const saveProgress = (lectureId, data) =>
  api.put(`/api/lectures/${lectureId}/progress`, data).then((res) => res.data);

// Private notes
export const getPrivateNote = (lectureId) =>
  api.get(`/api/lectures/${lectureId}/private-note`).then((res) => res.data);

export const savePrivateNote = (lectureId, text) =>
  api.put(`/api/lectures/${lectureId}/private-note`, { text }).then((res) => res.data);
