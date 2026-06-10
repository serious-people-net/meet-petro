// All on-screen copy, lifted from the UX flow.

export const copy = {
  intro: {
    title: "Hi! I'm Petro",
    subtitle: 'Your automated\noil and gas marketer',
    hint: 'Press enter to begin',
  },
  instructions: {
    title: "Let's go!\nWho do you want\nto influence?",
    hint: 'Press the < and > keys',
  },
  audience: {
    heading: 'Select Audience',
  },
  emotionIntro: {
    title: "Nice! Let's pick an\nemotion to manipulate",
    hint: 'Use the < and > keys',
  },
  emotion: {
    heading: 'Select Emotion',
  },
  generating: {
    // Theatrical loading phases — caption swaps as the bar progresses.
    phases: [
      "Ok! I'm on it!",
      'Having deep\nstrategic thoughts…',
      'Thinking of\nworld-first ideas',
      'Cutting down\nsome trees…',
    ],
  },
  success: {
    title: 'Your idea\nis ready',
    hint: 'Press enter to start again',
  },
} as const
