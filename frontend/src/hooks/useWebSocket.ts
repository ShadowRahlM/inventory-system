import { useEffect } from 'react';
import { queryClient } from '../lib/query-client';
import { INVENTORY_KEYS } from './useInventoryQueries';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export function useWebSocket() {
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let closed = false;

    function connect() {
      ws = new WebSocket(`${WS_BASE}/ws/inventory/?token=${token}`);

      ws.onopen = () => {
        console.log('[WS] connected');
      };

      ws.onmessage = (event) => {
        try {
          const { type } = JSON.parse(event.data);
          switch (type) {
            case 'movement_notification':
              queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
              queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.movements() });
              queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.notifications() });
              break;
            case 'low_stock_alert':
              queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.stock() });
              queryClient.invalidateQueries({ queryKey: INVENTORY_KEYS.notifications() });
              break;
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!closed) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);
}