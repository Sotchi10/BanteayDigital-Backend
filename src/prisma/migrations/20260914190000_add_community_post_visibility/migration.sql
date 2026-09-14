ALTER TABLE `CommunityPost`
    ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT true;

DROP INDEX `CommunityPost_publishedAt_idx` ON `CommunityPost`;

CREATE INDEX `CommunityPost_isPublished_publishedAt_idx`
    ON `CommunityPost`(`isPublished`, `publishedAt`);
