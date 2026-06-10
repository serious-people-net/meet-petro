// The two carousels. Add/remove/reorder entries here — the screens adapt.
// `image` is the illustration shown while that option is selected.
// All point at the placeholder Petro until the illustrator's drawings arrive.

import petro from '../assets/petro.png'

export interface Option {
  id: string
  label: string
  image: string
}

export const audiences: Option[] = [
  { id: 'divorced-men', label: 'Divorced Men', image: petro },
  { id: 'concerned-mothers', label: 'Concerned Mothers', image: petro },
  { id: 'disenfranchised-youth', label: 'Disenfranchised Youth', image: petro },
]

export const emotions: Option[] = [
  { id: 'fear', label: 'Fear', image: petro },
  { id: 'nostalgia', label: 'Nostalgia', image: petro },
  { id: 'anger', label: 'Anger', image: petro },
  { id: 'gratitude', label: 'Gratitude', image: petro },
]
