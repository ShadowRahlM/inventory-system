import { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/inventoryApi';
import { INVENTORY_KEYS } from '../hooks/useInventoryQueries';
import type { TileCatalog, CatalogExtractResult } from '../types/inventory';

export function Catalogs() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractResult, setExtractResult] = useState<Record<string, CatalogExtractResult>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [...INVENTORY_KEYS.all, 'catalogs'],
    queryFn: () => inventoryApi.catalogs.list(),
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => inventoryApi.catalogs.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...INVENTORY_KEYS.all, 'catalogs'] });
      setName('');
      setDescription('');
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.catalogs.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...INVENTORY_KEYS.all, 'catalogs'] });
      setDeleteTarget(null);
      setDeleteError(null);
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => inventoryApi.catalogs.batchDelete(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...INVENTORY_KEYS.all, 'catalogs'] });
      setSelectedIds(new Set());
      setDeleteError(null);
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  const extractMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.catalogs.extract(id),
    onSuccess: (result, id) => {
      setExtractResult((prev) => ({ ...prev, [id]: result }));
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.tiles() });
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('name', name || selectedFile.name);
    formData.append('description', description);
    formData.append('file', selectedFile);
    uploadMutation.mutate(formData);
  };

  const allIds = useMemo(() => data?.results?.map((c) => c.id) ?? [], [data]);
  const allSelected = allIds.length > 0 && selectedIds.size === allIds.length;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }, [allSelected, allIds]);

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
    setDeleteError(null);
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate([...selectedIds]);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Tile Catalogs</h1>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <span className="text-sm text-blue-800 font-medium">
            {selectedIds.size} catalog{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => { setDeleteError(null); handleBulkDelete(); }}
            disabled={bulkDeleteMutation.isPending}
            className="bg-red-600 text-white px-4 py-1.5 rounded text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Selected'}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-600 hover:text-gray-800 ml-auto">
            Clear selection
          </button>
          {deleteError && (
            <span className="text-sm text-red-600 ml-2">{deleteError}</span>
          )}
        </div>
      )}

      <div className="flex items-center mb-4">
        {data?.results && data.results.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span>Select all {data.results.length} catalogs</span>
          </label>
        )}
      </div>

      <form onSubmit={handleUpload} className="bg-white p-6 rounded-lg shadow border mb-8 max-w-lg">
        <h2 className="text-xl font-semibold mb-4">Upload Catalog PDF</h2>

        {uploadMutation.isError && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {uploadMutation.error?.message ?? 'Upload failed'}
          </div>
        )}

        <div className="mb-4">
          <label className="block mb-1 font-medium">Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Catalog name (defaults to filename)" />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} />
        </div>

        <div className="mb-4">
          <label className="block mb-1 font-medium">PDF File</label>
          <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} className="w-full" />
        </div>

        <button type="submit" disabled={!selectedFile || uploadMutation.isPending} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
          {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {isLoading ? (
        <div>Loading catalogs...</div>
      ) : (
        <div className="grid gap-4">
          {data?.results?.map((catalog: TileCatalog) => {
            const result = extractResult[catalog.id];
            const isSelected = selectedIds.has(catalog.id);
            return (
              <div key={catalog.id} className={`bg-white p-4 rounded-lg shadow border ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(catalog.id)} className="cursor-pointer" />
                    <div>
                      <h3 className="font-semibold">{catalog.name}</h3>
                      {catalog.description && <p className="text-gray-600 text-sm">{catalog.description}</p>}
                      <p className="text-gray-500 text-xs mt-1">
                        Uploaded {new Date(catalog.uploaded_at).toLocaleDateString()}
                        {catalog.uploaded_by_username ? ` by ${catalog.uploaded_by_username}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={catalog.file} target="_blank" rel="noopener noreferrer" className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm">View PDF</a>
                    <button onClick={() => handleDelete(catalog.id)} className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-sm">Delete</button>
                    <button
                      onClick={() => extractMutation.mutate(catalog.id)}
                      disabled={extractMutation.isPending && extractMutation.variables === catalog.id}
                      className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm disabled:opacity-50"
                    >
                      {extractMutation.isPending && extractMutation.variables === catalog.id ? 'Extracting...' : 'Extract'}
                    </button>
                  </div>
                </div>

                {result && (
                  <>
                    <div className={`mt-3 text-sm rounded px-3 py-2 ${
                      result.products_created > 0 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                    }`}>
                      Found {result.products_found} product{result.products_found !== 1 ? 's' : ''}
                      &nbsp;·&nbsp; Created {result.products_created} new tile{result.products_created !== 1 ? 's' : ''}
                      {result.products_skipped > 0 && (
                        <span>
                          &nbsp;·&nbsp; {result.products_skipped} skipped
                          {result.breakdown && (
                            <span className="text-xs ml-1">
                              (no SKU: {result.breakdown.no_sku_detected}
                              {result.breakdown.already_in_db > 0 && `, existing: ${result.breakdown.already_in_db}`}
                              {result.breakdown.error > 0 && `, errors: ${result.breakdown.error}`})
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    {result.page_errors.length > 0 && (
                      <div className="mt-2 bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-sm">
                        <strong>Issues:</strong>
                        <ul className="list-disc pl-4 mt-1">
                          {result.page_errors.map((err, i) => <li key={i}>{err}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-500">
                      Pages: {result.processed_pages}/{result.total_pages}
                      {result.cells_per_page.length > 0 && <> · Cells/page: {result.cells_per_page.join(', ')}</>}
                    </div>

                    {result.debug_first_50_sku && result.debug_first_50_sku.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          Sample extracted data (first {result.debug_first_50_sku.length})
                        </summary>
                        <div className="mt-1 max-h-48 overflow-y-auto bg-gray-50 rounded p-2 text-xs font-mono">
                          {result.debug_first_50_sku.map((s, i) => (
                            <div key={i} className={s.sku ? 'text-green-700' : 'text-red-500'}>
                              <div>Page {s.page}: name="{s.name}" → SKU=[{s.sku || 'EMPTY'}] brand=[{s.brand || '?'}] series=[{s.series || '?'}] tier=[{s.tier || '?'}] type=[{s.tile_type || '?'}] finish=[{s.finish || '?'}] thick=[{s.thickness || '?'}] cov=[{s.coverage_per_box || '?'}] use=[{s.use_case || '?'}] img=[{s.image_filename || '—'}]</div>
                              {s.ocr_snippet && <div className="text-gray-400 pl-2 truncate">ocr: {s.ocr_snippet}</div>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {result.products.filter(p => p.image).length > 0 && (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {result.products.filter(p => p.image).map((p) => (
                          <div key={p.id} className="border rounded overflow-hidden bg-gray-50">
                            <img src={p.image!} alt={p.sku} className="w-full h-24 object-cover" loading="lazy" />
                            <div className="px-2 py-1 text-xs flex items-center justify-between">
                              <span className="truncate font-medium">{p.sku}</span>
                              <a href={`https://www.google.com/search?q=${encodeURIComponent(p.sku + ' tile')}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 shrink-0 ml-1" title="Search on Google">🔍</a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {extractMutation.isError && extractMutation.variables === catalog.id && (
                  <div className="mt-3 bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-sm">
                    {extractMutation.error?.message ?? 'Extraction failed'}
                  </div>
                )}
              </div>
            );
          })}
          {data?.results?.length === 0 && <p className="text-gray-500">No catalogs uploaded yet.</p>}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>
          <div className="bg-white rounded-lg p-6 shadow-xl w-96" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Catalog</h3>
            <p className="text-gray-600 mb-4">Are you sure? This cannot be undone.</p>
            {deleteError && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{deleteError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setDeleteTarget(null); setDeleteError(null); }} className="px-4 py-2 border rounded hover:bg-gray-50">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget)} disabled={deleteMutation.isPending} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
