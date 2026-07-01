import { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { listTiles, type Tile } from '../api/tiles';
import { listStock, listMovements, type StockItem, type MovementItem } from '../api/inventory';

export function DashboardScreen() {
  const [search, setSearch] = useState('');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tileRes, stockRes, movRes] = await Promise.all([
        listTiles(),
        listStock(),
        listMovements(),
      ]);
      setTiles(tileRes.results);
      setStock(stockRes.results);
      setMovements(movRes.results);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const filteredTiles = search
    ? tiles.filter((t) =>
        t.sku.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase())
      )
    : tiles.slice(0, 10);

  const lowStock = stock.filter((s) => s.total_pieces <= 50);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={filteredTiles}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={() => (
        <>
          <Text style={styles.title}>Dashboard</Text>

          <View style={styles.summaryRow}>
            <View style={styles.card}><Text style={styles.cardNum}>{tiles.length}</Text><Text style={styles.cardLabel}>Tiles</Text></View>
            <View style={styles.card}><Text style={styles.cardNum}>{stock.length}</Text><Text style={styles.cardLabel}>Stock Items</Text></View>
            <View style={styles.card}><Text style={styles.cardNum}>{lowStock.length}</Text><Text style={styles.cardLabel}>Low Stock</Text></View>
          </View>

          {lowStock.length > 0 && (
            <View style={styles.alertBox}>
              <Text style={styles.alertTitle}>⚠️ {lowStock.length} low stock item{lowStock.length > 1 ? 's' : ''}</Text>
              {lowStock.slice(0, 5).map((s) => (
                <Text key={s.id} style={styles.alertItem}>
                  {s.tile_sku} — {s.total_pieces} pcs ({s.location})
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>
            {search ? `Search results for "${search}"` : 'Recent Tiles'}
          </Text>

          <TextInput
            style={styles.searchBar}
            placeholder="Search tiles..."
            value={search}
            onChangeText={setSearch}
          />
        </>
      )}
      renderItem={({ item }) => (
        <View style={styles.tileRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tileSku}>{item.sku}</Text>
            <Text style={styles.tileName} numberOfLines={1}>{item.name}</Text>
            {item.brand ? <Text style={styles.tileMeta}>{item.brand}{item.series ? ` · ${item.series}` : ''}</Text> : null}
          </View>
          <Text style={styles.tilePcs}>{item.pieces_per_carton} pcs/ctn</Text>
        </View>
      )}
      ListEmptyComponent={() => (
        <Text style={styles.empty}>{search ? 'No tiles match your search' : 'No tiles found'}</Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8, color: '#333' },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardNum: { fontSize: 24, fontWeight: 'bold', color: '#2563eb' },
  cardLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  alertBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' },
  alertTitle: { fontWeight: '600', color: '#dc2626', marginBottom: 4, fontSize: 14 },
  alertItem: { fontSize: 12, color: '#991b1b', marginBottom: 2 },
  searchBar: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8, borderWidth: 1, borderColor: '#ddd' },
  tileRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 6, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  tileSku: { fontWeight: '600', fontSize: 14, color: '#2563eb' },
  tileName: { fontSize: 13, color: '#333', marginTop: 2 },
  tileMeta: { fontSize: 11, color: '#888', marginTop: 1 },
  tilePcs: { fontSize: 12, color: '#666', marginLeft: 8 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
});
