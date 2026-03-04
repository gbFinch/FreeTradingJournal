import { useEffect, useState } from 'react';
import {
  clearAlpacaKeys,
  getAlpacaKeysStatus,
  getManualTradeTimezone,
  saveAlpacaKeys,
  saveManualTradeTimezone,
} from '@/api/settings';

export default function SettingsView() {
  const [apiKeyId, setApiKeyId] = useState('');
  const [apiSecretKey, setApiSecretKey] = useState('');
  const [hasKeyId, setHasKeyId] = useState(false);
  const [hasSecretKey, setHasSecretKey] = useState(false);
  const [maskedKeyId, setMaskedKeyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [alpacaMessage, setAlpacaMessage] = useState<string | null>(null);
  const [alpacaError, setAlpacaError] = useState<string | null>(null);
  const [manualTimezone, setManualTimezone] = useState('Europe/Amsterdam');
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [timezoneMessage, setTimezoneMessage] = useState<string | null>(null);
  const [timezoneError, setTimezoneError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setAlpacaError(null);
    setTimezoneError(null);
    try {
      const status = await getAlpacaKeysStatus();
      const configuredTimezone = await getManualTradeTimezone();
      setHasKeyId(status.has_key_id);
      setHasSecretKey(status.has_secret_key);
      setMaskedKeyId(status.masked_key_id);
      setManualTimezone(configuredTimezone);
    } catch (err) {
      const msg = String(err);
      setAlpacaError(msg);
      setTimezoneError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTimezone = async () => {
    setSavingTimezone(true);
    setTimezoneError(null);
    setTimezoneMessage(null);
    try {
      await saveManualTradeTimezone(manualTimezone);
      setTimezoneMessage('Manual trade timezone saved.');
    } catch (err) {
      setTimezoneError(String(err));
    } finally {
      setSavingTimezone(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setAlpacaError(null);
    setAlpacaMessage(null);
    try {
      await saveAlpacaKeys(apiKeyId, apiSecretKey);
      setApiKeyId('');
      setApiSecretKey('');
      setAlpacaMessage('Alpaca keys saved locally.');
      await loadStatus();
    } catch (err) {
      setAlpacaError(String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    setAlpacaError(null);
    setAlpacaMessage(null);
    try {
      await clearAlpacaKeys();
      setAlpacaMessage('Alpaca keys removed.');
      await loadStatus();
    } catch (err) {
      setAlpacaError(String(err));
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <section className="app-panel p-5 md:p-6">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Settings</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
          Save Alpaca API credentials in your local app database.
        </p>

        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900/50">
          {loading ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Checking key status...</p>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="text-stone-700 dark:text-stone-200">
                Key ID: {hasKeyId ? `Saved (${maskedKeyId ?? 'hidden'})` : 'Not saved'}
              </p>
              <p className="text-stone-700 dark:text-stone-200">
                Secret Key: {hasSecretKey ? 'Saved' : 'Not saved'}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-200">Alpaca API Key ID</label>
            <input
              type="text"
              value={apiKeyId}
              onChange={(e) => setApiKeyId(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-teal-500 focus:outline-none dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              placeholder="PK..."
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-200">Alpaca API Secret Key</label>
            <input
              type="password"
              value={apiSecretKey}
              onChange={(e) => setApiSecretKey(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-teal-500 focus:outline-none dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              placeholder="Your secret key"
              autoComplete="off"
              required
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Keys'}
            </button>
            <button
              type="button"
              disabled={clearing}
              onClick={() => void handleClear()}
              className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/30"
            >
              {clearing ? 'Clearing...' : 'Clear Keys'}
            </button>
          </div>
        </form>

        {alpacaMessage && <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{alpacaMessage}</p>}
        {alpacaError && <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{alpacaError}</p>}
      </section>

      <section className="app-panel mt-4 p-5 md:p-6">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Manual Trade Timezone</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
          Manual trade entry and exit times are interpreted in this timezone, then converted to UTC for storage.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            value={manualTimezone}
            onChange={(e) => setManualTimezone(e.target.value)}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-teal-500 focus:outline-none dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            <option value="Europe/Amsterdam">Europe/Amsterdam</option>
            <option value="America/New_York">America/New_York</option>
            <option value="UTC">UTC</option>
            <option value="Europe/London">Europe/London</option>
            <option value="America/Chicago">America/Chicago</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
          </select>
          <button
            type="button"
            onClick={() => void handleSaveTimezone()}
            disabled={savingTimezone}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingTimezone ? 'Saving...' : 'Save Timezone'}
          </button>
        </div>
        {timezoneMessage && <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{timezoneMessage}</p>}
        {timezoneError && <p className="mt-4 text-sm text-rose-600 dark:text-rose-400">{timezoneError}</p>}
      </section>
    </div>
  );
}
