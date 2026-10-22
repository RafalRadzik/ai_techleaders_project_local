export function navigate(screenId: string) {
  document.dispatchEvent(new CustomEvent('prototype:navigate', { detail: screenId }));
}

/** Screens the review bar can open directly. IDs come from lekcja-07/mapa-ekranow.md and never change. */
export const SCREENS: readonly (readonly [string, string])[] = [
  ['s01', 'Home'],
  ['s02', 'Sign in'],
  ['s03', 'Register'],
  ['s04', 'Check your inbox'],
  ['s05', 'GitHub (simulation)'],
  ['s06', 'Mentee home'],
  ['s07', 'Mentor home'],
  ['s08', 'Operator home'],
  ['s09', 'Users'],
  ['s10', 'No access'],
];
