import { useState } from 'react';
import api from '../lib/api';
import { PageHeader } from './ui/PageHeader';

export function AdminExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const response = await api.get('/inventory/admin-export/export_data/', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inventory_export.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader title="Data Export" description="Download all database data as a portable JSON file." />

      <div className="rounded-xl border bg-card p-6 shadow-sm max-w-xl">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-4 py-3 text-sm text-amber-800 dark:text-amber-300 mb-4">
          Exports all data including user accounts, inventory, movements, and audit logs.
          Password hashes are <strong>not</strong> included — users must reset passwords on the destination machine.
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-md mb-4 text-sm">
            Download started — saved as <strong>inventory_export.json</strong> in your Downloads folder.
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Download Export'
          )}
        </button>
      </div>
    </div>
  );
}
