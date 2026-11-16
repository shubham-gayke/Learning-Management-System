import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getLectures,
  updateLecture,
  deleteLecture,
  retryLecture,
} from '../../api/lectures';
import { getBatches } from '../../api/batches';
import {
  getLectureNotes,
  uploadLectureNote,
  deleteLectureNote,
} from '../../api/notes';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  Video,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Lock,
  Download,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

function formatRecordedDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const datePart = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const timePart = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
  return `${datePart} · ${timePart}`;
}

export default function ManageLecturesPage() {
  const { user } = useAuth();
  const allowedCategories = user?.allowedCategories;

  const [lectures, setLectures] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Edit Title Modal
  const [editingLecture, setEditingLecture] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('AI Lectures');
  const [editPublished, setEditPublished] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Manage Notes Modal
  const [notesModalLecture, setNotesModalLecture] = useState(null);
  const [lectureNotes, setLectureNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteType, setNoteType] = useState('drive_link'); // 'drive_link' | 'text' | 'pdf' | 'image'
  const [noteDriveLink, setNoteDriveLink] = useState('');
  const [noteTextContent, setNoteTextContent] = useState('');
  const [noteFile, setNoteFile] = useState(null);
  const [allowDownload, setAllowDownload] = useState(true);
  const [uploadingNote, setUploadingNote] = useState(false);

  const fetchLectures = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedBatch) params.batch = selectedBatch;
      if (selectedCategory) params.category = selectedCategory;

      const res = await getLectures(params);
      setLectures(res.data?.lectures || []);
    } catch {
      toast.error('Failed to load lectures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getBatches()
      .then((res) => setBatches(res.data?.batches || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLectures();
  }, [selectedBatch, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLectures();
  };

  // Toggle publish
  const handleTogglePublish = async (lec) => {
    try {
      await updateLecture(lec._id, { isPublished: !lec.isPublished });
      toast.success(!lec.isPublished ? 'Lecture published' : 'Lecture unpublished');
      fetchLectures();
    } catch {
      toast.error('Failed to update publish status');
    }
  };

  // Delete lecture
  const handleDelete = async (lec) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${lec.title}"? This permanently removes all HLS files, notes, and discussion data.`
      )
    ) {
      return;
    }
    try {
      await deleteLecture(lec._id);
      toast.success('Lecture deleted');
      fetchLectures();
    } catch {
      toast.error('Failed to delete lecture');
    }
  };

  // Retry processing
  const handleRetry = async (lecId) => {
    try {
      await retryLecture(lecId);
      toast.success('Re-queued lecture processing');
      fetchLectures();
    } catch {
      toast.error('Failed to retry');
    }
  };

  // Edit title modal
  const handleOpenEdit = (lec) => {
    setEditingLecture(lec);
    setEditTitle(lec.title);
    setEditCategory(lec.category || 'AI Lectures');
    setEditPublished(lec.isPublished);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    try {
      setSavingEdit(true);
      await updateLecture(editingLecture._id, {
        title: editTitle.trim(),
        category: editCategory,
        isPublished: editPublished,
      });
      toast.success('Lecture updated');
      setEditingLecture(null);
      fetchLectures();
    } catch {
      toast.error('Failed to update lecture');
    } finally {
      setSavingEdit(false);
    }
  };

  // Notes Modal
  const handleOpenNotes = async (lec) => {
    setNotesModalLecture(lec);
    setNoteTitle('');
    setNoteTextContent('');
    setNoteFile(null);
    setAllowDownload(false);
    try {
      setLoadingNotes(true);
      const res = await getLectureNotes(lec._id);
      setLectureNotes(res.data?.notes || []);
    } catch {
      toast.error('Failed to load notes');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleUploadNote = async (e) => {
    e.preventDefault();
    if (!noteTitle.trim()) {
      toast.error('Note title is required');
      return;
    }
    if (noteType === 'drive_link' && !noteDriveLink.trim()) {
      toast.error('Please paste the Google Drive link');
      return;
    }
    if ((noteType === 'pdf' || noteType === 'image') && !noteFile) {
      toast.error('Please choose a file');
      return;
    }

    try {
      setUploadingNote(true);

      if (noteType === 'drive_link') {
        await uploadLectureNote(notesModalLecture._id, {
          title: noteTitle.trim(),
          type: 'drive_link',
          driveLink: noteDriveLink.trim(),
          allowDownload,
        });
      } else if (noteType === 'text') {
        await uploadLectureNote(notesModalLecture._id, {
          title: noteTitle.trim(),
          type: 'text',
          textContent: noteTextContent,
          allowDownload,
        });
      } else {
        const formData = new FormData();
        formData.append('type', noteType);
        formData.append('title', noteTitle.trim());
        formData.append('allowDownload', allowDownload);
        if (noteFile) formData.append('file', noteFile);
        await uploadLectureNote(notesModalLecture._id, formData);
      }

      toast.success('Note attached successfully');

      // Refresh notes list
      const res = await getLectureNotes(notesModalLecture._id);
      setLectureNotes(res.data?.notes || []);

      setNoteTitle('');
      setNoteDriveLink('');
      setNoteTextContent('');
      setNoteFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to attach note');
    } finally {
      setUploadingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await deleteLectureNote(noteId);
      toast.success('Note deleted');
      setLectureNotes((prev) => prev.filter((n) => n._id !== noteId));
    } catch {
      toast.error('Failed to delete note');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Manage Lectures
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Edit titles, manage publish status, upload study notes, and monitor transcoding.
          </p>
        </div>
        <Link to="/trainer/upload">
          <Button variant="primary" icon={Plus}>
            Upload New Video
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search lectures by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <Button variant="secondary" type="submit" size="md">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">
              {Array.isArray(allowedCategories) && allowedCategories.length > 0
                ? 'All Assigned Tracks'
                : 'All Categories'}
            </option>
            {Array.isArray(allowedCategories) && allowedCategories.length > 0 ? (
              allowedCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))
            ) : (
              <>
                <option value="Linux Lectures">Linux Lectures</option>
                <option value="AWS Lectures">AWS Lectures</option>
                <option value="DevOps Lectures">DevOps Lectures</option>
                <option value="AI Lectures">AI Lectures</option>
                <option value="Communication Skill Lectures">Communication Skill Lectures</option>
                <option value="Job Portal Optimization + Resume Building Session">
                  Job Portal & Resume
                </option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Lectures List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : lectures.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No lectures found"
          description="Upload your first OBS recording from Google Drive to get started."
          actionText="Upload Lecture"
          onAction={() => (window.location.href = '/trainer/upload')}
        />
      ) : (
        <div className="space-y-3.5">
          {lectures.map((lec) => {
            const dateLabel = formatRecordedDate(lec.recordedAt);
            const canManageLec =
              !Array.isArray(allowedCategories) ||
              allowedCategories.length === 0 ||
              allowedCategories.includes(lec.category);

            return (
              <div
                key={lec._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-800"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                      {lec.batch?.name || 'Batch'}
                    </span>
                    <span
                      className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
                        lec.category === 'Linux Lectures'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400'
                          : lec.category === 'AWS Lectures'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400'
                          : lec.category === 'DevOps Lectures'
                          ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400'
                          : lec.category === 'AI Lectures'
                          ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300'
                          : lec.category === 'Communication Skill Lectures'
                          ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300'
                          : lec.category === 'Job Portal Optimization + Resume Building Session'
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {lec.category || 'Linux Lectures'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        lec.status === 'ready'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : lec.status === 'failed'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 animate-pulse'
                      }`}
                    >
                      {lec.status} {lec.status === 'processing' ? `${lec.progressPercent || 0}%` : ''}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        lec.isPublished
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {lec.isPublished ? 'Published' : 'Hidden'}
                    </span>
                  </div>

                  {/* Video Name · 15 Nov 2026 · 10:42 AM */}
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {lec.title} · {dateLabel}
                  </h3>

                  {lec.errorMessage && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Error: {lec.errorMessage}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 sm:self-center">
                  {lec.status === 'ready' && (
                    <Link to={`/lecture/${lec._id}`} target="_blank">
                      <Button variant="ghost" size="sm" icon={ExternalLink} className="text-xs">
                        Player
                      </Button>
                    </Link>
                  )}

                  {lec.status === 'failed' && canManageLec && (
                    <Button
                      variant="danger"
                      size="sm"
                      icon={RefreshCw}
                      onClick={() => handleRetry(lec._id)}
                      className="text-xs"
                    >
                      Retry
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={FileText}
                    onClick={() => handleOpenNotes(lec)}
                    className="text-xs"
                  >
                    Notes
                  </Button>

                  {canManageLec && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(lec)}
                        className="text-xs"
                      >
                        {lec.isPublished ? 'Unpublish' : 'Publish'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Edit2}
                        onClick={() => handleOpenEdit(lec)}
                        className="text-xs"
                      >
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDelete(lec)}
                        className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Title Modal */}
      <Modal
        isOpen={!!editingLecture}
        onClose={() => setEditingLecture(null)}
        title="Edit Lecture Details"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Lecture Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category / Track
            </label>
            <select
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {Array.isArray(allowedCategories) && allowedCategories.length > 0 ? (
                allowedCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))
              ) : (
                <>
                  <option value="Linux Lectures">Linux Lectures</option>
                  <option value="AWS Lectures">AWS Lectures</option>
                  <option value="DevOps Lectures">DevOps Lectures</option>
                  <option value="AI Lectures">AI Lectures</option>
                  <option value="Communication Skill Lectures">Communication Skill Lectures</option>
                  <option value="Job Portal Optimization + Resume Building Session">
                    Job Portal Optimization + Resume Building Session
                  </option>
                </>
              )}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editPub"
              checked={editPublished}
              onChange={(e) => setEditPublished(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="editPub" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Published (Visible to batch students)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="secondary" type="button" onClick={() => setEditingLecture(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={savingEdit}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage Notes Modal */}
      <Modal
        isOpen={!!notesModalLecture}
        onClose={() => setNotesModalLecture(null)}
        title={`Manage Notes — ${notesModalLecture?.title}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Upload New Note Form */}
          {user?.canUploadNotes === false ? (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs font-semibold text-amber-700 dark:text-amber-300">
              ⚠️ Note uploading is disabled for your trainer account.
            </div>
          ) : Array.isArray(allowedCategories) &&
            allowedCategories.length > 0 &&
            !allowedCategories.includes(notesModalLecture?.category) ? (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs font-semibold text-amber-700 dark:text-amber-300">
              ⚠️ You are only authorized to upload notes for: {allowedCategories.join(', ')}.
            </div>
          ) : (
            <form onSubmit={handleUploadNote} className="rounded-xl bg-slate-50 p-4 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-700/60 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Attach New Resource
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Note Title"
                  placeholder="e.g. Session Slides / Summary"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="drive_link">Google Drive Link (PDF / Slides / Notes) ⭐ Zero Storage</option>
                    <option value="text">In-App Text / Code Note</option>
                    <option value="pdf">Direct PDF File Upload (GridFS)</option>
                    <option value="image">Direct Image Upload (GridFS)</option>
                  </select>
                </div>
              </div>

              {noteType === 'drive_link' ? (
                <div>
                  <Input
                    label="Google Drive Share Link"
                    placeholder="https://drive.google.com/file/d/1aBcDeFg.../view?usp=sharing"
                    value={noteDriveLink}
                    onChange={(e) => setNoteDriveLink(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-[11px] text-cyan-600 dark:text-cyan-400">
                    💡 Zero database storage used. Ensure the file sharing in Google Drive is set to "Anyone with the link can view".
                  </p>
                </div>
              ) : noteType === 'text' ? (
                <textarea
                  rows={3}
                  placeholder="Write your note or markdown instructions here..."
                  value={noteTextContent}
                  onChange={(e) => setNoteTextContent(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Choose File (PDF or Image, max 15MB)
                  </label>
                  <input
                    type="file"
                    accept={noteType === 'pdf' ? '.pdf' : 'image/*'}
                    onChange={(e) => setNoteFile(e.target.files[0])}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 dark:file:bg-cyan-950 dark:file:text-cyan-300"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Allow students to download / open external file</span>
                </label>

                <Button variant="primary" size="sm" type="submit" isLoading={uploadingNote}>
                  Attach Note
                </Button>
              </div>
            </form>
          )}

          {/* Existing Notes List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Attached Notes ({lectureNotes.length})
            </h4>

            {loadingNotes ? (
              <Skeleton className="h-20 rounded-xl" />
            ) : lectureNotes.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No notes attached yet.</p>
            ) : (
              <div className="space-y-2">
                {lectureNotes.map((note) => (
                  <div
                    key={note._id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {note.title}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {note.type}
                        </span>
                        {note.allowDownload ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600">
                            <Download className="h-2.5 w-2.5" /> Downloadable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                            <Lock className="h-2.5 w-2.5" /> View-only
                          </span>
                        )}
                      </div>
                    </div>
                    {user?.canUploadNotes !== false &&
                      (!Array.isArray(allowedCategories) ||
                        allowedCategories.length === 0 ||
                        allowedCategories.includes(notesModalLecture?.category)) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleDeleteNote(note._id)}
                          className="text-xs text-rose-600 hover:text-rose-700"
                        >
                          Remove
                        </Button>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
