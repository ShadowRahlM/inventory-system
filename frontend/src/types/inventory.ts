export interface TileProduct {
  id: string;
  sku: string;
  name: string;
  description: string;
  dimensions: string;
  pieces_per_carton: number;
  category: string;
  brand: string;
  series: string;
  tier: string;
  tile_type: string;
  finish: string;
  thickness: string;
  coverage_per_box: string;
  use_case: string;
  image: string | null;
  created_at: string;
  updated_at: string;
}

export interface TileBatch {
  id: string;
  tile: string;
  tile_sku: string;
  tile_name: string;
  batch_number: string;
  production_date: string;
  supplier: string;
  received_date: string;
  is_active: boolean;
}

export interface StockLevel {
  id: string;
  tile: string;
  tile_sku: string;
  tile_name: string;
  batch: string;
  batch_number: string;
  cartons: number;
  loose_pieces: number;
  total_pieces: number;
  location: string;
  updated_at: string;
}

export interface MovementRecord {
  id: string;
  tile: string;
  tile_sku: string;
  tile_name: string;
  batch: string;
  batch_number: string;
  movement_type: MovementType;
  cartons_change: number;
  loose_pieces_change: number;
  previous_cartons: number;
  previous_loose_pieces: number;
  new_cartons: number;
  new_loose_pieces: number;
  reference: string;
  reason: string;
  performed_by: number;
  performed_by_username: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  movement: string;
  movement_type: string;
  action: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  changed_by: number;
  changed_by_username: string;
  timestamp: string;
  ip_address: string | null;
}

export type MovementType = 'RECEIVING' | 'DISPATCH' | 'ADJUSTMENT' | 'TRANSFER';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AvailableStockResponse {
  tile_id: string;
  sku: string;
  name: string;
  total_cartons: number;
  total_loose_pieces: number;
  total_pieces: number;
  locations: Array<{
    location: string;
    batch: string;
    cartons: number;
    loose_pieces: number;
    total_pieces: number;
  }>;
}

export interface ReceivePayload {
  tile_id: string;
  batch_number: string;
  production_date: string;
  supplier: string;
  cartons: number;
  loose_pieces: number;
  location: string;
  reference?: string;
}

export interface ReceiveResult {
  inventory: StockLevel;
  movement: MovementRecord;
}

export interface DispatchPayload {
  tile_id: string;
  batch_id: string;
  cartons: number;
  loose_pieces: number;
  location: string;
  reference?: string;
}

export interface DispatchResult {
  inventory: StockLevel;
  movement: MovementRecord;
}

export interface AdjustPayload {
  tile_id: string;
  batch_id: string;
  location: string;
  new_cartons: number;
  new_loose_pieces: number;
  reason: string;
}

export interface AdjustResult {
  inventory: StockLevel;
  movement: MovementRecord;
}

export interface TransferPayload {
  tile_id: string;
  batch_id: string;
  from_location: string;
  to_location: string;
  cartons: number;
  loose_pieces: number;
  reference?: string;
}

export interface TransferResult {
  source_inventory: StockLevel;
  destination_inventory: StockLevel;
  movement: MovementRecord;
}

export interface UserRecord {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role: 'admin' | 'manager' | 'viewer';
}

export interface TileCatalog {
  id: string;
  name: string;
  description: string;
  file: string;
  uploaded_at: string;
  uploaded_by: number | null;
  uploaded_by_username: string | null;
}

export interface CatalogExtractResult {
  products_found: number;
  products_created: number;
  products_skipped: number;
  total_pages: number;
  processed_pages: number;
  cells_per_page: number[];
  page_errors: string[];
  products: TileProduct[];
  breakdown: {
    no_sku_detected: number;
    already_in_db: number;
    error: number;
  };
  debug_first_50_sku: Array<{ sku: string; name: string; page: number; image_filename: string; ocr_snippet: string; brand: string; series: string; tier: string; tile_type: string; finish: string; thickness: string; coverage_per_box: string; use_case: string }>;
}

export interface StockSummary {
  total_tiles: number;
  total_cartons: number;
  total_loose_pieces: number;
  total_pieces: number;
  low_stock_count: number;
  location_count: number;
  total_batches: number;
}

export interface MovementSummaryItem {
  period: string;
  movement_type: string;
  count: number;
}

export interface MovementByType {
  movement_type: string;
  count: number;
  total_pieces: number;
}

export interface MovementSummary {
  period: string;
  since: string;
  movements: MovementSummaryItem[];
  by_type: MovementByType[];
}
