import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_FILTERS,
  filterHomes,
  withinAge,
  commuteLabel,
  commuteSummary,
  money,
} from "../src/domain.ts";
import type { Home } from "../src/domain.ts";

const homes = JSON.parse(
  readFileSync(
    new URL("./fixtures/homes-2026-11-07.json", import.meta.url),
    "utf8",
  ),
).homes as Home[];
const asOf = new Date("2026-11-07T12:00:00+09:00");

test("default results contain the three researched homes, excluding unknown commute", () => {
  assert.deepEqual(
    filterHomes(homes, DEFAULT_FILTERS, [], asOf).map((home) => home.id),
    ["N002", "N003", "N001"],
  );
});
test("price filters include their exact lower and upper boundaries", () => {
  assert.deepEqual(
    filterHomes(homes, { ...DEFAULT_FILTERS, min: 18, max: 24 }, [], asOf).map(
      (home) => home.id,
    ),
    ["N002", "N003"],
  );
  assert.equal(
    filterHomes(homes, { ...DEFAULT_FILTERS, min: 26, max: 30 }, [], asOf)
      .length,
    0,
  );
});
test("a pending route never satisfies an active commute filter", () => {
  assert.equal(
    filterHomes(homes, { ...DEFAULT_FILTERS, includePending: true }, [], asOf)
      .length,
    3,
  );
  assert.equal(
    filterHomes(
      homes,
      { ...DEFAULT_FILTERS, includePending: true, commute: null },
      [],
      asOf,
    ).length,
    4,
  );
});
test("age and favorites narrow the actual data independently", () => {
  assert.deepEqual(
    filterHomes(homes, { ...DEFAULT_FILTERS, age: 10 }, [], asOf).map(
      (home) => home.id,
    ),
    ["N001"],
  );
  assert.deepEqual(
    filterHomes(
      homes,
      { ...DEFAULT_FILTERS, favoritesOnly: true },
      ["N003"],
      asOf,
    ).map((home) => home.id),
    ["N003"],
  );
});
test("month-only construction dates at the 20-year boundary stay unverified", () => {
  assert.equal(withinAge("2006-11", 20, asOf), false);
  assert.equal(withinAge("2006-12", 20, asOf), true);
  assert.equal(withinAge("2006-10", 20, asOf), false);
});
test("commute and area sorting use the right values", () => {
  assert.equal(
    filterHomes(homes, { ...DEFAULT_FILTERS, sort: "commute" }, [], asOf)[0].id,
    "N001",
  );
  assert.equal(
    filterHomes(homes, { ...DEFAULT_FILTERS, sort: "area" }, [], asOf)[0].id,
    "N003",
  );
});
test("public data carries actual media and sources without private file paths", () => {
  assert.equal(new Set(homes.map((home) => home.id)).size, homes.length);
  const currentHomes = JSON.parse(
    readFileSync(new URL("../src/data/listings.json", import.meta.url), "utf8"),
  ).homes as Home[];
  for (const home of currentHomes) {
    assert.ok(home.rentYen >= 150000 && home.rentYen <= 300000);
    assert.ok(home.photos.some((photo) => photo.kind === "floorplan"));
    assert.ok(home.photos.some((photo) => photo.kind === "exterior"));
    assert.ok(
      home.sources.every((source) => source.url.startsWith("https://")),
    );
    assert.ok(!JSON.stringify(home).includes("/Users/"));
    assert.ok(!JSON.stringify(home).includes("evidence/"));
    for (const media of [
      ...home.photos,
      ...(home.commute ? [home.commute.image] : []),
    ]) {
      assert.ok(media.src.startsWith("/media/"));
      assert.ok(media.sourceUrl.startsWith("https://"));
    }
  }
});

test("public-transport labels never claim a bicycle route or speed scenario", () => {
  const transit = {
    ...homes[0].commute!,
    mode: "transit" as const,
    distanceKm: null,
    ascentM: null,
    slowMinutes: null,
  };
  assert.equal(commuteLabel(transit), "公交全程");
  assert.equal(commuteSummary(transit), "含步行、候车与换乘");
});

test("unlisted fees are distinct from a confirmed zero charge", () => {
  assert.equal(money(null), "待确认");
  assert.equal(money(0), "无");
  assert.equal(money(8000), "8,000日元");
  assert.equal(money(15000), "1.5万日元");
});
