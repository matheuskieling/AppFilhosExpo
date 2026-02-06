import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Animated,
  Modal,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { getProducts, getCategories, addPurchase } from '../services/firestore';
import { Product, Category } from '../types';
import haptics from '../utils/haptics';

interface ProductWithCategory extends Product {
  categoryName?: string;
  daysUntilEmpty: number;
}

type StatusType = 'urgent' | 'attention' | 'ok';

const getStatus = (daysUntilEmpty: number, notificationDays: number): StatusType => {
  if (daysUntilEmpty <= 0) return 'urgent';
  if (daysUntilEmpty <= notificationDays) return 'attention';
  return 'ok';
};

const getStatusColor = (status: StatusType) => {
  switch (status) {
    case 'urgent': return '#dc3545';
    case 'attention': return '#b8860b';
    case 'ok': return '#28a745';
  }
};

// Skeleton component for loading state
const SkeletonDashboard = () => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(animatedValue, { toValue: 0, duration: 1000, useNativeDriver: true }),
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
    <View style={styles.skeletonContainer}>
      <View style={styles.statusCardsRow}>
        {[1, 2, 3].map((i) => (
          <Animated.View key={i} style={[styles.skeletonCard, { opacity }]} />
        ))}
      </View>
      <Animated.View style={[styles.skeletonSection, { opacity }]} />
      <Animated.View style={[styles.skeletonItem, { opacity }]} />
      <Animated.View style={[styles.skeletonItem, { opacity }]} />
    </View>
  );
};

export default function Home({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Quick purchase modal state
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithCategory | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState('1');
  const [purchasing, setPurchasing] = useState(false);

  const fabScale = useRef(new Animated.Value(1)).current;

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [productsData, categoriesData] = await Promise.all([
        getProducts(user.uid),
        getCategories(user.uid),
      ]);

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
      console.error('Erro ao carregar dados:', error);
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

  // Calculate status counts (exclui produtos suspensos dos alertas)
  const activeProducts = products.filter(p => !p.isSuspended);
  const urgentProducts = activeProducts.filter(p => getStatus(p.daysUntilEmpty, p.notificationDays) === 'urgent');
  const attentionProducts = activeProducts.filter(p => getStatus(p.daysUntilEmpty, p.notificationDays) === 'attention');
  const okProducts = activeProducts.filter(p => getStatus(p.daysUntilEmpty, p.notificationDays) === 'ok');
  const alertProducts = [...urgentProducts, ...attentionProducts];

  // Quick purchase handlers
  const openPurchaseModal = (product: ProductWithCategory) => {
    haptics.light();
    setSelectedProduct(product);
    setPurchaseQuantity('1');
    setPurchaseModalVisible(true);
  };

  const handleQuickPurchase = async () => {
    if (!selectedProduct || !user) return;

    const qty = parseInt(purchaseQuantity) || 1;
    if (qty <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que zero');
      return;
    }

    setPurchasing(true);
    try {
      await addPurchase(user.uid, selectedProduct.id!, qty, selectedProduct.totalQuantity);
      haptics.success();
      setPurchaseModalVisible(false);
      loadData();
      Alert.alert(
        'Compra Registrada',
        `Compra de ${qty} unidade(s) registrada!\n\nQuando receber, marque como "Entregue" para atualizar o estoque.`
      );
    } catch (error) {
      haptics.error();
      Alert.alert('Erro', 'Não foi possível registrar a compra');
    } finally {
      setPurchasing(false);
    }
  };

  const handleFabPressIn = () => {
    Animated.spring(fabScale, { toValue: 0.9, useNativeDriver: true }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <Ionicons name="paw" size={28} color="#4285F4" />
            <Text style={styles.title}>FilhosApp</Text>
          </View>
        </View>
        <SkeletonDashboard />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerTitle}>
          <Ionicons name="paw" size={28} color="#4285F4" />
          <Text style={styles.title}>FilhosApp</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4285F4']} />
        }
      >
        {/* Status Cards */}
        <View style={styles.statusCardsRow}>
          <TouchableOpacity
            style={[styles.statusCard, { backgroundColor: '#fff5f5', borderColor: '#dc3545' }]}
            onPress={() => navigation.navigate('Produtos')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statusCount, { color: '#dc3545' }]}>{urgentProducts.length}</Text>
            <Text style={[styles.statusLabel, { color: '#dc3545' }]}>Urgente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusCard, { backgroundColor: '#fffbeb', borderColor: '#b8860b' }]}
            onPress={() => navigation.navigate('Produtos')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statusCount, { color: '#b8860b' }]}>{attentionProducts.length}</Text>
            <Text style={[styles.statusLabel, { color: '#b8860b' }]}>Comprar Logo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusCard, { backgroundColor: '#f0fff4', borderColor: '#28a745' }]}
            onPress={() => navigation.navigate('Produtos')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statusCount, { color: '#28a745' }]}>{okProducts.length}</Text>
            <Text style={[styles.statusLabel, { color: '#28a745' }]}>OK</Text>
          </TouchableOpacity>
        </View>

        {/* Alerts Section */}
        {alertProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle" size={20} color="#dc3545" />
              <Text style={styles.sectionTitle}>Precisa de Atenção</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{alertProducts.length}</Text>
              </View>
            </View>

            {alertProducts.map((product) => {
              const status = getStatus(product.daysUntilEmpty, product.notificationDays);
              const statusColor = getStatusColor(status);
              const isUrgent = status === 'urgent';

              return (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    styles.alertCard,
                    { backgroundColor: isUrgent ? '#fff5f5' : '#fffbeb', borderLeftColor: statusColor }
                  ]}
                  onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.alertCardContent}>
                    {product.photo ? (
                      <Image source={{ uri: product.photo }} style={styles.alertImage} />
                    ) : (
                      <View style={[styles.alertImage, styles.placeholderImage]}>
                        <Ionicons name="paw-outline" size={20} color="#ccc" />
                      </View>
                    )}
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertName} numberOfLines={1}>{product.name}</Text>
                      <Text style={[styles.alertStatus, { color: statusColor }]}>
                        {isUrgent ? 'ACABOU!' : `Comprar em ${product.daysUntilEmpty} dias`}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.quickBuyButton, { backgroundColor: '#28a745' }]}
                    onPress={() => openPurchaseModal(product)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="cart" size={16} color="#fff" />
                    <Text style={styles.quickBuyText}>Comprei</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Upcoming Section */}
        {okProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Próximas Compras</Text>
            </View>

            {okProducts.slice(0, 3).map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.upcomingCard}
                onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}
                activeOpacity={0.7}
              >
                {product.photo ? (
                  <Image source={{ uri: product.photo }} style={styles.upcomingImage} />
                ) : (
                  <View style={[styles.upcomingImage, styles.placeholderImage]}>
                    <Ionicons name="paw-outline" size={16} color="#ccc" />
                  </View>
                )}
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.upcomingDays}>
                    {product.daysUntilEmpty === Infinity ? 'Sem uso diário' : `${product.daysUntilEmpty} dias restantes`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {products.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="paw-outline" size={60} color="#4285F4" />
            </View>
            <Text style={styles.emptyTitle}>Nenhum produto ainda</Text>
            <Text style={styles.emptySubtitle}>
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
          </View>
        )}

        {/* Quick Actions */}
        {products.length > 0 && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ProductForm')}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={24} color="#4285F4" />
              <Text style={styles.actionButtonText}>Novo Produto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Produtos')}
              activeOpacity={0.7}
            >
              <Ionicons name="list-outline" size={24} color="#4285F4" />
              <Text style={styles.actionButtonText}>Ver Todos</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FAB for quick purchase */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }], bottom: 20 }]}>
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

      {/* Quick Purchase Modal */}
      <Modal
        visible={purchaseModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPurchaseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar Compra</Text>
              <TouchableOpacity onPress={() => setPurchaseModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <>
                <View style={styles.modalProduct}>
                  {selectedProduct.photo ? (
                    <Image source={{ uri: selectedProduct.photo }} style={styles.modalProductImage} />
                  ) : (
                    <View style={[styles.modalProductImage, styles.placeholderImage]}>
                      <Ionicons name="paw-outline" size={24} color="#ccc" />
                    </View>
                  )}
                  <View style={styles.modalProductInfo}>
                    <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                    <Text style={styles.modalProductDetail}>
                      {selectedProduct.totalQuantity} unidades por pacote
                    </Text>
                  </View>
                </View>

                <View style={styles.quantitySelector}>
                  <Text style={styles.quantityLabel}>Quantidade de pacotes:</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const current = parseInt(purchaseQuantity) || 1;
                        if (current > 1) setPurchaseQuantity(String(current - 1));
                        haptics.light();
                      }}
                    >
                      <Ionicons name="remove" size={24} color="#4285F4" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantityInput}
                      value={purchaseQuantity}
                      onChangeText={setPurchaseQuantity}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const current = parseInt(purchaseQuantity) || 0;
                        setPurchaseQuantity(String(current + 1));
                        haptics.light();
                      }}
                    >
                      <Ionicons name="add" size={24} color="#4285F4" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.modalSummary}>
                  <Text style={styles.summaryText}>
                    Estoque atual: {Math.round(selectedProduct.remainingQuantity)}
                  </Text>
                  <Text style={styles.summaryText}>
                    Após entrega: +{Math.round((parseInt(purchaseQuantity) || 0) * selectedProduct.totalQuantity)}
                  </Text>
                </View>

                <View style={styles.deliveryNotice}>
                  <Ionicons name="information-circle" size={18} color="#d97706" />
                  <Text style={styles.deliveryNoticeText}>
                    O estoque será atualizado quando você marcar como entregue.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.confirmButton, purchasing && styles.confirmButtonDisabled]}
                  onPress={handleQuickPurchase}
                  disabled={purchasing}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmButtonText}>
                    {purchasing ? 'Registrando...' : 'Confirmar Compra'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 100,
  },
  // Status Cards
  statusCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statusCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusCount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Alert Cards
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  alertCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  alertInfo: {
    marginLeft: 12,
    flex: 1,
  },
  alertName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  alertStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  quickBuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  quickBuyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Upcoming Cards
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  upcomingImage: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  upcomingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  upcomingDays: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  // Placeholder
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
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
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    maxWidth: 280,
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
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  actionButtonText: {
    color: '#4285F4',
    fontSize: 14,
    fontWeight: '600',
  },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 20,
  },
  modalProductImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  modalProductInfo: {
    marginLeft: 15,
    flex: 1,
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modalProductDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  quantitySelector: {
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    minWidth: 60,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 2,
    borderBottomColor: '#4285F4',
  },
  modalSummary: {
    padding: 15,
    backgroundColor: '#e8f0fe',
    borderRadius: 8,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  deliveryNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  deliveryNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
  },
  confirmButton: {
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Skeleton
  skeletonContainer: {
    padding: 15,
  },
  skeletonCard: {
    flex: 1,
    height: 80,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
  },
  skeletonSection: {
    height: 24,
    width: '50%',
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginTop: 20,
    marginBottom: 12,
  },
  skeletonItem: {
    height: 70,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    marginBottom: 8,
  },
});
