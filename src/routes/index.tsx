import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/festa-hero.jpg";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Types ───────────────────────────────────────────────────────────────────
type Confirmation = {
  id: string;
  name: string;
  sweet_dish: string | null;
  savory_dish: string | null;
  sweet_dishes: string[];
  savory_dishes: string[];
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
  const [y, m, d] = dateStr.split("-");
  const months = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];
  return `${Number(d)} de ${months[Number(m) - 1]} de ${y}`;
}

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5) + "h";
}

// Merge legacy single-dish columns with new arrays
function allSweet(c: Confirmation): string[] {
  const arr = c.sweet_dishes ?? [];
  return arr.length ? arr : c.sweet_dish ? [c.sweet_dish] : [];
}
function allSavory(c: Confirmation): string[] {
  const arr = c.savory_dishes ?? [];
  return arr.length ? arr : c.savory_dish ? [c.savory_dish] : [];
}

// ─── Component ───────────────────────────────────────────────────────────────
function Index() {
  const [list, setList] = useState<Confirmation[]>([]);
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [name, setName] = useState("");
  const [selectedSweets, setSelectedSweets] = useState<string[]>([]);
  const [selectedSavories, setSelectedSavories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("event_config")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setConfig(data as EventConfig);
      });

    supabase
      .from("confirmations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setList((data as Confirmation[]) ?? []));

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

  const sweetTaken = useMemo(
    () => new Set(list.flatMap(allSweet)),
    [list],
  );
  const savoryTaken = useMemo(
    () => new Set(list.flatMap(allSavory)),
    [list],
  );

  const sweetDishes = config?.sweet_dishes ?? [];
  const savoryDishes = config?.savory_dishes ?? [];

  function toggle(list: string[], setter: (v: string[]) => void, value: string) {
    if (list.includes(value)) setter(list.filter((v) => v !== value));
    else setter([...list, value]);
  }

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
    if (selectedSweets.length + selectedSavories.length < 2) {
      toast.error("Escolhe pelo menos 2 pratos (doces e/ou salgados)!");
      return;
    }
    const conflictSweet = selectedSweets.find((d) => sweetTaken.has(d));
    if (conflictSweet) {
      toast.error(`Alguém já escolheu "${conflictSweet}". Escolhe outro doce!`);
      return;
    }
    const conflictSavory = selectedSavories.find((d) => savoryTaken.has(d));
    if (conflictSavory) {
      toast.error(`Alguém já escolheu "${conflictSavory}". Escolhe outro salgado!`);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("confirmations")
      .insert({
        name: trimmed,
        sweet_dish: selectedSweets[0] ?? null,
        savory_dish: selectedSavories[0] ?? null,
        sweet_dishes: selectedSweets,
        savory_dishes: selectedSavories,
      })
      .select()
      .single();
    setLoading(false);

    if (error || !data) {
      toast.error("Não foi possível confirmar. Tenta de novo.");
      return;
    }

    toast.success(`Confirmado! ${trimmed} vai trazer ${selectedSweets.length + selectedSavories.length} pratos. 🎉`);
    setName("");
    setSelectedSweets([]);
    setSelectedSavories([]);
  }

  const hasEventInfo = config?.event_date || config?.event_time || config?.event_location;

  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-center" />

      <div className="bandeirinhas h-5 w-full" aria-hidden />

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
            Cada um (ou casal) leva <strong>pelo menos 2 pratos</strong> — doces, salgados ou um de cada — e <strong>sua própria bebida</strong>.
            Confirme sua presença e escolha o que vai trazer.
          </p>

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
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.event_location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary underline-offset-2 hover:underline"
                >
                  📍 {config.event_location}
                </a>
              )}
            </div>
          )}
        </div>

          {config?.event_location && (
            <div className="relative mx-auto max-w-2xl px-6 pb-8">
              <div className="overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 shadow">
                <iframe
                  title="Mapa do local da festa"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(config.event_location)}&output=embed`}
                  className="h-64 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </div>
          )}
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-6 pb-20 md:grid-cols-2">
        <section className="rounded-2xl border-2 border-dashed border-primary/40 bg-card p-6 shadow-sm">
          <h2 className="text-3xl text-primary">Confirma aí, cumpadi!</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
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

            <DishPicker
              label="Pratos doces 🍮"
              dishes={sweetDishes}
              taken={sweetTaken}
              selected={selectedSweets}
              onToggle={(d) => toggle(selectedSweets, setSelectedSweets, d)}
            />

            <DishPicker
              label="Pratos salgados 🌭"
              dishes={savoryDishes}
              taken={savoryTaken}
              selected={selectedSavories}
              onToggle={(d) => toggle(selectedSavories, setSelectedSavories, d)}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-3 text-base font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Confirmando…" : "Confirmar presença 🎉"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border-2 border-dashed border-accent/50 bg-card p-6 shadow-sm">
          <h2 className="text-3xl text-primary">
            Quem já confirmou <span className="text-base text-muted-foreground">({list.length})</span>
          </h2>
          {list.length === 0 ? (
            <p className="mt-4 text-muted-foreground">Ninguém confirmou ainda. Seja o primeiro!</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {list.map((c) => {
                const sweets = allSweet(c);
                const savories = allSavory(c);
                return (
                  <li key={c.id} className="py-3">
                    <p className="font-bold">{c.name}</p>
                    {sweets.length > 0 && (
                      <p className="text-sm text-foreground/80">🍮 {sweets.join(", ")}</p>
                    )}
                    {savories.length > 0 && (
                      <p className="text-sm text-foreground/80">🌭 {savories.join(", ")}</p>
                    )}
                  </li>
                );
              })}
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

function DishPicker({
  label,
  dishes,
  taken,
  selected,
  onToggle,
}: {
  label: string;
  dishes: string[];
  taken: Set<string>;
  selected: string[];
  onToggle: (dish: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">
          {selected.length} selecionado{selected.length === 1 ? "" : "s"}
        </span>
      </div>
      {dishes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-input bg-background p-2 max-h-56 overflow-y-auto">
          {dishes.map((dish) => {
            const isTaken = taken.has(dish);
            const isChecked = selected.includes(dish);
            return (
              <label
                key={dish}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                  isTaken
                    ? "opacity-40 line-through cursor-not-allowed"
                    : "hover:bg-muted cursor-pointer"
                }`}
              >
                <Checkbox
                  checked={isChecked}
                  disabled={isTaken}
                  onCheckedChange={() => !isTaken && onToggle(dish)}
                />
                <span>{dish}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
