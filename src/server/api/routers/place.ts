import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { db } from '~/server/db';

/**
 * Saved locations are a private, per-user journal overlaid on shared expenses.
 * EVERY query in this router is scoped to `createdById === ctx.session.user.id`,
 * so no group member can ever see another member's saved places.
 */

const upsertPlaceSchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const placeRouter = createTRPCRouter({
  /**
   * Autocomplete: places owned by the current user whose name matches `query`,
   * ordered by visit count (most-used first). Empty query returns recent/most-used.
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().trim().default(''),
        limit: z.number().min(1).max(20).default(8),
      }),
    )
    .query(async ({ ctx, input }) => {
      const places = await db.place.findMany({
        where: {
          createdById: ctx.session.user.id,
          ...(input.query ? { name: { contains: input.query, mode: 'insensitive' } } : {}),
        },
        include: {
          _count: { select: { expenses: true } },
        },
        take: input.limit,
      });

      return places
        .map((place) => ({
          id: place.id,
          name: place.name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          visitCount: place._count.expenses,
        }))
        .sort((a, b) => b.visitCount - a.visitCount || a.name.localeCompare(b.name));
    }),

  /**
   * Upsert a place under the CURRENT user's account, keyed on (createdById, name).
   * Called when a location is attached to an expense — even a shared one — so the
   * place is always saved privately to whoever attached it.
   */
  upsert: protectedProcedure.input(upsertPlaceSchema).mutation(async ({ ctx, input }) => {
    const place = await db.place.upsert({
      where: {
        createdById_name: {
          createdById: ctx.session.user.id,
          name: input.name,
        },
      },
      update: {
        // One tap fills in address/coordinates; only overwrite when new values are supplied.
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.lat !== undefined ? { lat: input.lat } : {}),
        ...(input.lng !== undefined ? { lng: input.lng } : {}),
      },
      create: {
        name: input.name,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
        createdById: ctx.session.user.id,
      },
    });

    return place;
  }),

  /**
   * Delete a place the current user owns. The DB FK is ON DELETE SET NULL, so
   * expense history is preserved — only the expenses' `placeId` is cleared.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const place = await db.place.findUnique({ where: { id: input.id } });
      if (!place || place.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Place not found' });
      }
      await db.place.delete({ where: { id: input.id } });
    }),

  /**
   * Map view: every place the current user owns, with rolled-up stats computed in a
   * single pass (no per-pin N+1). Returns visit count, the user's own average rating
   * at that place, and expense totals grouped by currency.
   */
  getPlacesWithStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const places = await db.place.findMany({
      where: { createdById: userId },
      include: {
        expenses: {
          where: { deletedBy: null },
          select: {
            id: true,
            amount: true,
            currency: true,
            expenseRatings: { where: { userId }, select: { rating: true } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return places.map((place) => {
      const totalsByCurrency = new Map<string, bigint>();
      const ownRatings: number[] = [];

      for (const expense of place.expenses) {
        totalsByCurrency.set(
          expense.currency,
          (totalsByCurrency.get(expense.currency) ?? 0n) + expense.amount,
        );
        const own = expense.expenseRatings[0]?.rating;
        if (own !== undefined) {
          ownRatings.push(own);
        }
      }

      return {
        id: place.id,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        visitCount: place.expenses.length,
        yourAverageRating:
          ownRatings.length > 0
            ? ownRatings.reduce((sum, r) => sum + r, 0) / ownRatings.length
            : null,
        totals: [...totalsByCurrency.entries()].map(([currency, amount]) => ({
          currency,
          amount,
        })),
      };
    });
  }),
});

export type PlaceRouter = typeof placeRouter;
