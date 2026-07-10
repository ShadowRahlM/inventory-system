import { useState, useRef } from 'react';
import api from '../lib/api';
import { PageHeader } from './ui/PageHeader';

interface ImportResult {
  total_created: number;
  total_skipped: number;
  preview: boolean;
  counts: Record<string, { created: number; skipped: number }>;
  version: string;
  exported_at: string;
}

export function AdminImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setResult(null);
      setError('');
    }
  };

  const doImport = async (preview: boolean) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { setError('Please select a file first'); return; }

    if (!preview) {
      const confirmed = window.confirm(
        'This will import all data from the export file. Existing records with the same ID will be skipped. Continue?'
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('preview', String(preview));

      const response = await api.post('/inventory/admin-export/import_data/', formData);
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? err.message ?? 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader title="Data Import" description="Upload a previously exported JSON file to restore data." />

      <div className="rounded-lg border bg-card p-6 max-w-xl mb-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300 mb-4">
          ⚠️ Users are created with unusable passwords — they must reset on login.
          Existing records (same ID) are skipped without error.
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 mb-4"
        />

        {fileName && (
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 mb-4">
            <span>✓</span> <span>Selected: <strong>{fileName}</strong></span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => doImport(true)}
            disabled={!fileName || loading}
            className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              '🔍 Preview'
            )}
          </button>
          <button
            onClick={() => doImport(false)}
            disabled={!fileName || loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              '📥 Import'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded max-w-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border bg-card max-w-xl">
          <div className="p-4 border-b bg-muted/50 font-medium text-sm">
            Import from {result.version} (exported {result.exported_at})
          </div>
          {result.preview && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
              ⚠️ This was a <strong>preview</strong> — no data was written. Click "Import" to execute.
            </div>
          )}
          <div className="p-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-sm font-medium text-muted-foreground">Model</th>
                  <th className="text-right py-2 text-sm font-medium text-muted-foreground">Created</th>
                  <th className="text-right py-2 text-sm font-medium text-muted-foreground">Skipped</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.counts).map(([label, c]) => (
                  <tr key={label} className="border-b hover:bg-muted/50">
                    <td className="py-2">{label}</td>
                    <td className="py-2 text-right">{c.created}</td>
                    <td className="py-2 text-right">{c.skipped}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t-2">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right text-green-700 dark:text-green-400">{result.total_created}</td>
                  <td className="py-2 text-right text-muted-foreground">{result.total_skipped}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}