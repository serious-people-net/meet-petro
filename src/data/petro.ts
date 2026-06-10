// Petro's states — one image per mood/screen. All placeholders for now;
// point each at its own file when the illustrations arrive.

import petro from '../assets/petro.png'

export const petroStates = {
  greeting: petro, // intro screen
  instructing: petro, // instruction screen
  working: petro, // generating screen (Petro at the easel)
  success: petro, // success screen (Petro at the printer)
} as const

export type PetroState = keyof typeof petroStates
