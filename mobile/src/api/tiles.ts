import { api } from './client';

export interface Tile {
  id: string;
  sku: string;
  name: string;
  description: string;
  brand: string;
  series: string;
  tier: string;
  tile_type: string;
  finish: string;
  thickness: string;
  coverage_per_box: string;
  use_case: string;
  category: string;
  pieces_per_carton: number;
  image: string | null;
}

export interface TileListResponse {
  count: number;
  results: Tile[];
}

export async function listTiles(search?: string): Promise<TileListResponse> {
  const params = search ? { search } : {};
  const res = await api.get<TileListResponse>('/inventory/tiles/', { params });
  return res.data;
}
