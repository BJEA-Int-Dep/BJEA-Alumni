import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { MessageCircle, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ProfileAvatar } from '@/features/avatar/profile-avatar';
import { apiRequest } from '@/lib/api';

interface Comment {
  id: number;
  authorName: string;
  body: string;
  createdAt: number;
  isMine: boolean;
  canDelete: boolean;
  avatarImageUrl?: string;
}

interface CommentMenu {
  commentId: number;
  x: number;
  y: number;
}

export function ProfileComments({ profileId, loggedIn, onLogin }: { profileId: string; loggedIn: boolean; onLogin: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [menu, setMenu] = useState<CommentMenu | null>(null);
  const [error, setError] = useState('');
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMenu(null);
    void apiRequest<{ comments: Comment[] }>(`/api/profiles/${profileId}/comments`)
      .then((result) => { if (!cancelled) setComments(result.comments); })
      .catch(() => { if (!cancelled) setError('评论暂时无法加载。'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profileId]);
  useEffect(() => {
    if (!menu) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-comment-menu]')) setMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(null); };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menu]);
  useEffect(() => () => { if (pressTimer.current !== null) window.clearTimeout(pressTimer.current); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const result = await apiRequest<{ comment: Comment }>(`/api/profiles/${profileId}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
      setComments((current) => [result.comment, ...current]);
      setBody('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '评论发送失败，请重试。');
    } finally { setSubmitting(false); }
  };
  const deleteComment = async (comment: Comment) => {
    setMenu(null);
    const prompt = comment.isMine ? '确定删除自己的这条留言吗？' : '确定删除这位校友在你 Profile 下的留言吗？';
    if (!window.confirm(`${prompt}删除后无法恢复。`)) return;
    setDeletingId(comment.id);
    setError('');
    try {
      await apiRequest<{ ok: boolean }>(`/api/profiles/${profileId}/comments/${comment.id}`, { method: 'DELETE' });
      setComments((current) => current.filter((item) => item.id !== comment.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除失败，请重试。');
    } finally { setDeletingId(null); }
  };
  const openMenu = (commentId: number, x: number, y: number) => {
    setMenu({
      commentId,
      x: Math.max(12, Math.min(x, window.innerWidth - 140)),
      y: Math.max(12, Math.min(y, window.innerHeight - 60)),
    });
  };
  const stopPress = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
    pressStart.current = null;
  };
  const startPress = (event: ReactPointerEvent<HTMLElement>, comment: Comment) => {
    if (!comment.canDelete || event.pointerType === 'mouse' || deletingId !== null) return;
    stopPress();
    const { clientX: x, clientY: y } = event;
    pressStart.current = { x, y };
    pressTimer.current = window.setTimeout(() => {
      openMenu(comment.id, x, y);
      pressTimer.current = null;
    }, 550);
  };
  const movePress = (event: ReactPointerEvent<HTMLElement>) => {
    if (pressStart.current && Math.hypot(event.clientX - pressStart.current.x, event.clientY - pressStart.current.y) > 10) stopPress();
  };
  const menuComment = comments.find((comment) => comment.id === menu?.commentId);
  return <section className="mt-6 rounded-[24px] bg-white p-5 shadow-[0_10px_35px_rgba(55,45,31,0.07)] sm:p-7">
    <h2 className="flex items-center gap-2 text-xl font-black"><MessageCircle className="size-5" /> 留言</h2>
    <p className="mt-1 text-xs text-muted-foreground">登录后可以评论；内容通过 AI 审核后立即公开。</p>
    {loggedIn ? <form onSubmit={(e) => void submit(e)} className="mt-5 grid gap-3"><Textarea value={body} onChange={(e) => setBody(e.target.value)} minLength={2} maxLength={500} required placeholder="说点什么吧…" className="min-h-24 rounded-xl" /><div className="flex justify-end"><Button type="submit" disabled={submitting || body.trim().length < 2} className="rounded-xl bg-[#ee573c] font-black text-white">{submitting ? '审核中…' : '发布评论'}</Button></div></form> : <Button variant="outline" onClick={onLogin} className="mt-5 rounded-xl bg-white font-bold">登录后评论</Button>}
    {error ? <p role="alert" className="mt-3 text-sm font-bold text-destructive">{error}</p> : null}
    <div className="mt-5 divide-y divide-black/[0.07] border-t border-black/[0.07]">
      {loading ? <p className="py-4 text-sm text-muted-foreground">正在加载评论…</p> : comments.length === 0 ? <p className="py-4 text-sm text-muted-foreground">还没有留言，来写第一条吧。</p> : comments.map((comment) => <article
        key={comment.id}
        className="py-4"
        tabIndex={comment.canDelete ? 0 : undefined}
        onPointerDown={(event) => startPress(event, comment)}
        onPointerMove={movePress}
        onPointerUp={stopPress}
        onPointerCancel={stopPress}
        onContextMenu={(event) => {
          if (!comment.canDelete || deletingId !== null) return;
          event.preventDefault();
          stopPress();
          openMenu(comment.id, event.clientX, event.clientY);
        }}
        onKeyDown={(event) => {
          if (!comment.canDelete || (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10'))) return;
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          openMenu(comment.id, rect.right - 130, rect.top + 20);
        }}
      >
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-black/[0.05] bg-[#f1f0ed] text-muted-foreground">
            {comment.avatarImageUrl
              ? <ProfileAvatar imageUrl={comment.avatarImageUrl} label={`${comment.authorName}的头像`} className="size-10" />
              : <UserRound aria-hidden="true" className="size-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-black">{comment.authorName}{comment.isMine ? ' · 我' : ''}</p>
              <time className="shrink-0 text-xs text-muted-foreground" dateTime={new Date(comment.createdAt).toISOString()}>{new Date(comment.createdAt).toLocaleDateString('zh-CN')}</time>
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{comment.body}</p>
          </div>
        </div>
      </article>)}
    </div>
    {menuComment ? <div data-comment-menu role="menu" className="fixed z-50 min-w-32 rounded-xl border border-black/10 bg-white p-1 shadow-xl" style={{ left: menu!.x, top: menu!.y }}>
      <Button type="button" role="menuitem" variant="ghost" autoFocus disabled={deletingId !== null} onClick={() => void deleteComment(menuComment)} className="w-full justify-start rounded-lg px-3 text-sm text-destructive hover:text-destructive">删除评论</Button>
    </div> : null}
  </section>;
}
