export default {
  expo: {
    name: "FilhosApp",
    slug: "FilhosApp",
    scheme: "filhosapp",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.matheuskieling.filhosapp",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      permissions: [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "463cddbe-9665-4d74-9a03-f48382552378"
      },
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID
    },
    plugins: [
      "expo-font",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#4285F4"
        }
      ]
    ]
  }
};
