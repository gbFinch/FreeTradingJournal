import { invoke } from '@/mocks/invoke';
import type { AlpacaKeysStatus } from '@/types';

export async function getAlpacaKeysStatus(): Promise<AlpacaKeysStatus> {
  return invoke('get_alpaca_keys_status', {});
}

export async function saveAlpacaKeys(apiKeyId: string, apiSecretKey: string): Promise<void> {
  return invoke('save_alpaca_keys', {
    apiKeyId,
    apiSecretKey,
  });
}

export async function clearAlpacaKeys(): Promise<void> {
  return invoke('clear_alpaca_keys', {});
}

export async function getManualTradeTimezone(): Promise<string> {
  return invoke('get_manual_trade_timezone', {});
}

export async function saveManualTradeTimezone(timezone: string): Promise<void> {
  return invoke('save_manual_trade_timezone', { timezone });
}
