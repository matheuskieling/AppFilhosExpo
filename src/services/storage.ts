import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import app from '../config/firebase';

const storage = getStorage(app);

/**
 * Faz upload de uma imagem para o Storage
 * @param userId - ID do usuário
 * @param uri - URI local da imagem
 * @param productId - ID do produto (para nomear o arquivo)
 * @returns URL pública da imagem
 */
export const uploadProductImage = async (
  userId: string,
  uri: string,
  productId: string
): Promise<string> => {
  // Converte URI para blob
  const response = await fetch(uri);
  const blob = await response.blob();

  // Define o caminho no storage
  const extension = uri.split('.').pop() || 'jpg';
  const path = `users/${userId}/products/${productId}.${extension}`;
  const storageRef = ref(storage, path);

  // Faz upload
  await uploadBytes(storageRef, blob);

  // Retorna URL pública
  return await getDownloadURL(storageRef);
};

/**
 * Deleta uma imagem do Storage
 * @param photoUrl - URL da imagem a ser deletada
 */
export const deleteProductImage = async (photoUrl: string): Promise<void> => {
  try {
    const storageRef = ref(storage, photoUrl);
    await deleteObject(storageRef);
  } catch (error) {
    // Ignora erro se imagem não existir
    console.log('Imagem não encontrada ou já deletada');
  }
};
