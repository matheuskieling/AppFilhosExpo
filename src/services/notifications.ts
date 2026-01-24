import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import app from '../config/firebase';

const db = getFirestore(app);

// Configura como as notificações são exibidas
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Registra o dispositivo para receber push notifications
 * @param userId - ID do usuário logado
 * @returns Token do dispositivo ou null se falhar
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications não funcionam no emulador');
    return null;
  }

  // Verifica/solicita permissão
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permissão de notificação negada');
    return null;
  }

  // Configuração para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4285F4',
    });
  }

  // Obtém o token FCM
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    console.log('Push token:', token);

    // Salva o token no Firestore
    await saveFcmToken(userId, token);

    return token;
  } catch (error) {
    console.error('Erro ao obter push token:', error);
    return null;
  }
}

/**
 * Salva o token FCM no Firestore
 */
async function saveFcmToken(userId: string, token: string): Promise<void> {
  const tokenRef = doc(db, `users/${userId}/fcmTokens/${token}`);
  await setDoc(tokenRef, {
    createdAt: new Date(),
    platform: Platform.OS,
  });
}

/**
 * Remove o token FCM do Firestore (ao fazer logout)
 */
export async function unregisterPushNotifications(userId: string, token: string): Promise<void> {
  try {
    const tokenRef = doc(db, `users/${userId}/fcmTokens/${token}`);
    await deleteDoc(tokenRef);
  } catch (error) {
    console.error('Erro ao remover token:', error);
  }
}

/**
 * Adiciona listener para notificações recebidas
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Adiciona listener para quando usuário clica na notificação
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
