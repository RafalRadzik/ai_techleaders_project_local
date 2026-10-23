import { Migration } from '@mikro-orm/migrations';

/**
 * Accounts and roles, Slice 4 (`.ai/specs/2026-09-04-accounts-and-roles.md`, step 23):
 * the PostgreSQL-backed rate-limit counters of primitive B8. Keys are hashed, so the table
 * holds no PII; `window_start` is indexed for the limiter's inline expiry delete.
 */
export class Migration20261023135729_auth_rate_limit extends Migration {

  override name = 'Migration20261023135729_auth_rate_limit';

  override up(): void | Promise<void> {
    this.addSql(`create table "auth_rate_limits" ("key" text not null, "window_start" timestamptz not null, "count" int not null, primary key ("key"));`);
    this.addSql(`create index "auth_rate_limits_window_start_index" on "auth_rate_limits" ("window_start");`);
  }

  // Reverse of `up`. The table holds only short-lived counters, so dropping it loses
  // nothing but the current windows: every key starts again from zero.
  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "auth_rate_limits" cascade;`);
  }

}
