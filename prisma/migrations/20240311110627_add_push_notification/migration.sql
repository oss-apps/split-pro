-- CreateTable
CREATE TABLE "PushNotification" (
    "userId" INTEGER NOT NULL,
    "subscription" TEXT NOT NULL,

    CONSTRAINT "PushNotification_pkey" PRIMARY KEY ("userId")
);
