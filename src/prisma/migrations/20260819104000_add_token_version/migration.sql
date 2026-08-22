-- Incrementing this value invalidates every previously issued JWT for the user.
ALTER TABLE `User` ADD COLUMN `tokenVersion` INTEGER NOT NULL DEFAULT 0;
