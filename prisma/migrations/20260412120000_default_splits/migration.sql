-- CreateTable
CREATE TABLE "public"."GroupDefaultSplit" (
    "groupId" INTEGER NOT NULL,
    "splitType" "public"."SplitType" NOT NULL,
    "shares" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupDefaultSplit_pkey" PRIMARY KEY ("groupId")
);

-- CreateTable
CREATE TABLE "public"."FriendDefaultSplit" (
    "userAId" INTEGER NOT NULL,
    "userBId" INTEGER NOT NULL,
    "splitType" "public"."SplitType" NOT NULL,
    "shares" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendDefaultSplit_pkey" PRIMARY KEY ("userAId","userBId")
);

-- AddForeignKey
ALTER TABLE "public"."GroupDefaultSplit" ADD CONSTRAINT "GroupDefaultSplit_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FriendDefaultSplit" ADD CONSTRAINT "FriendDefaultSplit_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FriendDefaultSplit" ADD CONSTRAINT "FriendDefaultSplit_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
