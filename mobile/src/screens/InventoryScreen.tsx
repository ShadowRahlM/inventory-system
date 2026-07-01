import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { listStock, type StockItem } from '../api/inventory';

export function InventoryScreen() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listStock().then((r) => { setStock(r.results); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={stock}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={() => (
        <>
          <Text style={styles.title}>Stock</Text>
          <Text style={styles.count}>{stock.length} item{stock.length !== 1 ? 's' : ''}</Text>
        </>
      )}
      renderItem={({ item }) => (
        <View style={[styles.row, item.total_pieces <= 50 && styles.rowLow]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sku}>{item.tile_sku}</Text>
            <Text style={styles.meta}>{item.location}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.pieces, item.total_pieces <= 50 && styles.low]}>{item.total_pieces} pcs</Text>
            <Text style={styles.breakdown}>{item.cartons} ctns + {item.loose_pieces} loose</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={() => <Text style={styles.empty}>No stock items</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4, color: '#1a1a1a' },
  count: { fontSize: 13, color: '#666', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 6, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  rowLow: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  sku: { fontWeight: '600', fontSize: 14, color: '#2563eb' },
  meta: { fontSize: 11, color: '#888', marginTop: 1 },
  pieces: { fontWeight: '600', fontSize: 14, color: '#333' },
  low: { color: '#dc2626' },
  breakdown: { fontSize: 11, color: '#888', marginTop: 1 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
});
