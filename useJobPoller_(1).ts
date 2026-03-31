import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/* ─── TYPES ──────────────────────────────────────────────────── */
export type JobStatus =
  | 'idle'
  | 'uploading'
  | 'vision_processing'
  | 'vision_done'
  | 'agents_processing'
  | 'completed'
  | 'error';

export type StoredJob = {
  vision_job_id:  string;
  session_type:   string;
  started_at:     string;   // ISO string
  session_date?:  string;
  camera?:        string;
  racket_name?:   string;
};

export const STATUS_LABELS: Record<JobStatus, string> = {
  idle:               'Preparando...',
  uploading:          'Subiendo video...',
  vision_processing:  'Procesando video con visión computacional...',
  vision_done:        'Visión completada — iniciando agentes IA...',
  agents_processing:  'Agentes IA analizando tu técnica...',
  completed:          'Análisis completado ✓',
  error:              'Error en el análisis',
};

/* ─── CONSTANTS ──────────────────────────────────────────────── */
const STORAGE_KEY     = 'tennisai_active_job';
const STATUS_ENDPOINT = 'https://aachondo--tennis-vision-pipeline-status-endpoint.modal.run';
const POLL_INTERVAL   = 5000;
const JOB_TTL_MS      = 30 * 60 * 1000; // 30 min — abandon stale jobs

/* ─── HELPERS ─────────────────────────────────────────────────── */
export const saveJob = (job: StoredJob) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(job));

export const clearJob = () =>
  localStorage.removeItem(STORAGE_KEY);

export const loadJob = (): StoredJob | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const job: StoredJob = JSON.parse(raw);
    // Abandon jobs older than TTL
    if (Date.now() - new Date(job.started_at).getTime() > JOB_TTL_MS) {
      clearJob();
      return null;
    }
    return job;
  } catch {
    return null;
  }
};

/* ─── HOOK ───────────────────────────────────────────────────── */
type UseJobPollerOptions = {
  onCompleted?: (sessionId: string) => void;
  onError?:     (message: string)   => void;
  sessionMeta?: {
    session_date:       string;
    camera_orientation: string;
    equipment_used:     unknown | null;
  };
};

export function useJobPoller(options: UseJobPollerOptions = {}) {
  const { onCompleted, onError, sessionMeta } = options;

  const [status,    setStatus]    = useState<JobStatus>('idle');
  const [jobId,     setJobId]     = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<StoredJob | null>(null);

  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const metaRef    = useRef(sessionMeta);
  metaRef.current  = sessionMeta;

  /* ── Stop polling ── */
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  /* ── Core poll tick ── */
  const tick = useCallback(async (vid: string) => {
    try {
      const resp = await fetch(`${STATUS_ENDPOINT}?vision_job_id=${vid}`);
      if (!resp.ok) return;

      const data    = await resp.json();
      const s: JobStatus = data.status ?? 'error';
      setStatus(s);

      if (s === 'completed' && data.session_id) {
        stopPolling();
        clearJob();
        setActiveJob(null);

        if (metaRef.current) {
          const { session_date, camera_orientation, equipment_used } = metaRef.current;
          await supabase
            .from('sessions')
            .update({
              actual_session_date: new Date(`${session_date}T12:00:00Z`).toISOString(),
              camera_orientation,
              equipment_used: equipment_used ?? null,
            })
            .eq('id', data.session_id);
        }

        onCompleted?.(data.session_id);
      }

      if (s === 'error') {
        stopPolling();
        clearJob();
        setActiveJob(null);
        onError?.(data.error_message || 'Error durante el análisis. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('Poll tick error:', err);
    }
  }, [stopPolling, onCompleted, onError]);

  /* ── Start polling ── */
  const startPolling = useCallback((vid: string) => {
    stopPolling();
    setJobId(vid);
    pollRef.current = setInterval(() => tick(vid), POLL_INTERVAL);
    // Immediate first tick
    tick(vid);
  }, [stopPolling, tick]);

  /* ── Resume from localStorage (used by Dashboard) ── */
  const resumeIfActive = useCallback(() => {
    const job = loadJob();
    if (!job) return null;
    setActiveJob(job);
    setStatus('vision_processing'); // optimistic — tick will correct
    startPolling(job.vision_job_id);
    return job;
  }, [startPolling]);

  /* ── Probe once without starting interval (lightweight check) ── */
  const probeOnce = useCallback(async (vid: string): Promise<JobStatus> => {
    try {
      const resp = await fetch(`${STATUS_ENDPOINT}?vision_job_id=${vid}`);
      if (!resp.ok) return 'error';
      const data = await resp.json();
      return data.status ?? 'error';
    } catch {
      return 'error';
    }
  }, []);

  /* ── Cleanup on unmount ── */
  useEffect(() => () => stopPolling(), [stopPolling]);

  // FIX: 'uploading' excluido — durante upload el componente maneja la UI
  // directamente via step===4, sin que isProcessing interfiera con la navegación
  const isProcessing = status !== 'idle' && status !== 'uploading' && status !== 'error' && status !== 'completed';

  return {
    status,
    jobId,
    activeJob,
    isProcessing,
    startPolling,
    stopPolling,
    resumeIfActive,
    probeOnce,
    setStatus,
  };
}
