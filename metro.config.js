const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Axios ve React Native için resolver ayarları
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs', 'mjs'];

// Browser build'lerini önceliklendir (Node.js yerine)
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Node.js core modüllerini boş shim'lere yönlendir
const shimPath = path.resolve(__dirname, 'shims/empty.js');
config.resolver.extraNodeModules = {
  crypto: shimPath,
  stream: shimPath,
  http: shimPath,
  https: shimPath,
  net: shimPath,
  tls: shimPath,
  fs: shimPath,
  zlib: shimPath,
  os: shimPath,
  url: shimPath,
  util: shimPath,
  assert: shimPath,
  buffer: shimPath,
  events: shimPath,
  'proxy-from-env': shimPath,
};

// Axios'u browser versiyonuna yönlendir
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // axios importlarını browser versiyonuna yönlendir
  if (moduleName === 'axios') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs'),
      type: 'sourceFile',
    };
  }
  // Diğer modüller için varsayılan resolver'ı kullan
  return context.resolveRequest(context, moduleName, platform);
};

// Bundle optimizasyonları
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_classnames: false,
    keep_fnames: false,
    mangle: {
      keep_classnames: false,
      keep_fnames: false,
    },
  },
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true, // Lazy loading için kritik - kodları inline eder
    },
  }),
};

// Bundle boyutunu azaltmak için - createModuleIdFactory kaldırıldı
// (Lazy loading ile çakışma yapıyor, "unknown module" hatasına neden oluyor)
// config.serializer = {
//   ...config.serializer,
//   createModuleIdFactory: () => {
//     let nextId = 0;
//     return () => nextId++;
//   },
// };

module.exports = config;
