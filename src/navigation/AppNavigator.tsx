import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList, TabParamList } from './types';
import { navigationRef } from './navigationRef';

// Screens
import Login from '../screens/Login';
import Home from '../screens/Home';
import ProductsList from '../screens/ProductsList';
import ProductForm from '../screens/ProductForm';
import ProductDetail from '../screens/ProductDetail';
import Categories from '../screens/Categories';
import PurchaseHistory from '../screens/PurchaseHistory';
import MoreMenu from '../screens/MoreMenu';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Produtos':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'Historico':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Mais':
              iconName = focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline';
              break;
            default:
              iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4285F4',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen
        name="Produtos"
        component={ProductsList}
        options={{ tabBarLabel: 'Produtos' }}
      />
      <Tab.Screen
        name="Historico"
        component={PurchaseHistory}
        options={{ tabBarLabel: 'Historico' }}
      />
      <Tab.Screen
        name="Mais"
        component={MoreMenu}
        options={{ tabBarLabel: 'Mais' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="ProductForm" component={ProductForm} />
            <Stack.Screen name="ProductDetail" component={ProductDetail} />
            <Stack.Screen name="Categories" component={Categories} />
          </>
        ) : (
          <Stack.Screen name="Login" component={Login} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
