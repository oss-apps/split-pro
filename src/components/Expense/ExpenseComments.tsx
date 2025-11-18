import type { FormEvent } from 'react';
import React, { useCallback, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '~/utils/api';
import type { User } from '@prisma/client';
import { EntityAvatar } from '../ui/avatar';
import { Separator } from '../ui/separator';

export interface ExpenseCommentType {
  id: string;
  createdById: number;
  comment: string;
  createdAt: Date;
  createdBy?: User;
}

/**
 * Props:
 * - expenseId: id for the expense (used for callbacks)
 * - comments: initial list of comments (server-sourced)
 * - onAddComment: optional async callback to persist a new comment
 *    signature: (expenseId, text) => Promise<ExpenseComment>
 * - currentUserId: optional id to highlight current user's comments
 */

export const ExpenseComments: React.FC<{
  expenseId: string;
  comments?: ExpenseCommentType[];
  currentUser: User;
  className?: string;
}> = ({ expenseId, comments = [], currentUser }) => {
  const addCommentMutation = api.expense.addComment.useMutation();
  const [commentList, setCommentList] = useState<ExpenseCommentType[]>(comments);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Fetch user details for all unique userIds in comments
  const userIds = Array.from(new Set(commentList.map((c) => c.createdById)));
  const userQueries = api.useQueries((t) =>
    userIds.map((id) => t.user.getUserDetails({ userId: id })),
  );
  const users = userQueries.map((q) => q.data).filter(Boolean);

  // Map userId to user object for fast lookup
  const userMap = React.useMemo(() => {
    const map = new Map<number, User>();
    users.forEach((u) => {
      if (u) {
        map.set(u.id, u);
      }
    });
    return map;
  }, [users]);

  // Ensure each comment has createdBy populated from fetched users
  const mappedCommentList = React.useMemo(
    () =>
      commentList.map((c) => ({
        ...c,
        createdBy: c.createdBy || userMap.get(c.createdById),
      })),
    [commentList, userMap],
  );

  const submit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault?.();
      const trimmed = comment.trim();
      if (!trimmed) {
        return;
      }
      setError(null);
      setLoading(true);

      // optimistic local comment
      const tempId = `temp-${Date.now()}`;
      const now = new Date();
      const optimistic: ExpenseCommentType = {
        id: tempId,
        comment: trimmed,
        createdAt: now,
        createdById: currentUser.id,
        createdBy: currentUser,
      };
      await addCommentMutation.mutateAsync({ expenseId, comment: trimmed });
      setCommentList((prev) => [...prev, optimistic]);
      setComment('');
      textareaRef.current?.focus();
      setLoading(false);
    },
    [comment, currentUser, expenseId, addCommentMutation, textareaRef],
  ); // <-- Dependency Array

  const handleOnchange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (e.target.value.length <= 200) {
        setComment(e.target.value);
      }
    },
    [setComment],
  );

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        await submit(e);
      }
    },
    [submit],
  );

  return (
    <>
      <Separator />
      <section className="mt-10 flex flex-col">
        <h3 className="mb-3 text-sm font-medium text-gray-500">Comments</h3>

        <div className="mb-4 space-y-3">
          {mappedCommentList.length === 0 ? (
            <p className="text-sm text-slate-500">No comments yet. Be the first to comment.</p>
          ) : (
            mappedCommentList.map((c) => (
              <div key={c.id} className="flex items-start gap-3 rounded-md p-2">
                <EntityAvatar entity={c.createdBy} size={35} />

                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-800 text-sm font-medium">
                      {c.createdBy ? c.createdBy.name : 'Unknown'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {c.createdAt
                        ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })
                        : ''}
                    </div>
                  </div>
                  <p className="text-400 mt-1 text-sm">{c.comment}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={submit} className="mt-auto flex flex-col gap-2">
          <textarea
            id={`expense-comment-${expenseId}`}
            ref={textareaRef}
            value={comment}
            onChange={handleOnchange}
            rows={1}
            onKeyDown={handleKeyDown}
            className="w-full rounded-md border border-slate-200 p-2 text-sm focus:ring-2 focus:ring-sky-300 focus:outline-none"
            placeholder="Write a comment..."
            disabled={loading}
          />

          <div className="flex items-center justify-between">
            <div className={`text-xs text-${comment.length >= 200 ? 'red' : 'slate'}-400`}>
              {comment.length}/200
            </div>
            <div className="flex items-center gap-2">
              {error && <div className="mr-2 text-xs text-red-500">{error}</div>}
              <button
                type="submit"
                disabled={loading || comment.trim().length === 0}
                className="rounded-md bg-sky-600 px-3 py-1 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </>
  );
};

// export ExpenseComments;
