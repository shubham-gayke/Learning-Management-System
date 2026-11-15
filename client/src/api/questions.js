import api from './axios';

export const getLectureQuestions = (lectureId) =>
  api.get(`/api/lectures/${lectureId}/questions`).then((res) => res.data);

export const askQuestion = (lectureId, data) =>
  api.post(`/api/lectures/${lectureId}/questions`, data).then((res) => res.data);

export const addQuestionMessage = (questionId, data) =>
  api.post(`/api/questions/${questionId}/messages`, data).then((res) => res.data);

export const updateQuestion = (questionId, data) =>
  api.patch(`/api/questions/${questionId}`, data).then((res) => res.data);

export const deleteQuestion = (questionId) =>
  api.delete(`/api/questions/${questionId}`).then((res) => res.data);

export const getStudentQuestions = () =>
  api.get('/api/student/questions').then((res) => res.data);

export const getTrainerQuestions = (params) =>
  api.get('/api/trainer/questions', { params }).then((res) => res.data);

export const getUnreadNotificationsCount = () =>
  api.get('/api/notifications/unread').then((res) => res.data);
