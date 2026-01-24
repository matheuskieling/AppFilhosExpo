import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getProducts, getCategories } from '../services/firestore';
import { Product, Category } from '../types';

interface ProductWithCategory extends Product {
  categoryName?: string;
  daysUntilEmpty: number;
}

export default function ProductsList({ navigation }: any) {
  const { user, signOut } = useAuth();
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(user.uid),
        getCategories(user.uid),
      ]);

      // Mapeia categorias para lookup rápido
      const categoryMap = new Map<string, string>();
      categoriesData.forEach((cat: Category) => {
        if (cat.id) categoryMap.set(cat.id, cat.name);
      });

      // Adiciona nome da categoria e dias até acabar
      const productsWithDetails = productsData.map((product: Product) => ({
        ...product,
        categoryName: product.categoryId ? categoryMap.get(product.categoryId) : undefined,
        daysUntilEmpty: product.dailyUsage > 0
          ? Math.ceil(product.remainingQuantity / product.dailyUsage)
          : Infinity,
      }));

      // Ordena por dias até acabar (mais urgentes primeiro)
      productsWithDetails.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);

      setProducts(productsWithDetails);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSignOut = () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: signOut, style: 'destructive' },
    ]);
  };

  const getStatusColor = (daysUntilEmpty: number, notificationDays: number) => {
    if (daysUntilEmpty <= 0) return '#dc3545'; // Vermelho - acabou
    if (daysUntilEmpty <= notificationDays) return '#ffc107'; // Amarelo - perto de acabar
    return '#28a745'; // Verde - ok
  };

  const renderProduct = ({ item }: { item: ProductWithCategory }) => {
    const statusColor = getStatusColor(item.daysUntilEmpty, item.notificationDays);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      >
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.placeholderImage]}>
            <Ionicons name="cube-outline" size={30} color="#ccc" />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          {item.categoryName && (
            <Text style={styles.productCategory}>{item.categoryName}</Text>
          )}
          <Text style={styles.productQuantity}>
            Restante: {Math.round(item.remainingQuantity)} / {Math.round(item.totalQuantity)}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {item.daysUntilEmpty === Infinity
                ? '∞'
                : item.daysUntilEmpty <= 0
                  ? 'Acabou'
                  : `${item.daysUntilEmpty}d`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meus Produtos</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Nenhum produto cadastrado</Text>
          <Text style={styles.emptySubtext}>
            Toque no + para adicionar seu primeiro produto
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id || ''}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ProductForm')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="cube" size={24} color="#4285F4" />
          <Text style={[styles.tabText, styles.tabTextActive]}>Produtos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('Categories')}
        >
          <Ionicons name="folder-outline" size={24} color="#666" />
          <Text style={styles.tabText}>Categorias</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('PurchaseHistory')}
        >
          <Ionicons name="receipt-outline" size={24} color="#666" />
          <Text style={styles.tabText}>Histórico</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  listContent: {
    padding: 15,
    paddingBottom: 150,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  productQuantity: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tabTextActive: {
    color: '#4285F4',
  },
});
