// Premium architecture seam.
//
// Every gated capability is described here and checked through `can()`.
// Today there is a single free plan and nothing is locked – there is
// deliberately no payment flow. When a subscription is introduced, resolve
// the plan from a server-verified entitlement and flip the relevant
// features to `premium: true`; UI that already calls `can()` will follow.

export type Plan = 'free' | 'premium';

export type FeatureId =
  | 'exclusiveCollections' | 'premiumTypography' | 'advancedPhotoEditing'
  | 'animatedCards' | 'extraExportFormats' | 'customDimensions' | 'expandedDesigns';

export interface Feature { id: FeatureId; title: string; description: string; premium: boolean; available: boolean }

export const FEATURES: Feature[] = [
  { id: 'exclusiveCollections', title: 'Exclusive card collections', description: 'Seasonal and designer collections released through the year.', premium: true, available: false },
  { id: 'premiumTypography', title: 'Premium typography', description: 'An extended library of display and script typefaces.', premium: true, available: false },
  { id: 'advancedPhotoEditing', title: 'Advanced photo editing', description: 'Background removal, retouching and fine colour controls.', premium: true, available: false },
  { id: 'animatedCards', title: 'Animated greeting cards', description: 'Motion cards that can be shared as short videos.', premium: true, available: false },
  { id: 'extraExportFormats', title: 'Additional export formats', description: 'Print-ready PDF with bleed, JPEG and transparent PNG.', premium: true, available: false },
  { id: 'customDimensions', title: 'Custom card dimensions', description: 'Any size, from gift tags to A4 posters.', premium: true, available: false },
  { id: 'expandedDesigns', title: 'Expanded design collections', description: 'Hundreds of additional templates and sticker packs.', premium: true, available: false },
];

export function currentPlan(): Plan { return 'free'; }

/** Whether the current plan may use a shipped feature. */
export function can(id: FeatureId, plan: Plan = currentPlan()): boolean {
  const f = FEATURES.find((x) => x.id === id);
  if (!f || !f.available) return false;
  return !f.premium || plan === 'premium';
}
