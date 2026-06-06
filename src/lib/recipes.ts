export const SWEET_RECIPES = [
  "Canjica",
  "Pé-de-moleque",
  "Paçoca",
  "Bolo de fubá",
  "Curau",
  "Arroz doce",
  "Cocada",
  "Pamonha doce",
  "Quentão (doce)",
  "Maçã do amor",
  "Brigadeiro de paçoca",
  "Bolo de milho",
] as const;

export const SAVORY_RECIPES = [
  "Pipoca",
  "Pamonha salgada",
  "Milho cozido",
  "Cachorro-quente",
  "Pastel de forno",
  "Caldo verde",
  "Cuscuz paulista",
  "Espetinho de carne",
  "Pão de queijo",
  "Empadinha de frango",
  "Polenta frita",
  "Linguiça na brasa",
] as const;

export function pickRandom<T>(list: readonly T[], exclude: Set<string> = new Set()): T {
  const available = list.filter((item) => !exclude.has(String(item)));
  const pool = available.length > 0 ? available : list;
  return pool[Math.floor(Math.random() * pool.length)];
}
