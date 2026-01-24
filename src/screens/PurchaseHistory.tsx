import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getAllPurchases } from '../services/firestore';
import { Purchase } from '../types';

interface PurchaseWithProduct extends Purchase {
  productName: string;
}

export default function PurchaseHistory({ navigation }: any) {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

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
      setPurchases(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoading(false);
    }
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

  const renderPurchase = ({ item }: { item: PurchaseWithProduct }) => (
    <TouchableOpacity
      style={styles.purchaseItem}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.productId })}
    >
      <View style={styles.purchaseIcon}>
        <Ionicons name="cart" size={24} color="#4285F4" />
      </View>
      <View style={styles.purchaseInfo}>
        <Text style={styles.productName}>{item.productName}</Text>
        <Text style={styles.purchaseDate}>{formatDate(item.date)}</Text>
      </View>
      <View style={styles.purchaseQuantity}>
        <Text style={styles.quantityText}>x{item.quantity}</Text>
      </View>
    </TouchableOpacity>
  );

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Histórico de Compras</Text>
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
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
  purchaseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchaseInfo: {
    flex: 1,
    marginLeft: 15,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  purchaseDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
