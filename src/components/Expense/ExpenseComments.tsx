import { Pencil, SendHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { type RouterOutputs, api } from '~/utils/api';

import { EntityAvatar } from '../ui/avatar';
import { Bubble, BubbleContent } from '../ui/bubble';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../ui/context-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '../ui/input-group';
import { Message, MessageAvatar, MessageContent, MessageGroup, MessageHeader } from '../ui/message';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';

type Expense = NonNullable<RouterOutputs['expense']['getExpenseDetails']>;

export const ExpenseComments = ({ expense, userId }: { expense: Expense; userId: number }) => {
  const { t, displayName } = useTranslationWithUtils();
  const utils = api.useUtils();
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const add = api.expense.addComment.useMutation();
  const edit = api.expense.editComment.useMutation();
  const remove = api.expense.deleteComment.useMutation();
  const pending = add.isPending || edit.isPending || remove.isPending;
  const refresh = () => utils.expense.getExpenseDetails.invalidate({ expenseId: expense.id });

  const save = async () => {
    try {
      if (editingId) {
        await edit.mutateAsync({ expenseId: expense.id, commentId: editingId, note: editNote });
        setEditingId(null);
      } else {
        await add.mutateAsync({ expenseId: expense.id, note });
        setNote('');
      }
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('comments.error'));
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await remove.mutateAsync({ expenseId: expense.id, commentId });
      setDeletingId(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('comments.error'));
    }
  };

  // Only combine adjacent comments so the conversation stays in chronological order.
  const groups = expense.expenseNotes.reduce<Expense['expenseNotes'][]>((result, comment) => {
    const previous = result.at(-1);
    if (previous?.[0]?.createdById === comment.createdById) {
      previous.push(comment);
    } else {
      result.push([comment]);
    }
    return result;
  }, []);

  return (
    <section className="mt-8 flex flex-col gap-4 pb-6" aria-label={t('comments.title')}>
      <Separator />
      {groups.map((comments) => {
        const author = comments[0];
        if (!author) {
          return null;
        }
        const ownComment = author.createdById === userId;
        const align = ownComment ? 'end' : 'start';
        return (
          <MessageGroup key={author.id}>
            <Message align={align} className="gap-3">
              <MessageAvatar className="self-start">
                <EntityAvatar entity={author.createdBy} size={32} />
              </MessageAvatar>
              <MessageContent className="gap-2">
                <MessageHeader>
                  {ownComment ? t('actors.you') : displayName(author.createdBy)}
                </MessageHeader>
                {comments.map((comment) => (
                  <div key={comment.id} className="flex min-w-0 flex-col">
                    {editingId === comment.id ? (
                      <form
                        className="flex flex-col gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void save();
                        }}
                      >
                        <Textarea
                          aria-label={t('comments.edit_label')}
                          value={editNote}
                          maxLength={5000}
                          onChange={(event) => setEditNote(event.target.value)}
                          disabled={pending}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            onClick={() => setEditingId(null)}
                          >
                            {t('actions.cancel')}
                          </Button>
                          <Button size="sm" disabled={pending || !editNote.trim()}>
                            {t('actions.save')}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <ContextMenu>
                        <ContextMenuTrigger
                          asChild
                          disabled={!!expense.deletedBy || comment.createdById !== userId}
                        >
                          <Bubble
                            variant={ownComment ? 'commentSent' : 'comment'}
                            align={align}
                            tabIndex={
                              !expense.deletedBy && comment.createdById === userId ? 0 : undefined
                            }
                          >
                            <BubbleContent className="[overflow-wrap:anywhere] whitespace-pre-wrap">
                              {comment.note}
                            </BubbleContent>
                          </Bubble>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuGroup>
                            <ContextMenuItem
                              disabled={pending || null !== editingId}
                              onSelect={() => {
                                setEditingId(comment.id);
                                setEditNote(comment.note);
                                setDeletingId(null);
                              }}
                            >
                              <Pencil />
                              {t('comments.edit')}
                            </ContextMenuItem>
                            <ContextMenuItem
                              variant="destructive"
                              disabled={pending || null !== editingId}
                              onSelect={() => setDeletingId(comment.id)}
                            >
                              <Trash2 />
                              {t('comments.delete')}
                            </ContextMenuItem>
                          </ContextMenuGroup>
                        </ContextMenuContent>
                      </ContextMenu>
                    )}
                    {deletingId === comment.id && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span>{t('comments.delete_confirm')}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => setDeletingId(null)}
                        >
                          {t('actions.cancel')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={pending}
                          onClick={() => void deleteComment(comment.id)}
                        >
                          {t('comments.delete')}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </MessageContent>
            </Message>
          </MessageGroup>
        );
      })}
      {!expense.deletedBy && null === editingId && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <InputGroup data-disabled={pending}>
            <InputGroupTextarea
              id="new-expense-comment"
              aria-label={t('comments.add')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onKeyDown={(event) => {
                if (
                  'Enter' !== event.key ||
                  event.shiftKey ||
                  event.nativeEvent.isComposing ||
                  229 === event.nativeEvent.keyCode
                ) {
                  return;
                }
                event.preventDefault();
                if (!pending && note.trim()) {
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={t('comments.placeholder')}
              maxLength={5000}
              rows={3}
              readOnly={pending}
              className="px-4"
            />
            <InputGroupAddon align="inline-end" className="mr-1 self-end pr-3">
              <InputGroupButton
                type="submit"
                variant="default"
                size="icon-sm"
                aria-label={t('comments.post')}
                title={t('comments.post')}
                disabled={pending || !note.trim()}
              >
                <SendHorizontal />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      )}
    </section>
  );
};
