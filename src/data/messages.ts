// Personal message writer.
//
// Messages are produced by a MessageProvider. The built-in provider below
// composes them locally from curated phrases, so it works offline and sends
// nothing anywhere. To add AI generation later, implement MessageProvider
// with a class that calls YOUR OWN backend endpoint (which holds the API
// key server-side) and register it in `providers` – never put an API key in
// frontend code.
import { mulberry32 } from '../lib/utils';
import { occasionLabel, type OccasionId } from './occasions';

export type Tone = 'heartfelt' | 'romantic' | 'funny' | 'formal' | 'warm' | 'inspirational' | 'elegant' | 'playful';
export type MessageLength = 'short' | 'medium' | 'long';

export const TONES: { id: Tone; label: string }[] = [
  { id: 'heartfelt', label: 'Heartfelt' }, { id: 'romantic', label: 'Romantic' }, { id: 'funny', label: 'Funny' },
  { id: 'formal', label: 'Formal' }, { id: 'warm', label: 'Warm' }, { id: 'inspirational', label: 'Inspirational' },
  { id: 'elegant', label: 'Elegant' }, { id: 'playful', label: 'Playful' },
];

export const RELATIONSHIPS = ['Friend', 'Partner', 'Mum', 'Dad', 'Sibling', 'Child', 'Grandparent', 'Family member', 'Colleague', 'Other'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export interface MessageRequest {
  recipient: string;
  occasion: OccasionId;
  relationship: Relationship;
  tone: Tone;
  length: MessageLength;
  details: string;
  sender: string;
}

export interface MessageProvider {
  id: string;
  label: string;
  generate(req: MessageRequest): Promise<string[]>;
}

/** The ten suggestion categories shown as quick starts. */
export const MESSAGE_CATEGORIES: { label: string; preset: Partial<MessageRequest> }[] = [
  { label: 'Birthday wishes', preset: { occasion: 'birthday', tone: 'warm' } },
  { label: 'Romantic', preset: { occasion: 'valentines', tone: 'romantic', relationship: 'Partner' } },
  { label: 'Anniversary', preset: { occasion: 'anniversary', tone: 'heartfelt', relationship: 'Partner' } },
  { label: 'Thank you', preset: { occasion: 'thank-you', tone: 'warm' } },
  { label: 'Funny', preset: { occasion: 'birthday', tone: 'funny', relationship: 'Friend' } },
  { label: 'Inspirational', preset: { occasion: 'graduation', tone: 'inspirational' } },
  { label: 'Sympathy', preset: { occasion: 'sympathy', tone: 'heartfelt' } },
  { label: 'Congratulations', preset: { occasion: 'congratulations', tone: 'warm' } },
  { label: 'Family', preset: { occasion: 'just-because', tone: 'heartfelt', relationship: 'Family member' } },
  { label: 'Friendship', preset: { occasion: 'just-because', tone: 'warm', relationship: 'Friend' } },
];

const SOLEMN: OccasionId[] = ['sympathy', 'get-well'];

/** Sympathy and get-well cards are never written in a jokey voice. */
export function effectiveTone(occasion: OccasionId, tone: Tone): Tone {
  if (SOLEMN.includes(occasion) && (tone === 'funny' || tone === 'playful')) return 'warm';
  if (occasion === 'sympathy' && tone === 'romantic') return 'heartfelt';
  return tone;
}

interface OccasionPhrases { open: string[]; wish: string[]; funny?: string[] }

const OCC: Record<OccasionId, OccasionPhrases> = {
  birthday: {
    open: ['Happy birthday!', 'Wishing you the happiest of birthdays.', 'Today is all about you — happy birthday!'],
    wish: ['I hope your day is filled with laughter, good company and all of your favourite things.', 'May the year ahead bring you everything you have been hoping for.', 'Here’s to another year of adventures, big and small.', 'You deserve every bit of joy today brings.'],
    funny: ['Don’t think of it as getting older — think of it as becoming a classic.', 'Age is just a number. In your case, a rather impressive one.', 'I was going to make a joke about your age, but the cake has enough candles to worry about.'],
  },
  anniversary: {
    open: ['Happy anniversary!', 'Congratulations on another beautiful year together.', 'Here’s to love that only grows.'],
    wish: ['Your love story is one of my favourites.', 'May the years ahead be as full of happiness as the ones behind you.', 'Wishing you a day as special as the bond you share.', 'Here’s to all the memories made and the many still to come.'],
    funny: ['Another year of tolerating each other’s snoring — true love really does conquer all.', 'Proof that someone can put up with you for this long. Miracles happen!'],
  },
  wedding: {
    open: ['Congratulations on your wedding day!', 'What a joy to celebrate the two of you.', 'Here’s to the happy couple!'],
    wish: ['May your life together be filled with love, laughter and endless adventure.', 'Wishing you a marriage as wonderful as today.', 'May you always find home in each other.', 'Here’s to a lifetime of dancing in the kitchen.'],
    funny: ['Marriage tip: “you were right” is always the correct answer.', 'Thank you for the free dinner and the open bar. Oh, and congratulations!'],
  },
  engagement: {
    open: ['Congratulations on your engagement!', 'You’re engaged — what wonderful news!', 'Here’s to the two of you and the adventure ahead.'],
    wish: ['I couldn’t be happier for you both.', 'Wishing you a lifetime of love and a wonderfully stress-free time planning.', 'May this be the beginning of your happiest chapter yet.'],
    funny: ['Finally! We were all starting to place bets.', 'Enjoy being engaged — it’s all the fun with none of the seating charts. Yet.'],
  },
  christmas: {
    open: ['Merry Christmas!', 'Wishing you a very merry Christmas.', 'Season’s greetings and all good wishes.'],
    wish: ['May your days be merry, bright and wonderfully unhurried.', 'I hope the season brings you warmth, rest and time with the people you love.', 'Wishing you peace and joy now and in the year to come.', 'May your home be full of laughter and your table full of good things.'],
    funny: ['May your Christmas be merry and your family arguments brief.', 'I hope Santa is good to you — you’ve been reasonably well behaved.'],
  },
  'new-year': {
    open: ['Happy New Year!', 'Cheers to a brand new year!', 'Here’s to fresh starts and new adventures.'],
    wish: ['May the year ahead be your best one yet.', 'Wishing you health, happiness and plenty to celebrate in the months ahead.', 'I hope this year brings you closer to everything you’re dreaming of.'],
    funny: ['May your resolutions last longer than the leftovers.', 'New year, same wonderful you — no upgrades required.'],
  },
  valentines: {
    open: ['Happy Valentine’s Day!', 'To my Valentine.', 'Happy Valentine’s Day to my favourite person.'],
    wish: ['Every day with you is my favourite day.', 'You make ordinary moments feel like something special.', 'I fall a little more in love with you all the time.', 'Thank you for being exactly who you are.'],
    funny: ['I love you more than pizza. And you know how I feel about pizza.', 'You’re the only person I’d share my chips with.'],
  },
  'mothers-day': {
    open: ['Happy Mother’s Day!', 'To the most wonderful mum.', 'Wishing you a beautiful Mother’s Day.'],
    wish: ['Thank you for your endless love, patience and wisdom.', 'Everything good in me started with you.', 'I hope today you feel as cherished as you have always made me feel.', 'You make the world softer, kinder and better.'],
    funny: ['Thanks for putting up with me — I turned out brilliantly, so well done you.', 'Sorry about my teenage years. All of them.'],
  },
  'fathers-day': {
    open: ['Happy Father’s Day!', 'To the best dad going.', 'Wishing you a brilliant Father’s Day.'],
    wish: ['Thank you for the lessons, the laughs and for always being in my corner.', 'I’m so grateful for everything you’ve taught me.', 'I hope today is full of your favourite things.', 'You’re one of a kind, and I’m lucky you’re mine.'],
    funny: ['Thanks for all the dad jokes. Someone has to laugh at them.', 'You taught me everything I know — except how to fold a map.'],
  },
  easter: {
    open: ['Happy Easter!', 'Wishing you a joyful Easter.', 'Hello spring and happy Easter!'],
    wish: ['I hope your day is full of sunshine, family and far too much chocolate.', 'May this season bring you fresh hope and new beginnings.', 'Wishing you a bright and peaceful long weekend.'],
    funny: ['May your egg hunt be fruitful and your chocolate stash well hidden.', 'Calories don’t count at Easter. That’s just science.'],
  },
  'thank-you': {
    open: ['Thank you so much.', 'I can’t thank you enough.', 'A heartfelt thank you.'],
    wish: ['Your kindness meant more than words can say.', 'I’m so grateful for your thoughtfulness and generosity.', 'It truly made all the difference.', 'I feel very lucky to have you in my life.'],
    funny: ['You’re officially my favourite person this week.', 'I owe you one. Possibly several.'],
  },
  congratulations: {
    open: ['Congratulations!', 'You did it — congratulations!', 'What brilliant news. Congratulations!'],
    wish: ['You worked so hard for this and deserve every bit of your success.', 'I’m so proud of everything you’ve achieved.', 'This is only the beginning of wonderful things for you.', 'Take a moment to celebrate — you’ve earned it.'],
    funny: ['I always knew you’d make it. I just didn’t think it would be this impressive.', 'Please remember us little people now that you’re famous.'],
  },
  'get-well': {
    open: ['Get well soon.', 'Thinking of you and wishing you a speedy recovery.', 'Sending you healing wishes.'],
    wish: ['Take all the time you need to rest and feel like yourself again.', 'I hope each day finds you a little stronger.', 'Sending you a little sunshine and a lot of love.', 'I’m here for anything you need — truly.'],
  },
  sympathy: {
    open: ['With deepest sympathy.', 'I am so very sorry for your loss.', 'Thinking of you at this difficult time.'],
    wish: ['May fond memories bring you comfort in the days ahead.', 'Please know you are in my thoughts.', 'I hope you feel surrounded by love and care.', 'I am here for you, now and in the weeks to come.'],
  },
  retirement: {
    open: ['Happy retirement!', 'Congratulations on your retirement!', 'Here’s to your next great chapter.'],
    wish: ['Congratulations on a remarkable career and everything you’ve achieved.', 'Wishing you long mornings, grand adventures and time for everything you love.', 'You’ve more than earned this — enjoy every moment.'],
    funny: ['Goodbye tension, hello pension!', 'Every day is Saturday now. Try not to rub it in.', 'You can finally turn off the alarm clock. Forever.'],
  },
  graduation: {
    open: ['Congratulations, graduate!', 'You did it — happy graduation!', 'Hats off to you!'],
    wish: ['All those late nights were worth it.', 'The world is lucky to have you — go and do wonderful things.', 'I can’t wait to see where your talent takes you.', 'Be proud of how far you’ve come.'],
    funny: ['Now for the hard part: finding a use for that cap.', 'Congratulations on being done with homework. Mostly.'],
  },
  'baby-shower': {
    open: ['Congratulations on your little one!', 'A new baby — how wonderful!', 'Welcome to the world, little one.'],
    wish: ['Wishing you tiny toes, sleepy cuddles and so much love.', 'May your home be filled with joy and just enough sleep.', 'You are going to be the most wonderful parents.', 'Here’s to the sweetest new adventure.'],
    funny: ['Sleep is overrated anyway. Coffee is your friend now.', 'Get ready for the cutest boss you’ll ever work for.'],
  },
  'just-because': {
    open: ['Just a little note to say hello.', 'No special reason — I simply wanted to say this.', 'Thinking of you today.'],
    wish: ['You make the people around you feel valued, and that includes me.', 'I’m so glad you’re in my life.', 'I hope today treats you as kindly as you treat everyone else.', 'You’re appreciated more than you know.'],
    funny: ['This card has no purpose other than to remind you that you’re great.', 'Consider this a hug in paper form.'],
  },
};

const TONE: Record<Tone, { extra: string[]; close: string[] }> = {
  heartfelt: { extra: ['You mean more to me than I often manage to say.', 'I’m so grateful for you, today and every day.', 'Thank you for being such an important part of my life.'], close: ['With all my love,', 'With love always,'] },
  romantic: { extra: ['My heart is yours, completely.', 'Loving you is the easiest thing I’ve ever done.', 'With you, I am exactly where I’m meant to be.'], close: ['Forever yours,', 'All my love, always,'] },
  funny: { extra: ['Don’t worry, I’ll bring the snacks.', 'This card cost me nearly five dollars, so please cherish it.', 'You’re welcome for this delightful card.'], close: ['Cheers,', 'Lots of love (and cake),'] },
  formal: { extra: ['Please accept my very best wishes.', 'It is a pleasure to mark this occasion with you.', 'I wish you every success and happiness.'], close: ['With kind regards,', 'Yours sincerely,'] },
  warm: { extra: ['Thinking of you with a big smile.', 'You deserve all the good things coming your way.', 'Sending you a great big hug.'], close: ['Warmest wishes,', 'With love,'] },
  inspirational: { extra: ['The best chapters are still ahead of you.', 'Keep going — you are capable of remarkable things.', 'May you always have the courage to chase what lights you up.'], close: ['Onwards and upwards,', 'Cheering you on,'] },
  elegant: { extra: ['May grace and good fortune follow you always.', 'It is a privilege to celebrate you.', 'Wishing you every happiness, now and always.'], close: ['With fondest regards,', 'With every good wish,'] },
  playful: { extra: ['Let’s celebrate properly — I’m thinking cake. Lots of cake.', 'Prepare for an unreasonable amount of fun.', 'High fives all round!'], close: ['Big hugs,', 'Lots of love,'] },
};

const REL: Record<Relationship, string[]> = {
  Friend: ['Friends like you make every chapter better.', 'I’m so lucky to call you my friend.'],
  Partner: ['Life with you is my favourite adventure.', 'I’d choose you again in every lifetime.'],
  Mum: ['I’m so lucky to have you as my mum.', 'Thank you for always believing in me, Mum.'],
  Dad: ['I’m so lucky to have you as my dad.', 'Thank you for always backing me, Dad.'],
  Sibling: ['I couldn’t have asked for a better partner in crime.', 'Growing up with you was the best luck I ever had.'],
  Child: ['Watching you grow is the greatest joy of my life.', 'I’m prouder of you than you’ll ever know.'],
  Grandparent: ['Your stories and your hugs are treasures to me.', 'Thank you for the wisdom and the endless biscuits.'],
  'Family member': ['Family like ours is a gift, and you’re a big part of why.', 'I’m so glad we’re family.'],
  Colleague: ['It’s a real pleasure working alongside you.', 'The team is better because you’re on it.'],
  Other: [],
};

const SOLEMN_REL: Partial<Record<Relationship, string>> = {
  Friend: 'I’m so grateful for our friendship, and I’m here whenever you need me.',
  Colleague: 'Everyone at work is thinking of you.',
  'Family member': 'Our whole family is holding you close.',
};

function detailLine(req: MessageRequest, i: number): string {
  const d = req.details.trim().replace(/[.!?\s]+$/, '');
  if (!d) return '';
  if (req.occasion === 'sympathy') return [`I will always treasure ${d}.`, `I keep thinking of ${d}, and it brings me comfort.`][i % 2];
  if (req.occasion === 'get-well') return [`I’m already looking forward to ${d} once you’re feeling better.`, `I keep thinking about ${d} — it still makes me smile.`][i % 2];
  return [`I keep thinking about ${d} — it still makes me smile.`, `I’ll never forget ${d}.`, `Remembering ${d} always brightens my day.`][i % 3];
}

function greeting(req: MessageRequest, tone: Tone): string {
  const name = req.recipient.trim();
  if (!name) return '';
  if (tone === 'formal' || tone === 'elegant') return `Dear ${name},`;
  if (tone === 'romantic') return `My dearest ${name},`;
  if (tone === 'funny' || tone === 'playful') return `${name}!`;
  return `Dear ${name},`;
}

function at<T>(list: T[], i: number): T { return list[((i % list.length) + list.length) % list.length]; }

/** Compose `count` distinct variants. Deterministic for a given seed. */
export function composeMessages(req: MessageRequest, count = 3, seed = Date.now()): string[] {
  const tone = effectiveTone(req.occasion, req.tone);
  const occ = OCC[req.occasion];
  const t = TONE[tone];
  const rnd = mulberry32(seed);
  const base = Math.floor(rnd() * 1000);
  const solemn = SOLEMN.includes(req.occasion);
  const out: string[] = [];
  for (let v = 0; v < count; v++) {
    const i = base + v;
    const body: string[] = [at(occ.open, i)];
    const wishes = (tone === 'funny' || tone === 'playful') && occ.funny ? [...occ.funny, ...occ.wish] : occ.wish;
    const rel = solemn ? SOLEMN_REL[req.relationship] ?? '' : REL[req.relationship].length ? at(REL[req.relationship], i) : '';
    const detail = detailLine(req, i);
    const extra = solemn && (tone === 'inspirational') ? 'Brighter days will come, and I will be beside you until they do.' : solemn && tone !== 'formal' && tone !== 'elegant' && tone !== 'heartfelt' ? '' : at(t.extra, i);
    if (req.length === 'short') {
      body.push(detail || at(wishes, i));
    } else if (req.length === 'medium') {
      body.push(at(wishes, i));
      body.push(detail || rel || extra);
      if (detail && rel && v % 2 === 0) body.push(rel);
    } else {
      body.push(at(wishes, i), at(wishes, i + 1));
      if (rel) body.push(rel);
      if (detail) body.push(detail);
      if (extra) body.push(extra);
      if (!solemn && req.occasion !== 'thank-you') body.push(at(occ.wish, i + 2));
    }
    const text = [...new Set(body.filter(Boolean))].join(' ');
    const sign = at(solemn && (tone === 'warm') ? ['Thinking of you,', 'With love,'] : t.close, i) + (req.sender.trim() ? '\n' + req.sender.trim() : '');
    out.push([greeting(req, tone), text, sign].filter(Boolean).join('\n\n'));
  }
  return [...new Set(out)];
}

/** Splits a generated message into the parts a card's inside uses. */
export function splitMessage(message: string): { greeting: string; body: string; signoff: string } {
  const parts = message.split('\n\n');
  if (parts.length >= 3) return { greeting: parts[0], body: parts.slice(1, -1).join('\n\n'), signoff: parts[parts.length - 1] };
  if (parts.length === 2) return { greeting: '', body: parts[0], signoff: parts[1] };
  return { greeting: '', body: message, signoff: '' };
}

export const builtInProvider: MessageProvider = {
  id: 'built-in',
  label: 'Built-in writer (works offline)',
  async generate(req) {
    if (!OCC[req.occasion]) throw new Error(`No messages available for ${occasionLabel(req.occasion)} yet.`);
    return composeMessages(req, 3);
  },
};

/** Registered providers – add a server-backed AI provider here in future. */
export const providers: MessageProvider[] = [builtInProvider];
