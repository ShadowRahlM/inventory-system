import { useState } from 'react';
import api from '../lib/api';

export function AdminExport() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
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
    } catch {
      // silent — download failed
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin — Data Export</h1>

      <div className="bg-white p-6 rounded-lg shadow border max-w-xl">
        <p className="text-gray-700 mb-4">
          Download all database data as a portable JSON file. This can be imported
          on another machine using <code className="bg-gray-100 px-1 rounded">python manage.py import_data</code>.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded px-4 py-3 text-sm text-yellow-800 mb-4">
          ⚠️ Exports all data including user accounts, inventory, movements, and audit logs.
          Password hashes are <strong>not</strong> included — users must reset passwords on the destination machine.
        </div>

        <button
          onClick={handleExport}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>Exporting…</>
          ) : (
            <>📥 Download Export</>
          )}
        </button>
      </div>
    </div>
  );
}
