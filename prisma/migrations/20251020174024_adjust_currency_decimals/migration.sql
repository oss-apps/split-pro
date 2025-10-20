-- Migration script for currencies with non-standard decimal digits

-- Currencies with 0 decimal digits
-- Currency: AFN
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'AFN';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'AFN';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'AFN';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'AFN';

-- Currency: ALL
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'ALL';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'ALL';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'ALL';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'ALL';

-- Currency: AMD
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'AMD';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'AMD';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'AMD';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'AMD';

-- Currency: BIF
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'BIF';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'BIF';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'BIF';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'BIF';

-- Currency: CLP
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'CLP';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'CLP';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'CLP';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'CLP';

-- Currency: COP
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'COP';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'COP';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'COP';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'COP';

-- Currency: CRC
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'CRC';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'CRC';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'CRC';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'CRC';

-- Currency: DJF
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'DJF';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'DJF';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'DJF';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'DJF';

-- Currency: GNF
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'GNF';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'GNF';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'GNF';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'GNF';

-- Currency: HUF
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'HUF';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'HUF';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'HUF';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'HUF';

-- Currency: IDR
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'IDR';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'IDR';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'IDR';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'IDR';

-- Currency: IQD
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'IQD';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'IQD';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'IQD';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'IQD';

-- Currency: IRR
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'IRR';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'IRR';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'IRR';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'IRR';

-- Currency: ISK
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'ISK';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'ISK';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'ISK';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'ISK';

-- Currency: JPY
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'JPY';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'JPY';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'JPY';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'JPY';

-- Currency: KMF
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'KMF';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'KMF';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'KMF';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'KMF';

-- Currency: KRW
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'KRW';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'KRW';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'KRW';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'KRW';

-- Currency: LBP
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'LBP';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'LBP';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'LBP';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'LBP';

-- Currency: MGA
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'MGA';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'MGA';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'MGA';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'MGA';

-- Currency: MMK
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'MMK';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'MMK';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'MMK';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'MMK';

-- Currency: MUR
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'MUR';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'MUR';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'MUR';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'MUR';

-- Currency: PKR
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'PKR';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'PKR';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'PKR';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'PKR';

-- Currency: PYG
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'PYG';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'PYG';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'PYG';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'PYG';

-- Currency: RSD
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'RSD';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'RSD';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'RSD';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'RSD';

-- Currency: RWF
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'RWF';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'RWF';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'RWF';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'RWF';

-- Currency: SOS
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'SOS';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'SOS';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'SOS';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'SOS';

-- Currency: SYP
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'SYP';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'SYP';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'SYP';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'SYP';

-- Currency: TZS
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'TZS';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'TZS';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'TZS';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'TZS';

-- Currency: UGX
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'UGX';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'UGX';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'UGX';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'UGX';

-- Currency: UZS
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'UZS';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'UZS';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'UZS';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'UZS';

-- Currency: VND
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'VND';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'VND';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'VND';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'VND';

-- Currency: XAF
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'XAF';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'XAF';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'XAF';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'XAF';

-- Currency: XOF
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'XOF';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'XOF';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'XOF';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'XOF';

-- Currency: YER
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'YER';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'YER';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'YER';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'YER';

-- Currency: ZMK
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'ZMK';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'ZMK';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'ZMK';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'ZMK';

-- Currency: ZWL
UPDATE "Expense" SET amount = amount / 100 WHERE currency = 'ZWL';
UPDATE "Balance" SET amount = amount / 100 WHERE currency = 'ZWL';
UPDATE "GroupBalance" SET amount = amount / 100 WHERE currency = 'ZWL';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount / 100 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'ZWL';


-- Currencies with 3 decimal digits
-- Currency: BHD
UPDATE "Expense" SET amount = amount * 10 WHERE currency = 'BHD';
UPDATE "Balance" SET amount = amount * 10 WHERE currency = 'BHD';
UPDATE "GroupBalance" SET amount = amount * 10 WHERE currency = 'BHD';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount * 10 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'BHD';

-- Currency: JOD
UPDATE "Expense" SET amount = amount * 10 WHERE currency = 'JOD';
UPDATE "Balance" SET amount = amount * 10 WHERE currency = 'JOD';
UPDATE "GroupBalance" SET amount = amount * 10 WHERE currency = 'JOD';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount * 10 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'JOD';

-- Currency: KWD
UPDATE "Expense" SET amount = amount * 10 WHERE currency = 'KWD';
UPDATE "Balance" SET amount = amount * 10 WHERE currency = 'KWD';
UPDATE "GroupBalance" SET amount = amount * 10 WHERE currency = 'KWD';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount * 10 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'KWD';

-- Currency: LYD
UPDATE "Expense" SET amount = amount * 10 WHERE currency = 'LYD';
UPDATE "Balance" SET amount = amount * 10 WHERE currency = 'LYD';
UPDATE "GroupBalance" SET amount = amount * 10 WHERE currency = 'LYD';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount * 10 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'LYD';

-- Currency: OMR
UPDATE "Expense" SET amount = amount * 10 WHERE currency = 'OMR';
UPDATE "Balance" SET amount = amount * 10 WHERE currency = 'OMR';
UPDATE "GroupBalance" SET amount = amount * 10 WHERE currency = 'OMR';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount * 10 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'OMR';

-- Currency: TND
UPDATE "Expense" SET amount = amount * 10 WHERE currency = 'TND';
UPDATE "Balance" SET amount = amount * 10 WHERE currency = 'TND';
UPDATE "GroupBalance" SET amount = amount * 10 WHERE currency = 'TND';
UPDATE "ExpenseParticipant" AS p SET amount = p.amount * 10 FROM "Expense" e WHERE e.id=p."expenseId" AND currency = 'TND';


