import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { getProducts, getCategories } from '../services/firestore';
import { Product, Category } from '../types';

// Skeleton Loading Component
const SkeletonCard = () => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={skeletonStyles.card}>
      <Animated.View style={[skeletonStyles.image, { opacity }]} />
      <View style={skeletonStyles.info}>
        <Animated.View style={[skeletonStyles.title, { opacity }]} />
        <Animated.View style={[skeletonStyles.subtitle, { opacity }]} />
        <Animated.View style={[skeletonStyles.text, { opacity }]} />
      </View>
      <Animated.View style={[skeletonStyles.badge, { opacity }]} />
    </View>
  );
};

const skeletonStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    width: '60%',
    height: 16,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    marginBottom: 8,
  },
  subtitle: {
    width: '40%',
    height: 12,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    marginBottom: 6,
  },
  text: {
    width: '50%',
    height: 14,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  badge: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
});

interface ProductWithCategory extends Product {
  categoryName?: string;
  daysUntilEmpty: number;
}

export default function ProductsList({ navigation }: any) {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const fabScale = useRef(new Animated.Value(1)).current;

  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleFabPressIn = () => {
    Animated.spring(fabScale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

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
    if (daysUntilEmpty <= notificationDays) return '#b8860b'; // Dark goldenrod - perto de acabar (better contrast)
    return '#28a745'; // Verde - ok
  };

  const renderProduct = ({ item }: { item: ProductWithCategory }) => {
    const statusColor = getStatusColor(item.daysUntilEmpty, item.notificationDays);
    const progressPercent = item.totalQuantity > 0
      ? Math.min(1, Math.max(0, item.remainingQuantity / item.totalQuantity))
      : 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        activeOpacity={0.7}
      >
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.placeholderImage]}>
            <Ionicons name="cube-outline" size={30} color="#ccc" />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          {item.categoryName && (
            <Text style={styles.productCategory} numberOfLines={1} ellipsizeMode="tail">
              {item.categoryName}
            </Text>
          )}
          <Text style={styles.productQuantity}>
            Restante: {Math.round(item.remainingQuantity)} / {Math.round(item.totalQuantity)}
          </Text>
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progressPercent * 100}%`,
                  backgroundColor: statusColor
                }
              ]}
            />
          </View>
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
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Meus Produtos</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <View style={styles.listContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.title}>Meus Produtos</Text>
        <TouchableOpacity onPress={handleSignOut} activeOpacity={0.7}>
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
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('ProductForm')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Adicionar Produto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id || ''}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4285F4']} />
          }
        />
      )}

      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => navigation.navigate('ProductForm')}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          activeOpacity={1}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
        <TouchableOpacity style={styles.tabItem} activeOpacity={0.7}>
          <Ionicons name="cube" size={24} color="#4285F4" />
          <Text style={[styles.tabText, styles.tabTextActive]}>Produtos</Text>
          <View style={styles.tabIndicator} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('Categories')}
          activeOpacity={0.7}
        >
          <Ionicons name="folder-outline" size={24} color="#666" />
          <Text style={styles.tabText}>Categorias</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => navigation.navigate('PurchaseHistory')}
          activeOpacity={0.7}
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
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
  tabIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4285F4',
    marginTop: 4,
  },
});
