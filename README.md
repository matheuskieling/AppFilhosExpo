# Filhos Estoque

App to manage food and medicine stock for our dogs. It tracks the remaining quantity of each product, automatically deducts daily usage, and notifies us when it's time to buy more.

## Features

- **Product registration** with photo, total quantity, daily usage and notification window
- **Automatic stock control** with daily deduction from remaining quantity
- **Purchase tracking** with full history per product
- **Push notifications** when a product is running low
- **Categories** to organize products (food, medicine, etc.)
- **Stock forecast** with automatically calculated estimated end date
- **Product suspension** to pause daily deduction when needed

## Tech Stack

- React Native + Expo (SDK 54)
- TypeScript
- Firebase (Authentication + Firestore)
- Expo Notifications (push notifications)
- React Navigation (tabs and stack navigation)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure credentials:
   - Copy `src/config/secrets.example.ts` to `src/config/secrets.ts` and fill in the Google OAuth Client IDs
   - Add the Firebase `google-services.json` to the project root
4. Start the development server:
   ```bash
   npm start
   ```

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start Expo dev server |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm run web` | Run in browser |
| `npm run build:preview` | Build test APK via EAS |

## Project Structure

```
src/
  config/       # Firebase and OAuth credentials
  contexts/     # AuthContext (global auth state)
  navigation/   # React Navigation (auth-based routing)
  screens/      # App screens
  services/     # Firestore, notifications, storage
  types/        # TypeScript types (Product, Purchase, Category)
  utils/        # Utilities (haptics)
```
