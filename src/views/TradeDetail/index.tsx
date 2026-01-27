import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useTradesStore } from '@/stores';
import TradeForm from '@/components/TradeForm';
import clsx from 'clsx';

function formatCurrency(value: number | null): string {
  if (value === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number | null, decimals = 2): string {
  if (value === null) return '-';
  if (!isFinite(value)) return 'Infinite';
  return value.toFixed(decimals);
}

interface DetailRowProps {
  label: string;
  value: string;
  valueClass?: string;
}

function DetailRow({ label, value, valueClass }: DetailRowProps) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100">
      <span className="text-gray-500">{label}</span>
      <span className={clsx('font-medium', valueClass)}>{value}</span>
    </div>
  );
}

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { selectedTrade, selectTrade, deleteTrade, fetchTrades, isLoading } = useTradesStore();

  useEffect(() => {
    if (id) {
      selectTrade(id);
    }
    return () => {
      selectTrade(null);
    };
  }, [id, selectTrade]);

  const handleDelete = async () => {
    if (id) {
      await deleteTrade(id);
      navigate('/trades');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!selectedTrade) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500">Trade not found.</div>
        <div className="text-center">
          <button
            onClick={() => navigate('/trades')}
            className="text-blue-600 hover:underline"
          >
            Back to trades
          </button>
        </div>
      </div>
    );
  }

  const trade = selectedTrade;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/trades')}
            className="text-gray-400 hover:text-gray-600"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {trade.symbol}
          </h1>
          <span
            className={clsx(
              'px-2 py-1 rounded text-sm font-medium',
              trade.direction === 'long'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            )}
          >
            {trade.direction.toUpperCase()}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Edit Form Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Edit Trade</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              <TradeForm
                trade={trade}
                defaultAccountId={trade.account_id}
                onSuccess={() => {
                  setIsEditing(false);
                  selectTrade(trade.id);
                  fetchTrades();
                }}
                onCancel={() => setIsEditing(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
            <h2 className="text-lg font-semibold mb-4">Delete Trade?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this trade? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Fields */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Trade Details</h2>
          <DetailRow
            label="Date"
            value={format(new Date(trade.trade_date), 'MMMM d, yyyy')}
          />
          <DetailRow label="Entry Price" value={`$${trade.entry_price.toFixed(2)}`} />
          <DetailRow
            label="Exit Price"
            value={trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-'}
          />
          <DetailRow label="Quantity" value={trade.quantity?.toString() ?? '-'} />
          <DetailRow
            label="Stop Loss"
            value={trade.stop_loss_price ? `$${trade.stop_loss_price.toFixed(2)}` : '-'}
          />
          <DetailRow label="Fees" value={formatCurrency(trade.fees)} />
          <DetailRow label="Strategy" value={trade.strategy ?? '-'} />
          <DetailRow label="Status" value={trade.status.toUpperCase()} />
        </div>

        {/* Derived Fields */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Performance</h2>
          <DetailRow
            label="Result"
            value={trade.result?.toUpperCase() ?? '-'}
            valueClass={
              trade.result === 'win'
                ? 'text-green-600'
                : trade.result === 'loss'
                ? 'text-red-600'
                : ''
            }
          />
          <DetailRow
            label="Gross P&L"
            value={formatCurrency(trade.gross_pnl)}
            valueClass={
              (trade.gross_pnl ?? 0) > 0
                ? 'text-green-600'
                : (trade.gross_pnl ?? 0) < 0
                ? 'text-red-600'
                : ''
            }
          />
          <DetailRow
            label="Net P&L"
            value={formatCurrency(trade.net_pnl)}
            valueClass={
              (trade.net_pnl ?? 0) > 0
                ? 'text-green-600'
                : (trade.net_pnl ?? 0) < 0
                ? 'text-red-600'
                : ''
            }
          />
          <DetailRow
            label="P&L per Share"
            value={trade.pnl_per_share ? `$${trade.pnl_per_share.toFixed(2)}` : '-'}
          />
          <DetailRow
            label="Risk per Share"
            value={trade.risk_per_share ? `$${trade.risk_per_share.toFixed(2)}` : '-'}
          />
          <DetailRow label="R-Multiple" value={formatNumber(trade.r_multiple)} />
        </div>
      </div>

      {/* Notes */}
      {trade.notes && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">Notes</h2>
          <p className="text-gray-600 whitespace-pre-wrap">{trade.notes}</p>
        </div>
      )}
    </div>
  );
}
