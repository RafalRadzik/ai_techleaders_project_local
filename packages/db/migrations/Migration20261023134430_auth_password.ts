import { Migration } from '@mikro-orm/migrations';

/**
 * Accounts and roles, Slice 4 (`.ai/specs/2026-09-04-accounts-and-roles.md`, Data Model):
 * the email-and-password fallback. `password_hash` is `text`, not `varchar(60)`, so the
 * column is not pinned to one algorithm's output width; null marks a GitHub-only account.
 */
export class Migration20261023134430_auth_password extends Migration {

  override name = 'Migration20261023134430_auth_password';

  override up(): void | Promise<void> {
    this.addSql(`alter table "users" add "password_hash" text null;`);
  }

  // Reverse of `up`. Dropping the column discards every stored hash, so password
  // accounts can no longer sign in with a password; GitHub sign-in keeps working.
  override down(): void | Promise<void> {
    this.addSql(`alter table "users" drop column "password_hash";`);
  }

}
