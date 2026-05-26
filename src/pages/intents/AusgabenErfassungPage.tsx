import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { BudgetTracker } from '@/components/BudgetTracker';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { ReiseDialog } from '@/components/dialogs/ReiseDialog';
import { AusgabeDialog } from '@/components/dialogs/AusgabeDialog';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Reise } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { IconPlus, IconArrowRight, IconCheck, IconMapPin, IconReceipt } from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Reise wählen' },
  { label: 'Ausgaben erfassen' },
  { label: 'Zusammenfassung' },
];

export default function AusgabenErfassungPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize step and reiseId from URL params
  const initialStep = (() => {
    const s = parseInt(searchParams.get('step') ?? '', 10);
    return s >= 1 && s <= 3 ? s : 1;
  })();
  const initialReiseId = searchParams.get('reiseId') ?? null;

  const [currentStep, setCurrentStep] = useState(initialStep);
  const [selectedReiseId, setSelectedReiseId] = useState<string | null>(initialReiseId);
  const [reiseDialogOpen, setReiseDialogOpen] = useState(false);
  const [ausgabeDialogOpen, setAusgabeDialogOpen] = useState(false);

  const { reise, kategorie, ausgabe, loading, error, fetchAll } = useDashboardData();

  // Sync URL params when step or reiseId changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (currentStep > 1) {
      params.set('step', String(currentStep));
    } else {
      params.delete('step');
    }
    if (selectedReiseId) {
      params.set('reiseId', selectedReiseId);
    } else {
      params.delete('reiseId');
    }
    setSearchParams(params, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedReiseId]);

  const selectedReise = useMemo(
    () => reise.find(r => r.record_id === selectedReiseId) ?? null,
    [reise, selectedReiseId]
  );

  // Filter Ausgabe records for the selected Reise
  const tripAusgaben = useMemo(
    () =>
      ausgabe.filter(
        a => extractRecordId(a.fields.ausgabe_reise) === selectedReiseId
      ),
    [ausgabe, selectedReiseId]
  );

  // Total spent for the trip
  const totalSpent = useMemo(
    () => tripAusgaben.reduce((sum, a) => sum + (a.fields.ausgabe_betrag ?? 0), 0),
    [tripAusgaben]
  );

  // Group Ausgabe by kategorie for summary
  const ausgabenByKategorie = useMemo(() => {
    const groups: Record<string, { name: string; sum: number }> = {};
    for (const a of tripAusgaben) {
      const katId = extractRecordId(a.fields.ausgabe_kategorie);
      const katRecord = kategorie.find(k => k.record_id === katId);
      const katName = katRecord?.fields.kategoriename ?? 'Sonstiges';
      if (!groups[katName]) {
        groups[katName] = { name: katName, sum: 0 };
      }
      groups[katName].sum += a.fields.ausgabe_betrag ?? 0;
    }
    return Object.values(groups).sort((a, b) => b.sum - a.sum);
  }, [tripAusgaben, kategorie]);

  function handleStepChange(step: number) {
    setCurrentStep(step);
  }

  function handleReiseSelect(id: string) {
    setSelectedReiseId(id);
    setCurrentStep(2);
  }

  async function handleCreateReise(fields: Reise['fields']) {
    const result = await LivingAppsService.createReiseEntry(fields);
    await fetchAll();
    // Auto-select the newly created record
    if (result && typeof result === 'object') {
      const entries = Object.entries(result as Record<string, unknown>);
      if (entries.length > 0) {
        const [newId] = entries[0];
        setSelectedReiseId(newId);
        setCurrentStep(2);
      }
    }
  }

  async function handleCreateAusgabe(fields: import('@/types/app').Ausgabe['fields']) {
    await LivingAppsService.createAusgabeEntry(fields);
    await fetchAll();
  }

  // Default values for AusgabeDialog: pre-fill ausgabe_reise
  const ausgabeDefaultValues = useMemo(() => {
    if (!selectedReiseId) return undefined;
    return {
      ausgabe_reise: createRecordUrl(APP_IDS.REISE, selectedReiseId),
    };
  }, [selectedReiseId]);

  const budget = selectedReise?.fields.gesamtbudget ?? 0;
  const waehrung = selectedReise?.fields.waehrung;
  const waehrungLabel = waehrung && typeof waehrung === 'object' && 'label' in waehrung
    ? (waehrung as { key: string; label: string }).label
    : typeof waehrung === 'string' ? waehrung : '';

  return (
    <IntentWizardShell
      title="Ausgaben erfassen"
      subtitle="Erfasse deine Reiseausgaben Schritt für Schritt"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Reise auswählen */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Welche Reise möchtest du erfassen?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle eine bestehende Reise oder lege eine neue an.
            </p>
          </div>
          <EntitySelectStep
            items={reise.map(r => ({
              id: r.record_id,
              title: r.fields.reiseziel ?? '(Kein Ziel)',
              subtitle:
                r.fields.reisebeginn || r.fields.reiseende
                  ? `${formatDate(r.fields.reisebeginn)} – ${formatDate(r.fields.reiseende)}`
                  : undefined,
              icon: <IconMapPin size={18} className="text-primary" />,
              stats: [
                ...(r.fields.gesamtbudget != null
                  ? [{ label: 'Budget', value: `${formatCurrency(r.fields.gesamtbudget)}${waehrungLabel ? '' : ''}` }]
                  : []),
                ...(r.fields.waehrung && typeof r.fields.waehrung === 'object' && 'label' in r.fields.waehrung
                  ? [{ label: 'Währung', value: (r.fields.waehrung as { key: string; label: string }).label }]
                  : []),
                ...(r.fields.anzahl_reisende != null
                  ? [{ label: 'Reisende', value: r.fields.anzahl_reisende }]
                  : []),
              ],
            }))}
            onSelect={handleReiseSelect}
            searchPlaceholder="Reise suchen..."
            emptyIcon={<IconMapPin size={32} />}
            emptyText="Noch keine Reisen vorhanden. Erstelle deine erste Reise!"
            createLabel="Neue Reise anlegen"
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

      {/* Step 2: Ausgaben erfassen */}
      {currentStep === 2 && selectedReise && (
        <div className="space-y-4">
          {/* Trip banner */}
          <div className="rounded-xl border bg-card p-4 flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconMapPin size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {selectedReise.fields.reiseziel ?? '(Kein Ziel)'}
              </p>
              {(selectedReise.fields.reisebeginn || selectedReise.fields.reiseende) && (
                <p className="text-xs text-muted-foreground truncate">
                  {formatDate(selectedReise.fields.reisebeginn)} – {formatDate(selectedReise.fields.reiseende)}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs text-muted-foreground"
              onClick={() => setCurrentStep(1)}
            >
              Ändern
            </Button>
          </div>

          {/* Budget tracker */}
          <BudgetTracker
            budget={budget}
            booked={totalSpent}
            label={`Budget${waehrungLabel ? ` (${waehrungLabel})` : ''}`}
          />

          {/* Ausgaben list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                Ausgaben ({tripAusgaben.length})
              </h2>
              <Button
                onClick={() => setAusgabeDialogOpen(true)}
                size="sm"
                className="gap-1.5"
              >
                <IconPlus size={15} />
                Ausgabe hinzufügen
              </Button>
            </div>

            {tripAusgaben.length === 0 ? (
              <div className="text-center py-10 border rounded-xl bg-card">
                <div className="flex justify-center mb-3 opacity-40">
                  <IconReceipt size={32} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Noch keine Ausgaben für diese Reise erfasst.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={() => setAusgabeDialogOpen(true)}
                >
                  <IconPlus size={14} />
                  Erste Ausgabe hinzufügen
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {tripAusgaben.map(a => {
                  const katId = extractRecordId(a.fields.ausgabe_kategorie);
                  const katRecord = kategorie.find(k => k.record_id === katId);
                  const katName = katRecord?.fields.kategoriename ?? '—';
                  const zahlungsmethode = a.fields.zahlungsmethode;
                  const zahlungsKey =
                    zahlungsmethode && typeof zahlungsmethode === 'object' && 'key' in zahlungsmethode
                      ? (zahlungsmethode as { key: string; label: string }).key
                      : typeof zahlungsmethode === 'string' ? zahlungsmethode : undefined;
                  const zahlungsLabel =
                    zahlungsmethode && typeof zahlungsmethode === 'object' && 'label' in zahlungsmethode
                      ? (zahlungsmethode as { key: string; label: string }).label
                      : typeof zahlungsmethode === 'string' ? zahlungsmethode : undefined;

                  return (
                    <div
                      key={a.record_id}
                      className="rounded-xl border bg-card p-4 overflow-hidden"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <IconReceipt size={16} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">
                              {a.fields.ausgabe_beschreibung ?? '(Keine Beschreibung)'}
                            </span>
                            <span className="font-semibold text-sm shrink-0">
                              {formatCurrency(a.fields.ausgabe_betrag)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(a.fields.ausgabe_datum)}
                            </span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground truncate">{katName}</span>
                            {zahlungsKey && (
                              <StatusBadge statusKey={zahlungsKey} label={zahlungsLabel} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button
              className="w-full gap-2"
              onClick={() => setCurrentStep(3)}
            >
              Weiter zur Zusammenfassung
              <IconArrowRight size={16} />
            </Button>
          </div>

          <AusgabeDialog
            open={ausgabeDialogOpen}
            onClose={() => setAusgabeDialogOpen(false)}
            onSubmit={handleCreateAusgabe}
            defaultValues={ausgabeDefaultValues}
            kategorieList={kategorie}
            reiseList={reise}
            enablePhotoScan={AI_PHOTO_SCAN['Ausgabe']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Ausgabe']}
          />
        </div>
      )}

      {/* Step 3: Zusammenfassung */}
      {currentStep === 3 && selectedReise && (
        <div className="space-y-4">
          {/* Trip banner */}
          <div className="rounded-xl border bg-card p-4 overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconMapPin size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {selectedReise.fields.reiseziel ?? '(Kein Ziel)'}
                </p>
                {(selectedReise.fields.reisebeginn || selectedReise.fields.reiseende) && (
                  <p className="text-xs text-muted-foreground">
                    {formatDate(selectedReise.fields.reisebeginn)} – {formatDate(selectedReise.fields.reiseende)}
                  </p>
                )}
                {selectedReise.fields.anzahl_reisende != null && (
                  <p className="text-xs text-muted-foreground">
                    {selectedReise.fields.anzahl_reisende} Reisende
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Budget overview */}
          <BudgetTracker
            budget={budget}
            booked={totalSpent}
            label={`Gesamtbudget${waehrungLabel ? ` (${waehrungLabel})` : ''}`}
          />

          {/* Expenses by category */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Ausgaben nach Kategorie</h2>
            {ausgabenByKategorie.length === 0 ? (
              <div className="text-center py-8 border rounded-xl bg-card">
                <p className="text-sm text-muted-foreground">
                  Keine Ausgaben erfasst.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {ausgabenByKategorie.map(group => (
                  <div
                    key={group.name}
                    className="rounded-xl border bg-card p-4 flex items-center justify-between gap-3 overflow-hidden"
                  >
                    <span className="text-sm font-medium truncate min-w-0">{group.name}</span>
                    <span className="text-sm font-semibold shrink-0">
                      {formatCurrency(group.sum)}
                    </span>
                  </div>
                ))}

                {/* Total row */}
                <div className="rounded-xl border bg-muted/50 p-4 flex items-center justify-between gap-3 overflow-hidden">
                  <span className="text-sm font-semibold truncate min-w-0">Gesamt ausgegeben</span>
                  <span className="text-sm font-bold shrink-0">{formatCurrency(totalSpent)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => setCurrentStep(2)}
            >
              <IconPlus size={16} />
              Neue Ausgabe hinzufügen
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={() => { window.location.hash = '#/ausgabe'; }}
            >
              <IconCheck size={16} />
              Fertig
            </Button>
          </div>
        </div>
      )}

      {/* Fallback: no reise selected but on step 2 or 3 */}
      {currentStep > 1 && !selectedReise && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground mb-4">
            Bitte wähle zuerst eine Reise aus.
          </p>
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            Zurück zur Reiseauswahl
          </Button>
        </div>
      )}
    </IntentWizardShell>
  );
}
