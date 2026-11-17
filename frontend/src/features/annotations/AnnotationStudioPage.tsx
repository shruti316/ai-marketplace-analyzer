import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Tag,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  UserCheck,
} from 'lucide-react';
import { annotationService, AnnotationTask } from '../../services/annotationService';
import { Button } from '../../components/ui/Button';

export const AnnotationStudioPage: React.FC = () => {
  const [page, setPage] = useState<number>(1);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTask, setSelectedTask] = useState<AnnotationTask | null>(null);

  // Fetch annotation tasks
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['annotation-tasks', page, selectedStatus],
    queryFn: () =>
      annotationService.getTasks({
        page,
        limit: 10,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
      }),
  });

  const totalPages = tasksData?.pagination?.totalPages || 1;
  const totalTasks = tasksData?.pagination?.total || 600;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ADJUDICATED':
        return { label: 'Adjudicated', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'IN_REVIEW':
        return { label: 'In Review', class: 'bg-amber-50 text-amber-800 border-amber-200' };
      default:
        return { label: 'Pending Queue', class: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0D1B2A] flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#3D7584]" />
            <span>Human-in-the-Loop Annotation Studio</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ground-truth curation queue, expert consensus scoring, and anomaly adjudication workflow
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
          <UserCheck className="w-4 h-4 text-[#3D7584]" />
          <span>{totalTasks} Curated Evaluation Tasks</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#DCE5E7] shadow-soft">
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {['ALL', 'ADJUDICATED', 'IN_REVIEW', 'PENDING'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setSelectedStatus(st);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all border ${
                selectedStatus === st
                  ? 'bg-[#0D1B2A] text-white border-transparent'
                  : 'bg-[#FAF7F2] text-slate-600 hover:bg-slate-200 border-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Task Queues' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-mono text-slate-400 hidden sm:block">
          Guidelines: v1.4_ONTOLOGY
        </span>
      </div>

      {/* Main Layout: Left Task Feed, Right Inspection Tray */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Task List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 animate-pulse space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : tasksData?.items.map((task) => {
            const isSelected = selectedTask?.id === task.id;
            const badge = getStatusBadge(task.task_status);

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-[#3D7584] shadow-md ring-1 ring-[#3D7584]/20'
                    : 'bg-white border-[#DCE5E7] hover:border-slate-300 hover:shadow-soft'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-[#3D7584] bg-[#EBF2F4] px-2 py-0.5 rounded">
                      {task.id}
                    </span>
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      {task.target_entity_type} • {task.marketplace}
                    </span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.class}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="pt-2 space-y-1">
                  <p className="text-xs font-semibold text-[#0D1B2A] line-clamp-1">
                    {task.product_title || task.canonical_product_id}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400">
                    Target: {task.target_entity_id}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Task Detail Inspector (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#DCE5E7] shadow-soft p-6 space-y-5 sticky top-20">
          {selectedTask ? (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-200">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                  Task Inspection Panel
                </span>
                <h3 className="text-sm font-bold text-[#0D1B2A] font-mono mt-0.5">
                  {selectedTask.id}
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Canonical Product:</span>
                  <p className="font-mono text-[#3D7584] font-semibold mt-0.5">
                    {selectedTask.canonical_product_id}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Target Entity:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedTask.target_entity_type} ({selectedTask.target_entity_id})
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Target Guidelines Version:</span>
                  <p className="font-mono text-slate-600 mt-0.5">
                    {selectedTask.target_guidelines_version}
                  </p>
                </div>
              </div>

              {/* Task Payload JSON Inspector */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 block">
                  Ground Truth Evidence Payload:
                </span>
                <pre className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#BAC7CA] text-[11px] font-mono text-slate-800 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedTask.task_payload_json, null, 2)}
                </pre>
              </div>

              {/* Adjudication Status Info */}
              <div className="p-3.5 rounded-xl bg-[#EBF2F4] border border-[#BAC7CA] text-xs text-[#1E3E47] space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[#3D7584]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Gold Standard Consensus</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Historical adjudication records anchor ground-truth labels across our Indian e-commerce benchmark partitions.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-700">Select a Task to Inspect</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Choose any annotation task from the queue to view its forensic payload, review metadata, and consensus record.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
