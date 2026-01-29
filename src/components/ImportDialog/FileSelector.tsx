import { useImportStore } from '@/stores';

export default function FileSelector() {
  const { selectFile, filePath, isLoading } = useImportStore();

  return (
    <div className="text-center py-8">
      <div className="mb-6">
        <svg
          className="mx-auto h-16 w-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Select a TLG File
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Import trades from an Interactive Brokers Trade Log (TLG) file.
        <br />
        Both stock and option transactions are supported.
      </p>

      {filePath && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 truncate max-w-md mx-auto">
          Selected: <span className="font-mono">{filePath}</span>
        </p>
      )}

      <button
        onClick={() => selectFile()}
        disabled={isLoading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Loading...' : 'Choose File'}
      </button>

      <div className="mt-8 text-left max-w-md mx-auto">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          How to export a TLG file:
        </h4>
        <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
          <li>Log in to Interactive Brokers Client Portal</li>
          <li>Go to Performance & Reports &gt; Flex Queries</li>
          <li>Create a new Flex Query with Trade Confirmations</li>
          <li>Select TLG format and download</li>
        </ol>
      </div>
    </div>
  );
}
