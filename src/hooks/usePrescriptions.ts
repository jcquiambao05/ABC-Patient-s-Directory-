/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * usePrescriptions Hook (NEW)
 * Manages prescription state and operations
 */

import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { Prescription } from '../types/queue';

interface UsePrescriptionsState {
  prescriptions: Prescription[];
  selectedPrescription: Prescription | null;
  isLoading: boolean;
  error: string | null;
}

export function usePrescriptions(token: string) {
  const [state, setState] = useState<UsePrescriptionsState>({
    prescriptions: [],
    selectedPrescription: null,
    isLoading: false,
    error: null
  });

  const fetchPrescriptions = useCallback(async (patientId?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = patientId
        ? await api.prescriptions.list(patientId, token)
        : await api.prescriptions.list('', token);
      if (!response.ok) throw new Error('Failed to fetch prescriptions');
      const data = await response.json();
      setState(prev => ({ ...prev, prescriptions: data }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Unknown error'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [token]);

  const selectPrescription = useCallback((prescription: Prescription | null) => {
    setState(prev => ({ ...prev, selectedPrescription: prescription }));
  }, []);

  const createPrescription = useCallback(async (prescriptionData: Omit<Prescription, 'id'>) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.prescriptions.create(prescriptionData, token);
      if (!response.ok) throw new Error('Failed to create prescription');
      const data = await response.json();
      setState(prev => ({
        ...prev,
        prescriptions: [...prev.prescriptions, data]
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

  const deletePrescription = useCallback(async (prescriptionId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.prescriptions.delete(prescriptionId, token);
      if (!response.ok) throw new Error('Failed to delete prescription');
      setState(prev => ({
        ...prev,
        prescriptions: prev.prescriptions.filter(p => p.id !== prescriptionId),
        selectedPrescription: prev.selectedPrescription?.id === prescriptionId ? null : prev.selectedPrescription
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
    // Actions
    fetchPrescriptions,
    selectPrescription,
    createPrescription,
    deletePrescription
  };
}
