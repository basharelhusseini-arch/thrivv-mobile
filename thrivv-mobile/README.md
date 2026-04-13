# Thrivv Mobile

A Progressive Web App (PWA) that loads https://thrivv.dev in a fullscreen WebView experience.

## Features

- 📱 **Installable**: Can be installed on iOS and Android home screens
- 🌐 **Fullscreen**: Opens without browser UI when installed
- 🎨 **Native Feel**: Black theme with smooth transitions
- ⚡ **Fast**: Optimized for mobile performance

## PWA Installation

### iOS (iPhone/iPad)
1. Open the app in Safari
2. Tap the Share button (square with arrow pointing up)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"
5. The app will appear on your home screen with the Thrivv icon

### Android
1. Open the app in Chrome
2. Tap the three-dot menu
3. Tap "Add to Home screen" or "Install app"
4. Confirm the installation
5. The app will appear on your home screen

## Development

```bash
# Start the development server
npm start

# Run on web
npm run web

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## PWA Configuration

The PWA setup includes:
- ✅ `manifest.json` with app metadata
- ✅ Icons in multiple sizes (192x192, 512x512)
- ✅ Apple touch icon for iOS
- ✅ Meta tags for fullscreen mode
- ✅ Theme colors for native appearance
- ✅ Viewport configuration for mobile devices

## Tech Stack

- **Framework**: Expo + React Native
- **Router**: Expo Router
- **WebView**: react-native-webview
- **PWA**: Native Web Manifest + Meta Tags

## License

Private
