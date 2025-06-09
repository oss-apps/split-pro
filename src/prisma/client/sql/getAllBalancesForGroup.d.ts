import * as $runtime from "../runtime/library"

/**
 * @param id of the group
 */
export const getAllBalancesForGroup: (id: number) => $runtime.TypedSql<getAllBalancesForGroup.Parameters, getAllBalancesForGroup.Result>

export namespace getAllBalancesForGroup {
  export type Parameters = [id: number]
  export type Result = {
    groupId: number | null
    borrowedBy: number
    paidBy: number
    currency: string
    amount: bigint | null
  }
}
