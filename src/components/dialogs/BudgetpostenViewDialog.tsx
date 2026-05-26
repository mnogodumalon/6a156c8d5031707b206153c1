import type { Budgetposten, Reise, Kategorie } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface BudgetpostenViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Budgetposten | null;
  onEdit: (record: Budgetposten) => void;
  reiseList: Reise[];
  kategorieList: Kategorie[];
}

export function BudgetpostenViewDialog({ open, onClose, record, onEdit, reiseList, kategorieList }: BudgetpostenViewDialogProps) {
  function getReiseDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return reiseList.find(r => r.record_id === id)?.fields.reiseziel ?? '—';
  }

  function getKategorieDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return kategorieList.find(r => r.record_id === id)?.fields.kategoriename ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Budgetposten anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Reise</Label>
            <p className="text-sm">{getReiseDisplayName(record.fields.reise)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kategorie</Label>
            <p className="text-sm">{getKategorieDisplayName(record.fields.kategorie)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geplanter Betrag (€)</Label>
            <p className="text-sm">{record.fields.geplanter_betrag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Priorität</Label>
            <Badge variant="secondary">{record.fields.prioritaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notiz</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.budgetposten_notiz ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}