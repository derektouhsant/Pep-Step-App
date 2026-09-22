function itemHeight(wheel) {
  const item = wheel.querySelector('.wheel-item');
  const height = item ? item.getBoundingClientRect().height : 0;
  return height > 0 ? height : 36;
}

function clampedIndex(wheel) {
  const items = wheel.querySelectorAll('.wheel-item');
  if (!items.length) return 0;
  const index = Math.round(wheel.scrollTop / itemHeight(wheel));
  return Math.max(0, Math.min(items.length - 1, index));
}

function paintActive(wheel) {
  const items = wheel.querySelectorAll('.wheel-item');
  const index = clampedIndex(wheel);
  items.forEach((el, i) => {
    const on = i === index;
    el.classList.toggle('is-active', on);
    if (on) el.setAttribute('aria-selected', 'true');
    else el.removeAttribute('aria-selected');
  });
}

function alignWheel(wheel) {
  const index = Number(wheel.dataset.index) || 0;
  wheel.scrollTop = index * itemHeight(wheel);
  paintActive(wheel);
}

/**
 * Snap-scroll columns. Commits the centered value after scrolling settles
 * without rebuilding the page, so the wheel keeps its place.
 */
export function mountWheels(root, onCommit) {
  const scope = root || document;
  scope.querySelectorAll('[data-wheel]').forEach((wheel) => {
    let ready = false;
    let timer = 0;
    let startY = 0;
    let dragged = false;

    const commit = () => {
      const items = wheel.querySelectorAll('.wheel-item');
      const item = items[clampedIndex(wheel)];
      if (!item || typeof onCommit !== 'function') return;
      onCommit({
        ei: Number(wheel.dataset.ei),
        si: Number(wheel.dataset.si),
        field: wheel.dataset.field,
        value: item.dataset.value,
      });
    };

    alignWheel(wheel);
    requestAnimationFrame(() => {
      alignWheel(wheel);
      ready = true;
    });

    wheel.addEventListener(
      'scroll',
      () => {
        paintActive(wheel);
        if (!ready) return;
        clearTimeout(timer);
        timer = setTimeout(commit, 90);
      },
      { passive: true }
    );

    wheel.addEventListener('pointerdown', (event) => {
      startY = event.clientY;
      dragged = false;
    });
    wheel.addEventListener('pointermove', (event) => {
      if (Math.abs(event.clientY - startY) > 8) dragged = true;
    });
    wheel.addEventListener('click', (event) => {
      const item = event.target.closest('.wheel-item');
      if (!item || dragged) return;
      const items = [...wheel.querySelectorAll('.wheel-item')];
      const index = items.indexOf(item);
      if (index < 0) return;
      wheel.scrollTo({ top: index * itemHeight(wheel), behavior: 'smooth' });
    });
    wheel.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      const items = wheel.querySelectorAll('.wheel-item');
      const dir = event.key === 'ArrowDown' ? 1 : -1;
      const next = Math.max(0, Math.min(items.length - 1, clampedIndex(wheel) + dir));
      wheel.scrollTo({ top: next * itemHeight(wheel), behavior: 'smooth' });
    });
  });
}
