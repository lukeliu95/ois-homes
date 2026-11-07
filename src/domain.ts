export interface Media {
  src: string;
  kind: string;
  caption: string;
  sourceUrl: string;
  width?: number;
  height?: number;
}

export interface Source {
  label: string;
  url: string;
  observedAt: string;
}

export interface Home {
  id: string;
  name: string;
  formalName: string;
  neighborhood: string;
  address: string;
  rentYen: number;
  managementFeeYen: number;
  sizeM2: number;
  layout: string;
  bedrooms: number;
  built: string;
  status: "verified" | "pending";
  statusNote: string;
  checkedAt: string;
  moveIn: string;
  lease: string;
  parking: string;
  parkingYen: number | null;
  summary: string;
  attention: string[];
  fees: { label: string; value: string }[];
  photos: Media[];
  sources: Source[];
  sourceUrl: string;
  commute: null | {
    mode: "bicycling" | "transit";
    minutes: number;
    distanceKm: number;
    ascentM: number;
    slowMinutes: number;
    note: string;
    url: string;
    observedAt: string;
    image: Media;
  };
}

export interface Filters {
  min: number;
  max: number;
  age: number | null;
  commute: number | null;
  includePending: boolean;
  favoritesOnly: boolean;
  sort: "rent" | "commute" | "area" | "newest";
}

export const DEFAULT_FILTERS: Filters = {
  min: 15,
  max: 30,
  age: 20,
  commute: 20,
  includePending: false,
  favoritesOnly: false,
  sort: "rent",
};

export function ageYears(built: string, today = new Date()): number {
  const [year, month] = built.split("-").map(Number);
  return (
    (today.getFullYear() * 12 + today.getMonth() - year * 12 - month + 1) / 12
  );
}

export function withinAge(
  built: string,
  years: number,
  today = new Date(),
): boolean {
  const [year, month] = built.split("-").map(Number);
  const boundaryYear = today.getFullYear() - years;
  const boundaryMonth = today.getMonth() + 1;
  if (year < boundaryYear || (year === boundaryYear && month < boundaryMonth))
    return false;
  if (year === boundaryYear && month === boundaryMonth && today.getDate() > 1)
    return false;
  return ageYears(built, today) >= 0;
}

export function filterHomes(
  homes: Home[],
  filters: Filters,
  favorites: string[] = [],
  today = new Date(),
): Home[] {
  return homes
    .filter((home) => {
      if (
        home.rentYen < filters.min * 10000 ||
        home.rentYen > filters.max * 10000
      )
        return false;
      if (!filters.includePending && home.status !== "verified") return false;
      if (filters.age !== null && !withinAge(home.built, filters.age, today))
        return false;
      if (
        filters.commute !== null &&
        (!home.commute || home.commute.minutes > filters.commute)
      )
        return false;
      if (filters.favoritesOnly && !favorites.includes(home.id)) return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === "commute")
        return (
          (a.commute?.minutes ?? Infinity) - (b.commute?.minutes ?? Infinity) ||
          a.rentYen - b.rentYen
        );
      if (filters.sort === "area") return b.sizeM2 - a.sizeM2;
      if (filters.sort === "newest") return b.built.localeCompare(a.built);
      return a.rentYen - b.rentYen;
    });
}

export function money(yen: number): string {
  if (yen === 0) return "无";
  return yen >= 10000
    ? `${Number((yen / 10000).toFixed(3))}万日元`
    : `${yen.toLocaleString("zh-CN")}日元`;
}

export function dateLabel(value: string, time = false): string {
  const date = new Date(
    value.length === 10 ? `${value}T12:00:00+09:00` : value,
  );
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    ...(time && value.length > 10
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : {}),
  });
}
