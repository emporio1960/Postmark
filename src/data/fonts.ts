// Fonts are bundled with the app (via @fontsource) – nothing is fetched
// from a third-party font service at runtime.
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/playfair-display/latin-400.css';
import '@fontsource/playfair-display/latin-400-italic.css';
import '@fontsource/playfair-display/latin-700.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/great-vibes/latin-400.css';
import '@fontsource/caveat/latin-500.css';
import '@fontsource/bebas-neue/latin-400.css';
import '@fontsource/abril-fatface/latin-400.css';

export interface FontDef {
  family: string;
  label: string;
  category: 'Serif' | 'Script' | 'Sans' | 'Display';
  /** approximate average glyph width as a fraction of font size (for auto-fitting) */
  widthFactor: number;
  premium?: boolean;
}

export const FONTS: FontDef[] = [
  { family: 'Playfair Display', label: 'Playfair Display', category: 'Serif', widthFactor: 0.56 },
  { family: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'Serif', widthFactor: 0.5 },
  { family: 'Great Vibes', label: 'Great Vibes', category: 'Script', widthFactor: 0.42 },
  { family: 'Caveat', label: 'Caveat', category: 'Script', widthFactor: 0.42 },
  { family: 'DM Sans', label: 'DM Sans', category: 'Sans', widthFactor: 0.58 },
  { family: 'Bebas Neue', label: 'Bebas Neue', category: 'Display', widthFactor: 0.44 },
  { family: 'Abril Fatface', label: 'Abril Fatface', category: 'Display', widthFactor: 0.58 },
];

export function fontFactor(family: string): number {
  return FONTS.find((f) => f.family === family)?.widthFactor ?? 0.56;
}

/** Ask the browser to load every card font so canvas rendering is accurate. */
export async function loadCardFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const specs: string[] = [];
  for (const f of FONTS) {
    specs.push(`400 32px "${f.family}"`, `700 32px "${f.family}"`, `italic 400 32px "${f.family}"`);
  }
  await Promise.allSettled(specs.map((s) => document.fonts.load(s)));
}
