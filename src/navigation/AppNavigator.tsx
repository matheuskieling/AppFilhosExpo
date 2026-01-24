import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from './types';
import { navigationRef } from './navigationRef';
import Login from '../screens/Login';
import ProductsList from '../screens/ProductsList';
import ProductForm from '../screens/ProductForm';
import ProductDetail from '../screens/ProductDetail';
import Categories from '../screens/Categories';
import PurchaseHistory from '../screens/PurchaseHistory';

const Stack = createNativeStackNavigator<RootStackParamList>();

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
            <Stack.Screen name="ProductsList" component={ProductsList} />
            <Stack.Screen name="ProductForm" component={ProductForm} />
            <Stack.Screen name="ProductDetail" component={ProductDetail} />
            <Stack.Screen name="Categories" component={Categories} />
            <Stack.Screen name="PurchaseHistory" component={PurchaseHistory} />
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
