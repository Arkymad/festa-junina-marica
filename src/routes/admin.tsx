import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";


// ─── Types ──────────────────────────────────────────────────────────────────
type EventConfig = {
  event_date: string | null;
  event_time: string | null;
  event_location: string | null;
  sweet_dishes: string[];
  savory_dishes: string[];
};

type Confirmation = {
  id: string;
  name: string;
  sweet_dish: string;
  savory_dish: string;
  created_at: string;
};

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

// ─── Admin secret ────────────────────────────────────────────────────────────
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET as string;
const SESSION_KEY = "arraia_admin_auth";

// ─── Main component ──────────────────────────────────────────────────────────
function AdminPage() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "true"
  );

  if (!authed) {
    return <LoginScreen onSuccess={() => { sessionStorage.setItem(SESSION_KEY, "true"); setAuthed(true); }} />;
  }

  return <AdminDashboard onLogout={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); }} />;
}

// ─── Login Screen ────────────────────────────────────────────────────────────
function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [shake, setShake] = useState(false);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_SECRET) {
      onSuccess();
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      toast.error("Senha errada, cumpadi! 🤠");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Toaster richColors position="top-center" />
      <div className="bandeirinhas fixed top-0 h-5 w-full z-10" aria-hidden />

      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <p className="text-4xl">🤠</p>
          <h1 className="mt-2 text-4xl text-primary">Área do Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Arraiá da Galera — painel de controle
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className={`rounded-2xl border-2 border-dashed border-primary/40 bg-card p-8 shadow-lg transition-transform ${shake ? "animate-[shake_0.4s_ease]" : ""}`}
          style={shake ? { animation: "shake 0.4s ease" } : {}}
        >
          <label className="block">
            <span className="text-sm font-semibold">Senha do administrador</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              autoFocus
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-base font-bold text-primary-foreground shadow hover:bg-primary/90"
          >
            Entrar 🎪
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [saving, setSaving] = useState(false);

  // Local editable state
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [sweetDishes, setSweetDishes] = useState<string[]>([]);
  const [savoryDishes, setSavoryDishes] = useState<string[]>([]);

  const loadConfig = useCallback(async () => {
    const { data } = await supabase
      .from("event_config")
      .select("*")
      .single();
    if (data) {
      const cfg = data as EventConfig;
      setConfig(cfg);
      setEventDate(cfg.event_date ?? "");
      setEventTime(cfg.event_time ?? "");
      setEventLocation(cfg.event_location ?? "");
      setSweetDishes(cfg.sweet_dishes ?? []);
      setSavoryDishes(cfg.savory_dishes ?? []);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    supabase
      .from("confirmations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setConfirmations((data as Confirmation[]) ?? []));
  }, [loadConfig]);

  async function saveConfig() {
    setSaving(true);
    const { error } = await supabase
      .from("event_config")
      .update({
        event_date: eventDate || null,
        event_time: eventTime || null,
        event_location: eventLocation || null,
        sweet_dishes: sweetDishes,
        savory_dishes: savoryDishes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configurações salvas! 🎉");
    }
  }

  async function removeConfirmation(id: string, name: string) {
    if (!confirm(`Remover "${name}" da lista?`)) return;
    const { error } = await supabase.from("confirmations").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover.");
    } else {
      setConfirmations((prev) => prev.filter((c) => c.id !== id));
      toast.success(`${name} removido da lista.`);
    }
  }

  function addDish(dish: string, type: "sweet" | "savory") {
    const trimmed = dish.trim();
    if (!trimmed) return;
    const setter = type === "sweet" ? setSweetDishes : setSavoryDishes;
    const current = type === "sweet" ? sweetDishes : savoryDishes;
    if (current.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" já está na lista.`);
      return;
    }
    setter([...current, trimmed]);
  }

  function removeDish(dish: string, type: "sweet" | "savory") {
    const taken = confirmations.some(
      (c) => (type === "sweet" ? c.sweet_dish : c.savory_dish) === dish,
    );
    if (taken) {
      toast.error(`"${dish}" já foi escolhido por alguém. Remova a pessoa primeiro.`);
      return;
    }
    const setter = type === "sweet" ? setSweetDishes : setSavoryDishes;
    const current = type === "sweet" ? sweetDishes : savoryDishes;
    setter(current.filter((d) => d !== dish));
  }


  // Format date for display
  function fmtDate(d: string) {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }

  return (
    <div className="min-h-screen pb-20">
      <Toaster richColors position="top-center" />

      {/* Top bar */}
      <div className="bandeirinhas h-5 w-full" aria-hidden />
      <header className="sticky top-0 z-10 border-b border-border/60 bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div>
            <h1 className="text-2xl text-primary leading-tight">Painel Admin</h1>
            <p className="text-xs text-muted-foreground">Arraiá da Galera 🤠</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-8 space-y-6">

        {/* ── Info Card ── */}
        <section className="rounded-2xl border-2 border-dashed border-primary/40 bg-card p-6 shadow-sm">
          <h2 className="text-2xl text-primary mb-4">📅 Informações da Festa</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold">Data</span>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Horário</span>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Local</span>
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Ex: Rua das Flores, 42 – Maricá"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </label>
          </div>

          {/* Preview */}
          {(eventDate || eventTime || eventLocation) && (
            <div className="mt-4 rounded-xl bg-secondary/60 px-4 py-3 text-sm text-foreground/80 flex flex-wrap gap-4">
              {eventDate && <span>📅 {fmtDate(eventDate)}</span>}
              {eventTime && <span>🕐 {eventTime}</span>}
              {eventLocation && <span>📍 {eventLocation}</span>}
            </div>
          )}
        </section>

        {/* ── Dishes ── */}
        <div className="grid gap-6 md:grid-cols-2">
          <DishCard
            title="Pratos Doces 🍮"
            dishes={ALL_SWEET}
            enabled={sweetEnabled}
            onToggle={(d) => toggleDish(d, "sweet")}
          />
          <DishCard
            title="Pratos Salgados 🌭"
            dishes={ALL_SAVORY}
            enabled={savoryEnabled}
            onToggle={(d) => toggleDish(d, "savory")}
          />
        </div>

        {/* ── Save button ── */}
        <button
          onClick={saveConfig}
          disabled={saving}
          className="w-full rounded-xl bg-primary px-4 py-4 text-lg font-bold text-primary-foreground shadow-md hover:bg-primary/90 disabled:opacity-60 transition-all"
        >
          {saving ? "Salvando…" : "💾 Salvar Configurações"}
        </button>

        {/* ── Confirmations ── */}
        <section className="rounded-2xl border-2 border-dashed border-accent/50 bg-card p-6 shadow-sm">
          <h2 className="text-2xl text-primary mb-1">
            👥 Confirmados{" "}
            <span className="text-base text-muted-foreground">({confirmations.length})</span>
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Clique em ✕ para remover alguém da lista.
          </p>

          {confirmations.length === 0 ? (
            <p className="text-muted-foreground text-sm">Ninguém confirmou ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {confirmations.map((c) => (
                <li key={c.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold leading-tight">{c.name}</p>
                    <p className="text-sm text-foreground/70">
                      🍮 {c.sweet_dish} · 🌭 {c.savory_dish}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <button
                    onClick={() => removeConfirmation(c.id, c.name)}
                    className="mt-1 rounded-full w-7 h-7 flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                    title="Remover"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <div className="bandeirinhas h-5 w-full mt-10" aria-hidden />
    </div>
  );
}

// ─── Dish Card ───────────────────────────────────────────────────────────────
function DishCard({
  title,
  dishes,
  enabled,
  onToggle,
}: {
  title: string;
  dishes: string[];
  enabled: Set<string>;
  onToggle: (dish: string) => void;
}) {
  const enabledCount = dishes.filter((d) => enabled.has(d)).length;

  return (
    <section className="rounded-2xl border-2 border-dashed border-primary/30 bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl text-primary">{title}</h2>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
          {enabledCount}/{dishes.length} ativos
        </span>
      </div>
      <ul className="space-y-2">
        {dishes.map((dish) => {
          const on = enabled.has(dish);
          return (
            <li key={dish}>
              <button
                onClick={() => onToggle(dish)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all border ${
                  on
                    ? "bg-primary/10 border-primary/30 text-foreground"
                    : "bg-muted/50 border-border/50 text-muted-foreground line-through opacity-60"
                }`}
              >
                <span>{dish}</span>
                <span
                  className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    on ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      on ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
