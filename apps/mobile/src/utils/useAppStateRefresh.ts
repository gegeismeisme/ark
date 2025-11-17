import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Calls the provided callback whenever the app transitions from background/inactive
 * back to the foreground. Useful for triggering manual refreshes in case realtime
 * events were missed.
 */
export function useAppStateRefresh(onActive: () => void | Promise<void>) {
  const stateRef = useRef<AppStateStatus>(AppState.currentState);
  const handlerRef = useRef(onActive);

  useEffect(() => {
    handlerRef.current = onActive;
  }, [onActive]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground = stateRef.current.match(/inactive|background/);
      stateRef.current = nextState;
      if (wasBackground && nextState === 'active') {
        void handlerRef.current?.();
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);
}
