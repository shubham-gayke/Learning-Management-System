import api from './axios';

export const getLectureNotes = (lectureId) =>
  api.get(`/api/lectures/${lectureId}/notes`).then((res) => res.data);

export const uploadLectureNote = (lectureId, data) => {
  if (data instanceof FormData) {
    return api.post(`/api/lectures/${lectureId}/notes`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  }
  return api.post(`/api/lectures/${lectureId}/notes`, data).then((res) => res.data);
};

export const deleteLectureNote = (noteId) =>
  api.delete(`/api/notes/${noteId}`).then((res) => res.data);
