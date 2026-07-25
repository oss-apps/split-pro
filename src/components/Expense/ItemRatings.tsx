import { type inferRouterOutputs } from '@trpc/server';
import { Plus, ScanText, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { type RatedItem, formatItemRatingsNote } from '~/lib/itemRatings';
import { type ExpenseRouter } from '~/server/api/routers/expense';
import { api } from '~/utils/api';
import { type ReceiptItem } from '~/lib/receiptParser';
import { scanReceiptForItems } from '~/utils/receiptOcr';

import { EntityAvatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { AppDrawer } from '../ui/drawer';
import { Input } from '../ui/input';
import { StarRating } from '../ui/star-rating';

type ExpenseDetailsOutput = NonNullable<inferRouterOutputs<ExpenseRouter>['getExpenseDetails']>;

interface EditorRow extends RatedItem {
  key: string;
}

let rowCounter = 0;
const newRow = (name = '', rating = 0): EditorRow => ({ key: `row-${rowCounter++}`, name, rating });

/**
 * Item ratings + notes for an expense.
 *
 * Item ratings are stored as plain text in a note authored by the current user (reusing
 * the existing ExpenseNote model — no new table). Because notes already support multiple
 * authors per expense, each person's item notes show separately. Editing always appends a
 * NEW note rather than overwriting, so no one clobbers anyone else's.
 *
 * The optional receipt scan runs entirely in the browser (tesseract.js) and only ever
 * proposes items as tappable suggestions — nothing is added without confirmation.
 */
export const ItemRatings: React.FC<{ expense: ExpenseDetailsOutput; userId: number }> = ({
  expense,
  userId,
}) => {
  const { t, displayName, toUIDate } = useTranslationWithUtils();
  const apiUtils = api.useUtils();

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<EditorRow[]>([newRow()]);
  const [suggestions, setSuggestions] = useState<ReceiptItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit =
    expense.addedBy === userId || expense.expenseParticipants.some((p) => p.userId === userId);

  const addNote = api.expense.addNote.useMutation({
    onSuccess: () => {
      apiUtils.expense.getExpenseDetails.invalidate({ expenseId: expense.id }).catch(console.error);
      toast.success(t('expense_details.item_ratings.saved'));
      setOpen(false);
      setRows([newRow()]);
      setSuggestions([]);
    },
    onError: () => toast.error(t('expense_details.item_ratings.save_error')),
  });

  const setRow = useCallback((key: string, patch: Partial<RatedItem>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }, []);

  const removeRow = useCallback((key: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }, []);

  const addSuggestion = useCallback((item: ReceiptItem) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.name.trim().length > 0 || r.rating > 0);
      return [...next, newRow(item.name)];
    });
    setSuggestions((prev) => prev.filter((s) => s !== item));
  }, []);

  const addAllSuggestions = useCallback(() => {
    setRows((prev) => {
      const next = prev.filter((r) => r.name.trim().length > 0 || r.rating > 0);
      return [...next, ...suggestions.map((s) => newRow(s.name))];
    });
    setSuggestions([]);
  }, [suggestions]);

  const onScanFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }
      setScanning(true);
      setSuggestions([]);
      try {
        const items = await scanReceiptForItems(file);
        setSuggestions(items);
        if (items.length === 0) {
          toast.message(t('expense_details.add_expense_details.receipt_scan.no_items'));
        }
      } catch (error) {
        console.error('Receipt scan failed:', error);
        toast.error(t('expense_details.add_expense_details.receipt_scan.error'));
      } finally {
        setScanning(false);
      }
    },
    [t],
  );

  const onSave = useCallback(() => {
    const note = formatItemRatingsNote(rows);
    if (!note) {
      toast.message(t('expense_details.item_ratings.empty'));
      return;
    }
    addNote.mutate({ expenseId: expense.id, note });
  }, [rows, addNote, expense.id, t]);

  const onScanClick = useCallback(() => fileInputRef.current?.click(), []);
  const addEmptyRow = useCallback(() => setRows((prev) => [...prev, newRow()]), []);

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">
          {t('expense_details.item_ratings.title')}
        </h3>
        {canEdit ? (
          <AppDrawer
            open={open}
            onOpenChange={setOpen}
            trigger={
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {t('expense_details.item_ratings.add')}
              </Button>
            }
            leftAction={t('actions.close')}
            title={t('expense_details.item_ratings.title')}
            actionTitle={t('expense_details.item_ratings.save')}
            actionOnClick={onSave}
            actionDisabled={addNote.isPending}
            className="h-[85vh]"
          >
            <div className="flex flex-col gap-4">
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full gap-2"
                  type="button"
                  loading={scanning}
                  onClick={onScanClick}
                >
                  <ScanText className="h-4 w-4" />
                  {scanning
                    ? t('expense_details.add_expense_details.receipt_scan.scanning')
                    : t('expense_details.add_expense_details.receipt_scan.scan')}
                </Button>
                <input
                  id="scan-receipt"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onScanFile}
                />
              </div>

              {suggestions.length > 0 ? (
                <div className="rounded-lg border border-gray-800 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {t('expense_details.add_expense_details.receipt_scan.suggestions_title')}
                    </span>
                    <Button variant="ghost" size="sm" onClick={addAllSuggestions}>
                      {t('expense_details.add_expense_details.receipt_scan.add_all')}
                    </Button>
                  </div>
                  <p className="mb-2 text-xs text-gray-500">
                    {t('expense_details.add_expense_details.receipt_scan.disclaimer')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <SuggestionChip key={`${s.name}-${s.price}`} item={s} onAdd={addSuggestion} />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                {rows.map((row) => (
                  <ItemRow
                    key={row.key}
                    row={row}
                    placeholder={t('expense_details.item_ratings.item_name_placeholder')}
                    onChange={setRow}
                    onRemove={removeRow}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="gap-2 self-start"
                type="button"
                onClick={addEmptyRow}
              >
                <Plus className="h-4 w-4" />
                {t('expense_details.item_ratings.add_item')}
              </Button>
            </div>
          </AppDrawer>
        ) : null}
      </div>

      {expense.expenseNotes.length > 0 ? (
        <div className="flex flex-col gap-3">
          {expense.expenseNotes.map((note) => (
            <div key={note.id} className="rounded-lg border border-gray-800 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                <EntityAvatar entity={note.createdBy} size={18} />
                <span>{displayName(note.createdBy, userId)}</span>
                <span>·</span>
                <span>{toUIDate(note.createdAt, { year: true })}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap text-gray-200">{note.note}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t('expense_details.item_ratings.empty')}</p>
      )}
    </div>
  );
};

/** One editable item row; keeps its handlers stable per row. */
const ItemRow: React.FC<{
  row: EditorRow;
  placeholder: string;
  onChange: (key: string, patch: Partial<RatedItem>) => void;
  onRemove: (key: string) => void;
}> = ({ row, placeholder, onChange, onRemove }) => {
  const onName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(row.key, { name: e.target.value }),
    [onChange, row.key],
  );
  const onRating = useCallback(
    (v: number | null) => onChange(row.key, { rating: v ?? 0 }),
    [onChange, row.key],
  );
  const onRemoveClick = useCallback(() => onRemove(row.key), [onRemove, row.key]);

  return (
    <div className="flex items-center gap-2">
      <Input value={row.name} placeholder={placeholder} onChange={onName} className="flex-1" />
      <StarRating value={row.rating || null} onChange={onRating} size={18} />
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="shrink-0"
        onClick={onRemoveClick}
      >
        <X className="h-4 w-4 text-gray-500" />
      </Button>
    </div>
  );
};

/** A scanned-item suggestion chip; adding it is confirmed by the user, never automatic. */
const SuggestionChip: React.FC<{ item: ReceiptItem; onAdd: (item: ReceiptItem) => void }> = ({
  item,
  onAdd,
}) => {
  const onClick = useCallback(() => onAdd(item), [onAdd, item]);
  return (
    <button
      type="button"
      className="hover:bg-primary/10 flex items-center gap-1 rounded-full border border-gray-700 px-3 py-1 text-xs"
      onClick={onClick}
    >
      <Plus className="h-3 w-3" />
      {item.name}
    </button>
  );
};
