const iosBinary =
  process.env.DETOX_IOS_APP_PATH ??
  "ios/build/Build/Products/Debug-iphonesimulator/Ark.app";

const androidBinary =
  process.env.DETOX_ANDROID_APP_PATH ??
  "android/app/build/outputs/apk/debug/app-debug.apk";

const config = {
  testRunner: {
    type: "jest",
    args: {
      $0: "jest",
      config: "apps/mobile/e2e/detox/jest.config.js",
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: iosBinary,
      build:
        'cd apps/mobile && EXPO_NO_DOTENV=1 expo prebuild --platform ios && xcodebuild -workspace ios/Ark.xcworkspace -scheme Ark -configuration Debug -sdk iphonesimulator BUILD_DIR=build',
    },
    "android.debug": {
      type: "android.apk",
      binaryPath: androidBinary,
      build:
        "cd apps/mobile && EXPO_NO_DOTENV=1 expo prebuild --platform android && cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: process.env.DETOX_IOS_DEVICE ?? "iPhone 15",
      },
    },
    emulator: {
      type: "android.emulator",
      device: {
        avdName: process.env.DETOX_AVD ?? "Pixel_6",
      },
    },
  },
  configurations: {
    "ios.sim.debug": {
      device: "simulator",
      app: "ios.debug",
    },
    "android.emu.debug": {
      device: "emulator",
      app: "android.debug",
    },
  },
};

export default config;
