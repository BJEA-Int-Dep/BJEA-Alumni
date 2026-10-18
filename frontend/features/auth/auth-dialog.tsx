import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  KeyRound,
  LogIn,
  Mail,
  Save,
} from 'lucide-react';
import {
  defaultAccountPreferences,
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
  onOpenChange: (open: boolean) => void;
  onAuthenticated: (payload: AuthPayload) => void;
  onCreateProfile: () => void;
}

const modeCopy: Record<AuthMode, { title: string; description: string }> = {
  login: {
    title: '邮箱验证码登录',
    description: '输入注册邮箱，获取一次性验证码后登录。',
  },
  'password-login': {
    title: '使用密码登录',
    description: '已设置密码的用户，可以用邮箱或原登录昵称登录。',
  },
  register: {
    title: '先注册校友账号',
    description: '留下邮箱和真实姓名，就可以开始创建 Profile。真实姓名不会公开。',
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

export function AuthDialog({
  open,
  initialMode = 'login',
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
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [sendCooldown, setSendCooldown] = useState(0);

  useEffect(() => {
    if (sendCooldown <= 0) return;
    const timeout = window.setTimeout(() => setSendCooldown((remaining) => remaining - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [sendCooldown]);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError('');
    setNotice('');
    setCode('');
    setPassword('');
    setConfirmPassword('');
  }, [initialMode, open]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setNotice('');
    setCode('');
    setPassword('');
    setConfirmPassword('');
  };


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
    setSendingCode(true);
    try {
      const result = await apiRequest<{ ok: true; status: 'accepted' }>('/api/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({ email, purpose }),
      });
      if (result.status !== 'accepted')
        throw new Error('网站前后端版本不一致，请更新并重启后端服务。');
      setSendCooldown(60);
      setNotice(mode === 'register'
        ? '只有尚未注册的邮箱会收到验证码，10 分钟内有效；如果已有账号，请切换到登录。'
        : '只有已注册且可用的邮箱会收到验证码，10 分钟内有效；若未收到，请检查邮箱地址。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '验证码发送失败。');
    } finally {
      setSendingCode(false);
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
          body: JSON.stringify({ realName, email, code, preferences: defaultAccountPreferences() }),
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
          ? '注册并开始创建'
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
                {mode === 'register' ? '返回' : '返回验证码登录'}
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

        <div className="subtle-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-7">
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
                onChange={(event) => {
                  setEmail(event.target.value);
                  setCode('');
                  setSendCooldown(0);
                  setNotice('');
                }}
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
                  disabled={sendingCode || sendCooldown > 0 || submitting}
                  className="h-12 rounded-xl bg-white px-4 font-black"
                >
                  <Mail className="size-4" />
                  {sendingCode ? '处理中…' : sendCooldown > 0 ? `${sendCooldown} 秒后再试` : '获取验证码'}
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
                还没有账号？先注册
              </button>
            </div>
          ) : null}

          {mode === 'register' ? (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="mt-5 block w-full text-center text-xs font-bold text-[#17648e] hover:underline"
            >
              已有帐号？登录
            </button>
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
