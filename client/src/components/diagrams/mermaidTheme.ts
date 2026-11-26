/*
  Mermaid theme variables built from the design system palette.
  Mermaid derives shades from these with its own color math, which
  only understands literal hex values, not CSS variables. That is
  why the palette is repeated here instead of read from globals.css.
  Keep these in sync with the tokens in globals.css.
*/

const LIGHT = {
  background: "#ffffff",
  surfaceRaised: "#f2f1ef",
  canvas: "#f8f7f5",
  border: "#cccbc8",
  textPrimary: "#0f0f0f",
  textSecondary: "#6b6b6b",
  accent: "#6f2da8",
  accentMuted: "#f3eefb",
};

const DARK = {
  background: "#1a1a19",
  surfaceRaised: "#222221",
  canvas: "#111110",
  border: "#3d3d3b",
  textPrimary: "#f0efed",
  textSecondary: "#8f8e8b",
  accent: "#6f2da8",
  accentMuted: "#2a1540",
};

// Background colour used both behind the diagram and in exported files
export const getDiagramBackground = (theme: "light" | "dark"): string =>
  theme === "dark" ? DARK.background : LIGHT.background;

/*
  Neutral nodes on a plain surface, grey connectors, and the accent
  used only for borders of secondary elements such as notes and
  clusters. This follows the rule that accent is used sparingly.
*/
export const getMermaidThemeVariables = (
  theme: "light" | "dark",
  fontFamily: string
): Record<string, string | boolean> => {
  const p = theme === "dark" ? DARK : LIGHT;

  return {
    darkMode: theme === "dark",
    fontFamily,
    fontSize: "13px",

    background: p.background,
    mainBkg: p.surfaceRaised,
    textColor: p.textPrimary,

    primaryColor: p.surfaceRaised,
    primaryTextColor: p.textPrimary,
    primaryBorderColor: p.border,

    secondaryColor: p.accentMuted,
    secondaryTextColor: p.textPrimary,
    secondaryBorderColor: p.accent,

    tertiaryColor: p.canvas,
    tertiaryTextColor: p.textPrimary,
    tertiaryBorderColor: p.border,

    lineColor: p.textSecondary,
    edgeLabelBackground: p.background,

    clusterBkg: p.canvas,
    clusterBorder: p.border,

    noteBkgColor: p.accentMuted,
    noteTextColor: p.textPrimary,
    noteBorderColor: p.accent,

    actorBkg: p.surfaceRaised,
    actorBorder: p.border,
    actorTextColor: p.textPrimary,
    actorLineColor: p.textSecondary,
    signalColor: p.textSecondary,
    signalTextColor: p.textPrimary,
    labelBoxBkgColor: p.surfaceRaised,
    labelBoxBorderColor: p.border,
    labelTextColor: p.textPrimary,
    loopTextColor: p.textPrimary,
  };
};
