export function setupFullscreen(button, element, onError) {
  const current = () => document.fullscreenElement || document.webkitFullscreenElement;
  const request = element.requestFullscreen || element.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  const supported = Boolean(request && exit && document.fullscreenEnabled !== false);
  button.disabled = !supported;
  if (!supported) button.title = 'Fullscreen is unavailable in this browser. On iPhone, try Add to Home Screen.';

  function update() {
    const active = current() === element;
    const label = active ? 'Exit fullscreen' : 'Enter fullscreen';
    button.setAttribute('aria-label', label);
    if (supported) button.title = label;
    button.setAttribute('aria-pressed', String(active));
  }

  async function leave() {
    if (current() === element) {
      try { await exit.call(document); } catch { /* Browser may already be exiting. */ }
    }
  }

  button.addEventListener('click', async () => {
    try {
      if (current() === element) await exit.call(document);
      else await request.call(element, { navigationUI: 'hide' });
    } catch {
      onError('Fullscreen could not open. You can keep playing in this window.');
    }
    update();
  });
  document.addEventListener('fullscreenchange', update);
  document.addEventListener('webkitfullscreenchange', update);
  update();
  return { exit: leave };
}
