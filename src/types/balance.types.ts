export interface MinimalBalance {
  currency: string;
  amount: bigint;
  friendId: number;
  groupId: number | null;
  groupName?: string | null;
}
