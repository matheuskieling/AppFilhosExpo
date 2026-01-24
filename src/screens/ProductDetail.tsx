import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getProduct, getPurchases, addPurchase, deletePurchase, deleteProduct, getCategories } from '../services/firestore';
import { Product, Purchase, Category } from '../types';

export default function ProductDetail({ navigation, route }: any) {
  const { user } = useAuth();
  const { productId } = route.params;

  const [product, setProduct] = useState<Product | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [categoryName, setCategoryName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState('1');
  const [savingPurchase, setSavingPurchase] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [productData, purchasesData, categoriesData] = await Promise.all([
        getProduct(user.uid, productId),
        getPurchases(user.uid, productId),
        getCategories(user.uid),
      ]);

      setProduct(productData);
      setPurchases(purchasesData);

      if (productData?.categoryId) {
        const category = categoriesData.find((c: Category) => c.id === productData.categoryId);
        setCategoryName(category?.name || '');
      }
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      Alert.alert('Erro', 'Não foi possível carregar o produto');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPurchase = async () => {
    if (!user || !product) return;

    const qty = parseInt(purchaseQuantity);
    if (!qty || qty <= 0) {
      Alert.alert('Erro', 'Informe uma quantidade válida');
      return;
    }

    setSavingPurchase(true);
    try {
      await addPurchase(user.uid, productId, qty, product.totalQuantity);
      setShowPurchaseModal(false);
      setPurchaseQuantity('1');
      loadData();
      Alert.alert('Sucesso', `Compra de ${qty} unidade(s) registrada!`);
    } catch (error) {
      console.error('Erro ao adicionar compra:', error);
      Alert.alert('Erro', 'Não foi possível registrar a compra');
    } finally {
      setSavingPurchase(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir produto',
      'Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await deleteProduct(user.uid, productId);
              navigation.goBack();
            } catch (error) {
              console.error('Erro ao excluir produto:', error);
              Alert.alert('Erro', 'Não foi possível excluir o produto');
            }
          },
        },
      ]
    );
  };

  const handleDeletePurchase = (purchase: Purchase) => {
    if (!product) return;

    Alert.alert(
      'Excluir compra',
      `Excluir compra de ${purchase.quantity} unidade(s)? O estoque será reduzido.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!user || !purchase.id) return;
            try {
              await deletePurchase(
                user.uid,
                productId,
                purchase.id,
                purchase.quantity,
                product.totalQuantity
              );
              loadData();
            } catch (error) {
              console.error('Erro ao excluir compra:', error);
              Alert.alert('Erro', 'Não foi possível excluir a compra');
            }
          },
        },
      ]
    );
  };

  const getDaysUntilEmpty = () => {
    if (!product || product.dailyUsage <= 0) return Infinity;
    return Math.ceil(product.remainingQuantity / product.dailyUsage);
  };

  const getEstimatedEndDate = () => {
    const days = getDaysUntilEmpty();
    if (days === Infinity) return 'Indeterminado';
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centered}>
        <Text>Produto não encontrado</Text>
      </View>
    );
  }

  const daysUntilEmpty = getDaysUntilEmpty();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ProductForm', { productId })}>
          <Ionicons name="create-outline" size={24} color="#4285F4" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Foto e Nome */}
        <View style={styles.productHeader}>
          {product.photo ? (
            <Image source={{ uri: product.photo }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.placeholderImage]}>
              <Ionicons name="cube-outline" size={50} color="#ccc" />
            </View>
          )}
          <Text style={styles.productName}>{product.name}</Text>
          {categoryName && <Text style={styles.categoryName}>{categoryName}</Text>}
        </View>

        {/* Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Restante</Text>
            <Text style={styles.statusValue}>
              {Math.round(product.remainingQuantity)} / {Math.round(product.totalQuantity)}
            </Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Uso diário</Text>
            <Text style={styles.statusValue}>{product.dailyUsage}</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Dias restantes</Text>
            <Text style={[
              styles.statusValue,
              daysUntilEmpty <= product.notificationDays && styles.statusWarning,
              daysUntilEmpty <= 0 && styles.statusDanger,
            ]}>
              {daysUntilEmpty === Infinity ? '∞' : daysUntilEmpty}
            </Text>
          </View>
        </View>

        {/* Previsão */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Previsão para acabar</Text>
          <Text style={styles.infoValue}>{getEstimatedEndDate()}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Notificar</Text>
          <Text style={styles.infoValue}>{product.notificationDays} dias antes</Text>
        </View>

        {/* Botão Adicionar Compra */}
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={() => setShowPurchaseModal(true)}
        >
          <Ionicons name="cart-outline" size={20} color="#fff" />
          <Text style={styles.purchaseButtonText}>Registrar Compra</Text>
        </TouchableOpacity>

        {/* Histórico de Compras */}
        <Text style={styles.sectionTitle}>Histórico de Compras</Text>
        {purchases.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma compra registrada</Text>
        ) : (
          purchases.map((purchase) => (
            <View key={purchase.id} style={styles.purchaseItem}>
              <View style={styles.purchaseInfo}>
                <Text style={styles.purchaseQuantity}>{purchase.quantity} unidade(s)</Text>
                <Text style={styles.purchaseDate}>
                  {purchase.date.toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <Text style={styles.purchaseTotal}>
                +{Math.round(purchase.quantity * product.totalQuantity)}
              </Text>
              <TouchableOpacity
                style={styles.purchaseDeleteButton}
                onPress={() => handleDeletePurchase(purchase)}
              >
                <Ionicons name="trash-outline" size={18} color="#dc3545" />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Botão Excluir */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#dc3545" />
          <Text style={styles.deleteButtonText}>Excluir Produto</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de Compra */}
      <Modal
        visible={showPurchaseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Registrar Compra</Text>
            <Text style={styles.modalLabel}>Quantas unidades você comprou?</Text>
            <TextInput
              style={styles.modalInput}
              value={purchaseQuantity}
              onChangeText={setPurchaseQuantity}
              keyboardType="number-pad"
              placeholder="1"
            />
            <Text style={styles.modalInfo}>
              Cada unidade tem {product.totalQuantity} de quantidade total
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPurchaseModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, savingPurchase && styles.modalButtonDisabled]}
                onPress={handleAddPurchase}
                disabled={savingPurchase}
              >
                {savingPurchase ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  productHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  placeholderImage: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  categoryName: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statusCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusWarning: {
    color: '#ffc107',
  },
  statusDanger: {
    color: '#dc3545',
  },
  infoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  purchaseButton: {
    flexDirection: 'row',
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 25,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  purchaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseDeleteButton: {
    padding: 8,
    marginLeft: 10,
  },
  purchaseQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  purchaseDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  purchaseTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#dc3545',
    fontSize: 16,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 25,
    width: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
  },
  modalInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
