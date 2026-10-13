export type Tone =
  | 'sunset'
  | 'ocean'
  | 'lemon'
  | 'mint'
  | 'berry'
  | 'graphite'
  | 'coral'
  | 'sky';

export interface AlumniProfile {
  avatarImageUrl?: string;
  avatarLabel?: string;
  example?: boolean;
  id: string;
  nickname: string;
  year: string;
  emoji: string;
  summary: string;
  field: string;
  status: string;
  place: string;
  direction: string;
  reflection: string;
  advice: string;
  tone: Tone;
}

export const TONE_CLASSES: Record<Tone, string> = {
  sunset: 'from-[#ff7048] via-[#f59b24] to-[#ffd45a]',
  ocean: 'from-[#1678b8] via-[#58a9d8] to-[#bde4ee]',
  lemon: 'from-[#f6ac23] via-[#ffcf4f] to-[#fff0a2]',
  mint: 'from-[#3e9f67] via-[#73bd6b] to-[#c8e8a9]',
  berry: 'from-[#e34a35] via-[#ef735c] to-[#f8c5b5]',
  graphite: 'from-[#48515a] via-[#78828a] to-[#cbd0d3]',
  coral: 'from-[#ef593c] via-[#f18c58] to-[#ffd09e]',
  sky: 'from-[#1c83c5] via-[#71b5db] to-[#d1ebf5]',
};

export const TONES = Object.keys(TONE_CLASSES) as Tone[];
