import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const useHapticFeedback = () => {
  const vibrate = useCallback((type: HapticType = 'light') => {
    // Check if vibration API is supported
    if (!('vibrate' in navigator)) return;

    const patterns: Record<HapticType, number | number[]> = {
      light: 10,
      medium: 25,
      heavy: 50,
      success: [10, 50, 10],
      warning: [25, 50, 25],
      error: [50, 100, 50, 100, 50],
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch (e) {
      // Vibration not supported or blocked
    }
  }, []);

  const lightTap = useCallback(() => vibrate('light'), [vibrate]);
  const mediumTap = useCallback(() => vibrate('medium'), [vibrate]);
  const heavyTap = useCallback(() => vibrate('heavy'), [vibrate]);
  const success = useCallback(() => vibrate('success'), [vibrate]);
  const warning = useCallback(() => vibrate('warning'), [vibrate]);
  const error = useCallback(() => vibrate('error'), [vibrate]);

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    success,
    warning,
    error,
  };
};
