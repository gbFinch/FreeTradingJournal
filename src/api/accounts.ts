import { invoke } from '@/mocks/invoke';
import type { Account } from '@/types';

export async function getAccounts(): Promise<Account[]> {
  return invoke('get_accounts');
}

export async function createAccount(
  name: string,
  baseCurrency?: string
): Promise<Account> {
  return invoke('create_account', { name, baseCurrency });
}
