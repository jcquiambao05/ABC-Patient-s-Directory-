import { createContext, useContext } from 'react';

export interface Preferences {
  fontSize: 'normal' | 'large' | 'xlarge';
  theme: 'dark' | 'light' | 'high-contrast' | 'system';
  sidebarCompact: boolean;
  defaultTab: 'directory' | 'queue' | 'dashboard';
}

export const defaultPreferences: Preferences = {
  fontSize: 'normal',
  theme: 'light',
  sidebarCompact: false,
  defaultTab: 'directory',
};

export function getSmartDefaults(role: string | null): Partial<Preferences> {
  // Smart role-based defaults for first-time users
  if (role === 'admin') {
    return { defaultTab: 'queue' }; // Doctors land on queue
  }
  return { defaultTab: 'directory' }; // Staff land on directory
}

export function applyPreferences(prefs: Preferences) {
  const html = document.documentElement;

  // Font size — class-based so it cascades properly
  html.classList.remove('font-normal', 'font-large', 'font-xlarge');
  html.classList.add(`font-${prefs.fontSize}`);

  // Theme
  let resolvedTheme = prefs.theme;
  if (prefs.theme === 'system') {
    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  html.setAttribute('data-theme', resolvedTheme);
}

export interface PreferencesContextValue {
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>, token: string) => Promise<void>;
}

export const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: defaultPreferences,
  updatePreferences: async () => {},
});

export function usePreferences() {
  return useContext(PreferencesContext);
}
