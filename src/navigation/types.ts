export type RootStackParamList = {
  Login: undefined;
  ProductsList: undefined;
  ProductForm: { productId?: string } | undefined;
  ProductDetail: { productId: string };
  Categories: undefined;
  PurchaseHistory: undefined;
};
