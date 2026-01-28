// Mock data layer for browser development
// When running outside Tauri, the invoke wrapper automatically uses mock data

export { invoke, isTauri } from './invoke';
export { mockInvoke } from './mockInvoke';
export { calculateDerivedFields } from './calculations';
export { mockAccounts, mockTrades } from './mockData';
