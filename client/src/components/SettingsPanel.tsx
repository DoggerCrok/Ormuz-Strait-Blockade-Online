import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Key, Wifi, AlertTriangle } from "lucide-react";
import type { SafeUser } from "@shared/schema";
import AuthPanel from "@/components/AuthPanel";

interface Props {
  currentSource: string;
  onClose: () => void;
  currentUser: SafeUser | null;
  authRequired: boolean;
  onAuthChange?: (user: SafeUser | null) => void;
}

export default function SettingsPanel({ currentSource, onClose, currentUser, authRequired, onAuthChange }: Props) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [source, setSource] = useState(currentSource);
  const [saving, setSaving] = useState(false);
  const canManageSettings = currentUser?.role === "admin" || currentUser?.plan === "pro" || currentUser?.plan === "enterprise";

  const saveApiKey = async () => {
    setSaving(true);
    try {
      const res = await apiRequest("POST", "/api/settings/apikey", { key: apiKey });
      const data = await res.json();
      toast({ title: "Ключ сохранён", description: data.message });
      setApiKey("");
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const clearApiKey = async () => {
    setSaving(true);
    try {
      await apiRequest("POST", "/api/settings/apikey", { key: "" });
      toast({ title: "Ключ очищен", description: "Переключено на демо-режим" });
      setApiKey("");
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveSource = async (val: string) => {
    setSource(val);
    try {
      await apiRequest("POST", "/api/settings/source", { source: val });
      toast({ title: "Источник изменён", description: `Источник данных: ${val}` });
    } catch (e: any) {
      toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 text-sm">
      <AuthPanel currentUser={currentUser} authRequired={authRequired} onAuthChange={onAuthChange} />

      {/* Source selector */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">
          Источник данных
        </Label>
        <RadioGroup value={source} onValueChange={saveSource} className="gap-3" disabled={!canManageSettings}>
          {[
            { val: "auto", label: "Авто", desc: "AISStream если есть ключ, иначе Демо" },
            { val: "aisstream", label: "AISStream", desc: "Только реальный поток AIS" },
            { val: "demo", label: "Демо", desc: "Синтетические данные (Ормузский пролив)" },
          ].map(({ val, label, desc }) => (
            <div key={val} className="flex items-start gap-2.5">
              <RadioGroupItem value={val} id={`src-${val}`} className="mt-0.5" data-testid={`radio-source-${val}`} />
              <Label htmlFor={`src-${val}`} className="cursor-pointer">
                <span className="font-medium text-sm">{label}</span>
                <p className="text-xs text-muted-foreground font-normal">{desc}</p>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* API key */}
      <div>
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block flex items-center gap-1.5">
          <Key className="h-3 w-3" /> AISStream API Key
        </Label>
        <div className="relative">
          <Input
            type={showKey ? "text" : "password"}
            placeholder="Введите ключ AISStream..."
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="pr-10 text-xs h-8 font-mono"
            data-testid="input-api-key"
            onKeyDown={e => e.key === "Enter" && saveApiKey()}
          />
          <button
            type="button"
            onClick={() => setShowKey(s => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-toggle-key-visibility"
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={saveApiKey}
            disabled={!apiKey.trim() || saving || !canManageSettings}
            data-testid="button-save-api-key"
          >
            <Wifi className="h-3 w-3 mr-1" />
            Подключиться
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={clearApiKey}
            disabled={saving || !canManageSettings}
            data-testid="button-clear-api-key"
          >
            Очистить
          </Button>
        </div>

        {!canManageSettings && (
          <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-md flex gap-2" data-testid="notice-plan-required">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-snug">
              Изменение источника и серверного AIS-ключа доступно только для тарифов Pro, Enterprise или администратора.
            </p>
          </div>
        )}

        <div className="mt-3 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-md flex gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-snug">
            Для production лучше задавать ключ через переменную окружения сервера. Панель ниже подходит для временной ручной смены ключа. Получить ключ: <a href="https://aisstream.io" target="_blank" rel="noopener noreferrer" className="text-primary underline">aisstream.io</a>
          </p>
        </div>
      </div>

      {/* Zone info */}
      <div className="text-xs text-muted-foreground border-t border-border pt-3 space-y-1">
        <p className="font-medium text-foreground">Зона мониторинга</p>
        <p>Ормузский пролив и подходы</p>
        <p className="font-mono">54.5°E – 60.0°E, 22.5°N – 27.5°N</p>
        <p className="font-mono mt-1">Линия пересечения: 56.5°E (25.8°–27.0°N)</p>
      </div>
    </div>
  );
}
