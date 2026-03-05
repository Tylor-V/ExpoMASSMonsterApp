# MASS Monster App

Custom fitness platform built with Expo and React Native. The app delivers courses, chat, store access, scheduling, and profile features through a consistent modern UI.

## Development

1. Install dependencies
   ```bash
   npm install
   ```
2. Create a `.env` file (copy from `.env.example`) and add the Shopify Storefront values (domain, API version, token, and optional test handle).
3. Quick UI checks in Expo Go
   ```bash
   npm run start:go
   ```
   You can also use `npm start` for the same Expo Go path.
4. Production-bound QA in a development build (required before production submission)
   ```bash
   npm run build:ios:dev
   npm run build:android:dev
   npm run start:dev-client
   ```

### Pre-release checklist
1. Validate core flows on real iOS and Android devices using a development or preview build (auth, Firestore-backed screens, Shopify store screens).
2. Verify resolved Expo config:
   ```bash
   npx expo config --type public
   ```
3. Run regression tests:
   ```bash
   npm test
   ```
4. Run production build after the checks above:
   ```bash
   eas build -p ios --profile production
   ```
### Project structure
- `SplashScreen` - Launch and pre-load screen.
- `LoginScreens` - authentication flows such as login, signup, and password reset.
- `MainScreens` - primary application areas including calendar, chat, classroom, profile, and store.
- `components` - reusable UI elements.
- `assets` - images, video, and fonts used throughout the app.

The app persists user data with Firebase/Firestore and pulls product information from a Shopify store using keys defined in `app.config.ts`.

## When viewing/changing

1. App code must maintain a consistent UI across all screens and components.
2. All code must be fully compatible with Expo Go. All Package versions must work together.
3. The app must function perfectly on all iOS and Android phone sized devices.
4. All per-user data must save and fetch correctly from Firestore and Firebase, with data persistence and syncing prioritized. Shopify store data must be fetched and displayed wherever required in the app.
5. Bugs should be patched immediately upon discovery, and potential issues should be addressed before they reach users.
6. Use or create common components and rework components to make sure they are functionable for all areas used. When changing components make sure all places it is used still works and is not misplaced.
7. Tests and mocks should be implemented as needed to validate functionality and prevent regressions. Fix any npm test issues as they arise.
8. Code and logic should be regularly reviewed and refactored for efficiency and maintainability. Unused code should be deleted if not used in any part of user interface or app logic. When looking through code think about the logic and the user interface and the goal of the code and re-format or re-code as needed. If old unused code is present delete it.
