module.exports = function(api) {
  // Cache yapılandırması - forever() kullanarak çakışmayı önle
  api.cache.forever();
  
  const enableLogs =
    String(process.env.EXPO_PUBLIC_ENABLE_LOGS || '').toLowerCase() === 'true';
  const isProd = process.env.NODE_ENV === 'production';

  const plugins = ['react-native-reanimated/plugin'];

  // Production bundle'da logları küçültmek için console.* kaldır (opsiyonel)
  // Eğer EXPO_PUBLIC_ENABLE_LOGS=true ise (prod debug), logları koru.
  if (isProd && !enableLogs) {
    plugins.push([
      'transform-remove-console',
      {
        exclude: ['error', 'warn'], // Sadece error ve warn logları kalsın
      },
    ]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
