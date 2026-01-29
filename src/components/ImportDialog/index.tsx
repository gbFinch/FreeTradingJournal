import { useImportStore, useAccountsStore, useTradesStore } from '@/stores';
import FileSelector from './FileSelector';
import ImportPreview from './ImportPreview';
import ImportComplete from './ImportComplete';

export default function ImportDialog() {
  const { isOpen, step, closeDialog, error, reset, executeImport } = useImportStore();
  const { accounts, selectedAccountId } = useAccountsStore();
  const { fetchTrades } = useTradesStore();

  if (!isOpen) return null;

  const handleClose = () => {
    closeDialog();
    reset();
  };

  const handleImport = async () => {
    const accountId = selectedAccountId ?? accounts[0]?.id;
    if (!accountId) {
      return;
    }

    await executeImport(accountId);
    fetchTrades();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-semibold dark:text-gray-100">Import Trades from TLG File</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {step === 'select' && <FileSelector />}
          {step === 'preview' && <ImportPreview onImport={handleImport} />}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Importing trades...</p>
            </div>
          )}
          {step === 'complete' && <ImportComplete onClose={handleClose} />}
        </div>
      </div>
    </div>
  );
}
