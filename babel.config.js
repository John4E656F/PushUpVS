module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // VisionCamera frame processors run on react-native-worklets-core;
    // its plugin compiles 'worklet'-directive functions. Reanimated 4's
    // react-native-worklets plugin is applied by babel-preset-expo.
    plugins: ['react-native-worklets-core/plugin'],
  };
};
