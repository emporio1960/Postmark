// Template library. Each template is a compact spec that is expanded into a
// full, editable card document for whichever layout the user picks.
import type { Art, ArtKind, Background, Border, CardDoc, CardElement, Face, Orientation, SavedCard, TextEl } from '../types';
import { cardSize } from '../types';
import { luminance, uid } from '../lib/utils';
import { fontFactor } from './fonts';
import { occasionLabel, styleLabel, type OccasionId, type StyleId } from './occasions';

export interface TemplateSpec {
  id: string;
  name: string;
  occasion: OccasionId;
  style: StyleId;
  trending?: boolean;
  bg: Background;
  art: Art;
  border?: Border;
  ink: string;
  accent: string;
  eyebrow?: string;
  title: string;
  sub?: string;
  titleFont: string;
  titleSize: number;
  titleItalic?: boolean;
  layout?: 'center' | 'top' | 'bottom';
  width?: number;
  sticker?: { kind: string; color: string };
  paper?: string;
}

const solid = (color: string): Background => ({ kind: 'solid', color });
const grad = (from: string, to: string, angle = 180): Background => ({ kind: 'gradient', from, to, angle });
const art = (kind: ArtKind, palette: string[], seed = 7): Art => ({ kind, palette, seed });
const GOLD = '#C2A05A';
const INK = '#2B2622';

const INSIDE: Record<OccasionId, { greeting: string; message: string; close: string }> = {
  birthday: { greeting: 'Happy Birthday!', message: 'Wishing you a day filled with laughter, love and all of your favourite things. Here’s to another wonderful year ahead.', close: 'With love,' },
  anniversary: { greeting: 'Happy Anniversary', message: 'Here’s to the love you share and the memories still to come. Wishing you both a beautiful day together.', close: 'With love,' },
  wedding: { greeting: 'Congratulations!', message: 'Wishing you a lifetime of love, laughter and happily ever after. May today be the first of many beautiful days.', close: 'With love and best wishes,' },
  engagement: { greeting: 'You’re engaged!', message: 'What wonderful news. Wishing you both every happiness as you begin planning your forever.', close: 'With love,' },
  christmas: { greeting: 'Merry Christmas', message: 'Wishing you a season of warmth, wonder and time with the people you love most. See you in the new year.', close: 'With love,' },
  'new-year': { greeting: 'Happy New Year!', message: 'May the year ahead bring you joy, good health and plenty of reasons to celebrate. Cheers to new beginnings.', close: 'Warmest wishes,' },
  valentines: { greeting: 'To my Valentine', message: 'Every day with you is my favourite day. Thank you for being exactly who you are. I love you.', close: 'Yours always,' },
  'mothers-day': { greeting: 'Happy Mother’s Day', message: 'Thank you for your endless love, patience and wisdom. Everything good in me started with you.', close: 'With all my love,' },
  'fathers-day': { greeting: 'Happy Father’s Day', message: 'Thank you for the lessons, the laughs and for always being in my corner. You’re one of a kind.', close: 'With love,' },
  easter: { greeting: 'Happy Easter', message: 'Wishing you a bright and joyful Easter, full of sunshine, family and far too much chocolate.', close: 'With love,' },
  'thank-you': { greeting: 'Thank you', message: 'Your kindness meant more than words can say. I’m so grateful to have you in my life.', close: 'With heartfelt thanks,' },
  congratulations: { greeting: 'Congratulations!', message: 'You worked so hard for this and deserve every bit of your success. We couldn’t be prouder.', close: 'Well done,' },
  'get-well': { greeting: 'Get well soon', message: 'Sending you a little sunshine and a lot of love. Rest up, take it easy and feel better soon.', close: 'Thinking of you,' },
  sympathy: { greeting: 'With sympathy', message: 'Thinking of you and your family at this difficult time. May fond memories bring you comfort and peace.', close: 'With deepest sympathy,' },
  retirement: { greeting: 'Happy Retirement!', message: 'Congratulations on a remarkable career. Wishing you long mornings, grand adventures and time for everything you love.', close: 'All the best,' },
  graduation: { greeting: 'Congratulations, Graduate!', message: 'All those late nights were worth it. The world is lucky to have you — go and do wonderful things.', close: 'So proud of you,' },
  'baby-shower': { greeting: 'Welcome, little one', message: 'Wishing you a lifetime of tiny toes, sleepy cuddles and so much love. Congratulations on your precious new arrival.', close: 'With love,' },
  'just-because': { greeting: 'Just because', message: 'No special reason — I simply wanted you to know that you’re thought of, appreciated and loved.', close: 'With love,' },
  'australia-day': { greeting: 'Happy Australia Day', message: 'Here’s to sunshine, good mates and a snag on the barbie. Hope your day is a ripper from start to finish.', close: 'Cheers,' },
  'anzac-day': { greeting: 'Lest we forget', message: 'Today we pause to remember those who served and those who never came home. Thinking of you and your family this ANZAC Day.', close: 'With respect,' },
  'melbourne-cup': { greeting: 'Happy Cup Day!', message: 'Frock up, pick a winner and pop something bubbly. May your horse run fast and your sweep come good.', close: 'Good luck,' },
  'footy-finals': { greeting: 'It’s finals time!', message: 'The pies are hot, the scarf is on and the nerves are jangling. Here’s hoping your team brings home the flag.', close: 'Go well,' },
};

export const TEMPLATES: TemplateSpec[] = [
  // Birthday
  { id: 'bday-bloom', name: 'Birthday in Bloom', occasion: 'birthday', style: 'floral', trending: true, bg: solid('#FBF3EE'), art: art('floral', ['#E8A7A1', '#F3C9B5', '#D98C8C', '#8FA58A', '#F7E3A1'], 11), ink: '#4A2F2F', accent: '#B5766F', title: 'Happy\nBirthday', sub: 'wishing you a beautiful day', titleFont: 'Great Vibes', titleSize: 170 },
  { id: 'bday-confetti', name: 'Confetti Pop', occasion: 'birthday', style: 'funny', bg: solid('#FFFDF8'), art: art('confetti', ['#F2B84B', '#E9806E', '#7FB7BE', '#B79AD6', '#8CC084'], 21), ink: INK, accent: '#E9806E', eyebrow: 'another year of', title: 'Being\nFabulous', sub: '(and only slightly older)', titleFont: 'Abril Fatface', titleSize: 130 },
  { id: 'bday-gilded', name: 'Gilded Birthday', occasion: 'birthday', style: 'luxury', trending: true, bg: grad('#2C3350', '#1A1E30'), art: art('stars', ['#E9D5A5', '#C2A05A'], 31), border: { kind: 'double', color: GOLD, inset: 44 }, ink: '#E9D5A5', accent: '#C2A05A', eyebrow: 'a toast to you', title: 'Happy\nBirthday', sub: 'may your year sparkle', titleFont: 'Playfair Display', titleSize: 118, paper: '#FBF7EF' },
  { id: 'bday-bold', name: 'Make a Wish', occasion: 'birthday', style: 'typography', trending: true, bg: solid('#F3E9DC'), art: art('geo', ['#D9A441', '#2B2622', '#E07A5F'], 3), ink: INK, accent: '#B9822B', title: 'MAKE\nA WISH', sub: 'happy birthday', titleFont: 'Bebas Neue', titleSize: 250 },
  { id: 'bday-balloons', name: 'Up, Up & Away', occasion: 'birthday', style: 'funny', bg: solid('#EAF3F5'), art: art('balloons', ['#E9806E', '#F2B84B', '#7FB7BE', '#B79AD6'], 5), ink: '#2D3B45', accent: '#C9685A', title: 'You’re not old,\nyou’re vintage', sub: 'happy birthday, legend', titleFont: 'Playfair Display', titleSize: 84, titleItalic: true, layout: 'bottom' },
  { id: 'bday-wash', name: 'Watercolour Wishes', occasion: 'birthday', style: 'watercolour', bg: solid('#FFFDF9'), art: art('wash', ['#F4B6C2', '#B8D8E8', '#F9E0A8', '#CDB4DB'], 8), ink: '#3E3A52', accent: '#8C7AA8', eyebrow: 'to someone wonderful', title: 'happy\nbirthday', titleFont: 'Great Vibes', titleSize: 170 },
  // Anniversary
  { id: 'anniv-gold', name: 'Golden Years', occasion: 'anniversary', style: 'luxury', bg: solid('#FBF7EF'), art: art('wreath', ['#C2A05A', '#DEC892', '#A8843F'], 4), ink: '#6E5626', accent: '#A8843F', eyebrow: 'with love', title: 'Happy\nAnniversary', titleFont: 'Cormorant Garamond', titleSize: 84, width: 0.5 },
  { id: 'anniv-romance', name: 'Still the One', occasion: 'anniversary', style: 'romantic', trending: true, bg: grad('#8E2F3C', '#5E1A25'), art: art('hearts', ['#F3C9C4', '#E8A7A1', '#C2A05A'], 9), ink: '#FBEDEA', accent: '#E9C9A5', title: 'Still\nthe One', sub: 'happy anniversary, my love', titleFont: 'Great Vibes', titleSize: 190, paper: '#FFF8F6' },
  { id: 'anniv-min', name: 'Here’s to Us', occasion: 'anniversary', style: 'minimalist', bg: solid('#F7F4EE'), art: art('geo', ['#C2A05A', '#2B2622', '#D9CBB0'], 2), ink: INK, accent: '#A8843F', eyebrow: 'happy anniversary', title: 'Here’s\nto us', titleFont: 'Playfair Display', titleSize: 130, titleItalic: true },
  // Wedding
  { id: 'wed-botanical', name: 'Garden Vows', occasion: 'wedding', style: 'nature', trending: true, bg: solid('#F8F6F0'), art: art('botanical', ['#7D9479', '#A9B8A0', '#5E7A63'], 6), ink: '#35463A', accent: '#6C8468', eyebrow: 'congratulations', title: 'Mr & Mrs', sub: 'on your wedding day', titleFont: 'Great Vibes', titleSize: 180 },
  { id: 'wed-lux', name: 'Ever After', occasion: 'wedding', style: 'luxury', bg: solid('#FFFDF8'), art: art('none', [GOLD]), border: { kind: 'corners', color: GOLD, inset: 56 }, ink: '#7A6128', accent: '#A8843F', sticker: { kind: 'ring', color: GOLD }, eyebrow: 'to the happy couple', title: 'Happily\nEver After', titleFont: 'Playfair Display', titleSize: 104 },
  { id: 'wed-wash', name: 'Two Hearts', occasion: 'wedding', style: 'watercolour', bg: solid('#FFF9F7'), art: art('wash', ['#F6CFCB', '#F9E3C8', '#E7C6DC'], 14), ink: '#5A3F45', accent: '#B98A8F', title: 'Two hearts,\none love', sub: 'congratulations on your wedding', titleFont: 'Cormorant Garamond', titleSize: 110, titleItalic: true },
  // Engagement
  { id: 'eng-ring', name: 'She Said Yes', occasion: 'engagement', style: 'romantic', bg: solid('#FBEFEA'), art: art('hearts', ['#E8A7A1', '#F3C9B5', '#DEC892'], 17), ink: '#6B3A3A', accent: '#B5766F', sticker: { kind: 'ring', color: '#C2A05A' }, title: 'She said\nyes!', sub: 'congratulations on your engagement', titleFont: 'Great Vibes', titleSize: 180 },
  { id: 'eng-modern', name: 'Engaged', occasion: 'engagement', style: 'typography', bg: solid('#1F2A44'), art: art('stars', ['#E9D5A5', '#F5EFE2'], 19), border: { kind: 'line', color: GOLD, inset: 44 }, ink: '#E9D5A5', accent: '#F5EFE2', eyebrow: 'officially', title: 'ENGAGED', sub: 'congratulations to you both', titleFont: 'Bebas Neue', titleSize: 240, paper: '#FBF7EF' },
  // Christmas
  { id: 'xmas-forest', name: 'Evergreen Christmas', occasion: 'christmas', style: 'seasonal', trending: true, bg: grad('#2B4A37', '#18301F'), art: art('snow', ['#FFFFFF'], 12), border: { kind: 'double', color: '#D8BE82', inset: 44 }, ink: '#F5EBD3', accent: '#D8BE82', eyebrow: 'wishing you a', title: 'Merry\nChristmas', sub: 'and a happy new year', titleFont: 'Great Vibes', titleSize: 180, paper: '#FBF7EF' },
  { id: 'xmas-min', name: 'Joy', occasion: 'christmas', style: 'minimalist', bg: solid('#FBF7EF'), art: art('geo', ['#B5362F', '#2F4A3A', '#C2A05A'], 2), ink: '#B5362F', accent: '#2F4A3A', title: 'JOY', sub: 'to you and yours this Christmas', titleFont: 'Bebas Neue', titleSize: 400 },
  { id: 'xmas-wreath', name: 'Winter Wreath', occasion: 'christmas', style: 'nature', bg: solid('#FFFDF8'), art: art('wreath', ['#2F4A3A', '#5E7A63', '#B5362F'], 23), ink: '#2F4A3A', accent: '#B5362F', eyebrow: 'warmest', title: 'Season’s\nGreetings', titleFont: 'Playfair Display', titleSize: 76, width: 0.5 },
  // New Year
  { id: 'ny-gold', name: 'Midnight Sparkle', occasion: 'new-year', style: 'luxury', bg: grad('#1E2233', '#0F1220'), art: art('confetti', ['#E9D5A5', '#C2A05A', '#F5EFE2', '#8A6D2F'], 27), ink: '#E9D5A5', accent: '#F5EFE2', eyebrow: 'cheers to a', title: 'Happy\nNew Year', titleFont: 'Playfair Display', titleSize: 120, paper: '#FBF7EF' },
  { id: 'ny-type', name: 'Hello, New Year', occasion: 'new-year', style: 'typography', bg: solid('#F2E8DA'), art: art('sunburst', ['#EADCC6', '#F2E8DA'], 1), ink: '#2B2622', accent: '#B9822B', title: 'HELLO\nNEW YEAR', sub: 'make it a good one', titleFont: 'Bebas Neue', titleSize: 200 },
  // Valentine's
  { id: 'val-hearts', name: 'Be Mine', occasion: 'valentines', style: 'romantic', trending: true, bg: solid('#FBE4E1'), art: art('hearts', ['#D9534F', '#E8837E', '#F3B1AC', '#B5362F'], 33), ink: '#8E2F3C', accent: '#B5362F', title: 'Be Mine', sub: 'happy valentine’s day', titleFont: 'Great Vibes', titleSize: 210 },
  { id: 'val-funny', name: 'Favourite Notification', occasion: 'valentines', style: 'funny', bg: solid('#FFFDF8'), art: art('terrazzo', ['#E8837E', '#F2B84B', '#7FB7BE'], 35), ink: INK, accent: '#D9534F', title: 'You’re my\nfavourite\nnotification', sub: 'happy valentine’s day', titleFont: 'Abril Fatface', titleSize: 96 },
  // Mother's Day
  { id: 'mum-floral', name: 'For Mum, With Love', occasion: 'mothers-day', style: 'floral', bg: solid('#FDF6F0'), art: art('floral', ['#E6A4B4', '#F5C6AA', '#C98BB0', '#8FA58A', '#F9E7A6'], 37), ink: '#5B3A4A', accent: '#B0728E', eyebrow: 'happy mother’s day', title: 'For Mum', sub: 'with all my love', titleFont: 'Great Vibes', titleSize: 200 },
  { id: 'mum-wash', name: 'Loveliest Mum', occasion: 'mothers-day', style: 'watercolour', bg: solid('#FFFDF9'), art: art('wash', ['#CDB4DB', '#F4B6C2', '#BDE0D0'], 39), ink: '#4B3F5C', accent: '#8C7AA8', title: 'World’s\nLoveliest\nMum', titleFont: 'Playfair Display', titleSize: 104, titleItalic: true },
  // Father's Day
  { id: 'dad-type', name: 'Top Dad', occasion: 'fathers-day', style: 'typography', bg: solid('#1F2A44'), art: art('stripes', ['#E0B252', '#C9785A', '#F5EFE2'], 1), ink: '#F5EFE2', accent: '#E0B252', title: 'TOP\nDAD', sub: 'happy father’s day', titleFont: 'Bebas Neue', titleSize: 330, paper: '#FBF7EF' },
  { id: 'dad-hills', name: 'Great Outdoors', occasion: 'fathers-day', style: 'nature', bg: solid('#F4EBDD'), art: art('hills', ['#E0B252', '#A9B8A0', '#7D9479', '#5E7A63', '#2F4A3A'], 41), ink: '#2F4A3A', accent: '#8A6A2F', title: 'Happy\nFather’s Day', sub: 'thanks for every adventure', titleFont: 'Playfair Display', titleSize: 92, layout: 'top' },
  // Easter
  { id: 'easter-pastel', name: 'Easter Meadow', occasion: 'easter', style: 'seasonal', bg: solid('#F9F6E8'), art: art('floral', ['#F7D08A', '#CDB4DB', '#F4B6C2', '#9CC5A1', '#FFFFFF'], 43), ink: '#5A5237', accent: '#8FA46B', title: 'Happy\nEaster', sub: 'hello, spring', titleFont: 'Great Vibes', titleSize: 180 },
  { id: 'easter-egg', name: 'Egg-stra Special', occasion: 'easter', style: 'funny', bg: solid('#EAF3F5'), art: art('terrazzo', ['#F4B6C2', '#F9E0A8', '#CDB4DB', '#9CC5A1'], 45), ink: '#2D3B45', accent: '#7A9AA6', title: 'Have an\negg-stra\nspecial Easter', titleFont: 'Abril Fatface', titleSize: 92 },
  // Thank you
  { id: 'ty-min', name: 'Simply, Thank You', occasion: 'thank-you', style: 'minimalist', trending: true, bg: solid('#FBF7EF'), art: art('none', [GOLD]), border: { kind: 'line', color: '#2B2622', inset: 56 }, ink: INK, accent: '#A8843F', sticker: { kind: 'rule', color: GOLD }, title: 'thank you', sub: 'for everything', titleFont: 'Playfair Display', titleSize: 124, titleItalic: true },
  { id: 'ty-wash', name: 'Grateful Heart', occasion: 'thank-you', style: 'watercolour', bg: solid('#FFFDF9'), art: art('wash', ['#F9E0A8', '#F5C9A9', '#F4B6C2'], 47), ink: '#6B4A35', accent: '#C08A5A', title: 'Thank You\nSo Much', titleFont: 'Great Vibes', titleSize: 170 },
  { id: 'ty-botanical', name: 'With Gratitude', occasion: 'thank-you', style: 'nature', bg: solid('#F3F1E7'), art: art('botanical', ['#8A9A7B', '#B5C0A6', '#66775C'], 49), ink: '#3D4A35', accent: '#66775C', title: 'With\nGratitude', titleFont: 'Cormorant Garamond', titleSize: 130 },
  // Congratulations
  { id: 'congrats-gold', name: 'Bravo', occasion: 'congratulations', style: 'luxury', bg: solid('#FFFDF8'), art: art('confetti', ['#C2A05A', '#DEC892', '#A8843F', '#EBDDB9'], 51), border: { kind: 'double', color: GOLD, inset: 44 }, ink: '#6E5626', accent: '#A8843F', eyebrow: 'bravo!', title: 'Congratulations', sub: 'you did it', titleFont: 'Playfair Display', titleSize: 92 },
  { id: 'congrats-type', name: 'You Did It', occasion: 'congratulations', style: 'typography', bg: solid('#E07A5F'), art: art('geo', ['#F5EFE2', '#2B2622', '#F2CC8F'], 2), ink: '#FBF7EF', accent: '#2B2622', title: 'YOU\nDID IT!', sub: 'congratulations', titleFont: 'Bebas Neue', titleSize: 290, paper: '#FBF7EF' },
  // Get well
  { id: 'gws-sun', name: 'Sunny Days Ahead', occasion: 'get-well', style: 'nature', bg: solid('#FFF6E5'), art: art('hills', ['#F2B84B', '#F8DDB0', '#F2C58E', '#E9A67A', '#D98A66'], 53), ink: '#7A4A2A', accent: '#C9785A', title: 'Get Well\nSoon', sub: 'sunnier days are on their way', titleFont: 'Playfair Display', titleSize: 110, layout: 'top' },
  { id: 'gws-wash', name: 'Gentle Wishes', occasion: 'get-well', style: 'watercolour', bg: solid('#FDFEFD'), art: art('wash', ['#B8D8E8', '#BDE0D0', '#F9E0A8'], 55), ink: '#3A5560', accent: '#6C96A3', title: 'Feel better\nsoon', sub: 'sending love and rest', titleFont: 'Great Vibes', titleSize: 170 },
  // Sympathy
  { id: 'symp-min', name: 'With Deepest Sympathy', occasion: 'sympathy', style: 'minimalist', bg: solid('#F4F2EE'), art: art('botanical', ['#A7AFA3', '#C3C8BE', '#8F998B'], 57), ink: '#4A4D48', accent: '#7C857A', title: 'With Deepest\nSympathy', sub: 'thinking of you', titleFont: 'Cormorant Garamond', titleSize: 96 },
  { id: 'symp-wash', name: 'In Loving Memory', occasion: 'sympathy', style: 'watercolour', bg: solid('#FCFBF9'), art: art('wash', ['#C9D6DF', '#DCD6E6', '#E8E4DA'], 59), ink: '#4C5560', accent: '#8090A0', title: 'Thinking\nof You', sub: 'with love and sympathy', titleFont: 'Cormorant Garamond', titleSize: 120, titleItalic: true },
  // Retirement
  { id: 'ret-hills', name: 'New Horizons', occasion: 'retirement', style: 'nature', bg: solid('#FBEFE0'), art: art('hills', ['#F2B84B', '#F0A07A', '#D9826A', '#9C6B7A', '#5B5273'], 61), ink: '#5B3F4A', accent: '#C9785A', title: 'Happy\nRetirement', sub: 'here’s to new horizons', titleFont: 'Playfair Display', titleSize: 100, layout: 'top' },
  { id: 'ret-funny', name: 'Out of Office', occasion: 'retirement', style: 'funny', bg: solid('#FFFDF8'), art: art('stripes', ['#7FB7BE', '#F2B84B', '#E9806E'], 1), ink: INK, accent: '#E9806E', title: 'OUT OF\nOFFICE\nFOREVER', sub: 'happy retirement!', titleFont: 'Bebas Neue', titleSize: 210 },
  // Graduation
  { id: 'grad-gold', name: 'The Graduate', occasion: 'graduation', style: 'luxury', bg: grad('#232842', '#141829'), art: art('stars', ['#E9D5A5', '#C2A05A'], 63), border: { kind: 'corners', color: GOLD, inset: 50 }, ink: '#E9D5A5', accent: '#F5EFE2', eyebrow: 'class act', title: 'Congratulations\nGraduate', titleFont: 'Playfair Display', titleSize: 88, paper: '#FBF7EF' },
  { id: 'grad-type', name: 'Onwards & Upwards', occasion: 'graduation', style: 'typography', bg: solid('#F2E8DA'), art: art('arcs', ['#E07A5F', '#F2CC8F', '#81B29A', '#3D405B', '#E9D5A5'], 1), ink: '#3D405B', accent: '#E07A5F', eyebrow: 'congratulations, graduate', title: 'ONWARDS\n& UPWARDS', titleFont: 'Bebas Neue', titleSize: 170, layout: 'top' },
  // Baby shower
  { id: 'baby-clouds', name: 'Hello, Little One', occasion: 'baby-shower', style: 'watercolour', bg: solid('#F4F9FB'), art: art('wash', ['#B8D8E8', '#F9E0A8', '#F4B6C2'], 65), ink: '#44606B', accent: '#7FA5B3', sticker: { kind: 'moon', color: '#F2CC8F' }, title: 'Hello,\nLittle One', titleFont: 'Great Vibes', titleSize: 170 },
  { id: 'baby-arcs', name: 'Over the Rainbow', occasion: 'baby-shower', style: 'abstract', bg: solid('#FBF4EA'), art: art('arcs', ['#E9A28E', '#F2CC8F', '#A9C5A0', '#9DB4C8', '#CDB4DB'], 1), ink: '#5A4A42', accent: '#C9856F', title: 'Welcome\nto the World', sub: 'little one', titleFont: 'Playfair Display', titleSize: 92, layout: 'top' },
  // Just because
  { id: 'jb-abstract', name: 'Abstract Sunshine', occasion: 'just-because', style: 'abstract', bg: solid('#F5EDE0'), art: art('terrazzo', ['#E07A5F', '#F2CC8F', '#81B29A', '#3D405B'], 67), ink: '#3D405B', accent: '#E07A5F', title: 'Just\nBecause', titleFont: 'Abril Fatface', titleSize: 150 },
  { id: 'jb-min', name: 'Thinking of You', occasion: 'just-because', style: 'minimalist', bg: solid('#EEF1EC'), art: art('geo', ['#7D9479', '#2B2622', '#C2A05A'], 2), ink: '#2F3A30', accent: '#7D9479', title: 'thinking\nof you', titleFont: 'Playfair Display', titleSize: 124, titleItalic: true },
  { id: 'jb-floral', name: 'Hello Lovely', occasion: 'just-because', style: 'floral', bg: solid('#FFF7F0'), art: art('floral', ['#F2A07B', '#F7C59F', '#E8837E', '#7FA08A', '#FCE9B2'], 69), ink: '#6B3F35', accent: '#C9785A', title: 'Hello\nLovely', titleFont: 'Great Vibes', titleSize: 200 },
  { id: 'jb-sun', name: 'You Are My Sunshine', occasion: 'just-because', style: 'abstract', bg: solid('#FBEFD2'), art: art('sunburst', ['#F9E3B0', '#FBEFD2'], 1), ink: '#7A5520', accent: '#C08A2F', sticker: { kind: 'sun', color: '#E8B04A' }, title: 'You Are My\nSunshine', titleFont: 'Playfair Display', titleSize: 100 },
  // Australian occasions
  { id: 'aus-sunburnt', name: 'Sunburnt Country', occasion: 'australia-day', style: 'nature', trending: true, bg: solid('#FCEBD2'), art: art('hills', ['#F2B84B', '#E9A67A', '#D9826A', '#B5533C', '#7A3B2E'], 71), ink: '#7A3B2E', accent: '#B5533C', title: 'Happy\nAustralia Day', sub: 'here’s to the sunburnt country', titleFont: 'Playfair Display', titleSize: 92, layout: 'top' },
  { id: 'aus-cross', name: 'Southern Cross', occasion: 'australia-day', style: 'typography', bg: grad('#1F2A44', '#101A30'), art: art('stars', ['#F5EFE2', '#DEC892'], 73), ink: '#F5EFE2', accent: '#DEC892', sticker: { kind: 'southernCross', color: '#F5EFE2' }, title: 'G’DAY', sub: 'happy Australia Day, mate', titleFont: 'Bebas Neue', titleSize: 330, paper: '#FBF7EF' },
  { id: 'anzac-poppy', name: 'Lest We Forget', occasion: 'anzac-day', style: 'minimalist', bg: solid('#F7F3EC'), art: art('none', [GOLD]), border: { kind: 'line', color: '#2B2622', inset: 56 }, ink: INK, accent: '#B5362F', sticker: { kind: 'poppy', color: '#B5362F' }, title: 'Lest We\nForget', sub: 'ANZAC Day · 25 April', titleFont: 'Cormorant Garamond', titleSize: 124 },
  { id: 'anzac-dawn', name: 'Dawn Service', occasion: 'anzac-day', style: 'nature', bg: solid('#FBEBD8'), art: art('hills', ['#F2B84B', '#E9A67A', '#B5766F', '#6B5B73', '#3D405B'], 75), ink: '#3D405B', accent: '#B5362F', title: 'We Will\nRemember Them', sub: 'ANZAC Day', titleFont: 'Playfair Display', titleSize: 88, layout: 'top' },
  { id: 'cup-race', name: 'Race Day', occasion: 'melbourne-cup', style: 'luxury', bg: solid('#FFFDF8'), art: art('confetti', ['#C2A05A', '#DEC892', '#A8843F', '#EBDDB9'], 77), border: { kind: 'double', color: GOLD, inset: 44 }, ink: '#6E5626', accent: '#A8843F', sticker: { kind: 'horseshoe', color: GOLD }, eyebrow: 'the race that stops a nation', title: 'Happy\nCup Day', titleFont: 'Playfair Display', titleSize: 116 },
  { id: 'cup-fun', name: 'Odds-On Favourite', occasion: 'melbourne-cup', style: 'funny', bg: solid('#EAF3EC'), art: art('terrazzo', ['#2F4A3A', '#C2A05A', '#E9806E'], 79), ink: '#2F4A3A', accent: '#A8843F', title: 'You’re my\nodds-on\nfavourite', sub: 'happy Melbourne Cup day', titleFont: 'Abril Fatface', titleSize: 96 },
  { id: 'footy-grand', name: 'Grand Final Day', occasion: 'footy-finals', style: 'typography', trending: true, bg: solid('#1F2A44'), art: art('stripes', ['#E0B252', '#F5EFE2', '#B5362F'], 1), ink: '#F5EFE2', accent: '#E0B252', sticker: { kind: 'footy', color: '#C9785A' }, title: 'GRAND\nFINAL\nDAY', titleFont: 'Bebas Neue', titleSize: 220, paper: '#FBF7EF' },
  { id: 'footy-fun', name: 'Carn the Team', occasion: 'footy-finals', style: 'funny', bg: solid('#FFF6E5'), art: art('confetti', ['#B5362F', '#1F2A44', '#E0B252', '#7FB7BE'], 81), ink: '#1F2A44', accent: '#B5362F', sticker: { kind: 'trophy', color: '#C2A05A' }, title: 'Carn the\nmighty team!', sub: 'happy footy finals', titleFont: 'Abril Fatface', titleSize: 96 },
  // More designs
  { id: 'bday-cake', name: 'Cake O’Clock', occasion: 'birthday', style: 'abstract', bg: solid('#FFF4EC'), art: art('terrazzo', ['#E9806E', '#F2B84B', '#B79AD6', '#7FB7BE'], 83), ink: '#4A2F2F', accent: '#E9806E', sticker: { kind: 'cake', color: '#E9806E' }, title: 'It’s cake\no’clock', sub: 'happy birthday', titleFont: 'Abril Fatface', titleSize: 116 },
  { id: 'bday-sun', name: 'Around the Sun', occasion: 'birthday', style: 'minimalist', bg: solid('#FBF7EF'), art: art('geo', ['#E8B04A', '#2B2622', '#E07A5F'], 2), ink: INK, accent: '#B9822B', sticker: { kind: 'sun', color: '#E8B04A' }, title: 'Another trip\naround the sun', sub: 'happy birthday', titleFont: 'Playfair Display', titleSize: 84, titleItalic: true },
  { id: 'xmas-summer', name: 'Summer Christmas', occasion: 'christmas', style: 'seasonal', bg: solid('#FFF6E5'), art: art('hills', ['#F2B84B', '#F8DDB0', '#9FD0D6', '#5FA9B6', '#2D6E7E'], 85), ink: '#2D6E7E', accent: '#C9785A', title: 'Merry\nChristmas', sub: 'from sunny Australia', titleFont: 'Great Vibes', titleSize: 170, layout: 'top' },
  { id: 'wed-married', name: 'Just Married', occasion: 'wedding', style: 'minimalist', bg: solid('#F7F4EE'), art: art('none', [GOLD]), border: { kind: 'line', color: GOLD, inset: 56 }, ink: INK, accent: '#A8843F', sticker: { kind: 'rule', color: GOLD }, title: 'just\nmarried', sub: 'congratulations to you both', titleFont: 'Playfair Display', titleSize: 136, titleItalic: true },
  { id: 'baby-twinkle', name: 'Twinkle, Twinkle', occasion: 'baby-shower', style: 'abstract', bg: grad('#2C3350', '#1A1E30'), art: art('stars', ['#F5EFE2', '#F2CC8F'], 87), ink: '#F5EFE2', accent: '#F2CC8F', sticker: { kind: 'moon', color: '#F2CC8F' }, title: 'Twinkle,\nTwinkle', sub: 'welcome, little star', titleFont: 'Great Vibes', titleSize: 170, paper: '#FBF7EF' },
  { id: 'ty-bunch', name: 'Thanks a Bunch', occasion: 'thank-you', style: 'floral', bg: solid('#FFF8F1'), art: art('floral', ['#F2A07B', '#F4B6C2', '#E8837E', '#8FA58A', '#FCE9B2'], 89), ink: '#6B3F35', accent: '#C9785A', title: 'Thanks\na Bunch', titleFont: 'Great Vibes', titleSize: 200 },
  { id: 'congrats-home', name: 'Home Sweet Home', occasion: 'congratulations', style: 'nature', bg: solid('#F3F1E7'), art: art('botanical', ['#7D9479', '#A9B8A0', '#5E7A63'], 91), ink: '#35463A', accent: '#6C8468', eyebrow: 'congratulations on your new', title: 'Home\nSweet Home', titleFont: 'Playfair Display', titleSize: 104 },
  { id: 'grad-smarty', name: 'Smarty Pants', occasion: 'graduation', style: 'funny', bg: solid('#FFFDF8'), art: art('confetti', ['#3D405B', '#E07A5F', '#F2CC8F', '#81B29A'], 93), ink: '#3D405B', accent: '#E07A5F', title: 'Officially\na smarty\npants', sub: 'congratulations, graduate', titleFont: 'Abril Fatface', titleSize: 100 },
  { id: 'val-you-me', name: 'You & Me', occasion: 'valentines', style: 'minimalist', bg: solid('#F9EEEC'), art: art('geo', ['#D9534F', '#2B2622', '#E8A7A1'], 2), ink: '#5A2A2A', accent: '#D9534F', sticker: { kind: 'heart', color: '#D9534F' }, title: 'you & me', sub: 'always', titleFont: 'Playfair Display', titleSize: 136, titleItalic: true },
  { id: 'ret-cheers', name: 'Cheers to You', occasion: 'retirement', style: 'luxury', bg: solid('#FFFDF8'), art: art('sunburst', ['#F6EEDB', '#FFFDF8'], 1), border: { kind: 'double', color: GOLD, inset: 44 }, ink: '#6E5626', accent: '#A8843F', eyebrow: 'happy retirement', title: 'Cheers\nto You', titleFont: 'Playfair Display', titleSize: 124 },
];

export const TEMPLATE_MAP: Record<string, TemplateSpec> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

function text(partial: Partial<TextEl> & Pick<TextEl, 'text' | 'x' | 'y' | 'w' | 'font' | 'size' | 'color'>): TextEl {
  return { id: uid(), type: 'text', align: 'center', bold: false, italic: false, spacing: 0, lineHeight: 1.2, ...partial };
}

function lineHeightFor(font: string): number {
  if (font === 'Bebas Neue') return 0.95;
  if (font === 'Great Vibes') return 1.08;
  return 1.14;
}

function buildFront(s: TemplateSpec, o: Orientation): Face {
  const { w: W, h: H } = cardSize(o);
  const boxW = Math.min(W * (s.width ?? 0.8), o === 'landscape' ? 1040 * ((s.width ?? 0.8) / 0.8) : W);
  const x = (W - boxW) / 2;
  const lines = s.title.split('\n');
  const maxChars = Math.max(...lines.map((l) => l.length));
  let size = Math.min(s.titleSize, boxW / (maxChars * fontFactor(s.titleFont)));
  const lh = lineHeightFor(s.titleFont);
  const stickerH = s.sticker ? (s.sticker.kind === 'rule' ? 60 : 120) : 0;
  const measure = () => (s.sticker ? stickerH + 26 : 0) + (s.eyebrow ? 24 * 1.4 + 26 : 0) + lines.length * size * lh + (s.sub ? 30 + 40 * 1.3 : 0);
  const maxBlock = H * (s.layout && s.layout !== 'center' ? 0.42 : 0.62);
  if (measure() > maxBlock) size *= Math.max(0.5, (maxBlock - (measure() - lines.length * size * lh)) / (lines.length * size * lh));
  const anchor = s.layout === 'top' ? 0.27 : s.layout === 'bottom' ? 0.72 : 0.5;
  let y = Math.max(70, anchor * H - measure() / 2);
  const els: CardElement[] = [];
  if (s.sticker) {
    const sw = s.sticker.kind === 'rule' ? 220 : stickerH;
    els.push({ id: uid(), type: 'sticker', kind: s.sticker.kind, color: s.sticker.color, x: (W - sw) / 2, y, w: sw, h: stickerH });
    y += stickerH + 26;
  }
  if (s.eyebrow) {
    els.push(text({ text: s.eyebrow.toUpperCase(), x, y, w: boxW, font: 'DM Sans', size: 24, color: s.accent, spacing: 8, lineHeight: 1.4 }));
    y += 24 * 1.4 + 26;
  }
  els.push(text({ text: s.title, x, y, w: boxW, font: s.titleFont, size: Math.round(size), color: s.ink, italic: !!s.titleItalic, lineHeight: lh, role: 'title' }));
  y += lines.length * size * lh + 30;
  if (s.sub) els.push(text({ text: s.sub, x, y, w: boxW, font: 'Cormorant Garamond', size: 40, color: s.ink, italic: true, lineHeight: 1.3 }));
  return { background: s.bg, art: s.art, border: s.border ?? { kind: 'none', color: GOLD, inset: 44 }, elements: els };
}

export function buildInside(o: Orientation, opts: { paper?: string; accent?: string; greeting: string; message: string; close: string; greetingFont?: string; signature?: string }): Face {
  const { w: W, h: H } = cardSize(o);
  const paper = opts.paper ?? '#FFFDF8';
  let accent = opts.accent ?? '#A8843F';
  if (luminance(accent) > 0.72) accent = '#A8843F';
  const boxW = Math.min(W * 0.72, 900), x = (W - boxW) / 2;
  const gFont = opts.greetingFont && opts.greetingFont !== 'Bebas Neue' && opts.greetingFont !== 'Abril Fatface' ? opts.greetingFont : 'Playfair Display';
  const script = gFont === 'Great Vibes';
  const tall = o === 'portrait';
  return {
    background: { kind: 'solid', color: paper },
    art: { kind: 'none', palette: [accent], seed: 1 },
    border: { kind: 'line', color: accent, inset: 44 },
    elements: [
      text({ text: opts.greeting, x, y: H * (tall ? 0.17 : 0.13), w: boxW, font: gFont, size: script ? 96 : 64, color: accent, lineHeight: 1.15, role: 'title' }),
      text({ text: opts.message, x, y: H * (tall ? 0.33 : 0.32), w: boxW, font: 'Cormorant Garamond', size: 42, color: INK, lineHeight: 1.45, role: 'message' }),
      text({ text: opts.close + (opts.signature ? '\n' + opts.signature : ''), x, y: H * (tall ? 0.74 : 0.72), w: boxW, font: 'Cormorant Garamond', size: 44, color: INK, italic: true, lineHeight: 1.3, role: 'signoff' }),
    ],
  };
}

export function buildTemplate(s: TemplateSpec, o: Orientation, signature = ''): CardDoc {
  const ins = INSIDE[s.occasion];
  return {
    orientation: o,
    front: buildFront(s, o),
    inside: buildInside(o, { paper: s.paper, accent: s.accent, greetingFont: s.titleFont, signature, ...ins }),
  };
}

export function blankDoc(o: Orientation, occasion: OccasionId = 'just-because', signature = ''): CardDoc {
  const { w: W, h: H } = cardSize(o);
  return {
    orientation: o,
    front: {
      background: { kind: 'solid', color: '#FBF7EF' },
      art: { kind: 'none', palette: ['#C2A05A', '#DEC892', '#A8843F'], seed: 1 },
      border: { kind: 'double', color: GOLD, inset: 44 },
      elements: [text({ text: 'Your heading', x: W * 0.1, y: H * 0.42, w: W * 0.8, font: 'Playfair Display', size: 96, color: INK, role: 'title' })],
    },
    inside: buildInside(o, { ...INSIDE[occasion], signature }),
  };
}

/** Re-flow a card into a different layout, keeping everything in proportion. */
export function reflow(doc: CardDoc, to: Orientation): CardDoc {
  if (doc.orientation === to) return doc;
  const a = cardSize(doc.orientation), b = cardSize(to);
  const sx = b.w / a.w, sy = b.h / a.h, s = Math.min(sx, sy);
  const face = (f: Face): Face => ({
    ...f,
    elements: f.elements.map((el) => {
      if (el.type === 'text') {
        const w = Math.min(b.w * 0.94, el.w * sx);
        const cxNew = (el.x + el.w / 2) * sx;
        return { ...el, w, x: cxNew - w / 2, y: el.y * sy, size: Math.max(12, Math.round(el.size * Math.min(1, Math.max(s, 0.8)))) };
      }
      const w = el.w * s, h = el.h * s;
      return { ...el, w, h, x: (el.x + el.w / 2) * sx - w / 2, y: (el.y + el.h / 2) * sy - h / 2 };
    }),
  });
  return { orientation: to, front: face(doc.front), inside: face(doc.inside) };
}

export function newCard(opts: { template?: TemplateSpec; orientation: Orientation; occasion?: OccasionId; signature?: string; recipient?: string }): SavedCard {
  const occasion = opts.template?.occasion ?? opts.occasion ?? 'just-because';
  const doc = opts.template ? buildTemplate(opts.template, opts.orientation, opts.signature) : blankDoc(opts.orientation, occasion, opts.signature);
  const now = Date.now();
  const recipient = opts.recipient?.trim();
  if (recipient) {
    // Address the inside of the card to the person it is for.
    const greeting = doc.inside.elements.find((e) => e.type === 'text' && e.role === 'title');
    if (greeting && greeting.type === 'text') { greeting.text = `Dear ${recipient},`; if (greeting.font === 'Great Vibes') greeting.size = Math.min(greeting.size, 84); }
  }
  const base = opts.template ? opts.template.name : `${occasionLabel(occasion)} card`;
  return {
    ...doc, id: uid(), name: recipient ? `${base} for ${recipient}` : base, recipient,
    occasion, templateId: opts.template?.id, status: 'draft', favourite: false, createdAt: now, updatedAt: now,
  };
}

export function searchTemplates(q: string, occasion?: string, styles?: string[]): TemplateSpec[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return TEMPLATES.filter((t) => {
    if (occasion && t.occasion !== occasion) return false;
    if (styles?.length && !styles.includes(t.style)) return false;
    if (!terms.length) return true;
    const hay = `${t.name} ${occasionLabel(t.occasion)} ${styleLabel(t.style)} ${t.title} ${t.sub ?? ''} ${t.eyebrow ?? ''} ${t.art.kind}`.toLowerCase().replace(/[’']/g, '');
    return terms.every((term) => hay.includes(term.replace(/[’']/g, '')));
  });
}

const previewCache = new Map<string, CardDoc>();
/** Cached document used for template thumbnails. */
export function templatePreview(id: string, o: Orientation = 'portrait'): CardDoc | undefined {
  const key = id + ':' + o;
  if (!previewCache.has(key) && TEMPLATE_MAP[id]) previewCache.set(key, buildTemplate(TEMPLATE_MAP[id], o));
  return previewCache.get(key);
}
