# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm start          # Start Expo development server
npm run android    # Run on Android with Expo Go
npm run ios        # Run on iOS with Expo Go
npm run web        # Run on web browser
```

For EAS builds:
```bash
eas build -p android --profile preview   # Build APK for testing
eas build -p android --profile production # Build AAB for Play Store
```

## Architecture

**Tech Stack:** React Native + Expo + TypeScript + Firebase Authentication

**Structure:**
- `src/config/` - Firebase initialization and OAuth credentials
- `src/contexts/` - React Context for global state (AuthContext)
- `src/navigation/` - React Navigation stack with auth-based routing
- `src/screens/` - Screen components (Login, ProductsList)

**Auth Flow:**
- AuthContext wraps the app and manages Firebase auth state
- AppNavigator conditionally renders Login or ProductsList based on auth
- Login supports email/password and Google OAuth
- Sessions persist via AsyncStorage

**Credentials:**
- `src/config/secrets.ts` - Google OAuth Client IDs (gitignored)
- `google-services.json` - Firebase Android config (gitignored)
- Copy `secrets.example.ts` to `secrets.ts` and fill in your credentials

## Key Patterns

- All UI text is in Portuguese (Brazilian)
- Error messages are user-friendly, not technical
- Path alias: `@/*` maps to `src/*`
- Styling uses React Native StyleSheet
- Primary color: #4285F4 (Google blue)

## Ideia principal do projeto (Maioria é lógica que fica no firebase)

Estamos construindo um aplicativo. Filhos estoque. Vou descrever como o aplicativo deve funcionar para você me ajudar a construir o backend e integraçoes necessárias.

O objetivo geral do aplicativo é gerir o estoque de produtos dos nossos cachorros, como ração e remédios e nos avisar o momento que devemos comprar os produtos registrados.

Um usuário gostaria de:
1. Criar um produto que:
   1.1 Tem uma foto
   1.2 Tem uma quantia usada por dia
   1.3 Tem uma quantia total
   1.4 Tem uma janela de tempo para notificar o usuário ( quanto tempo antes de acabar o usuário deve ser notificado para comprar )
   1.5 Tem uma quantidade restante no produto
   1.5.1 Desconta todo dia da quantidade restante do produto a quantidade usada por dia
   1.5.2 Quando eu clicar em adicionar compra do produto ele adiciona a quantidade restante a quantidade total do produto (Digamos que eu compre um 3x item de quantidade total 10, tenho 5 restantes, eu adiciono 3x10 aos 5 e no final tenho 35)
   1.5.3 Quando eu clicar em adicionar compra do produto ele adiciona o registro da compra (quando foi e a quantidade que foi, por exemplo comprei 3 sacos de ração)
   1.6 Tem uma categoria para selecionar
   1.7 Tem um nome de produto
   1.8 Tem uma data de previsão para acabar com base na quantia restante, quantia usada por dia e janela de notificação

2. Ter um histórico de cada produto e suas compras
   2.1 Guardar a quantidade de produto que comprou e quando (item 1.5.3)
3. Criar categorias para os produtos
4. Enviar push notification para o usuário quando o produto estiver perto de acabar (item 1.4)
   4.1 A data da notificação será calculada todo dia após descontar da quantidade restante a quantidade usada diariamente, levando em consideração
5. Ter uma listagem de produtos (inclui nessa resposta o histórico de compra do produto)
6. Ter uma listagem do histórico de compras (a lista é ordenada por última compra e traz de todos os produtos)

