// Tipos do Firestore

export interface Product {
  id?: string;
  name: string;
  photo?: string;
  dailyUsage: number; // quantidade usada por dia
  totalQuantity: number; // quantidade total de uma unidade
  remainingQuantity: number; // quantidade restante
  notificationDays: number; // dias antes de acabar para notificar
  categoryId?: string;
  isSuspended?: boolean; // se true, não desconta estoque diariamente
  createdAt?: Date;
  updatedAt?: Date;
}

export enum PurchaseStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
}

export interface Purchase {
  id?: string;
  productId: string;
  quantity: number; // quantas unidades comprou
  date: Date;
  status: PurchaseStatus; // 'pending' = compra realizada, 'delivered' = entregue
  deliveredAt?: Date; // data que foi marcada como entregue
}

export interface Category {
  id?: string;
  name: string;
  createdAt?: Date;
}

// Tipo para exibição com dados calculados
export interface ProductWithDetails extends Product {
  categoryName?: string;
  daysUntilEmpty: number;
  estimatedEndDate: Date;
  purchases?: Purchase[];
}
