import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Produtos: undefined;
  Historico: undefined;
  Mais: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  MainTabs: NavigatorScreenParams<TabParamList>;
  ProductForm: { productId?: string } | undefined;
  ProductDetail: { productId: string };
  Categories: undefined;
};

// Legacy support
export type { RootStackParamList as StackParamList };
