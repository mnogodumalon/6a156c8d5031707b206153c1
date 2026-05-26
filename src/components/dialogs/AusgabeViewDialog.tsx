import type { Ausgabe, Kategorie, Reise } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconFileText } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface AusgabeViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Ausgabe | null;
  onEdit: (record: Ausgabe) => void;
  kategorieList: Kategorie[];
  reiseList: Reise[];
}

export function AusgabeViewDialog({ open, onClose, record, onEdit, kategorieList, reiseList }: AusgabeViewDialogProps) {
  function getKategorieDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kategorieList.find(r => r.record_id === id)?.fields.kategoriename ?? '—';
  }

  function getReiseDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return reiseList.find(r => r.record_id === id)?.fields.reiseziel ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ausgabe anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kategorie</Label>
            <p className="text-sm">{getKategorieDisplayName(record.fields.ausgabe_kategorie)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Betrag (€)</Label>
            <p className="text-sm">{record.fields.ausgabe_betrag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum der Ausgabe</Label>
            <p className="text-sm">{formatDate(record.fields.ausgabe_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beschreibung</Label>
            <p className="text-sm">{record.fields.ausgabe_beschreibung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zahlungsmethode</Label>
            <Badge variant="secondary">{record.fields.zahlungsmethode?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Beleg / Quittung</Label>
            {record.fields.beleg ? (
              <div className="relative w-full rounded-lg bg-muted overflow-hidden border">
                <img src={record.fields.beleg} alt="" className="w-full h-auto object-contain" />
              </div>
            ) : <p className="text-sm text-muted-foreground">—</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notiz</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.ausgabe_notiz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Reise</Label>
            <p className="text-sm">{getReiseDisplayName(record.fields.ausgabe_reise)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}