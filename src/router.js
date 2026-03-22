let currentScreen = null;
let currentCleanup = null;
const routes = {};

export function registerRoute(path, screenModule) {
  routes[path] = screenModule;
}

export function navigate(path) {
  window.location.hash = path;
}

export function getCurrentPath() {
  return window.location.hash.slice(1) || '/';
}

export function getRouteParams() {
  const hash = window.location.hash.slice(1);
  const [path, query] = hash.split('?');
  const params = {};
  if (query) {
    query.split('&').forEach((pair) => {
      const [key, val] = pair.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(val || '');
    });
  }
  return { path, params };
}

export function initRouter(container) {
  async function handleRoute() {
    const { path, params } = getRouteParams();
    const route = path || '/';
    const screenModule = routes[route];

    if (!screenModule) {
      if (routes['/']) {
        window.location.hash = '/';
      }
      return;
    }

    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    container.innerHTML = screenModule.render(params);
    currentScreen = route;

    if (screenModule.mount) {
      currentCleanup = screenModule.mount(container, params) || null;
    }
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  return () => window.removeEventListener('hashchange', handleRoute);
}
