import { invoke } from '@/mocks/invoke';
import type { ImportPreview, ImportResult, AggregatedTrade, Execution } from '@/types';

/**
 * Open a file picker dialog to select a TLG file
 */
export async function selectTlgFile(): Promise<string | null> {
  return invoke('select_tlg_file', {});
}

/**
 * Preview importing trades from a TLG file
 */
export async function previewTlgImport(filePath: string): Promise<ImportPreview> {
  return invoke('preview_tlg_import', { filePath });
}

/**
 * Execute the import for selected trades
 */
export async function executeTlgImport(
  accountId: string,
  trades: AggregatedTrade[],
  skipDuplicates: boolean = true
): Promise<ImportResult> {
  return invoke('execute_tlg_import', {
    accountId,
    trades,
    skipDuplicates,
  });
}

/**
 * Get executions for a specific trade
 */
export async function getTradeExecutions(tradeId: string): Promise<Execution[]> {
  return invoke('get_trade_executions', { tradeId });
}
