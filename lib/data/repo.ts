// Repositório genérico. Os serviços só falam com esta interface; há duas
// implementações: memória (demonstração e testes) e Prisma (modo completo).
import type { Collection, DB, Settings } from "@/lib/domain/types";

export type Item<C extends Collection> = DB[C][number];

export interface Repo {
  all<C extends Collection>(c: C): Promise<Item<C>[]>;
  get<C extends Collection>(c: C, id: string): Promise<Item<C> | undefined>;
  insert<C extends Collection>(c: C, item: Item<C>): Promise<Item<C>>;
  update<C extends Collection>(c: C, id: string, patch: Partial<Item<C>>): Promise<Item<C>>;
  remove<C extends Collection>(c: C, id: string): Promise<void>;
  settings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>): Promise<Settings>;
}

/** Repositório em memória sobre um objecto DB. `onChange` permite persistir (localStorage). */
export function memoryRepo(db: DB, onChange?: (db: DB) => void): Repo {
  const key = (item: unknown) => (item as { id?: string; key?: string }).id ?? (item as { key?: string }).key;
  const list = <C extends Collection>(c: C) => db[c] as unknown as Item<C>[];
  const changed = () => onChange?.(db);
  const clone = <T,>(x: T): T => (x === undefined ? x : structuredClone(x));
  return {
    async all(c) {
      return clone(list(c));
    },
    async get(c, id) {
      return clone(list(c).find((x) => key(x) === id));
    },
    async insert(c, item) {
      list(c).push(clone(item));
      changed();
      return clone(item);
    },
    async update(c, id, patch) {
      const arr = list(c);
      const i = arr.findIndex((x) => key(x) === id);
      if (i < 0) throw new Error(`Não encontrado: ${String(c)}/${id}`);
      arr[i] = { ...arr[i], ...clone(patch) };
      changed();
      return clone(arr[i]);
    },
    async remove(c, id) {
      const arr = list(c);
      const i = arr.findIndex((x) => key(x) === id);
      if (i >= 0) arr.splice(i, 1);
      changed();
    },
    async settings() {
      return clone(db.settings);
    },
    async saveSettings(patch) {
      db.settings = { ...db.settings, ...clone(patch) };
      changed();
      return clone(db.settings);
    },
  };
}
