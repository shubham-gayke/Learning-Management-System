import api from './axios';

/**
 * Submit a bug report with optional screenshot and voice note.
 * @param {FormData} formData
 */
export const submitBugReport = (formData) =>
  api
    .post('/api/bug-reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);

/**
 * Fetch all bug reports (trainer / dev review).
 */
export const getBugReports = (params) =>
  api.get('/api/bug-reports', { params }).then((res) => res.data);

/**
 * Update a bug report status.
 */
export const updateBugReport = (id, data) =>
  api.patch(`/api/bug-reports/${id}`, data).then((res) => res.data);
