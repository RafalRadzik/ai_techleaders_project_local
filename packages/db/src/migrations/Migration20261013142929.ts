import { Migration } from '@mikro-orm/migrations';

export class Migration20261013142929 extends Migration {

  override name = 'Migration20261013142929';

  override up(): void | Promise<void> {
    this.addSql(`create table "users" ("id" uuid not null, "email" varchar(320) not null, "name" varchar(200) not null, "created_at" timestamptz not null, "updated_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`alter table "users" add constraint "users_email_unique" unique ("email");`);
  }

}
