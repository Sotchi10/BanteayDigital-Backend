-- A user can sign up with either an email address or a phone number.
ALTER TABLE `User` MODIFY `email` VARCHAR(191) NULL;
