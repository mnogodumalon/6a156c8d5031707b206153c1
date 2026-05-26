import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { BudgetTracker } from '@/components/BudgetTracker';
import { StatusBadge } from '@/components/StatusBadge';
import { ReiseDialog } from '@/components/dialogs/ReiseDialog';
import { BudgetpostenDialog } from '@/components/dialogs/BudgetpostenDialog';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Reise, Budgetposten, Kategorie } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { IconPlane, IconPlus, IconCheck, IconMapPin, IconCalendar, IconUsers, IconCurrencyEuro } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd.MM.yyyy', { locale: de });
  } catch {
    return dateStr;
  }
}

function formatBetrag(amount: number | undefined, waehrung?: string): string {
  if (amount === undefined || amount === null) return '—';
  const currency = waehrung ?? 'EUR';
  const currencyMap: Record<string, string> = {
    eur: 'EUR',
    usd: 'USD',
    gbp: 'GBP',
    chf: 'CHF',
    jpy: 'JPY',
    sonstige: 'EUR',
  };
  const iso = currencyMap[currency.toLowerCase()] ?? 'EUR';
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: iso }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${iso}`;
  }
}

const PRIORITAET_ORDER: Record<string, number> = { hoch: 0, mittel: 1, niedrig: 2 };

export default function ReiseplanungPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { reise, kategorie, budgetposten, loading, error, fetchAll } = useDashboardData();

  // Step state — initialize from URL param (1-indexed)
  const [step, setStep] = useState<number>(() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    return urlStep >= 1 && urlStep <= 3 ? urlStep : 1;
  });

  // Selected reise id — initialize from URL param
  const [selectedReiseId, setSelectedReiseId] = useState<string | null>(
    () => searchParams.get('reiseId') ?? null
  );

  // Dialog state
  const [reiseDialogOpen, setReiseDialogOpen] = useState(false);
  const [budgetpostenDialogOpen, setBudgetpostenDialogOpen] = useState(false);

  // Sync step to URL params
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('step', String(step));
    if (selectedReiseId) {
      params.set('reiseId', selectedReiseId);
    } else {
      params.delete('reiseId');
    }
    setSearchParams(params, { replace: true });
  }, [step, selectedReiseId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive selected reise object
  const selectedReise: Reise | undefined = useMemo(
    () => reise.find(r => r.record_id === selectedReiseId),
    [reise, selectedReiseId]
  );

  // Filter budgetposten for selected reise
  const reiseBudgetposten: Budgetposten[] = useMemo(() => {
    if (!selectedReiseId) return [];
    return budgetposten.filter(bp => {
      const rid = extractRecordId(bp.fields.reise);
      return rid === selectedReiseId;
    });
  }, [budgetposten, selectedReiseId]);

  // Total geplanter_betrag
  const totalGeplant = useMemo(
    () => reiseBudgetposten.reduce((sum, bp) => sum + (bp.fields.geplanter_betrag ?? 0), 0),
    [reiseBudgetposten]
  );

  // Kategorie lookup helper
  const kategorieMap = useMemo(() => {
    const m = new Map<string, Kategorie>();
    kategorie.forEach(k => m.set(k.record_id, k));
    return m;
  }, [kategorie]);

  function getKategorieName(bp: Budgetposten): string {
    const id = extractRecordId(bp.fields.kategorie);
    if (!id) return '—';
    return kategorieMap.get(id)?.fields.kategoriename ?? '—';
  }

  // Step change handler
  function handleStepChange(newStep: number) {
    setStep(newStep);
  }

  // Select reise and advance to step 2
  function handleSelectReise(id: string) {
    setSelectedReiseId(id);
    setStep(2);
  }

  // After creating a new reise: refresh and auto-select the newest
  async function handleCreateReise(fields: Reise['fields']) {
    const result = await LivingAppsService.createReiseEntry(fields);
    await fetchAll();
    // Auto-select newly created record
    if (result && typeof result === 'object') {
      const entries = Object.entries(result as Record<string, unknown>);
      if (entries.length > 0) {
        const newId = entries[0][0];
        setSelectedReiseId(newId);
        setStep(2);
      }
    }
  }

  // After creating a new budgetposten: refresh
  async function handleCreateBudgetposten(fields: Budgetposten['fields']) {
    // Inject the selected reise as applookup URL if not set
    const enrichedFields = {
      ...fields,
      reise: fields.reise ?? (selectedReiseId ? createRecordUrl(APP_IDS.REISE, selectedReiseId) : undefined),
    };
    await LivingAppsService.createBudgetpostenEntry(enrichedFields);
    await fetchAll();
  }

  // Budgetposten grouped by prioritaet for summary step
  const budgetpostenByPrioritaet = useMemo(() => {
    const groups: Record<string, Budgetposten[]> = {};
    reiseBudgetposten.forEach(bp => {
      const key = bp.fields.prioritaet?.key ?? 'sonstige';
      if (!groups[key]) groups[key] = [];
      groups[key].push(bp);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      return (PRIORITAET_ORDER[a] ?? 99) - (PRIORITAET_ORDER[b] ?? 99);
    });
  }, [reiseBudgetposten]);

  const waehrungKey = selectedReise?.fields.waehrung?.key ?? 'eur';

  return (
    <IntentWizardShell
      title="Reiseplanung"
      subtitle="Plane dein Budget Schritt für Schritt"
      steps={[
        { label: 'Reise wählen' },
        { label: 'Budget planen' },
        { label: 'Zusammenfassung' },
      ]}
      currentStep={step}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1 — Reise auswählen */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Wähle eine bestehende Reise aus oder erstelle eine neue, um mit der Budgetplanung zu beginnen.
          </p>
          <EntitySelectStep
            items={reise.map(r => ({
              id: r.record_id,
              title: r.fields.reiseziel ?? 'Unbenannte Reise',
              subtitle: r.fields.reisebeginn || r.fields.reiseende
                ? `${formatDate(r.fields.reisebeginn)} – ${formatDate(r.fields.reiseende)}`
                : undefined,
              icon: <IconPlane size={20} className="text-primary" />,
              stats: [
                {
                  label: 'Budget',
                  value: r.fields.gesamtbudget !== undefined
                    ? formatBetrag(r.fields.gesamtbudget, r.fields.waehrung?.key)
                    : '—',
                },
                ...(r.fields.anzahl_reisende !== undefined
                  ? [{ label: 'Reisende', value: r.fields.anzahl_reisende }]
                  : []),
              ],
            }))}
            onSelect={handleSelectReise}
            searchPlaceholder="Reise suchen..."
            emptyIcon={<IconPlane size={40} />}
            emptyText="Noch keine Reisen vorhanden. Erstelle deine erste Reise!"
            createLabel="Neue Reise erstellen"
            onCreateNew={() => setReiseDialogOpen(true)}
            createDialog={
              <ReiseDialog
                open={reiseDialogOpen}
                onClose={() => setReiseDialogOpen(false)}
                onSubmit={handleCreateReise}
                enablePhotoScan={AI_PHOTO_SCAN['Reise']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Reise']}
              />
            }
          />
        </div>
      )}

      {/* Step 2 — Budgetposten planen */}
      {step === 2 && (
        <div className="space-y-4">
          {selectedReise && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <IconPlane size={16} className="text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">
                  {selectedReise.fields.reiseziel ?? 'Reise'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatDate(selectedReise.fields.reisebeginn)} – {formatDate(selectedReise.fields.reiseende)}
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0 underline underline-offset-2"
              >
                Ändern
              </button>
            </div>
          )}

          <BudgetTracker
            budget={selectedReise?.fields.gesamtbudget ?? 0}
            booked={totalGeplant}
            label="Geplantes Budget"
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Budgetposten
                {reiseBudgetposten.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({reiseBudgetposten.length})
                  </span>
                )}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBudgetpostenDialogOpen(true)}
                className="gap-1.5 shrink-0"
              >
                <IconPlus size={14} />
                Budgetposten hinzufügen
              </Button>
            </div>

            {reiseBudgetposten.length === 0 ? (
              <div className="text-center py-10 rounded-xl border border-dashed text-muted-foreground space-y-3">
                <IconCurrencyEuro size={36} className="mx-auto opacity-30" />
                <p className="text-sm">Noch keine Budgetposten vorhanden.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBudgetpostenDialogOpen(true)}
                  className="gap-1.5"
                >
                  <IconPlus size={14} />
                  Ersten Budgetposten hinzufügen
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {reiseBudgetposten.map(bp => (
                  <div
                    key={bp.record_id}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card overflow-hidden"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <IconCurrencyEuro size={16} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getKategorieName(bp)}</p>
                      {bp.fields.budgetposten_notiz && (
                        <p className="text-xs text-muted-foreground truncate">{bp.fields.budgetposten_notiz}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {bp.fields.prioritaet && (
                        <StatusBadge
                          statusKey={bp.fields.prioritaet.key}
                          label={bp.fields.prioritaet.label}
                        />
                      )}
                      <span className="text-sm font-semibold">
                        {formatBetrag(bp.fields.geplanter_betrag, waehrungKey)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <BudgetpostenDialog
            open={budgetpostenDialogOpen}
            onClose={() => setBudgetpostenDialogOpen(false)}
            onSubmit={handleCreateBudgetposten}
            defaultValues={
              selectedReiseId
                ? { reise: createRecordUrl(APP_IDS.REISE, selectedReiseId) }
                : undefined
            }
            reiseList={reise}
            kategorieList={kategorie}
            enablePhotoScan={AI_PHOTO_SCAN['Budgetposten']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Budgetposten']}
          />

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Zurück
            </Button>
            <Button onClick={() => setStep(3)}>
              Weiter zur Zusammenfassung
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Zusammenfassung */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="p-4 border-b bg-secondary/50">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <IconPlane size={16} className="text-primary" />
                Reisedetails
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <IconMapPin size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Reiseziel</p>
                  <p className="text-sm font-medium">{selectedReise?.fields.reiseziel ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IconCalendar size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Zeitraum</p>
                  <p className="text-sm font-medium">
                    {formatDate(selectedReise?.fields.reisebeginn)} – {formatDate(selectedReise?.fields.reiseende)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IconUsers size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Reisende</p>
                  <p className="text-sm font-medium">
                    {selectedReise?.fields.anzahl_reisende ?? '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <IconCurrencyEuro size={15} className="text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Gesamtbudget</p>
                  <p className="text-sm font-medium">
                    {formatBetrag(selectedReise?.fields.gesamtbudget, waehrungKey)}
                    {selectedReise?.fields.waehrung && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({selectedReise.fields.waehrung.label})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <BudgetTracker
            budget={selectedReise?.fields.gesamtbudget ?? 0}
            booked={totalGeplant}
            label="Gesamtplanung"
          />

          {budgetpostenByPrioritaet.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Budgetposten nach Priorität</h3>
              {budgetpostenByPrioritaet.map(([prioritaetKey, posten]) => {
                const prioritaetLabel = posten[0]?.fields.prioritaet?.label ?? prioritaetKey;
                const subtotal = posten.reduce((sum, bp) => sum + (bp.fields.geplanter_betrag ?? 0), 0);
                return (
                  <div key={prioritaetKey} className="rounded-xl border bg-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50 border-b">
                      <div className="flex items-center gap-2">
                        <StatusBadge statusKey={prioritaetKey} label={prioritaetLabel} />
                        <span className="text-xs text-muted-foreground">
                          {posten.length} Posten
                        </span>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatBetrag(subtotal, waehrungKey)}
                      </span>
                    </div>
                    <div className="divide-y">
                      {posten.map(bp => (
                        <div key={bp.record_id} className="flex items-center justify-between px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{getKategorieName(bp)}</p>
                            {bp.fields.budgetposten_notiz && (
                              <p className="text-xs text-muted-foreground truncate">
                                {bp.fields.budgetposten_notiz}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-medium shrink-0 ml-3">
                            {formatBetrag(bp.fields.geplanter_betrag, waehrungKey)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 rounded-xl border border-dashed text-muted-foreground">
              <IconCurrencyEuro size={32} className="mx-auto opacity-30 mb-2" />
              <p className="text-sm">Noch keine Budgetposten geplant.</p>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Zurück
            </Button>
            <Button
              onClick={() => { window.location.hash = '#/reise'; }}
              className="gap-2"
            >
              <IconCheck size={16} stroke={2.5} />
              Fertig
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
