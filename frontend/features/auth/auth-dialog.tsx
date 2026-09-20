import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LogIn,
  Mail,
  UserPlus,
} from 'lucide-react';
import type { AuthPayload } from '../../../shared/account';
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
  | 'register'
  | 'recover-nickname'
  | 'reset-password';

interface AuthDialogProps {
  open: boolean;
  initialMode?: AuthMode;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: (payload: AuthPayload) => void;
}

const modeCopy: Record<AuthMode, { title: string; description: string }> = {
  login: {
    title: '欢迎回来',
    description: '用注册时的昵称和密码登录。',
  },
  register: {
    title: '创建校友账号',
    description: '一个邮箱只能注册一个账号，昵称和邮箱都不能重复。',
  },
  'recover-nickname': {
    title: '找回昵称',
    description: '验证注册邮箱后，我们会显示你的登录昵称。',
  },
  'reset-password': {
    title: '重置密码',
    description: '验证注册邮箱后，设置一个新密码。',
  },
};

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <label className="grid gap-2 text-xs font-black text-muted-foreground">
      {label}
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
}: AuthDialogProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [recoveredNickname, setRecoveredNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setError('');
    setNotice('');
    setRecoveredNickname('');
  }, [initialMode, open]);

  useEffect(() => {
    if (mode !== 'register' || nickname.trim().length < 2) {
      setCheckingNickname(false);
      setNicknameAvailable(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setCheckingNickname(true);
      void apiRequest<{
        valid: boolean;
        available: boolean;
        error?: string;
      }>(`/api/auth/nickname-availability?nickname=${encodeURIComponent(nickname)}`, {
        signal: controller.signal,
      })
        .then((result) => {
          setNicknameAvailable(result.valid && result.available);
          if (!result.valid && result.error) setError(result.error);
        })
        .catch((cause) => {
          if (!controller.signal.aborted)
            setError(cause instanceof Error ? cause.message : '暂时无法检查昵称。');
        })
        .finally(() => {
          if (!controller.signal.aborted) setCheckingNickname(false);
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [mode, nickname]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setNotice('');
    setRecoveredNickname('');
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
        : mode === 'recover-nickname'
          ? 'recover-nickname'
          : 'reset-password';
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
    setRecoveredNickname('');
    if (mode === 'register' && nicknameAvailable !== true) {
      setError('请先选择一个可用的昵称。');
      return;
    }
    if (
      (mode === 'register' || mode === 'reset-password') &&
      password !== confirmPassword
    ) {
      setError('两次输入的密码不一致。');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const payload = await apiRequest<AuthPayload>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ nickname, password }),
        });
        onAuthenticated(payload);
        return;
      }
      if (mode === 'register') {
        const payload = await apiRequest<AuthPayload>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ nickname, email, password, code }),
        });
        onAuthenticated(payload);
        return;
      }
      if (mode === 'recover-nickname') {
        const result = await apiRequest<{ nickname: string }>(
          '/api/auth/recover-nickname',
          {
            method: 'POST',
            body: JSON.stringify({ email, code }),
          },
        );
        setRecoveredNickname(result.nickname);
        return;
      }
      await apiRequest<{ ok: true }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, code, password }),
      });
      switchMode('login');
      setNotice('密码已经重置，请用新密码登录。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败，请重试。');
    } finally {
      setSubmitting(false);
    }
  };

  const copy = modeCopy[mode];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto rounded-[26px] bg-[#fffaf1] p-6 sm:p-7">
        <DialogHeader>
          {mode !== 'login' ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => switchMode('login')}
              className="mb-1 -ml-2 w-fit rounded-full px-2 font-black"
            >
              <ArrowLeft className="size-4" /> 返回登录
            </Button>
          ) : null}
          <DialogTitle className="text-2xl font-black tracking-tight">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="leading-6">
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          {mode === 'login' || mode === 'register' ? (
            <div>
              <Field
                label={mode === 'register' ? '登录昵称（唯一）' : '登录昵称'}
                name="nickname"
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value);
                  setError('');
                  setNicknameAvailable(null);
                }}
                autoComplete="username"
                maxLength={24}
                required
                placeholder="2–24 个字符"
                aria-invalid={mode === 'register' && nicknameAvailable === false}
              />
              {mode === 'register' && nickname.trim().length >= 2 ? (
                <p
                  className={`mt-1.5 text-xs font-bold ${
                    nicknameAvailable
                      ? 'text-[#3f7a3c]'
                      : nicknameAvailable === false
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                  }`}
                >
                  {checkingNickname
                    ? '正在检查…'
                    : nicknameAvailable
                      ? '这个昵称可以使用'
                      : nicknameAvailable === false
                        ? '这个昵称已被占用或格式不正确'
                        : '等待检查昵称'}
                </p>
              ) : null}
            </div>
          ) : null}

          {mode !== 'login' ? (
            <Field
              label="注册邮箱"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={254}
              required
              placeholder="name@example.com"
            />
          ) : null}

          {mode !== 'login' ? (
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

          {mode !== 'recover-nickname' ? (
            <Field
              label={mode === 'reset-password' ? '新密码' : '密码'}
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              maxLength={72}
              required
              placeholder="至少 8 个字符"
            />
          ) : null}

          {mode === 'register' || mode === 'reset-password' ? (
            <Field
              label="再次输入密码"
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
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-destructive">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="rounded-xl bg-[#eaf5fa] p-3 text-xs font-bold leading-5 text-[#17648e]">
              {notice}
            </p>
          ) : null}
          {recoveredNickname ? (
            <div className="rounded-2xl bg-[#edf5e6] p-4 text-center">
              <CheckCircle2 className="mx-auto size-6 text-[#4f9445]" />
              <p className="mt-2 text-xs font-bold text-[#52714e]">你的登录昵称是</p>
              <p className="mt-1 text-xl font-black">{recoveredNickname}</p>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={submitting || checkingNickname}
            className="mt-1 h-12 rounded-2xl bg-[#ee573c] text-base font-black text-white hover:bg-[#d9462f]"
          >
            {mode === 'login' ? <LogIn className="size-4" /> : mode === 'register' ? <UserPlus className="size-4" /> : <KeyRound className="size-4" />}
            {submitting
              ? '请稍候…'
              : mode === 'login'
                ? '登录'
                : mode === 'register'
                  ? '注册并继续'
                  : mode === 'recover-nickname'
                    ? '找回昵称'
                    : '重置密码'}
          </Button>
        </form>

        {mode === 'login' ? (
          <div className="grid gap-3 border-t border-black/[0.07] pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => switchMode('register')}
              className="h-11 rounded-xl bg-white font-black"
            >
              还没有账号？注册
            </Button>
            <div className="flex justify-center gap-4 text-xs font-bold text-muted-foreground">
              <button type="button" onClick={() => switchMode('recover-nickname')} className="hover:text-foreground">
                忘记昵称
              </button>
              <button type="button" onClick={() => switchMode('reset-password')} className="hover:text-foreground">
                忘记密码
              </button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
