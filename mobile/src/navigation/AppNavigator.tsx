import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TilesScreen } from '../screens/TilesScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { MovementsScreen } from '../screens/MovementsScreen';
import { useAuthStore } from '../store/authStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '📊',
    Tiles: '🧱',
    Stock: '📦',
    Movements: '🔄',
  };
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>{icons[label] ?? '●'}</Text>
      <Text style={{ fontSize: 10, color: focused ? '#2563eb' : '#888', fontWeight: focused ? '600' : '400' }}>
        {label}
      </Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { paddingTop: 4, height: 60 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Dashboard" focused={focused} /> }}
      />
      <Tab.Screen
        name="Tiles"
        component={TilesScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Tiles" focused={focused} /> }}
      />
      <Tab.Screen
        name="Stock"
        component={InventoryScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Stock" focused={focused} /> }}
      />
      <Tab.Screen
        name="Movements"
        component={MovementsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Movements" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const user = useAuthStore((s) => s.user);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
