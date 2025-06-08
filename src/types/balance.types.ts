export interface Balance {
  userId: number;
  friendId: number;
  currency: string;
  amount: bigint;
}

export interface GroupBalance extends Balance {
  groupId: number;
}
