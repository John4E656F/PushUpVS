const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Allow bundling TensorFlow Lite models (see scripts/download-model.sh).
config.resolver.assetExts.push('tflite');

module.exports = withNativeWind(config, { input: './src/global.css' });
