import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { listTiles, type Tile } from '../api/tiles';

export function TilesScreen() {
  const [search, setSearch] = useState('');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTiles = (q: string) => {
    setLoading(true);
    listTiles(q || undefined)
      .then((r) => setTiles(r.results))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTiles('');
  }, []);

  const onChangeText = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchTiles(text), 300);
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={tiles}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={() => (
        <>
          <Text style={styles.title}>Tiles</Text>
          <TextInput
            style={styles.searchBar}
            placeholder="Search tiles..."
            value={search}
            onChangeText={onChangeText}
          />
          {loading && <ActivityIndicator size="small" color="#2563eb" style={{ marginBottom: 8 }} />}
        </>
      )}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sku}>{item.sku}</Text>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.meta}>
              {[item.brand, item.series, item.category].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text style={styles.pcs}>{item.pieces_per_carton} pcs</Text>
        </View>
      )}
      ListEmptyComponent={() =>
        loading ? null : <Text style={styles.empty}>No tiles found</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, color: '#1a1a1a' },
  searchBar: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 8, borderWidth: 1, borderColor: '#ddd' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 6, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  sku: { fontWeight: '600', fontSize: 14, color: '#2563eb' },
  name: { fontSize: 13, color: '#333', marginTop: 2 },
  meta: { fontSize: 11, color: '#888', marginTop: 1 },
  pcs: { fontSize: 12, color: '#666', marginLeft: 8 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
});
