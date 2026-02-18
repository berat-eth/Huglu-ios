import { registerRootComponent } from 'expo';
import App from './App';
import { initI18n } from './src/i18n';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
initI18n().catch(() => {});
registerRootComponent(App);
