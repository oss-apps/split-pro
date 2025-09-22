-- AddForeignKey
ALTER TABLE "public"."CachedBankData" ADD CONSTRAINT "CachedBankData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
