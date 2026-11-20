// Shared design tokens: primary #ECA406 (buttons, charts, highlights), black text, no blues or greens.
// Single source of truth — previously duplicated in three view files.
export const COLORS = {
  parchment: "#FFF9EB",     // page background (warm tint of the #ECA406 accent)
  parchmentDark: "#FDF0D0", // deeper background band
  parchmentDeep: "#F3D89B", // borders / hairlines
  cream: "#FFFFFF",         // cards / surfaces
  brownDeep: "#1A1A1A",     // near-black — titles, dark header bands, avatars
  brownMid: "#333333",      // dark grey
  brownLight: "#1A1A1A",    // black
  brownWarm: "#ECA406",     // primary
  rust: "#1A1A1A",          // eyebrow / badge text
  rustLight: "#ECA406",
  rustBright: "#ECA406",
  gold: "#8A5A00",          // verified / success text: dark amber (7:1 on white, AA)
  goldLight: "#ECA406",     // metric numbers on the dark header
  tan: "#F3D89B",
  textDark: "#1A1A1A",      // foreground
  textMid: "#333333",
  textLight: "#555555",     // muted foreground (7:1 on page bg)
  success: "#8A5A00",
  successLight: "#ECA406",
  info: "#1A1A1A",          // text / links: black; fills use accent
  accent: "#ECA406",        // primary: buttons, bars, highlights (black text on it)
  infoLight: "#ECA406",
};

export const FONT_DISPLAY = "'Lexend', sans-serif";
export const FONT_BODY = "'Source Sans 3', sans-serif";
