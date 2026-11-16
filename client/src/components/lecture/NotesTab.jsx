import { useState, useEffect, useRef } from 'react';
import { getLectureNotes } from '../../api/notes';
import { getPrivateNote, savePrivateNote } from '../../api/lectures';
import { apiUrl } from '../../api/axios';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import {
  FileText,
  File,
  Image as ImageIcon,
  Download,
  Eye,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cloud,
} from 'lucide-react';
import toast from 'react-hot-toast';

function getGoogleDriveEmbedUrl(link) {
  if (!link) return null;
  const matchFile = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile && matchFile[1]) {
    return `https://drive.google.com/file/d/${matchFile[1]}/preview`;
  }
  const matchId = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://drive.google.com/file/d/${matchId[1]}/preview`;
  }
  return link;
}

function getGoogleDriveDownloadUrl(link) {
  if (!link) return null;
  const match = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return link;
}

export default function NotesTab({ lectureId, isTrainer }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Private notes state
  const [privateNoteText, setPrivateNoteText] = useState('');
  const [isSavingPrivateNote, setIsSavingPrivateNote] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const autosaveTimeoutRef = useRef(null);

  // Lightbox / Viewer modal
  const [viewerItem, setViewerItem] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [notesRes, privateRes] = await Promise.allSettled([
          getLectureNotes(lectureId),
          getPrivateNote(lectureId),
        ]);

        if (notesRes.status === 'fulfilled') {
          setNotes(notesRes.value.data?.notes || []);
        }
        if (privateRes.status === 'fulfilled') {
          setPrivateNoteText(privateRes.value.data?.text || '');
        }
      } catch {
        toast.error('Failed to load notes');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [lectureId]);

  // Autosave private note with debounce (800ms)
  const handlePrivateNoteChange = (e) => {
    const text = e.target.value;
    setPrivateNoteText(text);

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSavingPrivateNote(true);
        await savePrivateNote(lectureId, text);
        setLastSavedTime(new Date());
      } catch {
        // silent fail for autosave
      } finally {
        setIsSavingPrivateNote(false);
      }
    }, 800);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Lecture Notes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Trainer Notes & Resources
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Attached learning materials, study PDFs, code snippets, and diagrams
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
            <FileText className="mx-auto h-8 w-8 text-slate-400 mb-1" />
            No notes have been attached to this lecture yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {notes.map((note) => {
              const isDriveLink = !!note.driveLink;
              const fileUrl = isDriveLink
                ? getGoogleDriveEmbedUrl(note.driveLink)
                : apiUrl(`/api/notes/${note._id}/file`);
              const downloadUrl = isDriveLink
                ? (getGoogleDriveDownloadUrl(note.driveLink) || note.driveLink)
                : apiUrl(`/api/notes/${note._id}/file?download=true`);

              return (
                <div
                  key={note._id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-800 transition-all hover:shadow-md hover:border-cyan-400/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-cyan-500/10 p-2 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
                      {isDriveLink ? (
                        <Cloud className="h-5 w-5" />
                      ) : note.type === 'pdf' ? (
                        <File className="h-5 w-5" />
                      ) : note.type === 'image' ? (
                        <ImageIcon className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {note.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          {isDriveLink ? 'Google Drive' : note.type}
                        </span>
                        {isDriveLink && (
                          <span className="text-[10px] text-slate-400">Cloud Stream</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {note.textContent && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 whitespace-pre-wrap font-mono dark:bg-slate-900/60 dark:text-slate-300 max-h-32 overflow-y-auto">
                      {note.textContent}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    {note.type !== 'text' || isDriveLink ? (
                      <button
                        onClick={() => setViewerItem(note)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400"
                      >
                        <Eye className="h-3.5 w-3.5" /> Read / Preview
                      </button>
                    ) : (
                      <span />
                    )}

                    <div className="flex items-center gap-2">
                      {isDriveLink && (
                        <a
                          href={note.driveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
                          title="Open directly in Google Drive"
                        >
                          <ExternalLink className="h-3 w-3" /> Drive
                        </a>
                      )}

                      {note.allowDownload || isTrainer ? (
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={!isDriveLink}
                          className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-500/25 dark:bg-cyan-950 dark:text-cyan-300"
                        >
                          <Download className="h-3 w-3" /> Download
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Lock className="h-3 w-3" /> View-only
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Private Notes (Autosaving) Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              My Private Notes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Only you can see these notes. Autosaves as you type.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            {isSavingPrivateNote ? (
              <span className="text-amber-500 animate-pulse">Saving...</span>
            ) : lastSavedTime ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </span>
            ) : null}
          </div>
        </div>

        <textarea
          rows={4}
          value={privateNoteText}
          onChange={handlePrivateNoteChange}
          placeholder="Jot down your questions, key takeaways, code notes..."
          className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900 dark:focus:ring-indigo-400/20"
        />
      </div>

      {/* Lightbox / PDF In-page Viewer Modal */}
      {viewerItem && (
        <Modal
          isOpen={!!viewerItem}
          onClose={() => setViewerItem(null)}
          title={viewerItem.title}
          size="lg"
        >
          <div className="space-y-4">
            {viewerItem.driveLink ? (
              <div className="h-[75vh] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950">
                <iframe
                  src={getGoogleDriveEmbedUrl(viewerItem.driveLink)}
                  title={viewerItem.title}
                  className="h-full w-full border-0"
                  allow="autoplay"
                />
              </div>
            ) : viewerItem.type === 'image' ? (
              <div className="flex items-center justify-center rounded-xl bg-slate-950 p-2">
                <img
                  src={apiUrl(`/api/notes/${viewerItem._id}/file`)}
                  alt={viewerItem.title}
                  className="max-h-[70vh] max-w-full rounded-lg object-contain"
                />
              </div>
            ) : viewerItem.type === 'pdf' ? (
              <div className="h-[70vh] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <iframe
                  src={apiUrl(`/api/notes/${viewerItem._id}/file`)}
                  title={viewerItem.title}
                  className="h-full w-full"
                />
              </div>
            ) : null}

            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-3">
                {viewerItem.driveLink && (
                  <a
                    href={viewerItem.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:underline dark:text-cyan-400"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open in Google Drive
                  </a>
                )}
                <span className="text-xs text-slate-500">
                  {viewerItem.allowDownload ? 'Download / external access allowed' : 'In-page preview only'}
                </span>
              </div>
              <Button variant="secondary" onClick={() => setViewerItem(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
