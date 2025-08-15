# MASS Monster App

Custom fitness platform built with Expo and React Native. The app delivers courses, chat, store access, scheduling, and profile features through a consistent modern UI.

## Development

1. Install dependencies
   ```bash
   npm install
   ```
2. Launch the app
   ```bash
   npx expo start
   ```
   Open the project with Expo Go or an emulator for iOS or Android.

### Project structure

- `LoginScreens` – authentication flows such as login, signup, and password reset.
- `MainScreens` – primary application areas including calendar, chat, classroom, profile, and store.
- `components` – reusable UI elements.
- `assets` – images, video, and fonts used throughout the app.

The app persists user data with Firebase/Firestore and pulls product information from a Shopify store using keys defined in `app.config.ts`.