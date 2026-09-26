import type { AccountPreferences, PersistedProfileDraft } from './account';

export type AccountStatus = 'active' | 'disabled';

export interface AdminStudent {
  id: number;
  nickname: string;
  realName: string;
  email: string;
  hasPassword: boolean;
  preferences: AccountPreferences;
  status: AccountStatus;
  createdAt: number;
  updatedAt: number;
  draft: PersistedProfileDraft | null;
}

export interface AdminSessionPayload {
  configured: boolean;
  authenticated: boolean;
}
