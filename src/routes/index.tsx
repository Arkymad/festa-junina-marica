import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/festa-hero.jpg";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───────────────────────────────────────────────────────────────────
type Confirmation = {
  id: string;
  name: string;
  sweet_dish: string;
  savory_dish: string;
  created_at: string;
};

type EventConfig = {
  event_date: string | null;
  event_time: string | null;
  event_location: string | null;
  sweet_dishes: string[];
  savory_dishes: string[];
};

export const Route = createFileRoute("/")({
  component: Index,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  // date comes as "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-");
  const months = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${Number(d)} de ${months[Number(m) - 1]} de ${y}`;
}

function formatTime(timeStr: string) {
  // time comes as "HH:MM" or "HH:MM:SS"
  return timeStr.slice(0, 5) + "h";
}

// ─── Component ───────────────────────────────────────────────────────────────
function Index() {
  const [list, setList] = useState<Confirmation[]>([]);
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [name, setName] = useState("");
  const [sweetDish, setSweetDish] = useState("");
  const [savoryDish, setSavoryDish] = useState("");
  const [loading, setLoading] = useState(false);

  // Load event config + confirmations
  useEffect(() => {
    // Event config
    supabase
      .from("event_config")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) setConfig(data as EventConfig);
      });

    // Confirmations
    supabase
      .from("confirmations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setList((data as Confirmation[]) ?? []));

    // Real-time new confirmations
    const channel = supabase
      .channel("confirmations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "confirmations" },
        (payload) => {
          setList((prev) => [payload.new as Confirmation, ...prev]);
        },
      )
      .subscribe();

    // Real-time config updates
    const configChannel = supabase
      .channel("event_config")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "event_config" },
        (payload) => {
          setConfig(payload.new as EventConfig);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(configChannel);
    };
  }, []);

  const sweetTaken = useMemo(() => new Set(list.map((c) => c.sweet_dish)), [list]);
  const savoryTaken = useMemo(() => new Set(list.map((c) => c.savory_dish)), [list]);

  // Available dishes come from config (fallback to empty while loading)
  const sweetDishes = config?.sweet_dishes ?? [];
  const savoryDishes = config?.savory_dishes ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Coloca o nome aí, sô!");
      return;
    }
    if (trimmed.length > 80) {
      toast.error("Nome muito grande — abrevia aí.");
      return;
    }
    if (!sweetDish) {
      toast.error("Escolhe um prato doce!");
      return;
    }
    if (!savoryDish) {
      toast.error("Escolhe um prato salgado!");
      return;
    }
    if (sweetTaken.has(sweetDish)) {
      toast.error(`Alguém já escolheu "${sweetDish}". Escolhe outro doce!`);
      return;
    }
    if (savoryTaken.has(savoryDish)) {
      toast.error(`Alguém já escolheu "${savoryDish}". Escolhe outro salgado!`);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("confirmations")
      .insert({ name: trimmed, sweet_dish: sweetDish, savory_dish: savoryDish })
      .select()
      .single();
    setLoading(false);

    if (error || !data) {
      toast.error("Não foi possível confirmar. Tenta de novo.");
      return;
    }

    toast.success(`Confirmado! ${trimmed} vai trazer ${sweetDish} e ${savoryDish}. 🎉`);
    setName("");
    setSweetDish("");
    setSavoryDish("");
  }

  const hasEventInfo = config?.event_date || config?.event_time || config?.event_location;

  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-center" />

      {/* Bandeirinhas */}
      <div className="bandeirinhas h-5 w-full" aria-hidden />

      {/* Hero */}
      <header className="relative overflow-hidden">
        <img
          src={heroImg}
          alt="Bandeirinhas e fogueira de festa junina"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="relative mx-auto max-w-4xl px-6 py-14 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            🌽 Arraiá da Galera 🔥
          </p>
          <h1 className="mt-4 text-5xl md:text-7xl font-bold text-primary drop-shadow-sm">
            Vem pro forró!
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base md:text-lg text-foreground/80">
            Cada um (ou casal) leva <strong>um prato doce</strong> e <strong>um salgado</strong>.
            Confirma sua presença e escolha o que vai trazer.
          </p>

          {/* Event info pill */}
          {hasEventInfo && (
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-2xl border-2 border-dashed border-primary/50 bg-card/80 backdrop-blur px-6 py-3 text-sm font-semibold text-foreground shadow">
              {config?.event_date && (
                <span className="flex items-center gap-1.5">
                  📅 {formatDate(config.event_date)}
                </span>
              )}
              {config?.event_time && (
                <span className="flex items-center gap-1.5">
                  🕐 {formatTime(config.event_time)}
                </span>
              )}
              {config?.event_location && (
                <span className="flex items-center gap-1.5">
                  📍 {config.event_location}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 pb-20 md:grid-cols-2">
        {/* Form */}
        <section className="rounded-2xl border-2 border-dashed border-primary/40 bg-card p-6 shadow-sm">
          <h2 className="text-3xl text-primary">Confirma aí, cumpadi!</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold">Seu nome (ou do casal)</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Ex: Maria e João"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>

            <div className="space-y-1">
              <span className="text-sm font-semibold">Prato doce 🍮</span>
              <Select value={sweetDish} onValueChange={setSweetDish}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={sweetDishes.length === 0 ? "Carregando…" : "Escolha um doce"} />
                </SelectTrigger>
                <SelectContent>
                  {sweetDishes.map((dish) => {
                    const taken = sweetTaken.has(dish);
                    return (
                      <SelectItem
                        key={dish}
                        value={dish}
                        disabled={taken}
                        className={taken ? "opacity-40 line-through" : ""}
                      >
                        {dish} {taken ? "(já escolhido)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <span className="text-sm font-semibold">Prato salgado 🌭</span>
              <Select value={savoryDish} onValueChange={setSavoryDish}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={savoryDishes.length === 0 ? "Carregando…" : "Escolha um salgado"} />
                </SelectTrigger>
                <SelectContent>
                  {savoryDishes.map((dish) => {
                    const taken = savoryTaken.has(dish);
                    return (
                      <SelectItem
                        key={dish}
                        value={dish}
                        disabled={taken}
                        className={taken ? "opacity-40 line-through" : ""}
                      >
                        {dish} {taken ? "(já escolhido)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-3 text-base font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Confirmando…" : "Confirmar presença 🎉"}
            </button>
          </form>
        </section>

        {/* List */}
        <section className="rounded-2xl border-2 border-dashed border-accent/50 bg-card p-6 shadow-sm">
          <h2 className="text-3xl text-primary">
            Quem já confirmou <span className="text-base text-muted-foreground">({list.length})</span>
          </h2>
          {list.length === 0 ? (
            <p className="mt-4 text-muted-foreground">Ninguém confirmou ainda. Seja o primeiro!</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {list.map((c) => (
                <li key={c.id} className="py-3">
                  <p className="font-bold">{c.name}</p>
                  <p className="text-sm text-foreground/80">
                    🍮 {c.sweet_dish} · 🌭 {c.savory_dish}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <div className="bandeirinhas h-5 w-full" aria-hidden />
      <footer className="py-6 text-center text-sm text-muted-foreground">
        Feito com fogueira, quentão e muito amor ❤️
      </footer>
    </div>
  );
}
