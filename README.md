# Filhos Estoque

Aplicativo para gerenciar o estoque de ração e remédios dos nossos cachorros. Ele controla a quantidade restante de cada produto, desconta automaticamente o uso diário e nos avisa quando está na hora de comprar mais.

## Funcionalidades

- **Cadastro de produtos** com foto, quantidade total, uso diário e janela de notificação
- **Controle automático de estoque** com desconto diário da quantidade restante
- **Registro de compras** com histórico completo por produto
- **Push notifications** avisando quando um produto está perto de acabar
- **Categorias** para organizar os produtos (ração, remédios, etc.)
- **Previsão de fim de estoque** com data estimada calculada automaticamente
- **Suspensão de produtos** para pausar o desconto diário quando necessário

## Tech Stack

- React Native + Expo (SDK 54)
- TypeScript
- Firebase (Authentication + Firestore)
- Expo Notifications (push notifications)
- React Navigation (navegação com tabs e stack)

## Setup

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as credenciais:
   - Copie `src/config/secrets.example.ts` para `src/config/secrets.ts` e preencha os Client IDs do Google OAuth
   - Adicione o `google-services.json` do Firebase na raiz do projeto
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm start
   ```

## Scripts

| Comando | Descricao |
|---|---|
| `npm start` | Inicia o servidor Expo |
| `npm run android` | Roda no Android |
| `npm run ios` | Roda no iOS |
| `npm run web` | Roda no navegador |
| `npm run build:preview` | Gera APK de teste via EAS |

## Estrutura do Projeto

```
src/
  config/       # Firebase e credenciais OAuth
  contexts/     # AuthContext (estado global de autenticacao)
  navigation/   # React Navigation (rotas baseadas em auth)
  screens/      # Telas do app
  services/     # Firestore, notifications, storage
  types/        # Tipos TypeScript (Product, Purchase, Category)
  utils/        # Utilitarios (haptics)
```
