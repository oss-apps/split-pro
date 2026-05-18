import { SplitType } from '@prisma/client';
import React, { useCallback, useMemo } from 'react';

import {
  DEFAULT_SPLIT_TYPES,
  type SerializedDefaultSplitConfig,
  deserializeDefaultSplit,
  isDefaultSplitType,
  serializeDefaultSplit,
} from '~/lib/defaultSplit';
import { type Participant, useAddExpenseStore } from '~/store/addStore';

import { SplitExpenseForm } from '../AddExpense/SplitTypeSection';
import { Button } from '../ui/button';

interface DefaultSplitSettingsProps {
  participants: Participant[];
  defaultSplit: SerializedDefaultSplitConfig | null | undefined;
  triggerLabel: string;
  disabled?: boolean;
  onSave: (defaultSplit: SerializedDefaultSplitConfig) => void;
}

export const DefaultSplitSettings: React.FC<DefaultSplitSettingsProps> = ({
  participants,
  defaultSplit,
  triggerLabel,
  disabled,
  onSave,
}) => {
  const splitType = useAddExpenseStore((s) => s.splitType);
  const splitShares = useAddExpenseStore((s) => s.splitShares);
  const editorParticipants = useAddExpenseStore((s) => s.participants);
  const { applySplitPreset, resetState, setAmount, setParticipants } = useAddExpenseStore(
    (s) => s.actions,
  );

  const parsedDefaultSplit = useMemo(() => deserializeDefaultSplit(defaultSplit), [defaultSplit]);

  const onTriggerClick = useCallback(() => {
    resetState();
    setParticipants(participants);
    setAmount(10000n);

    if (parsedDefaultSplit) {
      applySplitPreset(parsedDefaultSplit.splitType, parsedDefaultSplit.shares);
    }
  }, [applySplitPreset, parsedDefaultSplit, participants, resetState, setAmount, setParticipants]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetState();
      }
    },
    [resetState],
  );

  const onDrawerSave = useCallback(() => {
    if (!isDefaultSplitType(splitType)) {
      return;
    }

    const shares = Object.fromEntries(
      editorParticipants.map((participant) => {
        const fallbackShare = splitType === SplitType.EQUAL ? 1n : 0n;
        return [participant.id, splitShares[participant.id]?.[splitType] ?? fallbackShare];
      }),
    );

    onSave(
      serializeDefaultSplit({
        splitType,
        shares,
      }),
    );
    resetState();
  }, [editorParticipants, onSave, resetState, splitShares, splitType]);

  return (
    <SplitExpenseForm
      allowedSplitTypes={DEFAULT_SPLIT_TYPES}
      onSave={onDrawerSave}
      onOpenChange={onOpenChange}
      onTriggerClick={onTriggerClick}
    >
      <Button size="sm" variant="secondary" disabled={disabled}>
        {triggerLabel}
      </Button>
    </SplitExpenseForm>
  );
};
