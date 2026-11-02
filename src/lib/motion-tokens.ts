/** Motion tokens and springs. Components never inline durations or spring values. */
export const motionTokens = {
  duration: { instant: 0.08, fast: 0.18, normal: 0.35 },
  easing: { smooth: [0.22, 1, 0.36, 1] as const },
  scale: { subtle: 0.98, press: 0.96 },
};

export const springs = {
  snappy: { type: "spring", stiffness: 300, damping: 30 },
  instant: { type: "spring", stiffness: 600, damping: 35 },
} as const;
