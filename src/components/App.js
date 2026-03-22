import * as TabBar from './TabBar.js';

export function render() {
  return `
    <main id="screen-container"></main>
    ${TabBar.render()}
  `;
}

export function mount(appEl) {
  return TabBar.mount(appEl);
}
