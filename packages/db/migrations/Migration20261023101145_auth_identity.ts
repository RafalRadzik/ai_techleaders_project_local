import { Migration } from '@mikro-orm/migrations';

/**
 * Accounts and roles, Slice 2 (`.ai/specs/2026-09-04-accounts-and-roles.md`, Data Model):
 * GitHub identity, roles, email verification and session revocation on `users`.
 */
export class Migration20261023101145_auth_identity extends Migration {

  override name = 'Migration20261023101145_auth_identity';

  override up(): void | Promise<void> {
    this.addSql(`alter table "users" add "roles" text[] not null default '{mentee}', add "github_id" varchar(64) null, add "github_login" varchar(64) null, add "avatar_url" text null, add "email_verified_at" timestamptz null, add "session_version" int not null default 0;`);
    this.addSql(`alter table "users" add constraint "users_github_id_unique" unique ("github_id");`);
    this.addSql(`alter table "users" add constraint "users_roles_check" check (cardinality("roles") > 0 and array_position("roles", null) is null and "roles" <@ array['mentee', 'mentor', 'operator']::text[]);`);
    // Existing rows are founder-created seed and demo data: mark them verified rather
    // than delete them, so Ada Lovelace's row survives (BACKWARD_COMPATIBILITY.md §3).
    this.addSql(`update "users" set "email_verified_at" = now() where "email_verified_at" is null;`);
  }

  // Hand-written reverse of `up`. Dropping the columns discards roles, GitHub links and
  // verification timestamps; re-running `up` backfills verification again.
  override down(): void | Promise<void> {
    this.addSql(`alter table "users" drop constraint "users_roles_check";`);
    this.addSql(`alter table "users" drop constraint "users_github_id_unique";`);
    this.addSql(`alter table "users" drop column "roles", drop column "github_id", drop column "github_login", drop column "avatar_url", drop column "email_verified_at", drop column "session_version";`);
  }

}
