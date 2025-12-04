import { useState, useEffect, useCallback } from "react";

export interface AlertPreferences {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  criticalOnly: boolean;
}

const STORAGE_KEY = "security-alert-preferences";

const defaultPreferences: AlertPreferences = {
  soundEnabled: true,
  notificationsEnabled: true,
  criticalOnly: false,
};

export const useAlertPreferences = () => {
  const [preferences, setPreferences] = useState<AlertPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...defaultPreferences, ...parsed });
      }
    } catch (error) {
      console.error("Error loading alert preferences:", error);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when preferences change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        console.error("Error saving alert preferences:", error);
      }
    }
  }, [preferences, isLoaded]);

  const updatePreference = useCallback(<K extends keyof AlertPreferences>(
    key: K,
    value: AlertPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
  }, []);

  return {
    preferences,
    isLoaded,
    updatePreference,
    resetPreferences,
  };
};
