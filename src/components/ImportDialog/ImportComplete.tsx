import { useImportStore } from '@/stores';

interface ImportCompleteProps {
  onClose: () => void;
}

export default function ImportComplete({ onClose }: ImportCompleteProps) {
  const { result } = useImportStore();

  if (!result) return null;

  const hasErrors = result.errors.length > 0;

  return (
    <div className="text-center py-8">
      <div className="mb-6">
        {hasErrors ? (
          <svg
            className="mx-auto h-16 w-16 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ) : (
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>

      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {hasErrors ? 'Import Completed with Errors' : 'Import Complete!'}
      </h3>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
        <p>
          <span className="font-medium text-green-600 dark:text-green-400">
            {result.imported_count}
          </span>{' '}
          trade{result.imported_count !== 1 ? 's' : ''} imported successfully
        </p>

        {result.skipped_duplicates > 0 && (
          <p>
            <span className="font-medium text-gray-500">{result.skipped_duplicates}</span> duplicate
            {result.skipped_duplicates !== 1 ? 's' : ''} skipped
          </p>
        )}
      </div>

      {hasErrors && (
        <div className="mb-6 max-w-md mx-auto">
          <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Errors:</h4>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-left max-h-32 overflow-auto">
            {result.errors.map((error, i) => (
              <p key={i} className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Done
      </button>
    </div>
  );
}
