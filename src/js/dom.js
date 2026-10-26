export function createElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

export function announce(message) {
  const region = document.getElementById('app-announcement');
  if (region) region.textContent = message;
}

export function showError(message) {
  const status = document.getElementById('data-status');
  status.hidden = false;
  status.classList.add('is-error');
  status.textContent = message;
  announce(message);
}
