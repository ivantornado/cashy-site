// The shared switch between the hero, the smooth scroller and the mobile menu.
// The hero owns scrolling while locked; Lenis only runs once it lets go.

type Listener = () => void;

let heroLocked = false;
let menuOpen = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function isHeroLocked() {
  return heroLocked;
}

export function setHeroLocked(next: boolean) {
  if (heroLocked === next) return;
  heroLocked = next;
  notify();
}

export function isMenuOpen() {
  return menuOpen;
}

export function setMenuOpen(next: boolean) {
  if (menuOpen === next) return;
  menuOpen = next;
  notify();
}

export function subscribeScrollState(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
