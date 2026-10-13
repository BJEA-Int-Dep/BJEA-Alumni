import { createHash } from 'node:crypto';
import { nicknameSuggestionRequestSchema, type NicknameSuggestions } from '../../shared/avatar.ts';
import { suggestNicknames } from '../nicknames.ts';
import { ApiError } from '../errors.ts';
import type { ApiContext } from './context.ts';

export function createNicknameRoutes(suggest: typeof suggestNicknames = suggestNicknames) {
  const nicknameCache = new Map<
    string,
    { promise: Promise<NicknameSuggestions>; expires: number }
  >();
  let activeNicknames = 0;
  let dailyNicknames = { date: '', count: 0 };

  return async function handleNicknameRequest(context: ApiContext): Promise<boolean> {
    const { req, res, url, json, readBody, sameOrigin, clientIp, limit } = context;
    const respond = (status: number, value: unknown) => {
      json(res, status, value);
      return true;
    };
    if (req.method === 'POST' && url.pathname === '/api/nicknames/suggestions') {
      sameOrigin(req);
      const parsed = nicknameSuggestionRequestSchema.safeParse(await readBody(req));
      if (!parsed.success)
        throw new ApiError(400, '填写内容格式不正确或过长。');
      const input = parsed.data;
      const ip = clientIp(req);
      const key = createHash('sha256')
        .update(ip + JSON.stringify({ ...input, answers: { ...input.answers, nickname: '' } }))
        .digest('hex');
      for (const [id, item] of nicknameCache)
        if (item.expires < Date.now()) nicknameCache.delete(id);
      if (!nicknameCache.has(key)) {
        limit(`nicknames:${ip}`, 30);
        const today = new Date().toISOString().slice(0, 10);
        if (dailyNicknames.date !== today)
          dailyNicknames = { date: today, count: 0 };
        if (dailyNicknames.count >= Number(process.env.NICKNAME_DAILY_LIMIT || 300))
          throw new ApiError(429, '今天的昵称推荐额度已用完，你可以自己填写。');
        if (activeNicknames >= 3)
          throw new ApiError(503, '昵称推荐正在忙，请稍后重试。');
        dailyNicknames.count++;
        activeNicknames++;
        const promise = (suggest)(input)
          .finally(() => { activeNicknames--; });
        if (nicknameCache.size >= 300)
          nicknameCache.delete(nicknameCache.keys().next().value!);
        nicknameCache.set(key, { promise, expires: Date.now() + 10 * 60000 });
        void promise.catch(() => nicknameCache.delete(key));
      }
      return respond(200, await nicknameCache.get(key)!.promise);
    }
    return false;
  };
}
