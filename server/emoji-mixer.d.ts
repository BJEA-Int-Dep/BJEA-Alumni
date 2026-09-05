declare module 'emoji-mixer' {
  export default function getEmojiMixUrl(
    left: string,
    right: string,
    detailedErrors?: boolean,
    oldToNew?: boolean,
  ): string | null | undefined;
  export const supportedEmojis: string[];
  export function checkSupported(
    emoji: string,
  ): Array<{ leftEmoji: string; rightEmoji: string; date: string }> | null;
  export function googleRequestUrl(combo: {
    leftEmoji: string;
    rightEmoji: string;
    date: string;
  }): string;
}
