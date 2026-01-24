import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { createProduct, updateProduct, getProduct, getCategories } from '../services/firestore';
import { uploadProductImage } from '../services/storage';
import { Category } from '../types';
import { Picker } from '@react-native-picker/picker';

export default function ProductForm({ navigation, route }: any) {
  const { user } = useAuth();
  const productId = route.params?.productId;
  const isEditing = !!productId;

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [dailyUsage, setDailyUsage] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [remainingQuantity, setRemainingQuantity] = useState('');
  const [notificationDays, setNotificationDays] = useState('3');
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);

  useEffect(() => {
    loadCategories();
    if (isEditing) {
      loadProduct();
    }
  }, []);

  const loadCategories = async () => {
    if (!user) return;
    try {
      const cats = await getCategories(user.uid);
      setCategories(cats);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadProduct = async () => {
    if (!user || !productId) return;
    try {
      const product = await getProduct(user.uid, productId);
      if (product) {
        setName(product.name);
        setPhoto(product.photo || null);
        setDailyUsage(product.dailyUsage.toString());
        setTotalQuantity(product.totalQuantity.toString());
        setRemainingQuantity(product.remainingQuantity.toString());
        setNotificationDays(product.notificationDays.toString());
        setCategoryId(product.categoryId || '');
      }
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
      Alert.alert('Erro', 'Não foi possível carregar o produto');
    } finally {
      setLoadingData(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Adicionar foto', 'Escolha uma opção', [
      { text: 'Câmera', onPress: takePhoto },
      { text: 'Galeria', onPress: pickImage },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validação
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe o nome do produto');
      return;
    }
    if (!dailyUsage || parseFloat(dailyUsage) < 0) {
      Alert.alert('Erro', 'Informe a quantidade usada por dia');
      return;
    }
    if (!totalQuantity || parseFloat(totalQuantity) <= 0) {
      Alert.alert('Erro', 'Informe a quantidade total');
      return;
    }

    setLoading(true);

    try {
      let photoUrl = photo;

      // Upload da imagem se for uma URI local
      if (photo && photo.startsWith('file://')) {
        const tempId = productId || Date.now().toString();
        photoUrl = await uploadProductImage(user.uid, photo, tempId);
      }

      const productData: any = {
        name: name.trim(),
        dailyUsage: parseFloat(dailyUsage),
        totalQuantity: parseFloat(totalQuantity),
        remainingQuantity: parseFloat(remainingQuantity) || parseFloat(totalQuantity),
        notificationDays: parseInt(notificationDays) || 3,
      };

      // Só adiciona campos opcionais se tiverem valor
      if (photoUrl) productData.photo = photoUrl;
      if (categoryId) productData.categoryId = categoryId;

      if (isEditing) {
        await updateProduct(user.uid, productId, productData);
        Alert.alert('Sucesso', 'Produto atualizado!');
      } else {
        await createProduct(user.uid, productData);
        Alert.alert('Sucesso', 'Produto criado!');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      Alert.alert('Erro', 'Não foi possível salvar o produto');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
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
        <Text style={styles.title}>{isEditing ? 'Editar Produto' : 'Novo Produto'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Foto */}
        <TouchableOpacity style={styles.photoContainer} onPress={showImageOptions}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera-outline" size={40} color="#999" />
              <Text style={styles.photoText}>Adicionar foto</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Nome */}
        <Text style={styles.label}>Nome do produto *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Ração Golden"
        />

        {/* Categoria */}
        <Text style={styles.label}>Categoria</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={categoryId}
            onValueChange={setCategoryId}
            style={styles.picker}
          >
            <Picker.Item label="Sem categoria" value="" />
            {categories.map((cat) => (
              <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
            ))}
          </Picker>
        </View>

        {/* Quantidade Total */}
        <Text style={styles.label}>Quantidade total (por unidade) *</Text>
        <TextInput
          style={styles.input}
          value={totalQuantity}
          onChangeText={setTotalQuantity}
          placeholder="Ex: 15 (kg por saco)"
          keyboardType="decimal-pad"
        />

        {/* Uso Diário */}
        <Text style={styles.label}>Quantidade usada por dia *</Text>
        <TextInput
          style={styles.input}
          value={dailyUsage}
          onChangeText={setDailyUsage}
          placeholder="Ex: 0.5 (kg por dia)"
          keyboardType="decimal-pad"
        />

        {/* Quantidade Restante */}
        <Text style={styles.label}>Quantidade restante atual</Text>
        <TextInput
          style={styles.input}
          value={remainingQuantity}
          onChangeText={setRemainingQuantity}
          placeholder="Deixe vazio para usar quantidade total"
          keyboardType="decimal-pad"
        />

        {/* Dias para Notificação */}
        <Text style={styles.label}>Notificar quantos dias antes de acabar</Text>
        <TextInput
          style={styles.input}
          value={notificationDays}
          onChangeText={setNotificationDays}
          placeholder="Ex: 3"
          keyboardType="number-pad"
        />

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Salvar Alterações' : 'Criar Produto'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  form: {
    flex: 1,
    padding: 20,
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  photoText: {
    color: '#999',
    fontSize: 12,
    marginTop: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  saveButton: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
