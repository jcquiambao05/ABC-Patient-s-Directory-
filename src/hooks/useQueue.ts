/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * useQueue Hook
 * Manages patient queue and appointment operations
 */

import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { QueueEntry, QueueState } from '../types/queue';

interface UseQueueState {
  queueEntries: QueueEntry[];
  queueState: QueueState | null;
  isLoading: boolean;
  error: string | null;
}

export function useQueue(token: string) {
  const [state, setState] = useState<UseQueueState>({
    queueEntries: [],
    queueState: null,
    isLoading: false,
    error: null
  });

  const fetchQueue = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.queue.list(token);
      if (!response.ok) throw new Error('Failed to fetch queue');
      const data = await response.json();
      setState(prev => ({ ...prev, queueEntries: data }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Unknown error'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [token]);

  const addToQueue = useCallback(async (queueEntry: Omit<QueueEntry, 'id'>) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.queue.add(queueEntry, token);
      if (!response.ok) throw new Error('Failed to add to queue');
      const data = await response.json();
      setState(prev => ({
        ...prev,
        queueEntries: [...prev.queueEntries, data]
      }));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [token]);

  const reorderQueue = useCallback(async (entries: QueueEntry[]) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.queue.reorder(entries, token);
      if (!response.ok) throw new Error('Failed to reorder queue');
      setState(prev => ({ ...prev, queueEntries: entries }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [token]);

  const updateStatus = useCallback(async (entryId: string, status: QueueEntry['status']) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.queue.updateStatus(entryId, { status }, token);
      if (!response.ok) throw new Error('Failed to update status');
      const data = await response.json();
      setState(prev => ({
        ...prev,
        queueEntries: prev.queueEntries.map(e => e.id === entryId ? data : e)
      }));
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [token]);

  const markDone = useCallback(async (entryId: string) => {
    return updateStatus(entryId, 'done');
  }, [updateStatus]);

  const resetQueue = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.queue.reset(token);
      if (!response.ok) throw new Error('Failed to reset queue');
      setState(prev => ({
        ...prev,
        queueEntries: [],
        queueState: null
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [token]);

  return {
    // State
    ...state,
    // Derived
    activeQueue: state.queueEntries.filter(e => e.status !== 'done'),
    completedCount: state.queueEntries.filter(e => e.status === 'done').length,
    // Actions
    fetchQueue,
    addToQueue,
    reorderQueue,
    updateStatus,
    markDone,
    resetQueue
  };
}
