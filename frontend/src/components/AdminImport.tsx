import { useState, useRef } from 'react';
import api from '../lib/api';

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
      <h1 className="text-3xl font-bold mb-6">Admin — Data Import</h1>

      <div className="bg-white p-6 rounded-lg shadow border max-w-xl mb-6">
        <p className="text-gray-700 mb-4">
          Upload a previously exported JSON file to restore data. Use the preview
          button first to see what will be imported, then confirm to execute.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded px-4 py-3 text-sm text-yellow-800 mb-4">
          ⚠️ Users are created with unusable passwords — they must reset on login.
          Existing records (same ID) are skipped without error.
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={() => doImport(true)}
            disabled={!fileName || loading}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? 'Processing…' : '🔍 Preview'}
          </button>
          <button
            onClick={() => doImport(false)}
            disabled={!fileName || loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? 'Importing…' : '📥 Import'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-xl mb-6">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-white rounded-lg shadow border max-w-xl">
          <div className="p-4 border-b bg-gray-50 font-medium">
            Import from {result.version} (exported {result.exported_at})
          </div>
          {result.preview && (
            <div className="p-4 bg-blue-50 border-b border-blue-100 text-sm text-blue-800">
              ⚠️ This was a <strong>preview</strong> — no data was written. Click "Import" to execute.
            </div>
          )}
          <div className="p-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Model</th>
                  <th className="text-right py-2">Created</th>
                  <th className="text-right py-2">Skipped</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.counts).map(([label, c]) => (
                  <tr key={label} className="border-b hover:bg-gray-50">
                    <td className="py-2">{label}</td>
                    <td className="py-2 text-right">{c.created}</td>
                    <td className="py-2 text-right">{c.skipped}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t-2">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right text-green-700">{result.total_created}</td>
                  <td className="py-2 text-right text-gray-500">{result.total_skipped}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}