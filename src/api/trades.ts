import { invoke } from '@/mocks/invoke';
import type { TradeWithDerived, CreateTradeInput, UpdateTradeInput } from '@/types';

export async function getTrades(params?: {
  accountId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<TradeWithDerived[]> {
  return invoke('get_trades', {
    accountId: params?.accountId,
    startDate: params?.startDate,
    endDate: params?.endDate,
  });
}

export async function getTrade(id: string): Promise<TradeWithDerived | null> {
  return invoke('get_trade', { id });
}

export async function createTrade(input: CreateTradeInput): Promise<TradeWithDerived> {
  return invoke('create_trade', { input });
}

export async function updateTrade(id: string, input: UpdateTradeInput): Promise<TradeWithDerived> {
  return invoke('update_trade', { id, input });
}

export async function deleteTrade(id: string): Promise<void> {
  return invoke('delete_trade', { id });
}
