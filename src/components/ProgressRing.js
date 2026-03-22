export function createProgressRing(size = 200, strokeWidth = 12) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return {
    render(progress = 0, label = '', sublabel = '') {
      const offset = circumference - Math.min(progress, 1) * circumference;
      const color =
        progress >= 1 ? 'var(--color-success)' : 'var(--color-primary)';
      const extraClass =
        progress > 1 ? 'ring-gold' : progress >= 1 ? 'ring-pulse' : '';

      return `
        <div class="progress-ring-wrapper ${extraClass}" style="width:${size}px;height:${size}px;margin:0 auto;">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle
              cx="${center}" cy="${center}" r="${radius}"
              fill="none"
              stroke="var(--color-fill)"
              stroke-width="${strokeWidth}"
            />
            <circle
              class="progress-ring-circle"
              cx="${center}" cy="${center}" r="${radius}"
              fill="none"
              stroke="${color}"
              stroke-width="${strokeWidth}"
              stroke-linecap="round"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"
              transform="rotate(-90 ${center} ${center})"
              style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s;"
            />
          </svg>
          <div class="progress-ring-content">
            <div class="progress-ring-label">${label}</div>
            ${sublabel ? `<div class="progress-ring-sublabel">${sublabel}</div>` : ''}
          </div>
        </div>
      `;
    },
  };
}

// Inline styles for the ring content overlay
const style = document.createElement('style');
style.textContent = `
  .progress-ring-wrapper {
    position: relative;
    display: inline-block;
  }
  .progress-ring-content {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .progress-ring-label {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1;
  }
  .progress-ring-sublabel {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin-top: 4px;
  }
`;
document.head.appendChild(style);
