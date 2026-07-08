module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // 'worklet' directives (VisionCamera frame outputs, Reanimated) are
    // compiled by react-native-worklets' plugin via babel-preset-expo.
  };
};
