import api from './axios';

export const getAllowedEmails = (params) =>
  api.get('/api/trainer/allowed-emails', { params }).then((res) => res.data);

export const addAllowedEmails = (data) =>
  api.post('/api/trainer/allowed-emails', data).then((res) => res.data);

export const deleteAllowedEmail = (id) =>
  api.delete(`/api/trainer/allowed-emails/${id}`).then((res) => res.data);
