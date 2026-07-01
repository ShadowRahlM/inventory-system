import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { listMovements, type MovementItem } from '../api/inventory';

const TYPE_COLORS: Record<string, string> = {
  receive: '#16a34a',
  dispatch: '#dc2626',
  adjust: '#f59e0b',
  transfer: '#6366f1',
};

export function MovementsScreen() {
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMovements().then((r) => { setMovements(r.results); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={movements}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={() => (
        <>
          <Text style={styles.title}>Movements</Text>
          <Text style={styles.count}>{movements.length} movement{movements.length !== 1 ? 's' : ''}</Text>
        </>
      )}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.badge, { backgroundColor: TYPE_COLORS[item.movement_type] ?? '#888' }]}>
                <Text style={styles.badgeText}>{item.movement_type}</Text>
              </View>
              <Text style={styles.sku}>{item.tile_sku}</Text>
            </View>
            {item.reference ? <Text style={styles.ref}>Ref: {item.reference}</Text> : null}
            {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            <Text style={styles.change}>
              {item.cartons_change > 0 ? '+' : ''}{item.cartons_change} ctns
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={() => <Text style={styles.empty}>No movements</Text>}
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
  sku: { fontWeight: '600', fontSize: 14, color: '#2563eb', marginTop: 2 },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  ref: { fontSize: 11, color: '#888', marginTop: 2 },
  reason: { fontSize: 11, color: '#666', marginTop: 1 },
  date: { fontSize: 11, color: '#888' },
  change: { fontSize: 12, color: '#333', fontWeight: '500', marginTop: 2 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
});
