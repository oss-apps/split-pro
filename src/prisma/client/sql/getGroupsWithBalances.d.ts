import * as $runtime from "../runtime/library"

/**
 * @param id of the user
 */
export const getGroupsWithBalances: (id: number) => $runtime.TypedSql<getGroupsWithBalances.Parameters, getGroupsWithBalances.Result>

export namespace getGroupsWithBalances {
  export type Parameters = [id: number]
  export type Result = {
    id: number
    name: string
    balance: bigint | null
    currency: string | null
  }
}
