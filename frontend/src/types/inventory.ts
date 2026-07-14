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
  is_mix: boolean;
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
  json_data: Record<string, unknown>;
  processed: boolean;
  uploaded_at: string;
  uploaded_by: number | null;
  uploaded_by_username: string | null;
}

export interface CatalogProcessResult {
  created: number;
  skipped: number;
  errors: Array<{ index: number; error: string }>;
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

export interface StockByCategory {
  tile__category: string;
  tile_count: number;
  total_cartons: number;
  total_loose: number;
  total_pieces: number;
}

export interface StockByLocation {
  location: string;
  total_cartons: number;
  total_loose: number;
  total_pieces: number;
  item_count: number;
}

export interface FastMover {
  tile_id: string;
  tile__sku: string;
  tile__name: string;
  movement_count: number;
}

export interface LowStockItem {
  id: string;
  tile_id: string;
  sku: string;
  name: string;
  category: string;
  batch_number: string;
  location: string;
  cartons: number;
  loose_pieces: number;
  pieces_per_carton: number;
  total_pieces: number;
}

export interface LowStockDetail {
  threshold: number;
  count: number;
  results: LowStockItem[];
}

export interface PeriodComparisonEntry {
  movement_type: string;
  current_count: number;
  previous_count: number;
  change_pct: number;
}

export interface PeriodComparison {
  period: string;
  current_since: string;
  previous_since: string;
  comparison: PeriodComparisonEntry[];
}

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  lead_time_days: number;
  created_at: string;
  updated_at: string;
}

export interface OrderLineItem {
  id: string;
  sales_order: string | null;
  purchase_order: string | null;
  tile: string;
  tile_sku: string;
  tile_name: string;
  batch: string | null;
  batch_number: string | null;
  quantity_cartons: number;
  quantity_loose: number;
  unit_price: number;
  line_total: number;
}

export interface SalesOrder {
  id: string;
  order_number: string;
  customer: string;
  customer_name: string;
  status: OrderStatus;
  order_date: string;
  total_amount: number;
  notes: string;
  created_by: number;
  created_by_username: string;
  line_items: OrderLineItem[];
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier: string;
  supplier_name: string;
  status: OrderStatus;
  order_date: string;
  expected_date: string | null;
  total_amount: number;
  notes: string;
  created_by: number;
  created_by_username: string;
  line_items: OrderLineItem[];
  updated_at: string;
}

export interface NotificationRecord {
  id: string;
  notification_type: 'LOW_STOCK' | 'MOVEMENT' | 'ORDER_STATUS' | 'SYSTEM';
  title: string;
  message: string;
  data: Record<string, unknown>;
  user: number | null;
  is_read: boolean;
  created_at: string;
}

export interface CreateSalesOrderPayload {
  customer_id: string;
  notes?: string;
  items: Array<{
    tile_id: string;
    batch_id?: string;
    cartons?: number;
    loose_pieces?: number;
    unit_price?: number;
  }>;
}

export interface CreatePurchaseOrderPayload {
  supplier_id: string;
  expected_date?: string;
  notes?: string;
  items: Array<{
    tile_id: string;
    cartons?: number;
    loose_pieces?: number;
    unit_price?: number;
  }>;
}

export interface StockTakeResult {
  tiles_created: number;
  stock_created: number;
  stock_updated: number;
  total_entries: number;
  errors: Array<{ sku: string; error: string }>;
}

export interface SyncConflict {
  id: string;
  model_name: string;
  record_id: string;
  peer_url: string;
  local_data: Record<string, unknown>;
  remote_data: Record<string, unknown>;
  created_at: string;
  resolved: boolean;
  resolution: 'local' | 'remote' | null;
  resolved_at: string | null;
}
