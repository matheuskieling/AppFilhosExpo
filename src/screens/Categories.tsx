import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/firestore';
import { Category } from '../types';

export default function Categories({ navigation }: any) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (!user) return;

    try {
      const data = await getCategories(user.uid);
      setCategories(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
    } else {
      setEditingCategory(null);
      setCategoryName('');
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!categoryName.trim()) {
      Alert.alert('Erro', 'Informe o nome da categoria');
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(user.uid, editingCategory.id!, categoryName.trim());
      } else {
        await createCategory(user.uid, categoryName.trim());
      }
      setShowModal(false);
      setCategoryName('');
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      Alert.alert('Erro', 'Não foi possível salvar a categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (category: Category) => {
    Alert.alert(
      'Excluir categoria',
      `Tem certeza que deseja excluir "${category.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await deleteCategory(user.uid, category.id!);
              loadCategories();
            } catch (error) {
              console.error('Erro ao excluir categoria:', error);
              Alert.alert('Erro', 'Não foi possível excluir a categoria');
            }
          },
        },
      ]
    );
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <View style={styles.categoryItem}>
      <TouchableOpacity style={styles.categoryContent} onPress={() => openModal(item)}>
        <Ionicons name="folder-outline" size={24} color="#4285F4" />
        <Text style={styles.categoryName}>{item.name}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleDelete(item)}>
        <Ionicons name="trash-outline" size={20} color="#dc3545" />
      </TouchableOpacity>
    </View>
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
        <Text style={styles.title}>Categorias</Text>
        <TouchableOpacity onPress={() => openModal()}>
          <Ionicons name="add" size={28} color="#4285F4" />
        </TouchableOpacity>
      </View>

      {categories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Nenhuma categoria</Text>
          <Text style={styles.emptySubtext}>Toque no + para criar uma categoria</Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id || ''}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Nome da categoria"
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, saving && styles.modalButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  listContent: {
    padding: 15,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  categoryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
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
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
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
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#4285F4',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
