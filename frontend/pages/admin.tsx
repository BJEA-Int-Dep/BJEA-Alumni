import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Download,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type {
  AccountStatus,
  AdminSessionPayload,
  AdminStudent,
} from '../../shared/admin';
import type { PersistedProfileDraft } from '../../shared/account';
import { experienceLabel, primaryExperience } from '../../shared/experience';
import { generatedAvatarPath } from '../../shared/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { apiRequest, readApiResponse } from '@/lib/api';
import { ProfileAvatar } from '@/features/avatar/profile-avatar';
import { ProfilePreview } from '@/features/onboarding/profile-preview';
import { AboutSection, ThoughtsSection } from '@/features/onboarding/profile-sections';
import { ExperienceSection } from '@/features/onboarding/experience-section';

const inputClass =
  'h-11 rounded-lg border-black/10 bg-white text-sm font-medium text-foreground';

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
      {label}
      <Input className={inputClass} {...props} />
    </label>
  );
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function statusLabel(status: AccountStatus) {
  return status === 'active' ? '正常' : '已停用';
}

function experienceSummary(draft: PersistedProfileDraft | null) {
  const experience = draft && primaryExperience(draft.experiences);
  return experience ? `${experienceLabel(experience)} · ${experience.title}` : '—';
}

export function AdminPage() {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AdminStudent | null>(null);
  const [editorTab, setEditorTab] = useState<'profile' | 'account'>('profile');
  const [loginError, setLoginError] = useState('');
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const loadStudents = async () => {
    setLoading(true);
    setPageError('');
    try {
      const result = await apiRequest<{ students: AdminStudent[] }>(
        '/api/admin/students',
      );
      setStudents(result.students);
      setAuthenticated(true);
    } catch (cause) {
      if (cause instanceof Error) setPageError(cause.message);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void apiRequest<AdminSessionPayload>('/api/admin/me')
      .then(async (session) => {
        if (cancelled) return;
        setConfigured(session.configured);
        setAuthenticated(session.authenticated);
        if (session.authenticated) await loadStudents();
      })
      .catch((cause) => {
        if (!cancelled)
          setPageError(cause instanceof Error ? cause.message : '后台暂时无法连接。');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleStudents = useMemo(() => {
    const key = query.trim().toLocaleLowerCase('zh-CN');
    if (!key) return students;
    return students.filter((student) =>
      [
        student.realName,
        student.nickname,
        student.email,
        student.draft?.nickname,
        student.draft?.year,
        ...(student.draft?.experiences.flatMap((item) => [item.title, item.organization, item.location, item.description]) ?? []),
      ].some((value) => value?.toLocaleLowerCase('zh-CN').includes(key)),
    );
  }, [query, students]);
  const avatarRecipe = editing?.draft?.avatar?.adoptedRecipe ?? editing?.draft?.avatar?.recipe;

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoginError('');
    setLoading(true);
    try {
      await apiRequest<{ ok: true }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          username: String(form.get('username') || ''),
          password: String(form.get('password') || ''),
        }),
      });
      await loadStudents();
    } catch (cause) {
      setLoginError(cause instanceof Error ? cause.message : '登录失败。');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await apiRequest<{ ok: true }>('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    setStudents([]);
    setEditing(null);
  };

  const updateEditing = (patch: Partial<AdminStudent>) =>
    setEditing((current) => (current ? { ...current, ...patch } : current));

  const updateDraft = (patch: Partial<PersistedProfileDraft>) =>
    setEditing((current) =>
      current?.draft
        ? { ...current, draft: { ...current.draft, ...patch } }
        : current,
    );

  const saveStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    const original = students.find((student) => student.id === editing.id);
    if (
      original?.status === 'active' &&
      editing.status === 'disabled' &&
      !window.confirm('停用后，该学生会立即退出登录并从校友墙隐藏。确认停用吗？')
    )
      return;
    setSaving(true);
    setPageError('');
    setNotice('');
    try {
      const result = await apiRequest<{ student: AdminStudent }>(
        `/api/admin/students/${editing.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            nickname: editing.nickname,
            realName: editing.realName,
            email: editing.email,
            status: editing.status,
            draft: editing.draft,
          }),
        },
      );
      setStudents((current) =>
        current.map((student) =>
          student.id === result.student.id ? result.student : student,
        ),
      );
      setEditing(result.student);
      setNotice('学生信息已保存。');
    } catch (cause) {
      setPageError(cause instanceof Error ? cause.message : '保存失败。');
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (!editing || newPassword.length < 8) {
      setPageError('新密码至少需要 8 个字符。');
      return;
    }
    if (!window.confirm(`确认重置“${editing.realName || editing.email}”的密码并退出其所有登录吗？`))
      return;
    setSaving(true);
    setPageError('');
    setNotice('');
    try {
      await apiRequest<{ ok: true }>(
        `/api/admin/students/${editing.id}/password`,
        { method: 'POST', body: JSON.stringify({ password: newPassword }) },
      );
      setNewPassword('');
      setNotice('密码已重置，请将新密码单独告知学生。');
    } catch (cause) {
      setPageError(cause instanceof Error ? cause.message : '密码重置失败。');
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async () => {
    if (!editing) return;
    if (
      !window.confirm(
        `确认永久删除“${editing.realName || editing.email}”及其 Profile 吗？此操作无法撤销。`,
      )
    )
      return;
    setSaving(true);
    setPageError('');
    try {
      await apiRequest<{ ok: true }>(`/api/admin/students/${editing.id}`, {
        method: 'DELETE',
      });
      setStudents((current) =>
        current.filter((student) => student.id !== editing.id),
      );
      setEditing(null);
      setNotice('学生账号已删除。');
    } catch (cause) {
      setPageError(cause instanceof Error ? cause.message : '删除失败。');
    } finally {
      setSaving(false);
    }
  };

  const downloadExport = async () => {
    setLoading(true);
    setPageError('');
    try {
      const response = await fetch('/api/admin/export.xlsx');
      if (!response.ok) {
        await readApiResponse(response, '导出失败，请重试。');
        return;
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `bjea-alumni-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (cause) {
      setPageError(cause instanceof Error ? cause.message : '导出失败。');
    } finally {
      setLoading(false);
    }
  };

  if (!ready)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f1e9] text-sm font-bold text-muted-foreground">
        正在加载后台…
      </main>
    );

  if (!configured)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f1e9] p-6">
        <div className="max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/10">
          <h1 className="text-xl font-black">后台尚未配置</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            请在服务器环境变量中设置 ADMIN_USERNAME、ADMIN_PASSWORD 和
            ADMIN_SESSION_SECRET。
          </p>
        </div>
      </main>
    );

  if (!authenticated)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f1e9] p-6">
        <form
          onSubmit={login}
          className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/10"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#24282c] text-white">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h1 className="text-xl font-black">校友信息后台</h1>
              <p className="text-xs text-muted-foreground">仅供学校老师使用</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            <Field
              label="管理员账号"
              name="username"
              autoComplete="username"
              required
              autoFocus
            />
            <Field
              label="管理员密码"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {loginError || pageError ? (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-bold text-red-700">
              {loginError || pageError}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={loading}
            className="mt-5 h-11 w-full rounded-xl bg-[#24282c] text-sm font-black text-white"
          >
            {loading ? '正在登录…' : '登录后台'}
          </Button>
        </form>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#f4f1e9] text-foreground">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-black">校友信息后台</h1>
            <p className="text-xs text-muted-foreground">管理学生账号与公开 Profile</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void downloadExport()} disabled={loading}>
              <Download /> 导出 XLSX
            </Button>
            <Button variant="outline" onClick={() => void loadStudents()} disabled={loading}>
              <RefreshCw className={loading ? 'animate-spin' : ''} /> 刷新
            </Button>
            <Button variant="ghost" onClick={() => void logout()}>
              <LogOut /> 退出
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 text-xs font-bold">
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">
              全部 {students.length}
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">
              有 Profile {students.filter((student) => student.draft).length}
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-black/10">
              已停用 {students.filter((student) => student.status === 'disabled').length}
            </span>
          </div>
          <label className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索姓名、昵称、邮箱、年份或经历"
              className="h-10 rounded-xl border-black/10 bg-white pl-9"
            />
          </label>
        </div>

        {notice ? (
          <p role="status" className="mb-4 rounded-xl bg-[#edf5e6] p-3 text-sm font-bold text-[#3f743b]">
            {notice}
          </p>
        ) : null}
        {pageError ? (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {pageError}
          </p>
        ) : null}

        <div className="subtle-scrollbar overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/10">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-[#f8f6f1] text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">真实姓名</th>
                <th className="px-4 py-3 font-bold">Profile 昵称</th>
                <th className="px-4 py-3 font-bold">邮箱</th>
                <th className="px-4 py-3 font-bold">公开</th>
                <th className="px-4 py-3 font-bold">毕业年份</th>
                <th className="px-4 py-3 font-bold">最近经历</th>
                <th className="px-4 py-3 font-bold">账号状态</th>
                <th className="px-4 py-3 font-bold">更新时间</th>
                <th className="px-4 py-3 font-bold" />
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((student) => (
                <tr key={student.id} className="border-t border-black/[0.06]">
                  <td className="px-4 py-3 font-bold">
                    {student.realName || '待补充'}
                    <span className="block text-xs font-normal text-muted-foreground">账号 #{student.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    {student.draft ? (
                      <span className="flex items-center gap-2">
                        <ProfileAvatar
                          imageUrl={student.draft.avatar?.generatedAssetId
                            ? generatedAvatarPath(student.draft.avatar.generatedAssetId)
                            : undefined}
                          label="Profile 头像"
                          className="size-9 rounded-full bg-[#f4f1e9]"
                        />
                        <span className="font-bold">{student.draft.nickname || '未填写昵称'}</span>
                      </span>
                    ) : '尚未创建'}
                  </td>
                  <td className="px-4 py-3">{student.email}</td>
                  <td className="px-4 py-3">
                    {student.preferences.publicProfile ? '是' : '否'}
                  </td>
                  <td className="px-4 py-3">{student.draft?.year || '—'}</td>
                  <td className="px-4 py-3">
                    {experienceSummary(student.draft)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        student.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {statusLabel(student.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(student.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(structuredClone(student));
                        setEditorTab(student.draft ? 'profile' : 'account');
                        setNewPassword('');
                        setNotice('');
                        setPageError('');
                      }}
                    >
                      查看 / 编辑
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleStudents.length ? (
            <p className="p-10 text-center text-sm text-muted-foreground">没有找到匹配的学生。</p>
          ) : null}
        </div>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="subtle-scrollbar max-h-[92vh] overflow-y-auto rounded-2xl bg-[#f8f6f1] p-0 sm:max-w-5xl">
          {editing ? (
            <form onSubmit={saveStudent}>
              <DialogHeader className="border-b border-black/10 bg-white p-5 pr-12">
                <DialogTitle className="text-xl font-black">
                  {editing.realName || editing.email}
                </DialogTitle>
                <DialogDescription>账号 ID：{editing.id} · 注册于 {formatDate(editing.createdAt)}</DialogDescription>
              </DialogHeader>

              <div role="group" aria-label="编辑内容" className="flex gap-2 border-b border-black/10 bg-white px-5 py-3">
                {(['profile', 'account'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    aria-pressed={editorTab === tab}
                    onClick={() => setEditorTab(tab)}
                    className={`rounded-xl px-4 py-2 text-sm font-black ${editorTab === tab ? 'bg-[#24282c] text-white' : 'bg-[#f4f1e9] text-foreground'}`}
                  >
                    {tab === 'profile' ? '公开 Profile' : '账号与权限'}
                  </button>
                ))}
              </div>

              <div className="grid gap-5 p-5">
                {editorTab === 'profile' ? editing.draft ? (
                  <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="order-2 grid min-w-0 gap-4 lg:order-1">
                      <section className="rounded-2xl bg-[#fffaf1] p-5 shadow-sm">
                        <div className="mb-4 flex items-baseline justify-between gap-3">
                          <h2 className="text-lg font-black">基本信息</h2>
                          <span className="text-xs font-bold text-[#df5035]">必填</span>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field
                            label="Profile 昵称"
                            value={editing.draft.nickname}
                            onChange={(event) => updateDraft({ nickname: event.target.value })}
                            maxLength={24}
                            required
                          />
                          <Field
                            label="高中毕业年份"
                            value={editing.draft.year}
                            onChange={(event) => updateDraft({ year: event.target.value })}
                            maxLength={4}
                            inputMode="numeric"
                            pattern="20[0-9]{2}"
                            required
                          />
                        </div>
                      </section>
                      <section className="rounded-2xl bg-[#fffaf1] p-5 shadow-sm">
                        <h2 className="mb-1 text-lg font-black">关于我</h2>
                        <p className="mb-4 text-xs text-muted-foreground">选几个性格标签，也可以写一句话介绍自己。</p>
                        <AboutSection draft={editing.draft} patchDraft={updateDraft} />
                      </section>
                      <section className="rounded-2xl bg-[#fffaf1] p-5 shadow-sm">
                        <h2 className="mb-4 text-lg font-black">经历</h2>
                        <ExperienceSection draft={editing.draft} patchDraft={updateDraft} />
                      </section>
                      <section className="rounded-2xl bg-[#fffaf1] p-5 shadow-sm">
                        <h2 className="mb-1 text-lg font-black">一些想法</h2>
                        <p className="mb-4 text-xs text-muted-foreground">想分享时再写。</p>
                        <ThoughtsSection draft={editing.draft} patchDraft={updateDraft} />
                      </section>
                      <section className="rounded-2xl bg-[#fffaf1] p-5 shadow-sm">
                        <h2 className="text-lg font-black">AI 头像</h2>
                        <p className="mt-1 text-xs text-muted-foreground">头像由校友本人生成并采纳；这里显示当前已保存的头像。</p>
                        <div className="mt-4 flex items-center gap-4">
                          <ProfileAvatar
                            imageUrl={editing.draft.avatar?.generatedAssetId
                              ? generatedAvatarPath(editing.draft.avatar.generatedAssetId)
                              : undefined}
                            label="当前头像"
                            className="size-20 rounded-2xl bg-white ring-1 ring-black/10"
                          />
                          <div className="min-w-0 text-sm">
                            <p className="font-bold">{avatarRecipe?.subject || '尚未设置头像主体'}</p>
                            <p className="mt-1 text-muted-foreground">
                              {avatarRecipe?.detail || (editing.draft.avatar?.generatedAssetId
                                ? '暂无配件或动作' : '尚未采纳头像')}
                            </p>
                          </div>
                        </div>
                      </section>
                    </div>
                    <div className="order-1 lg:order-2">
                      <ProfilePreview draft={editing.draft} onToneChange={(tone) => updateDraft({ tone })} />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white p-6 text-sm text-muted-foreground">
                    这名校友还没有创建 Profile；目前只能由本人创建。
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <section className="rounded-2xl bg-white p-5 shadow-sm">
                      <h2 className="text-lg font-black">账号信息</h2>
                      <p className="mb-4 mt-1 text-xs text-muted-foreground">真实姓名和邮箱仅供后台管理，不会显示在公开 Profile 上。</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                          label="真实姓名"
                          value={editing.realName}
                          onChange={(event) => updateEditing({ realName: event.target.value })}
                          required
                        />
                        <Field
                          label="邮箱"
                          type="email"
                          value={editing.email}
                          onChange={(event) => updateEditing({ email: event.target.value })}
                          required
                        />
                        <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
                          账号状态
                          <select
                            value={editing.status}
                            onChange={(event) => updateEditing({ status: event.target.value as AccountStatus })}
                            className={inputClass}
                          >
                            <option value="active">正常</option>
                            <option value="disabled">已停用</option>
                          </select>
                        </label>
                      </div>
                      <details className="mt-5 border-t border-black/10 pt-4">
                        <summary className="cursor-pointer text-sm font-bold">旧版登录设置</summary>
                        <p className="my-3 text-xs text-muted-foreground">登录昵称用于兼容旧版密码登录，与公开 Profile 昵称不同。</p>
                        <div className="max-w-sm">
                          <Field
                            label="登录昵称"
                            value={editing.nickname}
                            onChange={(event) => updateEditing({ nickname: event.target.value })}
                          />
                        </div>
                      </details>
                    </section>
                    <section className="rounded-2xl bg-white p-5 shadow-sm">
                      <h2 className="text-lg font-black">校友的授权状态</h2>
                      <p className="mt-1 text-xs text-muted-foreground">由校友本人设置，管理员只能查看。</p>
                      <div className="mt-4 grid gap-3">
                        {([
                          ['notifyMajorEvents', '学校重大活动通知（约每年 1 次）'],
                          ['notifyCommunityUpdates', '校友活动与校园近况（约每 3 个月 1 次）'],
                          ['publicProfile', '公开到任何人可浏览的校友墙'],
                        ] as const).map(([key, label]) => (
                          <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-black/10 p-3 text-sm">
                            <span>{label}</span>
                            <span className={`shrink-0 font-bold ${editing.preferences[key] ? 'text-[#3f743b]' : 'text-muted-foreground'}`}>
                              {key === 'publicProfile'
                                ? editing.preferences[key] ? '已公开' : '未公开'
                                : editing.preferences[key] ? '已同意' : '未同意'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className="rounded-2xl bg-white p-5 shadow-sm">
                      <h2 className="text-lg font-black">重置密码</h2>
                      <p className="mt-1 text-xs text-muted-foreground">重置后学生会退出所有设备，由老师单独告知新密码。</p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                          placeholder="输入至少 8 位的新密码"
                          className={inputClass}
                        />
                        <Button type="button" variant="outline" onClick={() => void resetPassword()} disabled={saving}>
                          重置密码
                        </Button>
                      </div>
                    </section>
                  </div>
                )}

                {notice ? (
                  <p role="status" className="rounded-lg bg-[#edf5e6] p-3 text-xs font-bold text-[#3f743b]">
                    {notice}
                  </p>
                ) : null}
                {pageError ? (
                  <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs font-bold text-red-700">
                    {pageError}
                  </p>
                ) : null}
              </div>

              <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-white p-4">
                <Button type="button" variant="destructive" onClick={() => void deleteStudent()} disabled={saving}>
                  <Trash2 /> 删除账号
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                    关闭
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-[#24282c] text-white">
                    {saving ? '正在保存…' : '保存修改'}
                  </Button>
                </div>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
