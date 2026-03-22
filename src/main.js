import './styles/base.css';
import './styles/components.css';
import './styles/screens.css';
import './styles/celebrations.css';

import * as App from './components/App.js';
import { registerRoute, initRouter } from './router.js';
import * as Dashboard from './screens/Dashboard.js';
import * as AddEntry from './screens/AddEntry.js';
import * as History from './screens/History.js';
import * as Charts from './screens/Charts.js';
import * as Settings from './screens/Settings.js';
import { init as initInstallPrompt } from './components/InstallPrompt.js';

// Register routes
registerRoute('/', Dashboard);
registerRoute('/add', AddEntry);
registerRoute('/history', History);
registerRoute('/charts', Charts);
registerRoute('/settings', Settings);

// Initialize app
const appEl = document.getElementById('app');
appEl.innerHTML = App.render();
const cleanupTabBar = App.mount(appEl);

// Initialize router with the screen container
const screenContainer = document.getElementById('screen-container');
const cleanupRouter = initRouter(screenContainer);

// Initialize PWA install prompt
initInstallPrompt();

// Request persistent storage
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist();
}
