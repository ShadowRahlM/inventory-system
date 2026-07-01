import { api } from './client';

export interface StockItem {
  id: string;
  tile_sku: string;
  batch_number: string;
  cartons: number;
  loose_pieces: number;
  total_pieces: number;
  location: string;
  updated_at: string;
}

export interface MovementItem {
  id: string;
  tile_sku: string;
  movement_type: string;
  cartons_change: number;
  loose_pieces_change: number;
  reference: string;
  reason: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

export async function listStock(): Promise<PaginatedResponse<StockItem>> {
  const res = await api.get<PaginatedResponse<StockItem>>('/inventory/inventory/');
  return res.data;
}

export async function listMovements(): Promise<PaginatedResponse<MovementItem>> {
  const res = await api.get<PaginatedResponse<MovementItem>>('/inventory/movements/');
  return res.data;
}
