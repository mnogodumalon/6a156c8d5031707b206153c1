import type { EnrichedAusgabe, EnrichedBudgetposten } from '@/types/enriched';
import type { Ausgabe, Budgetposten, Kategorie, Reise } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BudgetpostenMaps {
  reiseMap: Map<string, Reise>;
  kategorieMap: Map<string, Kategorie>;
}

export function enrichBudgetposten(
  budgetposten: Budgetposten[],
  maps: BudgetpostenMaps
): EnrichedBudgetposten[] {
  return budgetposten.map(r => ({
    ...r,
    reiseName: resolveDisplay(r.fields.reise, maps.reiseMap, 'reiseziel'),
    kategorieName: resolveDisplay(r.fields.kategorie, maps.kategorieMap, 'kategoriename'),
  }));
}

interface AusgabeMaps {
  kategorieMap: Map<string, Kategorie>;
  reiseMap: Map<string, Reise>;
}

export function enrichAusgabe(
  ausgabe: Ausgabe[],
  maps: AusgabeMaps
): EnrichedAusgabe[] {
  return ausgabe.map(r => ({
    ...r,
    ausgabe_kategorieName: resolveDisplay(r.fields.ausgabe_kategorie, maps.kategorieMap, 'kategoriename'),
    ausgabe_reiseName: resolveDisplay(r.fields.ausgabe_reise, maps.reiseMap, 'reiseziel'),
  }));
}
