import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../contexts/AuthContext';
import { getAllPurchases, markPurchaseAsDelivered, getProduct } from '../services/firestore';
import { Purchase, PurchaseStatus } from '../types';

interface PurchaseWithProduct extends Purchase {
  productName: string;
}

export default function PurchaseHistory({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [purchases, setPurchases] = useState<PurchaseWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPurchases();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadPurchases();
    });
    return unsubscribe;
  }, [navigation]);

  const loadPurchases = async () => {
    if (!user) return;

    try {
      const data = await getAllPurchases(user.uid);
      // Ordenar: pendentes primeiro, depois por data (mais recente primeiro)
      const sorted = data.sort((a, b) => {
        if (a.status === PurchaseStatus.PENDING && b.status !== PurchaseStatus.PENDING) return -1;
        if (a.status !== PurchaseStatus.PENDING && b.status === PurchaseStatus.PENDING) return 1;
        return b.date.getTime() - a.date.getTime();
      });
      setPurchases(sorted);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPurchases();
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;

    return date.toLocaleDateString('pt-BR');
  };

  const handleMarkAsDelivered = async (purchase: PurchaseWithProduct) => {
    if (!user || !purchase.id) return;

    // Busca o produto para pegar a quantidade total por unidade
    const product = await getProduct(user.uid, purchase.productId);
    if (!product) {
      Alert.alert('Erro', 'Produto não encontrado');
      return;
    }

    Alert.alert(
      'Confirmar Entrega',
      `Confirmar entrega de ${purchase.quantity} unidade(s) de ${purchase.productName}?\n\nSerão adicionados ${Math.round(purchase.quantity * product.totalQuantity)} ao estoque.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await markPurchaseAsDelivered(
                user.uid,
                purchase.productId,
                purchase.id!,
                purchase.quantity,
                product.totalQuantity
              );
              loadPurchases();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Sucesso', 'Entrega confirmada! Estoque atualizado.');
            } catch (error) {
              console.error('Erro ao marcar como entregue:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Erro', 'Não foi possível confirmar a entrega');
            }
          },
        },
      ]
    );
  };

  const renderPurchase = ({ item }: { item: PurchaseWithProduct }) => {
    const isPending = item.status === PurchaseStatus.PENDING;

    return (
      <TouchableOpacity
        style={[styles.purchaseItem, isPending && styles.purchaseItemPending]}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
        activeOpacity={0.7}
      >
        <View style={[styles.purchaseIcon, isPending && styles.purchaseIconPending]}>
          <Ionicons name={isPending ? 'time' : 'cart'} size={24} color={isPending ? '#d97706' : '#4285F4'} />
        </View>
        <View style={styles.purchaseInfo}>
          <Text style={styles.productName} numberOfLines={1} ellipsizeMode="tail">
            {item.productName}
          </Text>
          <View style={styles.purchaseMeta}>
            <Text style={styles.purchaseDate}>{formatDate(item.date)}</Text>
            {isPending ? (
              <View style={styles.statusBadgePending}>
                <Ionicons name="time-outline" size={10} color="#d97706" />
                <Text style={styles.statusBadgeTextPending}>Aguardando Entrega</Text>
              </View>
            ) : (
              <View style={styles.statusBadgeDelivered}>
                <Text style={styles.statusBadgeTextDelivered}>Entregue</Text>
              </View>
            )}
          </View>
        </View>
        {isPending ? (
          <TouchableOpacity
            style={styles.deliveredButton}
            onPress={() => handleMarkAsDelivered(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.deliveredButtonText}>Entregue</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.purchaseQuantity}>
            <Text style={styles.quantityText}>x{item.quantity}</Text>
          </View>
        )}
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

  const pendingCount = purchases.filter(p => p.status === PurchaseStatus.PENDING).length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Histórico de Compras</Text>
          {pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>
                {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      {purchases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Nenhuma compra registrada</Text>
          <Text style={styles.emptySubtext}>
            Suas compras aparecerão aqui
          </Text>
        </View>
      ) : (
        <FlatList
          data={purchases}
          renderItem={renderPurchase}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4285F4']} />
          }
        />
      )}
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
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  pendingBadgeText: {
    fontSize: 11,
    color: '#d97706',
    fontWeight: '500',
  },
  listContent: {
    padding: 15,
  },
  purchaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  purchaseItemPending: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  purchaseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchaseIconPending: {
    backgroundColor: '#fef3c7',
  },
  purchaseInfo: {
    flex: 1,
    flexShrink: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  purchaseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flexShrink: 1,
    gap: 4,
    marginTop: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  purchaseDate: {
    fontSize: 12,
    color: '#666',
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  statusBadgeTextPending: {
    fontSize: 10,
    fontWeight: '600',
    color: '#d97706',
  },
  statusBadgeDelivered: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeTextDelivered: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  purchaseQuantity: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  quantityText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deliveredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  deliveredButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
