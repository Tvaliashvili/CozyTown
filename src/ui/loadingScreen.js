// The loading screen lives in index.html so it shows before any JavaScript arrives.
// Call this once there is something to show instead: the town, or an error message.
export function hideLoadingScreen() {
  const screen = document.getElementById('boot')
  if (!screen) return
  screen.classList.add('hidden')
  setTimeout(() => screen.remove(), 600)
}
