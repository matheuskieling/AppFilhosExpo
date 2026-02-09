import {setGlobalOptions} from "firebase-functions";
import {onSchedule} from "firebase-functions/scheduler";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getMessaging} from "firebase-admin/messaging";
import {getAuth} from "firebase-admin/auth";
import {initializeApp} from "firebase-admin/app";
import * as logger from "firebase-functions/logger";

// Inicializa o Firebase Admin
initializeApp();

// Limita instâncias para controle de custos
setGlobalOptions({maxInstances: 10, region: "southamerica-east1"});

const db = getFirestore();

/**
 * Estrutura do Firestore:
 * users/{userId}/products/{productId}
 * users/{userId}/products/{productId}/purchases/{purchaseId}
 * users/{userId}/categories/{categoryId}
 * users/{userId}/fcmTokens/{tokenId}
 */

/**
 * Função agendada que roda todo dia às 08:00 (horário de Brasília)
 * - Desconta a quantidade usada por dia de cada produto
 * - Verifica se precisa enviar notificação
 */
export const dailyStockUpdate = onSchedule(
  {
    schedule: "0 8 * * *", // Todo dia às 8h BRT
    timeZone: "America/Sao_Paulo",
  },
  async () => {
    logger.info("Iniciando atualização diária de estoque");

    try {
      // Busca todos os usuários do Firebase Auth
      const listUsersResult = await getAuth().listUsers();

      for (const userRecord of listUsersResult.users) {
        await processUserProducts(userRecord.uid);
      }

      logger.info("Atualização diária concluída");
    } catch (error) {
      logger.error("Erro na atualização diária:", error);
    }
  }
);

/**
 * Processa os produtos de um usuário
 * @param {string} userId - ID do usuário
 */
async function processUserProducts(userId: string): Promise<void> {
  const productsRef = db.collection(`users/${userId}/products`);
  const productsSnapshot = await productsRef.get();

  for (const productDoc of productsSnapshot.docs) {
    const product = productDoc.data();
    const productId = productDoc.id;

    // Pula produtos suspensos
    if (product.isSuspended) {
      logger.info(`Produto ${product.name} está suspenso - pulando desconto`);
      continue;
    }

    // Calcula nova quantidade restante
    const dailyUsage = product.dailyUsage || 0;
    const currentRemaining = product.remainingQuantity || 0;
    const newRemaining = Math.max(0, currentRemaining - dailyUsage);

    // Atualiza quantidade restante
    await productDoc.ref.update({
      remainingQuantity: newRemaining,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Verifica se precisa notificar (apenas se ainda há estoque)
    const notificationDays = product.notificationDays || 3;
    const daysUntilEmpty =
      dailyUsage > 0 ? newRemaining / dailyUsage : Infinity;

    // Só notifica se ainda há estoque restante
    if (newRemaining > 0 && daysUntilEmpty <= notificationDays) {
      // Verifica se já existe compra pendente
      // (já comprado, aguardando entrega)
      const pendingPurchases = await db
        .collection(`users/${userId}/products/${productId}/purchases`)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (pendingPurchases.empty) {
        await sendLowStockNotification(
          userId, productId, product.name, Math.ceil(daysUntilEmpty)
        );
      } else {
        logger.info(
          `Produto ${product.name}: notificação suprimida - compra pendente`
        );
      }
    }
    // Não envia notificação quando chega a 0

    logger.info(
      `Produto ${product.name}: ${currentRemaining} -> ${newRemaining}`
    );
  }
}

/**
 * Envia notificação de estoque baixo
 * @param {string} userId - ID do usuário
 * @param {string} productId - ID do produto
 * @param {string} productName - Nome do produto
 * @param {number} daysRemaining - Dias restantes
 */
async function sendLowStockNotification(
  userId: string,
  productId: string,
  productName: string,
  daysRemaining: number
): Promise<void> {
  const tokens = await getUserFcmTokens(userId);
  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: "Estoque baixo!",
      body: `${productName} vai acabar em ${daysRemaining} dia(s).`,
    },
    data: {
      type: "low_stock",
      productId: productId,
    },
    tokens: tokens,
  };

  try {
    await getMessaging().sendEachForMulticast(message);
    logger.info(`Notificação enviada para ${userId}: ${productName}`);
  } catch (error) {
    logger.error("Erro ao enviar notificação:", error);
  }
}

/**
 * Busca os tokens FCM do usuário
 * @param {string} userId - ID do usuário
 * @return {Promise<string[]>} Lista de tokens FCM
 */
async function getUserFcmTokens(userId: string): Promise<string[]> {
  const tokensSnapshot =
    await db.collection(`users/${userId}/fcmTokens`).get();
  return tokensSnapshot.docs.map((doc) => doc.id);
}
