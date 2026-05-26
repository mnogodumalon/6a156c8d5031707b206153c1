import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Reise, Kategorie, Budgetposten, Ausgabe } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [reise, setReise] = useState<Reise[]>([]);
  const [kategorie, setKategorie] = useState<Kategorie[]>([]);
  const [budgetposten, setBudgetposten] = useState<Budgetposten[]>([]);
  const [ausgabe, setAusgabe] = useState<Ausgabe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [reiseData, kategorieData, budgetpostenData, ausgabeData] = await Promise.all([
        LivingAppsService.getReise(),
        LivingAppsService.getKategorie(),
        LivingAppsService.getBudgetposten(),
        LivingAppsService.getAusgabe(),
      ]);
      setReise(reiseData);
      setKategorie(kategorieData);
      setBudgetposten(budgetpostenData);
      setAusgabe(ausgabeData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [reiseData, kategorieData, budgetpostenData, ausgabeData] = await Promise.all([
          LivingAppsService.getReise(),
          LivingAppsService.getKategorie(),
          LivingAppsService.getBudgetposten(),
          LivingAppsService.getAusgabe(),
        ]);
        setReise(reiseData);
        setKategorie(kategorieData);
        setBudgetposten(budgetpostenData);
        setAusgabe(ausgabeData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const reiseMap = useMemo(() => {
    const m = new Map<string, Reise>();
    reise.forEach(r => m.set(r.record_id, r));
    return m;
  }, [reise]);

  const kategorieMap = useMemo(() => {
    const m = new Map<string, Kategorie>();
    kategorie.forEach(r => m.set(r.record_id, r));
    return m;
  }, [kategorie]);

  return { reise, setReise, kategorie, setKategorie, budgetposten, setBudgetposten, ausgabe, setAusgabe, loading, error, fetchAll, reiseMap, kategorieMap };
}