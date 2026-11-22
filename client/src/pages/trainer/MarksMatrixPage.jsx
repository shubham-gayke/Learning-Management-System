import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getMarksMatrix } from '../../api/exams';
import { getBatches } from '../../api/batches';
import Skeleton from '../../components/common/Skeleton';
import {
  TableProperties,
  Download,
  Search,
  Layers,
  Award,
  Users,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowUpDown,
  RefreshCw,
  FileCheck,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MarksMatrixPage() {
  const [data, setData] = useState({
    students: [],
    exams: [],
    matrix: {},
    studentStats: {},
  });
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');

  const fetchMatrix = useCallback(async () => {
    try {
      setLoading(true);
      const [matrixRes, batchesRes] = await Promise.all([
        getMarksMatrix({
          batch: selectedBatch !== 'all' ? selectedBatch : undefined,
          search: search.trim() || undefined,
        }),
        getBatches(),
      ]);

      setData(matrixRes.data || { students: [], exams: [], matrix: {}, studentStats: {} });
      setBatches(batchesRes.data?.batches || []);
    } catch {
      toast.error('Failed to load marks matrix data.');
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, search]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  // Export to CSV / Excel
  const handleExportCSV = () => {
    if (!data.students.length || !data.exams.length) {
      toast.error('No data available to export.');
      return;
    }

    // CSV Headers
    const headers = [
      'Student Name',
      'Email',
      'Batch',
      ...data.exams.map((e) => `"${e.title} (${e.totalMarks} Marks)"`),
      'Exams Attempted',
      'Total Passed',
      'Average Percentage',
    ];

    // CSV Rows
    const rows = data.students.map((student) => {
      const sId = student._id;
      const stats = data.studentStats[sId] || {};

      const examMarks = data.exams.map((exam) => {
        const cell = data.matrix[sId]?.[exam._id];
        if (!cell) return '"N/A"';
        if (cell.status === 'terminated') return `"Terminated (0/${exam.totalMarks})"`;
        return `"${cell.score}/${cell.totalMarks} (${cell.percentage}%)"`;
      });

      return [
        `"${student.firstName} ${student.lastName}"`,
        `"${student.email}"`,
        `"${student.batch?.name || 'N/A'}"`,
        ...examMarks,
        stats.totalAttempted || 0,
        stats.totalPassed || 0,
        `"${stats.averagePercentage || 0}%"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Mentore_LMS_Marks_Matrix_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Excel-compatible CSV spreadsheet downloaded!');
  };

  // Class analytics summary
  const summary = useMemo(() => {
    const totalStudents = data.students.length;
    const totalExams = data.exams.length;
    let totalScoreSum = 0;
    let totalMaxScoreSum = 0;
    let totalTerminatedCount = 0;

    Object.values(data.studentStats).forEach((st) => {
      totalScoreSum += st.totalScore || 0;
      totalMaxScoreSum += st.totalMaxScore || 0;
      totalTerminatedCount += st.totalTerminated || 0;
    });

    const overallAvg =
      totalMaxScoreSum > 0 ? Math.round((totalScoreSum / totalMaxScoreSum) * 100) : 0;

    return { totalStudents, totalExams, overallAvg, totalTerminatedCount };
  }, [data]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-cyan-950/70 to-slate-950 p-6 sm:p-8 text-white shadow-2xl shadow-cyan-950/40">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-semibold text-cyan-200 backdrop-blur-md">
              <TableProperties className="h-4 w-4 text-cyan-400" />
              <span>Assessment Performance Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Excel-Style Marks Tracking Matrix
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/90 max-w-2xl leading-relaxed">
              Real-time multi-batch spreadsheet tracking every student candidate across all scheduled exams. Export directly to CSV for administrative records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/trainer/exams"
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-950/40 px-4 py-2.5 text-xs sm:text-sm font-semibold text-cyan-200 hover:bg-cyan-900/50 hover:text-white transition-all shadow-sm"
            >
              <FileCheck className="h-4 w-4" />
              <span>Exam Scheduler</span>
            </Link>

            <Link
              to="/trainer/student-progress"
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-950/40 px-4 py-2.5 text-xs sm:text-sm font-semibold text-cyan-200 hover:bg-cyan-900/50 hover:text-white transition-all shadow-sm"
            >
              <UserCheck className="h-4 w-4" />
              <span>Track Candidate</span>
            </Link>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export to Excel (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Candidates</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{summary.totalStudents}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Scheduled Exams</p>
          <p className="mt-1 text-2xl font-black text-cyan-600 dark:text-cyan-400">{summary.totalExams}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Class Overall Average</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.overallAvg}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-medium text-rose-500 dark:text-rose-400">Security Terminations</p>
          <p className="mt-1 text-2xl font-black text-rose-500 dark:text-rose-400">{summary.totalTerminatedCount}</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate name or email..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 focus:border-cyan-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-sm cursor-pointer"
          >
            <option value="all">All Batches</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>

          <button
            onClick={fetchMatrix}
            className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Excel Spreadsheet Matrix Container */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Skeleton key={n} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : data.students.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No student candidate records found.
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">
                  {/* Sticky Candidate Column */}
                  <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-950 py-3.5 px-4 min-w-[200px] border-r border-slate-200 dark:border-slate-800">
                    Student Candidate
                  </th>
                  <th className="py-3.5 px-3 min-w-[100px] text-center border-r border-slate-200 dark:border-slate-800">
                    Cohort
                  </th>

                  {/* Dynamic Exam Columns */}
                  {data.exams.map((exam) => (
                    <th
                      key={exam._id}
                      className="py-3.5 px-3 min-w-[150px] text-center border-r border-slate-200 dark:border-slate-800"
                    >
                      <div className="truncate max-w-[140px] mx-auto font-black text-slate-800 dark:text-slate-200">
                        {exam.title}
                      </div>
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">
                        ({exam.totalMarks} Marks)
                      </span>
                    </th>
                  ))}

                  {/* Aggregate Summary Columns */}
                  <th className="py-3.5 px-3 min-w-[90px] text-center font-bold">
                    Attempted
                  </th>
                  <th className="py-3.5 px-3 min-w-[80px] text-center font-bold text-emerald-600">
                    Passed
                  </th>
                  <th className="py-3.5 px-3 min-w-[90px] text-center font-bold text-cyan-600">
                    Average %
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {data.students.map((student, idx) => {
                  const sId = student._id;
                  const stats = data.studentStats[sId] || {};

                  return (
                    <tr
                      key={sId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Sticky Student Name & Email */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-3 px-4 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <Link
                          to={`/trainer/student-progress?studentId=${sId}`}
                          className="font-extrabold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                        >
                          {student.firstName} {student.lastName}
                        </Link>
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                          {student.email}
                        </p>
                      </td>

                      {/* Cohort Batch */}
                      <td className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-800">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {student.batch?.name || 'N/A'}
                        </span>
                      </td>

                      {/* Dynamic Exam Marks Cells */}
                      {data.exams.map((exam) => {
                        const cell = data.matrix[sId]?.[exam._id];

                        if (!cell) {
                          return (
                            <td
                              key={exam._id}
                              className="py-3 px-3 text-center text-slate-300 dark:text-slate-600 border-r border-slate-200 dark:border-slate-800 font-medium"
                            >
                              -
                            </td>
                          );
                        }

                        if (cell.status === 'terminated') {
                          return (
                            <td
                              key={exam._id}
                              className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20"
                              title={cell.terminationReason || 'Terminated by anti-cheating proctor'}
                            >
                              <div className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-400/20">
                                <ShieldAlert className="h-3 w-3" />
                                <span>0/{exam.totalMarks} (Violated)</span>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={exam._id}
                            className="py-3 px-3 text-center border-r border-slate-200 dark:border-slate-800"
                          >
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {cell.score}/{exam.totalMarks}
                            </span>
                            <span
                              className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                cell.passed
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400'
                              }`}
                            >
                              {cell.percentage}%
                            </span>
                          </td>
                        );
                      })}

                      {/* Aggregate Summary */}
                      <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                        {stats.totalAttempted || 0} / {data.exams.length}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {stats.totalPassed || 0}
                      </td>
                      <td className="py-3 px-3 text-center font-black text-cyan-600 dark:text-cyan-400">
                        {stats.averagePercentage || 0}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
