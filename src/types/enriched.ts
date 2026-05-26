import type { Ausgabe, Budgetposten } from './app';

export type EnrichedBudgetposten = Budgetposten & {
  reiseName: string;
  kategorieName: string;
};

export type EnrichedAusgabe = Ausgabe & {
  ausgabe_kategorieName: string;
  ausgabe_reiseName: string;
};
