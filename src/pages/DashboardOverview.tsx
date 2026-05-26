import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBudgetposten, enrichAusgabe } from '@/lib/enrich';
import type { EnrichedBudgetposten, EnrichedAusgabe } from '@/types/enriched';
import type { Reise } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconMapPin, IconCalendar,
  IconUsers, IconWallet, IconChevronRight, IconReceipt,
  IconCoin, IconTrendingUp, IconArrowRight,
} from '@tabler/icons-react';
import { ReiseDialog } from '@/components/dialogs/ReiseDialog';
import { BudgetpostenDialog } from '@/components/dialogs/BudgetpostenDialog';
import { AusgabeDialog } from '@/components/dialogs/AusgabeDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const APPGROUP_ID = '6a156c8d5031707b206153c1';
const REPAIR_ENDPOINT = '/claude/build/repair';

const CATEGORY_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'
];

export default function DashboardOverview() {
  const {
    reise, kategorie, budgetposten, ausgabe,
    reiseMap, kategorieMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBudgetposten = enrichBudgetposten(budgetposten, { reiseMap, kategorieMap });
  const enrichedAusgabe = enrichAusgabe(ausgabe, { kategorieMap, reiseMap });

  // State — ALL hooks before early returns!
  const [selectedReiseId, setSelectedReiseId] = useState<string | null>(null);
  const [reiseDialogOpen, setReiseDialogOpen] = useState(false);
  const [editReise, setEditReise] = useState<Reise | null>(null);
  const [deleteReise, setDeleteReise] = useState<Reise | null>(null);
  const [budgetpostenDialogOpen, setBudgetpostenDialogOpen] = useState(false);
  const [editBudgetposten, setEditBudgetposten] = useState<EnrichedBudgetposten | null>(null);
  const [deleteBudgetposten, setDeleteBudgetposten] = useState<EnrichedBudgetposten | null>(null);
  const [ausgabeDialogOpen, setAusgabeDialogOpen] = useState(false);
  const [editAusgabe, setEditAusgabe] = useState<EnrichedAusgabe | null>(null);
  const [deleteAusgabe, setDeleteAusgabe] = useState<EnrichedAusgabe | null>(null);

  // Derived data
  const selectedReise = useMemo(
    () => selectedReiseId ? reiseMap.get(selectedReiseId) ?? null : null,
    [selectedReiseId, reiseMap]
  );

  const reiseWithStats = useMemo(() => {
    return reise.map(r => {
      const posten = enrichedBudgetposten.filter(b => extractRecordId(b.fields.reise) === r.record_id);
      const ausgaben = enrichedAusgabe.filter(a => extractRecordId(a.fields.ausgabe_reise) === r.record_id);
      const geplant = posten.reduce((sum, b) => sum + (b.fields.geplanter_betrag ?? 0), 0);
      const ausgegeben = ausgaben.reduce((sum, a) => sum + (a.fields.ausgabe_betrag ?? 0), 0);
      const budget = r.fields.gesamtbudget ?? 0;
      const progress = budget > 0 ? Math.min(100, (ausgegeben / budget) * 100) : 0;
      return { ...r, geplant, ausgegeben, budget, progress, postenCount: posten.length, ausgabenCount: ausgaben.length };
    });
  }, [reise, enrichedBudgetposten, enrichedAusgabe]);

  const selectedBudgetposten = useMemo(
    () => enrichedBudgetposten.filter(b => extractRecordId(b.fields.reise) === selectedReiseId),
    [enrichedBudgetposten, selectedReiseId]
  );

  const selectedAusgabe = useMemo(
    () => enrichedAusgabe.filter(a => extractRecordId(a.fields.ausgabe_reise) === selectedReiseId),
    [enrichedAusgabe, selectedReiseId]
  );

  const totalBudget = useMemo(() => reise.reduce((s, r) => s + (r.fields.gesamtbudget ?? 0), 0), [reise]);
  const totalAusgegeben = useMemo(() => ausgabe.reduce((s, a) => s + (a.fields.ausgabe_betrag ?? 0), 0), [ausgabe]);

  // Category breakdown for pie chart
  const categoryBreakdown = useMemo(() => {
    const ausg = selectedReiseId ? selectedAusgabe : enrichedAusgabe;
    const map = new Map<string, { name: string; value: number }>();
    ausg.forEach(a => {
      const name = a.ausgabe_kategorieName || 'Sonstiges';
      const existing = map.get(name);
      if (existing) existing.value += a.fields.ausgabe_betrag ?? 0;
      else map.set(name, { name, value: a.fields.ausgabe_betrag ?? 0 });
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [selectedReiseId, selectedAusgabe, enrichedAusgabe]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const currentReiseStats = selectedReiseId
    ? reiseWithStats.find(r => r.record_id === selectedReiseId)
    : null;

  const handleDeleteReise = async () => {
    if (!deleteReise) return;
    await LivingAppsService.deleteReiseEntry(deleteReise.record_id);
    if (selectedReiseId === deleteReise.record_id) setSelectedReiseId(null);
    setDeleteReise(null);
    fetchAll();
  };

  const handleDeleteBudgetposten = async () => {
    if (!deleteBudgetposten) return;
    await LivingAppsService.deleteBudgetpostenEntry(deleteBudgetposten.record_id);
    setDeleteBudgetposten(null);
    fetchAll();
  };

  const handleDeleteAusgabe = async () => {
    if (!deleteAusgabe) return;
    await LivingAppsService.deleteAusgabeEntry(deleteAusgabe.record_id);
    setDeleteAusgabe(null);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Workflow Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="#/intents/reiseplanung" className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 min-w-0">
          <IconWallet size={24} className="text-primary shrink-0" stroke={1.5} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground truncate">Reise planen</p>
            <p className="text-xs text-muted-foreground line-clamp-2">Budgetposten für eine Reise anlegen und Budget verwalten</p>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" stroke={1.5} />
        </a>
        <a href="#/intents/ausgaben-erfassung" className="bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4 min-w-0">
          <IconReceipt size={24} className="text-primary shrink-0" stroke={1.5} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-foreground truncate">Ausgaben erfassen</p>
            <p className="text-xs text-muted-foreground line-clamp-2">Ausgaben für eine Reise schnell erfassen und auswerten</p>
          </div>
          <IconChevronRight size={18} className="text-muted-foreground shrink-0" stroke={1.5} />
        </a>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Reisen"
          value={String(reise.length)}
          description="Geplant"
          icon={<IconMapPin size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Gesamtbudget"
          value={totalBudget > 0 ? formatCurrency(totalBudget) : '—'}
          description="Alle Reisen"
          icon={<IconWallet size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ausgegeben"
          value={totalAusgegeben > 0 ? formatCurrency(totalAusgegeben) : '—'}
          description="Alle Reisen"
          icon={<IconCoin size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Ausgaben"
          value={String(ausgabe.length)}
          description="Einträge gesamt"
          icon={<IconReceipt size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Main workspace: Trip list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Reise list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Meine Reisen</h2>
            <Button size="sm" onClick={() => { setEditReise(null); setReiseDialogOpen(true); }}>
              <IconPlus size={14} className="shrink-0" />
              <span className="hidden sm:inline ml-1">Neue Reise</span>
            </Button>
          </div>

          {reise.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-border gap-3">
              <IconMapPin size={40} className="text-muted-foreground" stroke={1.5} />
              <div className="text-center">
                <p className="font-medium text-foreground text-sm">Noch keine Reise</p>
                <p className="text-xs text-muted-foreground mt-1">Erstelle deine erste Reise</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setEditReise(null); setReiseDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1" /> Reise hinzufügen
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {reiseWithStats.map(r => {
                const isSelected = r.record_id === selectedReiseId;
                const pct = r.budget > 0 ? Math.min(100, (r.ausgegeben / r.budget) * 100) : 0;
                const isOver = r.ausgegeben > r.budget && r.budget > 0;
                return (
                  <div
                    key={r.record_id}
                    onClick={() => setSelectedReiseId(isSelected ? null : r.record_id)}
                    className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-semibold text-sm truncate">{r.fields.reiseziel || 'Unbekanntes Ziel'}</p>
                          {isSelected && <IconChevronRight size={14} className="shrink-0 text-primary" />}
                        </div>
                        {r.fields.reisebeginn && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <IconCalendar size={11} className="shrink-0" />
                            {formatDate(r.fields.reisebeginn)}
                            {r.fields.reiseende && <><IconArrowRight size={10} />{formatDate(r.fields.reiseende)}</>}
                          </p>
                        )}
                        {r.fields.anzahl_reisende && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <IconUsers size={11} className="shrink-0" />
                            {r.fields.anzahl_reisende} Reisende
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); setEditReise(r); setReiseDialogOpen(true); }}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                          title="Bearbeiten"
                        >
                          <IconPencil size={13} className="text-muted-foreground" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteReise(r); }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                          title="Löschen"
                        >
                          <IconTrash size={13} className="text-destructive" />
                        </button>
                      </div>
                    </div>

                    {r.budget > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className={isOver ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                            {formatCurrency(r.ausgegeben)} ausgegeben
                          </span>
                          <span className="text-muted-foreground">{formatCurrency(r.budget)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isOver ? 'bg-destructive' : 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{r.postenCount} Budgetposten</span>
                      <span>{r.ausgabenCount} Ausgaben</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Detail view */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedReise ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-2xl border-2 border-dashed border-border gap-3">
              <IconTrendingUp size={40} className="text-muted-foreground" stroke={1.5} />
              <div className="text-center">
                <p className="font-medium text-foreground text-sm">Reise auswählen</p>
                <p className="text-xs text-muted-foreground mt-1">Klicke auf eine Reise, um Details zu sehen</p>
              </div>
            </div>
          ) : (
            <>
              {/* Trip header */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg">{selectedReise.fields.reiseziel || 'Reise'}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      {selectedReise.fields.reisebeginn && (
                        <span className="flex items-center gap-1">
                          <IconCalendar size={13} className="shrink-0" />
                          {formatDate(selectedReise.fields.reisebeginn)}
                          {selectedReise.fields.reiseende && <> – {formatDate(selectedReise.fields.reiseende)}</>}
                        </span>
                      )}
                      {selectedReise.fields.anzahl_reisende && (
                        <span className="flex items-center gap-1">
                          <IconUsers size={13} className="shrink-0" />
                          {selectedReise.fields.anzahl_reisende} Reisende
                        </span>
                      )}
                      {selectedReise.fields.waehrung && (
                        <span>{selectedReise.fields.waehrung.label}</span>
                      )}
                    </div>
                  </div>
                  {currentReiseStats && currentReiseStats.budget > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(currentReiseStats.ausgegeben)}</p>
                      <p className="text-xs text-muted-foreground">von {formatCurrency(currentReiseStats.budget)}</p>
                      <p className={`text-xs font-medium mt-0.5 ${currentReiseStats.ausgegeben > currentReiseStats.budget ? 'text-destructive' : 'text-green-600'}`}>
                        {currentReiseStats.ausgegeben > currentReiseStats.budget
                          ? `${formatCurrency(currentReiseStats.ausgegeben - currentReiseStats.budget)} überzogen`
                          : `${formatCurrency(currentReiseStats.budget - currentReiseStats.ausgegeben)} verbleibend`}
                      </p>
                    </div>
                  )}
                </div>
                {currentReiseStats && currentReiseStats.budget > 0 && (
                  <div className="mt-4">
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${currentReiseStats.ausgegeben > currentReiseStats.budget ? 'bg-destructive' : 'bg-primary'}`}
                        style={{ width: `${currentReiseStats.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{Math.round(currentReiseStats.progress)}% des Budgets genutzt</p>
                  </div>
                )}
                {selectedReise.fields.notizen && (
                  <p className="text-sm text-muted-foreground mt-3 italic">"{selectedReise.fields.notizen}"</p>
                )}
              </div>

              {/* Budget + Ausgaben side by side on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Budgetposten */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h4 className="font-semibold text-sm">Budgetposten</h4>
                    <Button size="sm" variant="outline" onClick={() => { setEditBudgetposten(null); setBudgetpostenDialogOpen(true); }}>
                      <IconPlus size={13} className="shrink-0" />
                      <span className="hidden sm:inline ml-1">Hinzufügen</span>
                    </Button>
                  </div>
                  <div className="divide-y divide-border max-h-72 overflow-y-auto">
                    {selectedBudgetposten.length === 0 ? (
                      <div className="flex flex-col items-center py-8 gap-2 text-center px-4">
                        <IconWallet size={28} className="text-muted-foreground" stroke={1.5} />
                        <p className="text-sm text-muted-foreground">Noch keine Budgetposten</p>
                      </div>
                    ) : (
                      selectedBudgetposten.map(bp => {
                        const prio = bp.fields.prioritaet?.key;
                        return (
                          <div key={bp.record_id} className="flex items-center gap-2 px-4 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{bp.kategorieName || 'Kategorie'}</p>
                              {bp.fields.budgetposten_notiz && (
                                <p className="text-xs text-muted-foreground truncate">{bp.fields.budgetposten_notiz}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {prio && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                                  prio === 'hoch' ? 'bg-red-100 text-red-700' :
                                  prio === 'mittel' ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {bp.fields.prioritaet?.label}
                                </span>
                              )}
                              <span className="text-sm font-semibold">{formatCurrency(bp.fields.geplanter_betrag)}</span>
                              <button onClick={() => { setEditBudgetposten(bp); setBudgetpostenDialogOpen(true); }} className="p-1 rounded hover:bg-accent transition-colors">
                                <IconPencil size={12} className="text-muted-foreground" />
                              </button>
                              <button onClick={() => setDeleteBudgetposten(bp)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                                <IconTrash size={12} className="text-destructive" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {selectedBudgetposten.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex justify-between text-sm">
                      <span className="text-muted-foreground">Gesamt geplant</span>
                      <span className="font-bold">{formatCurrency(selectedBudgetposten.reduce((s, b) => s + (b.fields.geplanter_betrag ?? 0), 0))}</span>
                    </div>
                  )}
                </div>

                {/* Ausgaben */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <h4 className="font-semibold text-sm">Ausgaben</h4>
                    <Button size="sm" variant="outline" onClick={() => { setEditAusgabe(null); setAusgabeDialogOpen(true); }}>
                      <IconPlus size={13} className="shrink-0" />
                      <span className="hidden sm:inline ml-1">Erfassen</span>
                    </Button>
                  </div>
                  <div className="divide-y divide-border max-h-72 overflow-y-auto">
                    {selectedAusgabe.length === 0 ? (
                      <div className="flex flex-col items-center py-8 gap-2 text-center px-4">
                        <IconReceipt size={28} className="text-muted-foreground" stroke={1.5} />
                        <p className="text-sm text-muted-foreground">Noch keine Ausgaben</p>
                      </div>
                    ) : (
                      selectedAusgabe
                        .sort((a, b) => (b.fields.ausgabe_datum ?? '').localeCompare(a.fields.ausgabe_datum ?? ''))
                        .map(a => (
                          <div key={a.record_id} className="flex items-center gap-2 px-4 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{a.fields.ausgabe_beschreibung || a.ausgabe_kategorieName || 'Ausgabe'}</p>
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                {a.fields.ausgabe_datum && <span>{formatDate(a.fields.ausgabe_datum)}</span>}
                                {a.ausgabe_kategorieName && <span>· {a.ausgabe_kategorieName}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-sm font-semibold">{formatCurrency(a.fields.ausgabe_betrag)}</span>
                              <button onClick={() => { setEditAusgabe(a); setAusgabeDialogOpen(true); }} className="p-1 rounded hover:bg-accent transition-colors">
                                <IconPencil size={12} className="text-muted-foreground" />
                              </button>
                              <button onClick={() => setDeleteAusgabe(a)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                                <IconTrash size={12} className="text-destructive" />
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                  {selectedAusgabe.length > 0 && (
                    <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex justify-between text-sm">
                      <span className="text-muted-foreground">Gesamt ausgegeben</span>
                      <span className="font-bold">{formatCurrency(selectedAusgabe.reduce((s, a) => s + (a.fields.ausgabe_betrag ?? 0), 0))}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Pie Chart */}
              {categoryBreakdown.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <h4 className="font-semibold text-sm mb-3">Ausgaben nach Kategorie</h4>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-full sm:w-48 h-40 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {categoryBreakdown.map((_, i) => (
                              <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => formatCurrency(v)}
                            contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="space-y-1.5">
                        {categoryBreakdown.map((cat, i) => {
                          const total = categoryBreakdown.reduce((s, c) => s + c.value, 0);
                          const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                          return (
                            <div key={cat.name} className="flex items-center gap-2 min-w-0">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                              <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{cat.name}</span>
                              <span className="text-xs font-medium shrink-0">{formatCurrency(cat.value)}</span>
                              <span className="text-xs text-muted-foreground shrink-0 w-8 text-right">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <ReiseDialog
        open={reiseDialogOpen}
        onClose={() => { setReiseDialogOpen(false); setEditReise(null); }}
        onSubmit={async (fields) => {
          if (editReise) {
            await LivingAppsService.updateReiseEntry(editReise.record_id, fields);
          } else {
            await LivingAppsService.createReiseEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editReise?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Reise']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Reise']}
      />

      <BudgetpostenDialog
        open={budgetpostenDialogOpen}
        onClose={() => { setBudgetpostenDialogOpen(false); setEditBudgetposten(null); }}
        onSubmit={async (fields) => {
          if (editBudgetposten) {
            await LivingAppsService.updateBudgetpostenEntry(editBudgetposten.record_id, fields);
          } else {
            await LivingAppsService.createBudgetpostenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editBudgetposten
          ? editBudgetposten.fields
          : selectedReiseId
            ? { reise: createRecordUrl(APP_IDS.REISE, selectedReiseId) }
            : undefined
        }
        reiseList={reise}
        kategorieList={kategorie}
        enablePhotoScan={AI_PHOTO_SCAN['Budgetposten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Budgetposten']}
      />

      <AusgabeDialog
        open={ausgabeDialogOpen}
        onClose={() => { setAusgabeDialogOpen(false); setEditAusgabe(null); }}
        onSubmit={async (fields) => {
          if (editAusgabe) {
            await LivingAppsService.updateAusgabeEntry(editAusgabe.record_id, fields);
          } else {
            await LivingAppsService.createAusgabeEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editAusgabe
          ? editAusgabe.fields
          : selectedReiseId
            ? { ausgabe_reise: createRecordUrl(APP_IDS.REISE, selectedReiseId) }
            : undefined
        }
        kategorieList={kategorie}
        reiseList={reise}
        enablePhotoScan={AI_PHOTO_SCAN['Ausgabe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Ausgabe']}
      />

      <ConfirmDialog
        open={!!deleteReise}
        title="Reise löschen"
        description={`"${deleteReise?.fields.reiseziel ?? 'Reise'}" wirklich löschen? Alle Budgetposten und Ausgaben bleiben erhalten.`}
        onConfirm={handleDeleteReise}
        onClose={() => setDeleteReise(null)}
      />

      <ConfirmDialog
        open={!!deleteBudgetposten}
        title="Budgetposten löschen"
        description="Diesen Budgetposten wirklich löschen?"
        onConfirm={handleDeleteBudgetposten}
        onClose={() => setDeleteBudgetposten(null)}
      />

      <ConfirmDialog
        open={!!deleteAusgabe}
        title="Ausgabe löschen"
        description="Diese Ausgabe wirklich löschen?"
        onConfirm={handleDeleteAusgabe}
        onClose={() => setDeleteAusgabe(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
