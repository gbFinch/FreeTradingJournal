import { mockInvoke } from './mockInvoke';

// Check if running in Tauri environment (Tauri 2.x uses __TAURI_INTERNALS__)
export function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)
  );
}

// Unified invoke function that uses mock in browser, real Tauri in app
export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    // Dynamic import to avoid bundling issues when not in Tauri
    const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
    return tauriInvoke<T>(cmd, args);
  } else {
    return mockInvoke<T>(cmd, args);
  }
}
