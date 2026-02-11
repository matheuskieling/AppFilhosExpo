import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import app from '../config/firebase';
import { Product, Category, Purchase, PurchaseStatus } from '../types';

const db = getFirestore(app);

// Helper para converter Timestamp para Date
const convertTimestamp = (timestamp: Timestamp | undefined): Date | undefined => {
  return timestamp?.toDate();
};

// ==================== PRODUCTS ====================

export const getProducts = async (userId: string): Promise<Product[]> => {
  const productsRef = collection(db, `users/${userId}/products`);
  const q = query(productsRef, orderBy('name'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
    updatedAt: convertTimestamp(doc.data().updatedAt),
  })) as Product[];
};

export const getProduct = async (userId: string, productId: string): Promise<Product | null> => {
  const productRef = doc(db, `users/${userId}/products/${productId}`);
  const snapshot = await getDoc(productRef);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
    createdAt: convertTimestamp(snapshot.data().createdAt),
    updatedAt: convertTimestamp(snapshot.data().updatedAt),
  } as Product;
};

export const createProduct = async (userId: string, product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const productsRef = collection(db, `users/${userId}/products`);
  const docRef = await addDoc(productsRef, {
    ...product,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateProduct = async (userId: string, productId: string, product: Partial<Product>): Promise<void> => {
  const productRef = doc(db, `users/${userId}/products/${productId}`);
  await updateDoc(productRef, {
    ...product,
    updatedAt: serverTimestamp(),
  });
};

export const deleteProduct = async (userId: string, productId: string): Promise<void> => {
  const productRef = doc(db, `users/${userId}/products/${productId}`);
  await deleteDoc(productRef);
};

// ==================== CATEGORIES ====================

export const getCategories = async (userId: string): Promise<Category[]> => {
  const categoriesRef = collection(db, `users/${userId}/categories`);
  const q = query(categoriesRef, orderBy('name'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: convertTimestamp(doc.data().createdAt),
  })) as Category[];
};

export const createCategory = async (userId: string, name: string): Promise<string> => {
  const categoriesRef = collection(db, `users/${userId}/categories`);
  const docRef = await addDoc(categoriesRef, {
    name,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateCategory = async (userId: string, categoryId: string, name: string): Promise<void> => {
  const categoryRef = doc(db, `users/${userId}/categories/${categoryId}`);
  await updateDoc(categoryRef, { name });
};

export const deleteCategory = async (userId: string, categoryId: string): Promise<void> => {
  const categoryRef = doc(db, `users/${userId}/categories/${categoryId}`);
  await deleteDoc(categoryRef);
};

// ==================== PURCHASES ====================

export const getPurchases = async (userId: string, productId: string): Promise<Purchase[]> => {
  const purchasesRef = collection(db, `users/${userId}/products/${productId}/purchases`);
  const q = query(purchasesRef, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    productId,
    ...doc.data(),
    date: convertTimestamp(doc.data().date) || new Date(),
    status: doc.data().status || PurchaseStatus.DELIVERED, // retrocompatibilidade: compras antigas são consideradas entregues
    deliveredAt: convertTimestamp(doc.data().deliveredAt),
  })) as Purchase[];
};

export const addPurchase = async (
  userId: string,
  productId: string,
  quantity: number,
  _totalQuantityPerUnit: number // mantido para compatibilidade, não usado mais aqui
): Promise<void> => {
  // Adiciona registro de compra com status pendente (aguardando entrega)
  const purchasesRef = collection(db, `users/${userId}/products/${productId}/purchases`);
  await addDoc(purchasesRef, {
    quantity,
    date: serverTimestamp(),
    status: PurchaseStatus.PENDING,
  });
  // Não atualiza a quantidade do produto - isso só acontece quando a compra for marcada como entregue
};

export const markPurchaseAsDelivered = async (
  userId: string,
  productId: string,
  purchaseId: string,
  purchaseQuantity: number,
  totalQuantityPerUnit: number
): Promise<void> => {
  // Atualiza o status da compra para entregue
  const purchaseRef = doc(db, `users/${userId}/products/${productId}/purchases/${purchaseId}`);
  await updateDoc(purchaseRef, {
    status: PurchaseStatus.DELIVERED,
    deliveredAt: serverTimestamp(),
  });

  // Agora sim adiciona a quantidade ao estoque do produto
  const product = await getProduct(userId, productId);
  if (product) {
    const newRemaining = product.remainingQuantity + (purchaseQuantity * totalQuantityPerUnit);
    await updateProduct(userId, productId, { remainingQuantity: newRemaining });
  }
};

export const deletePurchase = async (
  userId: string,
  productId: string,
  purchaseId: string,
  purchaseQuantity: number,
  totalQuantityPerUnit: number,
  purchaseStatus: PurchaseStatus = PurchaseStatus.DELIVERED // retrocompatibilidade
): Promise<void> => {
  // Remove o registro de compra
  const purchaseRef = doc(db, `users/${userId}/products/${productId}/purchases/${purchaseId}`);
  await deleteDoc(purchaseRef);

  // Só subtrai a quantidade do estoque se a compra já estava entregue
  if (purchaseStatus === PurchaseStatus.DELIVERED) {
    const product = await getProduct(userId, productId);
    if (product) {
      const newRemaining = Math.max(0, product.remainingQuantity - (purchaseQuantity * totalQuantityPerUnit));
      await updateProduct(userId, productId, { remainingQuantity: newRemaining });
    }
  }
};

// ==================== PENDING PURCHASES CHECK ====================

export const getProductIdsWithPendingPurchases = async (
  userId: string,
  productIds: string[]
): Promise<Set<string>> => {
  const idsWithPending = new Set<string>();

  await Promise.all(
    productIds.map(async (productId) => {
      const purchasesRef = collection(db, `users/${userId}/products/${productId}/purchases`);
      const q = query(purchasesRef, where('status', '==', PurchaseStatus.PENDING), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        idsWithPending.add(productId);
      }
    })
  );

  return idsWithPending;
};

// ==================== ALL PURCHASES (para histórico geral) ====================

export const getAllPurchases = async (userId: string): Promise<(Purchase & { productName: string })[]> => {
  const products = await getProducts(userId);
  const allPurchases: (Purchase & { productName: string })[] = [];

  for (const product of products) {
    if (!product.id) continue;
    const purchases = await getPurchases(userId, product.id);
    allPurchases.push(...purchases.map(p => ({ ...p, productName: product.name })));
  }

  // Ordena por data decrescente
  return allPurchases.sort((a, b) => b.date.getTime() - a.date.getTime());
};
