/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * usePatients Hook
 * Manages patient list state and operations
 */

import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { normalizePatient } from '../lib/normalization';
import type { Patient } from '../types/patients';

interface UsePatientState {
  patients: Patient[];
  selectedPatient: Patient | null;
  patientDetails: Patient | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

export function usePatients(token: string) {
  const [state, setState] = useState<UsePatientState>({
    patients: [],
    selectedPatient: null,
    patientDetails: null,
    searchQuery: '',
    isLoading: false,
    error: null
  });

  const fetchPatients = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.patients.list(token);
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      const normalized = data.map(normalizePatient);
      setState(prev => ({ ...prev, patients: normalized }));
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [token]);

  const fetchPatientDetails = useCallback(async (patientId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.patients.get(patientId, token);
      if (!response.ok) throw new Error('Failed to fetch patient');
      const data = await response.json();
      const normalized = normalizePatient(data);
      setState(prev => ({ ...prev, patientDetails: normalized }));
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [token]);

  const selectPatient = useCallback((patient: Patient | null) => {
    setState(prev => ({ ...prev, selectedPatient: patient }));
  }, []);

  const addPatient = useCallback(async (patientData: any) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.patients.create(patientData, token);
      if (!response.ok) throw new Error('Failed to create patient');
      const data = await response.json();
      const normalized = normalizePatient(data);
      setState(prev => ({ 
        ...prev, 
        patients: [...prev.patients, normalized],
        patientDetails: normalized
      }));
      return normalized;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [token]);

  const editPatient = useCallback(async (patientId: string, updates: Partial<Patient>) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.patients.update(patientId, updates, token);
      if (!response.ok) throw new Error('Failed to update patient');
      const data = await response.json();
      const normalized = normalizePatient(data);
      setState(prev => ({
        ...prev,
        patients: prev.patients.map(p => p.id === patientId ? normalized : p),
        patientDetails: prev.patientDetails?.id === patientId ? normalized : prev.patientDetails,
        selectedPatient: prev.selectedPatient?.id === patientId ? normalized : prev.selectedPatient
      }));
      return normalized;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [token]);

  const deletePatient = useCallback(async (patientId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await api.patients.delete(patientId, token);
      if (!response.ok) throw new Error('Failed to delete patient');
      setState(prev => ({
        ...prev,
        patients: prev.patients.filter(p => p.id !== patientId),
        selectedPatient: prev.selectedPatient?.id === patientId ? null : prev.selectedPatient,
        patientDetails: prev.patientDetails?.id === patientId ? null : prev.patientDetails
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ ...prev, error: message }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [token]);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const getFilteredPatients = useCallback(() => {
    const query = state.searchQuery.toLowerCase();
    return state.patients.filter(p =>
      p.full_name?.toLowerCase().includes(query) ||
      p.phone?.includes(query) ||
      p.email?.toLowerCase().includes(query)
    );
  }, [state.patients, state.searchQuery]);

  return {
    // State
    ...state,
    filteredPatients: getFilteredPatients(),
    // Actions
    fetchPatients,
    fetchPatientDetails,
    selectPatient,
    addPatient,
    editPatient,
    deletePatient,
    setSearchQuery
  };
}
