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
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { getProducts, getCategories } from '../services/firestore';
import { Product, Category } from '../types';
import haptics from '../utils/haptics';

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

type FilterType = 'all' | 'urgent' | string;

export default function ProductsList({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const fabScale = useRef(new Animated.Value(1)).current;
  const searchAnimation = useRef(new Animated.Value(0)).current;

  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search and filter state
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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

  const toggleSearch = () => {
    haptics.light();
    const toValue = searchVisible ? 0 : 1;
    setSearchVisible(!searchVisible);
    Animated.timing(searchAnimation, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
    if (searchVisible) {
      setSearchQuery('');
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(user.uid),
        getCategories(user.uid),
      ]);

      setCategories(categoriesData);

      const categoryMap = new Map<string, string>();
      categoriesData.forEach((cat: Category) => {
        if (cat.id) categoryMap.set(cat.id, cat.name);
      });

      const productsWithDetails = productsData.map((product: Product) => ({
        ...product,
        categoryName: product.categoryId ? categoryMap.get(product.categoryId) : undefined,
        daysUntilEmpty: product.dailyUsage > 0
          ? Math.ceil(product.remainingQuantity / product.dailyUsage)
          : Infinity,
      }));

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

  const getStatusColor = (daysUntilEmpty: number, notificationDays: number) => {
    if (daysUntilEmpty <= 0) return '#dc3545';
    if (daysUntilEmpty <= notificationDays) return '#b8860b';
    return '#28a745';
  };

  const getStatus = (daysUntilEmpty: number, notificationDays: number): 'urgent' | 'attention' | 'ok' => {
    if (daysUntilEmpty <= 0) return 'urgent';
    if (daysUntilEmpty <= notificationDays) return 'attention';
    return 'ok';
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    // Search filter
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Category/Status filter
    if (activeFilter === 'all') return true;
    if (activeFilter === 'urgent') {
      const status = getStatus(product.daysUntilEmpty, product.notificationDays);
      return status === 'urgent' || status === 'attention';
    }
    return product.categoryId === activeFilter;
  });

  // Group products by status
  const urgentProducts = filteredProducts.filter(p => {
    const status = getStatus(p.daysUntilEmpty, p.notificationDays);
    return status === 'urgent' || status === 'attention';
  });
  const okProducts = filteredProducts.filter(p => {
    const status = getStatus(p.daysUntilEmpty, p.notificationDays);
    return status === 'ok';
  });

  const searchHeight = searchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 50],
  });

  const renderProduct = ({ item }: { item: ProductWithCategory }) => {
    const statusColor = getStatusColor(item.daysUntilEmpty, item.notificationDays);
    const status = getStatus(item.daysUntilEmpty, item.notificationDays);
    const isUrgent = status === 'urgent';
    const needsAttention = status === 'attention';
    const progressPercent = item.totalQuantity > 0
      ? Math.min(1, Math.max(0, item.remainingQuantity / item.totalQuantity))
      : 0;

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          isUrgent && styles.productCardUrgent,
          needsAttention && styles.productCardAttention,
        ]}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        activeOpacity={0.7}
      >
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.placeholderImage]}>
            <Ionicons name="paw-outline" size={30} color="#ccc" />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          {isUrgent && (
            <Text style={[styles.urgentLabel, { color: '#dc3545' }]}>ACABOU!</Text>
          )}
          {needsAttention && (
            <Text style={[styles.urgentLabel, { color: '#b8860b' }]}>
              Comprar em {item.daysUntilEmpty} dias
            </Text>
          )}
          {item.categoryName && !isUrgent && !needsAttention && (
            <Text style={styles.productCategory} numberOfLines={1} ellipsizeMode="tail">
              {item.categoryName}
            </Text>
          )}
          <Text style={styles.productQuantity}>
            Restante: {Math.round(item.remainingQuantity)} / {Math.round(item.totalQuantity)}
          </Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${progressPercent * 100}%`, backgroundColor: statusColor }
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
                  ? '!'
                  : `${item.daysUntilEmpty}d`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string, count: number, color: string) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, { backgroundColor: color }]} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.sectionBadge, { backgroundColor: color }]}>
        <Text style={styles.sectionBadgeText}>{count}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Produtos</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="search-outline" size={24} color="#666" />
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
        <Text style={styles.title}>Produtos</Text>
        <TouchableOpacity onPress={toggleSearch} activeOpacity={0.7}>
          <Ionicons name={searchVisible ? "close" : "search-outline"} size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Animated Search Bar */}
      <Animated.View style={[styles.searchContainer, { height: searchHeight, opacity: searchAnimation }]}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#888"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => { setActiveFilter('all'); haptics.light(); }}
          >
            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'urgent' && styles.filterChipUrgent]}
            onPress={() => { setActiveFilter('urgent'); haptics.light(); }}
          >
            <Ionicons name="alert-circle" size={14} color={activeFilter === 'urgent' ? '#fff' : '#dc3545'} />
            <Text style={[styles.filterChipText, activeFilter === 'urgent' && styles.filterChipTextActive]}>
              Urgentes
            </Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterChip, activeFilter === cat.id && styles.filterChipActive]}
              onPress={() => { setActiveFilter(cat.id!); haptics.light(); }}
            >
              <Text style={[styles.filterChipText, activeFilter === cat.id && styles.filterChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          {products.length === 0 ? (
            <>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="paw-outline" size={60} color="#4285F4" />
              </View>
              <Text style={styles.emptyTitle}>Nenhum produto ainda</Text>
              <Text style={styles.emptySubtext}>
                Adicione seu primeiro produto para começar a controlar o estoque dos pets
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('ProductForm')}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Adicionar Produto</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons name="search-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => { setActiveFilter('all'); setSearchQuery(''); }}
                activeOpacity={0.7}
              >
                <Text style={styles.clearFilterText}>Limpar filtros</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={[
            ...(urgentProducts.length > 0 ? [{ type: 'header' as const, title: 'Precisa de Atenção', count: urgentProducts.length, color: '#dc3545' }] : []),
            ...urgentProducts.map(p => ({ type: 'product' as const, data: p })),
            ...(okProducts.length > 0 ? [{ type: 'header' as const, title: 'Estoque OK', count: okProducts.length, color: '#28a745' }] : []),
            ...okProducts.map(p => ({ type: 'product' as const, data: p })),
          ]}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return renderSectionHeader(item.title, item.count, item.color);
            }
            return renderProduct({ item: item.data });
          }}
          keyExtractor={(item, index) => item.type === 'header' ? `header-${index}` : item.data.id || String(index)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  // Search
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    overflow: 'hidden',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  // Filters
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterScroll: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  filterChipUrgent: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Product Card
  listContent: {
    padding: 15,
    paddingBottom: 100,
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productCardUrgent: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  productCardAttention: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 4,
    borderLeftColor: '#b8860b',
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
  urgentLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearFilterButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  clearFilterText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: '500',
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
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
});
