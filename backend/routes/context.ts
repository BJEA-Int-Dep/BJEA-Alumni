import type { IncomingMessage, ServerResponse } from 'node:http';
import type { z } from 'zod';
import type { PersistedProfileDraft } from '../../shared/account.ts';
import type { AppDatabase } from '../database.ts';
import type { createGeneratedAvatarService } from '../generated-avatar.ts';

export interface ApiContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  database: AppDatabase;
  generatedAvatars: ReturnType<typeof createGeneratedAvatarService>;
  json: (res: ServerResponse, status: number, value: unknown) => void;
  readBody: (req: IncomingMessage) => Promise<unknown>;
  sameOrigin: (req: IncomingMessage) => void;
  parsedBody: <T>(schema: z.ZodType<T>, value: unknown) => T;
  clientIp: (req: IncomingMessage) => string;
  limit: (key: string, max: number) => void;
  savedDraft: (userId: number) => PersistedProfileDraft | null;
  publicProfileDraft: (profileId: string) => PersistedProfileDraft | null;
  commentAvatar: (draft: PersistedProfileDraft | null) => { avatarImageUrl: string | undefined };
}
