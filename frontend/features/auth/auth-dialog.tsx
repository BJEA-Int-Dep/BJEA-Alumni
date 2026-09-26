import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Globe2,
  KeyRound,
  LogIn,
  Mail,
  Save,
} from 'lucide-react';
import {
  defaultAccountPreferences,
  type AccountPreferences,
  type AuthPayload,
} from '../../../shared/account';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/api';

export type AuthMode =
  | 'login'
  | 'password-login'
  | 'register'
  | 'reset-password';

interface AuthDialogProps {
  open: boolean;
  initialMode?: AuthMode;
  publishProfileAfterRegister?: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: (payload: AuthPayload) => void;
  onCreateProfile: () => void;
}

const modeCopy: Record<AuthMode, { title: string; description: string }> = {
  login: {
    title: '邮箱验证码登录',
    description: '无需记密码，用注册邮箱收取验证码即可回来。',
  },
  'password-login': {
    title: '使用密码登录',
    description: '已设置密码的用户，可以用邮箱或原登录昵称登录。',
  },
  register: {
    title: '保存你的 Profile',
    description: '最后验证邮箱，下次就能随时回来修改。',
  },
  'reset-password': {
    title: '设置新密码',
    description: '密码是可选登录方式；邮箱验证码始终可以登录。',
  },
};

function Field({
  label,
  hint,
  ...props
}: {
  label: string;
  hint?: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <label className="grid gap-2 text-xs font-black text-muted-foreground">
      <span>
        {label}
        {hint ? (
          <span className="ml-2 font-medium text-muted-foreground/75">{hint}</span>
        ) : null}
      </span>
      <Input
        className="h-12 rounded-xl border-black/10 bg-white text-base font-medium text-foreground"
        {...props}
      />
    </label>
  );
}

function PreferenceOption({
  checked,
  onChange,
  icon,
  title,
  description,
  recommended = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  recommended?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition ${
        checked
          ? 'border-[#ee573c]/45 bg-[#fff0e7] ring-2 ring-[#ee573c]/10'
          : 'border-black/[0.08] bg-white hover:border-black/20'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-[#ee573c]"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-black text-foreground">
          <span className="text-[#df5035]">{icon}</span>
          {title}
          {recommended ? (
            <span className="rounded-full bg-[#ee573c] px-2 py-0.5 text-[10px] text-white">
              推荐
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-xs font-medium leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  );
}

export function AuthDialog({
  open,
  initialMode = 'login',
  publishProfileAfterRegister = false,
  onOpenChange,
  onAuthenticated,
  onCreateProfile,
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [realName, setRealName] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [preferences, setPreferences] = useState<AccountPreferences>(
    defaultAccountPreferences,
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError('');
    setNotice('');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    if (initialMode === 'register')
      setPreferences(defaultAccountPreferences());
  }, [initialMode, open]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setNotice('');
    setCode('');
    setPassword('');
    setConfirmPassword('');
  };

  const updatePreference = (
    key: keyof AccountPreferences,
    value: boolean,
  ) => setPreferences((current) => ({ ...current, [key]: value }));

  const sendCode = async () => {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('请先填写邮箱。');
      return;
    }
    const purpose =
      mode === 'register'
        ? 'register'
        : mode === 'reset-password'
          ? 'reset-password'
          : 'login';
    try {
      await apiRequest<{ ok: true }>('/api/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({ email, purpose }),
      });
      setNotice('已模拟发送验证码；测试验证码是 7410。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '验证码发送失败。');
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (mode === 'reset-password' && password !== confirmPassword) {
      setError('两次输入的密码不一致。');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const payload = await apiRequest<AuthPayload>('/api/auth/email-login', {
          method: 'POST',
          body: JSON.stringify({ email, code }),
        });
        onAuthenticated(payload);
        return;
      }
      if (mode === 'password-login') {
        const payload = await apiRequest<AuthPayload>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
        });
        onAuthenticated(payload);
        return;
      }
      if (mode === 'register') {
        const payload = await apiRequest<AuthPayload>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ realName, email, code, preferences }),
        });
        onAuthenticated(payload);
        return;
      }
      await apiRequest<{ ok: true }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, password }),
      });
      switchMode('login');
      setNotice('密码已经更新，请登录。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败，请重试。');
    } finally {
      setSubmitting(false);
    }
  };

  const copy = modeCopy[mode];
  const usesCode = mode !== 'password-login';
  const submitLabel = submitting
    ? '请稍候…'
    : mode === 'login'
      ? '验证并登录'
      : mode === 'password-login'
        ? '登录'
        : mode === 'register'
          ? publishProfileAfterRegister
            ? '验证邮箱并保存 Profile'
            : '验证邮箱并保存'
          : '更新密码';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] max-w-md flex-col gap-0 overflow-hidden rounded-[26px] bg-[#fffaf1] p-0">
        <div className="shrink-0 px-6 pt-6 sm:px-7 sm:pt-7">
          <DialogHeader>
            {mode !== 'login' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  mode === 'register'
                    ? onOpenChange(false)
                    : switchMode('login')
                }
                className="mb-1 -ml-2 w-fit rounded-full px-2 font-black"
              >
                <ArrowLeft className="size-4" />
                {mode === 'register' ? '返回角色卡' : '返回验证码登录'}
              </Button>
            ) : null}
            <DialogTitle className="text-2xl font-black tracking-tight">
              {copy.title}
            </DialogTitle>
            <DialogDescription className="leading-6">
              {copy.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="auth-scroll-area min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-7">
          <form id="auth-dialog-form" onSubmit={submit} className="grid gap-4">
            {mode === 'register' ? (
              <Field
                label="真实姓名"
                hint="仅学校老师可见"
                name="real-name"
                value={realName}
                onChange={(event) => setRealName(event.target.value)}
                autoComplete="name"
                maxLength={80}
                required
                placeholder="不会显示在校友墙"
              />
            ) : null}

            {mode === 'password-login' ? (
              <Field
                label="邮箱或原登录昵称"
                name="identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                maxLength={254}
                required
              />
            ) : (
              <Field
                label={mode === 'login' ? '邮箱' : '注册邮箱'}
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                maxLength={254}
                required
                placeholder="name@example.com"
              />
            )}

            {usesCode ? (
              <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <Field
                  label="邮箱验证码"
                  name="code"
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  maxLength={8}
                  required
                  placeholder="输入验证码"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendCode}
                  className="h-12 rounded-xl bg-white px-4 font-black"
                >
                  <Mail className="size-4" /> 获取验证码
                </Button>
              </div>
            ) : null}

            {mode === 'password-login' || mode === 'reset-password' ? (
              <Field
                label={mode === 'reset-password' ? '新密码' : '密码'}
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  mode === 'password-login' ? 'current-password' : 'new-password'
                }
                minLength={8}
                maxLength={72}
                required
                placeholder="至少 8 个字符"
              />
            ) : null}

            {mode === 'reset-password' ? (
              <Field
                label="再次输入新密码"
                name="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
              />
            ) : null}

            {mode === 'register' ? (
              <fieldset className="grid gap-2.5">
                <legend className="mb-1 text-sm font-black text-foreground">
                  你希望怎样参与？
                </legend>
                <p className="-mt-1 mb-1 text-xs leading-5 text-muted-foreground">
                  三项都可选，以后可以随时修改。
                </p>
                <PreferenceOption
                  checked={preferences.notifyMajorEvents}
                  onChange={(value) =>
                    updatePreference('notifyMajorEvents', value)
                  }
                  icon={<CalendarDays className="size-4" />}
                  title="学校重大活动通知"
                  description="如校友返校日，约每年 1 次。"
                  recommended
                />
                <PreferenceOption
                  checked={preferences.notifyCommunityUpdates}
                  onChange={(value) =>
                    updatePreference('notifyCommunityUpdates', value)
                  }
                  icon={<Bell className="size-4" />}
                  title="校友活动与校园近况"
                  description="约每 3 个月 1 次。"
                />
                <PreferenceOption
                  checked={preferences.publicProfile}
                  onChange={(value) =>
                    updatePreference('publicProfile', value)
                  }
                  icon={<Globe2 className="size-4" />}
                  title="公开我的 Profile"
                  description="发布到任何人都能浏览的校友墙；在校生可通过老师提出联系，邮箱永不公开。"
                />
              </fieldset>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-destructive"
              >
                {error}
              </p>
            ) : null}
            {notice ? (
              <p
                role="status"
                className="rounded-xl bg-[#eaf5fa] p-3 text-xs font-bold leading-5 text-[#17648e]"
              >
                {notice}
              </p>
            ) : null}
          </form>

          {mode === 'login' ? (
            <div className="mt-5 grid gap-3 border-t border-black/[0.07] pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => switchMode('password-login')}
                className="h-11 rounded-xl bg-white font-black"
              >
                <KeyRound className="size-4" /> 使用密码登录
              </Button>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onCreateProfile();
                }}
                className="text-xs font-bold text-[#17648e] hover:underline"
              >
                还没有 Profile？先创建
              </button>
            </div>
          ) : null}

          {mode === 'password-login' ? (
            <button
              type="button"
              onClick={() => switchMode('reset-password')}
              className="mt-4 block w-full text-center text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              忘记密码
            </button>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-black/[0.06] bg-[#fffaf1]/95 px-6 pb-6 pt-4 backdrop-blur-sm sm:px-7 sm:pb-7">
          <Button
            type="submit"
            form="auth-dialog-form"
            disabled={submitting}
            className="h-12 w-full rounded-2xl bg-[#ee573c] text-base font-black text-white hover:bg-[#d9462f]"
          >
            {mode === 'login' ? (
              <LogIn className="size-4" />
            ) : mode === 'register' ? (
              <Save className="size-4" />
            ) : (
              <KeyRound className="size-4" />
            )}
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
