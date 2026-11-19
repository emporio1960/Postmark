// Core domain model for Greeting Card Studio.
// All card geometry is expressed in "card units": 200 units = 1 inch,
// so a portrait card is 1000 × 1400 units = 5 × 7 in.

export type Orientation = 'portrait' | 'landscape' | 'square';
export type FaceKey = 'front' | 'inside';
export type Align = 'left' | 'center' | 'right';

export type Background =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string; angle: number };

export type ArtKind =
  | 'none' | 'floral' | 'wash' | 'confetti' | 'arcs' | 'botanical' | 'wreath' | 'stars'
  | 'snow' | 'hearts' | 'sunburst' | 'hills' | 'terrazzo' | 'stripes' | 'balloons' | 'geo';

export interface Art { kind: ArtKind; palette: string[]; seed: number }

export type BorderKind = 'none' | 'line' | 'double' | 'dashed' | 'corners' | 'thick';
export interface Border { kind: BorderKind; color: string; inset: number }

interface BaseEl { id: string; x: number; y: number; w: number; /** rotation in degrees around the element's centre */ rotation?: number }

export interface TextEl extends BaseEl {
  type: 'text';
  text: string;
  font: string;
  size: number;
  color: string;
  align: Align;
  bold: boolean;
  italic: boolean;
  spacing: number; // letter spacing in card units
  lineHeight: number;
  role?: 'title' | 'message' | 'signoff';
  /** -100..100: bend the text along an arc (positive arches upward) */
  curve?: number;
  shadow?: boolean;
  /** outline width in card units (0 = none) */
  outline?: number;
  outlineColor?: string;
}

export type PhotoFilter = 'none' | 'mono' | 'sepia' | 'warm' | 'cool' | 'vivid' | 'fade';
export type PhotoShape = 'rect' | 'rounded' | 'circle' | 'arch';
export type PhotoFrame = 'none' | 'white' | 'gold' | 'ink' | 'shadow';

export interface ImageEl extends BaseEl {
  type: 'image';
  h: number;
  src: string; // data URL – photos never leave the device
  zoom: number; // 1..3
  ox: number; // -1..1 horizontal reposition
  oy: number; // -1..1 vertical reposition
  filter: PhotoFilter;
  shape: PhotoShape;
  frame: PhotoFrame;
  /** a hand-drawn signature rather than a photograph */
  role?: 'signature';
}

export interface StickerEl extends BaseEl {
  type: 'sticker';
  h: number;
  kind: string; // vector sticker id, "emoji:🎂" or "qr:https://…"
  color: string;
}

export type CardElement = TextEl | ImageEl | StickerEl;

export interface Face {
  background: Background;
  art: Art;
  border: Border;
  elements: CardElement[];
}

export interface CardDoc {
  orientation: Orientation;
  front: Face;
  inside: Face;
}

export type CardStatus = 'draft' | 'completed';

export type EnvelopeStyle = 'match' | 'ivory' | 'kraft' | 'white';
export interface EnvelopeSpec { name: string; lines: string; style: EnvelopeStyle }

export interface Contact { id: string; name: string; relationship: string; notes: string }

export interface SavedCard extends CardDoc {
  id: string;
  name: string;
  occasion: string;
  templateId?: string;
  status: CardStatus;
  favourite: boolean;
  recipient?: string;
  envelope?: EnvelopeSpec;
  createdAt: number;
  updatedAt: number;
}

export type ReminderKind = 'birthday' | 'anniversary' | 'custom';

export interface OccasionReminder {
  id: string;
  title: string;
  recipient: string;
  kind: ReminderKind;
  date: string; // YYYY-MM-DD
  yearly: boolean;
  remindDays: number; // days before the date to remind
  lastNotified?: string; // YYYY-MM-DD of the last reminder shown
}

export interface CloudConfig { containerId: string; apiToken: string; environment: 'development' | 'production' }

export interface Settings {
  defaultOrientation: Orientation;
  signature: string;
  exportScale: number; // output pixels per card unit
  reduceMotion: boolean;
  notifications: boolean;
  /** hand-drawn signature as a transparent PNG data URL */
  signatureImage?: string;
  /** optional URL of the user's own AI message backend */
  aiEndpoint?: string;
  /** iCloud sync details entered on this device (overrides src/config.ts) */
  cloud?: CloudConfig;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultOrientation: 'portrait',
  signature: '',
  exportScale: 1.5,
  reduceMotion: false,
  notifications: false,
};

export function cardSize(o: Orientation): { w: number; h: number } {
  if (o === 'landscape') return { w: 1400, h: 1000 };
  if (o === 'square') return { w: 1000, h: 1000 };
  return { w: 1000, h: 1400 };
}

export const ORIENTATION_LABEL: Record<Orientation, string> = {
  portrait: 'Portrait · 5 × 7 in',
  landscape: 'Landscape · 7 × 5 in',
  square: 'Square · 5 × 5 in',
};
