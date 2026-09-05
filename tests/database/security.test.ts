import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const C = "10000000-0000-4000-8000-000000000003";
const D = "10000000-0000-4000-8000-000000000004";
test("actual migration, RPC rules and RLS under authenticated role", async (t) => {
  const db = new PGlite();
  try {
    // Only Supabase-owned infrastructure is stubbed; all application SQL is the real migration.
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema realtime;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table realtime.messages(extension text, topic text); alter table realtime.messages enable row level security;
      create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
      create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$ select $$;
      create publication supabase_realtime;
      grant usage on schema public,auth,realtime to authenticated,anon;
      grant select,insert on realtime.messages to authenticated;`);
    await db.exec(
      readFileSync("supabase/migrations/20260905192934_initial.sql", "utf8"),
    );
    await db.exec(
      `insert into auth.users values('${A}'),('${B}'),('${C}'),('${D}')`,
    );
    async function as(user: string) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user,
      ]);
      await db.exec("set role authenticated");
    }
    async function scalar(sql: string, params: unknown[] = []) {
      const r = await db.query<Record<string, unknown>>(sql, params);
      return Object.values(r.rows[0] ?? {})[0];
    }
    await as(A);
    const cid = await scalar("select public.create_couple()");
    const invite = await scalar("select invite_code from public.couples");
    const plant = await scalar("select id from public.plants");
    await t.test(
      "profile trigger and seed are real, RLS enabled everywhere",
      async () => {
        assert.equal(
          await scalar("select count(*)::int from public.profiles"),
          1,
        );
        assert.equal(await scalar("select stage from public.plants"), 0);
        assert.equal(
          await scalar(
            "select count(*)::int from pg_tables where schemaname='public' and not rowsecurity",
          ),
          0,
        );
      },
    );
    await t.test("own invite and second space rejected", async () => {
      await assert.rejects(
        db.query("select public.join_couple($1)", [invite]),
        /OWN_INVITE/,
      );
      await assert.rejects(
        db.query("select public.create_couple()"),
        /ALREADY_MEMBER/,
      );
    });
    await t.test("only one second member and invite consumed", async () => {
      await as(B);
      assert.equal(
        await scalar("select public.join_couple($1)", [invite]),
        cid,
      );
      assert.equal(
        await scalar("select invite_code from public.couples"),
        null,
      );
      assert.equal(
        await scalar("select count(*)::int from public.couple_members"),
        2,
      );
      await as(C);
      assert.equal(
        await scalar("select public.join_couple($1)", [invite]),
        null,
      );
    });
    await t.test(
      "invalid invite throttling survives committed failure",
      async () => {
        await assert.rejects(
          db.query("select public.join_couple('00000000')"),
          /RATE_LIMIT/,
        );
      },
    );
    await t.test(
      "stranger reads no private data and cannot forge writes",
      async () => {
        for (const table of [
          "couples",
          "couple_members",
          "plants",
          "notes",
          "memories",
          "plant_actions",
        ])
          assert.equal(
            await scalar(`select count(*)::int from public.${table}`),
            0,
          );
        await assert.rejects(
          db.query("select public.perform_action($1,$2,$3)", [
            plant,
            "water",
            crypto.randomUUID(),
          ]),
          /FORBIDDEN/,
        );
        await assert.rejects(
          db.query("update public.plants set growth_points=9999"),
          /permission denied/,
        );
        await assert.rejects(
          db.query(
            "insert into public.couple_members(user_id,couple_id,display_name) values($1,$2,$3)",
            [C, cid, "Intruder"],
          ),
          /permission denied/,
        );
      },
    );
    await t.test(
      "water is authoritative, idempotent and has a server cooldown",
      async () => {
        await as(A);
        const id = crypto.randomUUID();
        await db.query("select public.perform_action($1,$2,$3)", [
          plant,
          "water",
          id,
        ]);
        assert.equal(
          await scalar("select growth_points from public.plants"),
          5,
        );
        await db.query("select public.perform_action($1,$2,$3)", [
          plant,
          "water",
          id,
        ]);
        assert.equal(
          await scalar("select growth_points from public.plants"),
          5,
        );
        await assert.rejects(
          db.query("select public.perform_action($1,$2,$3)", [
            plant,
            "water",
            crypto.randomUUID(),
          ]),
          /COOLDOWN/,
        );
        await as(B);
        await db.query("select public.perform_action($1,$2,$3)", [
          plant,
          "water",
          crypto.randomUUID(),
        ]);
        assert.equal(
          await scalar("select growth_points from public.plants"),
          10,
        );
        assert.equal(await scalar("select stage from public.plants"), 1);
      },
    );
    await t.test(
      "shared touch awarded exactly once and raw touches are ephemeral",
      async () => {
        await as(A);
        await db.query("select public.perform_action($1,$2,$3)", [
          plant,
          "touch",
          crypto.randomUUID(),
        ]);
        await as(B);
        const result = await scalar("select public.perform_action($1,$2,$3)", [
          plant,
          "touch",
          crypto.randomUUID(),
        ]);
        assert.deepEqual(result, { shared: true, duplicate: false });
        assert.equal(
          await scalar("select growth_points from public.plants"),
          20,
        );
        assert.equal(
          await scalar(
            "select count(*)::int from public.memories where type='shared'",
          ),
          1,
        );
        assert.equal(
          await scalar(
            "select count(*)::int from public.plant_actions where action_type='touch'",
          ),
          0,
        );
        await assert.rejects(
          db.query("select public.perform_action($1,$2,$3)", [
            plant,
            "touch",
            crypto.randomUUID(),
          ]),
          /COOLDOWN/,
        );
      },
    );
    await t.test(
      "notes stay inside couple and cannot impersonate another author",
      async () => {
        await db.query("select public.save_note('Удачи сегодня!')");
        await as(A);
        assert.equal(
          await scalar("select text from public.notes"),
          "Удачи сегодня!",
        );
        await assert.rejects(
          db.query(
            "insert into public.notes(couple_id,author_id,text) values($1,$2,$3)",
            [cid, B, "fake"],
          ),
          /permission denied/,
        );
        await as(C);
        assert.equal(await scalar("select count(*)::int from public.notes"), 0);
        await assert.rejects(
          db.query("select public.save_note('wrong couple')"),
          /FORBIDDEN/,
        );
      },
    );
    await t.test(
      "private channel policies reject strangers and client broadcasts",
      async () => {
        await as(A);
        const version = await scalar(
          "select channel_version from public.couples",
        );
        const topic = `couple:${cid}:${version}`;
        await db.query("select set_config('realtime.topic',$1,false)", [topic]);
        await db.query("insert into realtime.messages values('presence',$1)", [
          topic,
        ]);
        await assert.rejects(
          db.query("insert into realtime.messages values('broadcast',$1)", [
            topic,
          ]),
          /row-level security/,
        );
        await as(C);
        assert.equal(
          await scalar("select count(*)::int from realtime.messages"),
          0,
        );
        await assert.rejects(
          db.query("insert into realtime.messages values('presence',$1)", [
            topic,
          ]),
          /row-level security/,
        );
      },
    );
    await t.test("disconnect revokes access and rotates channel", async () => {
      await as(B);
      const before = await scalar("select channel_version from public.couples");
      await db.exec("select public.leave_couple()");
      assert.equal(await scalar("select count(*)::int from public.plants"), 0);
      await as(A);
      assert.notEqual(
        await scalar("select channel_version from public.couples"),
        before,
      );
      assert.equal(
        await scalar("select count(*)::int from public.couple_members"),
        1,
      );
      assert.equal(await scalar("select count(*)::int from public.notes"), 0);
    });
    await t.test(
      "account deletion cannot retain access with an old JWT",
      async () => {
        await as(A);
        await db.exec("select public.delete_own_account()");
        assert.equal(
          await scalar("select count(*)::int from public.profiles"),
          0,
        );
        assert.equal(
          await scalar("select count(*)::int from public.plants"),
          0,
        );
        await assert.rejects(
          db.query("select public.perform_action($1,$2,$3)", [
            plant,
            "water",
            crypto.randomUUID(),
          ]),
          /FORBIDDEN/,
        );
      },
    );
    await t.test("anonymous role cannot invoke mutating RPC", async () => {
      await db.exec("reset role; set role anon");
      await assert.rejects(
        db.query("select public.create_couple()"),
        /permission denied/,
      );
    });
  } finally {
    await db.close();
  }
});
