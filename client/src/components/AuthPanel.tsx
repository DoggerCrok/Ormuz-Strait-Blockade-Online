import { useMemo, useState } from "react";
import type { SafeUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getToken, setToken, clearToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Lock, LogIn, LogOut, UserPlus } from "lucide-react";

interface Props {
  currentUser: SafeUser | null;
  authRequired: boolean;
  onAuthChange?: (user: SafeUser | null) => void;
}

type Mode = "login" | "register";

export default function AuthPanel({ currentUser, authRequired, onAuthChange }: Props) {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const hasToken = useMemo(() => Boolean(getToken()), []);

  const submit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await apiRequest("POST", endpoint, {
        email: email.trim().toLowerCase(),
        password,
      });
      const data = await res.json();
      if (data.token) {
        setToken(String(data.token));
      }
      const user = (data.user ?? null) as SafeUser | null;
      onAuthChange?.(user);
      toast({
        title: mode === "login" ? "Вход выполнен" : "Регистрация завершена",
        description: user ? `${user.email} · тариф ${user.plan}` : "Токен сохранён",
      });
      setPassword("");
    } catch (e: any) {
      toast({ title: "Ошибка входа", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    onAuthChange?.(null);
    toast({ title: "Выход выполнен", description: "Токен очищен из клиента" });
  };

  return (
    <Card className="rounded-md shadow-none">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Доступ</CardTitle>
          </div>
          <Badge variant={authRequired ? "default" : "secondary"} data-testid="badge-auth-mode">
            {authRequired ? "Вход обязателен" : "Вход опционален"}
          </Badge>
        </div>
        <CardDescription className="text-xs leading-relaxed">
          JWT уже подключён. Этот блок нужен для проверки тарифов, лимитов и будущей монетизации потока.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        {currentUser ? (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-background/50 p-3 space-y-1" data-testid="panel-current-user">
              <p className="text-sm font-medium text-foreground">{currentUser.email}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span data-testid="text-user-role">Роль: {currentUser.role}</span>
                <span data-testid="text-user-plan">Тариф: {currentUser.plan}</span>
                <span data-testid="text-user-status">Статус: {currentUser.status}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={logout} data-testid="button-logout">
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Выйти
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "login" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setMode("login")}
                data-testid="button-mode-login"
              >
                <LogIn className="mr-1.5 h-3.5 w-3.5" />
                Вход
              </Button>
              <Button
                type="button"
                variant={mode === "register" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setMode("register")}
                data-testid="button-mode-register"
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Регистрация
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  data-testid="input-auth-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="auth-password">Пароль</Label>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Минимум один надёжный пароль"
                  data-testid="input-auth-password"
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={loading || !email.trim() || !password.trim()}
                onClick={submit}
                data-testid="button-auth-submit"
              >
                {mode === "login" ? "Войти" : "Создать аккаунт"}
              </Button>
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-1 text-[11px] leading-relaxed text-muted-foreground" data-testid="text-auth-hint">
          <p>Анонимный режим можно сохранить для чтения, пока REQUIRE_AUTH=false.</p>
          <p>Платные функции удобно закрывать по тарифу: запись настроек, число WebSocket-сессий, повышенные лимиты API.</p>
          <p>{hasToken ? "JWT уже присутствует в клиенте и будет отправляться в API и WebSocket." : "JWT пока отсутствует в клиенте."}</p>
        </div>
      </CardContent>
    </Card>
  );
}
