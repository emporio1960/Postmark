export type OccasionId =
  | 'birthday' | 'anniversary' | 'wedding' | 'engagement' | 'christmas' | 'new-year' | 'valentines'
  | 'mothers-day' | 'fathers-day' | 'easter' | 'thank-you' | 'congratulations' | 'get-well'
  | 'sympathy' | 'retirement' | 'graduation' | 'baby-shower' | 'just-because';

export interface Occasion { id: OccasionId; label: string; emoji: string; tint: string; popular?: boolean }

export const OCCASIONS: Occasion[] = [
  { id: 'birthday', label: 'Birthday', emoji: '🎂', tint: '#F8E4DD', popular: true },
  { id: 'anniversary', label: 'Anniversary', emoji: '🥂', tint: '#F4E9D0', popular: true },
  { id: 'wedding', label: 'Wedding', emoji: '💍', tint: '#EEF0E6', popular: true },
  { id: 'engagement', label: 'Engagement', emoji: '💕', tint: '#F9E3E3' },
  { id: 'christmas', label: 'Christmas', emoji: '🎄', tint: '#E3EDE2', popular: true },
  { id: 'new-year', label: 'New Year', emoji: '✨', tint: '#E6E7F0' },
  { id: 'valentines', label: 'Valentine’s Day', emoji: '❤️', tint: '#F9DEDE' },
  { id: 'mothers-day', label: 'Mother’s Day', emoji: '🌷', tint: '#F8E5EC' },
  { id: 'fathers-day', label: 'Father’s Day', emoji: '🏆', tint: '#E4E9F0' },
  { id: 'easter', label: 'Easter', emoji: '🐣', tint: '#F6F1D5' },
  { id: 'thank-you', label: 'Thank You', emoji: '💌', tint: '#F6E9D8', popular: true },
  { id: 'congratulations', label: 'Congratulations', emoji: '🎉', tint: '#F8ECCB', popular: true },
  { id: 'get-well', label: 'Get Well Soon', emoji: '🌻', tint: '#FBF0CF' },
  { id: 'sympathy', label: 'Sympathy', emoji: '🕊️', tint: '#ECECEA' },
  { id: 'retirement', label: 'Retirement', emoji: '🏖️', tint: '#F9E6D3' },
  { id: 'graduation', label: 'Graduation', emoji: '🎓', tint: '#E5E6EF' },
  { id: 'baby-shower', label: 'Baby Shower', emoji: '🧸', tint: '#E4F0F3' },
  { id: 'just-because', label: 'Just Because', emoji: '🌿', tint: '#E9EFE4' },
];

export function occasionLabel(id: string): string {
  return OCCASIONS.find((o) => o.id === id)?.label ?? 'Card';
}

export type StyleId = 'floral' | 'minimalist' | 'typography' | 'luxury' | 'romantic' | 'funny' | 'watercolour' | 'nature' | 'seasonal' | 'abstract';

export const STYLES: { id: StyleId; label: string }[] = [
  { id: 'floral', label: 'Elegant floral' },
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'typography', label: 'Modern typography' },
  { id: 'luxury', label: 'Luxury gold' },
  { id: 'romantic', label: 'Romantic' },
  { id: 'funny', label: 'Funny' },
  { id: 'watercolour', label: 'Watercolour' },
  { id: 'nature', label: 'Nature-inspired' },
  { id: 'seasonal', label: 'Seasonal' },
  { id: 'abstract', label: 'Artistic & abstract' },
];

export function styleLabel(id: string): string { return STYLES.find((s) => s.id === id)?.label ?? id; }

export interface Collection { id: string; title: string; blurb: string; styles: StyleId[]; cover: string }

export const COLLECTIONS: Collection[] = [
  { id: 'gilded', title: 'Gilded Moments', blurb: 'Foil-inspired frames and midnight tones for grand occasions.', styles: ['luxury'], cover: 'bday-gilded' },
  { id: 'garden', title: 'Watercolour Garden', blurb: 'Soft washes and hand-painted blooms.', styles: ['watercolour', 'floral'], cover: 'bday-bloom' },
  { id: 'minimal', title: 'Modern Minimal', blurb: 'Quiet layouts and confident type.', styles: ['minimalist', 'typography'], cover: 'ty-min' },
  { id: 'wild', title: 'Wild & Botanical', blurb: 'Leaves, hills and open skies.', styles: ['nature'], cover: 'wed-botanical' },
  { id: 'festive', title: 'Festive Season', blurb: 'Christmas, Easter and every holiday between.', styles: ['seasonal'], cover: 'xmas-forest' },
  { id: 'play', title: 'Laugh Out Loud', blurb: 'Cheeky cards for people with a sense of humour.', styles: ['funny', 'abstract'], cover: 'bday-confetti' },
];
