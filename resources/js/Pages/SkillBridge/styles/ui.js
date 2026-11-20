// Shared design tokens for the SkillBridge dashboards (amber #ECA406 accent, navy text, verified-green).
// Single source of truth — previously duplicated in three view files.
export const COLORS = {
  parchment: "#FFF9EB",     // page background (warm tint of the #ECA406 accent)
  parchmentDark: "#FDF0D0", // deeper background band
  parchmentDeep: "#F3D89B", // borders / hairlines
  cream: "#FFFFFF",         // cards / surfaces
  brownDeep: "#0C4A6E",     // deep brand blue — titles, dark buttons, avatars
  brownMid: "#075985",      // strong blue
  brownLight: "#0369A1",    // primary blue
  brownWarm: "#0EA5E9",     // secondary sky blue
  rust: "#0369A1",          // eyebrow/badge accent → primary blue
  rustLight: "#0EA5E9",
  rustBright: "#38BDF8",
  gold: "#15803D",          // verified / success accent (green-700: 5:1 with white, AA for text)
  goldLight: "#4ADE80",     // positive metric numbers on dark
  tan: "#F3D89B",
  textDark: "#0C4A6E",      // foreground
  textMid: "#075985",
  textLight: "#475569",     // muted foreground (7:1 on page bg)
  success: "#15803D",
  successLight: "#22C55E",
  info: "#0369A1",          // TEXT/link blue only; fills use accent
  accent: "#ECA406",        // dashboard accent: buttons, bars, highlights (pair with brownDeep text)
  infoLight: "#0EA5E9",
};

export const FONT_DISPLAY = "'Lexend', sans-serif";
export const FONT_BODY = "'Source Sans 3', sans-serif";
