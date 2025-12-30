// Utilities for converting/normalizing the world-atlas TopoJSON into GeoJSON
// while applying app-specific overrides (e.g., merge Somaliland into Somalia).
//
// We intentionally keep types lightweight (no extra deps) and rely on runtime
// guards because the upstream data is fetched over the network.

import { feature, merge } from "topojson-client";

type JsonRecord = Record<string, unknown>;

export type MinimalGeometry = {
  type: string;
  coordinates?: unknown;
};

export type MinimalFeature = {
  type: "Feature";
  id?: string | number;
  properties?: JsonRecord;
  geometry: MinimalGeometry | null;
  // react-simple-maps adds rsmKey at runtime; we keep it optional.
  rsmKey?: string;
};

export type MinimalFeatureCollection = {
  type: "FeatureCollection";
  features: MinimalFeature[];
};

function isRecord(v: unknown): v is JsonRecord {
  return typeof v === "object" && v !== null;
}

function getId(v: unknown): string | number | null {
  if (!isRecord(v)) return null;
  const id = v.id;
  if (typeof id === "string" || typeof id === "number") return id;
  return null;
}

function getName(v: unknown): string | null {
  if (!isRecord(v)) return null;
  const props = v.properties;
  if (!isRecord(props)) return null;
  const name = props.name;
  return typeof name === "string" ? name : null;
}

function nameIncludesSomaliland(name: string | null): boolean {
  if (!name) return false;
  return name.toLowerCase().includes("somaliland");
}

function nameIsSomalia(name: string | null): boolean {
  if (!name) return false;
  return name.toLowerCase() === "somalia";
}

export function getCountriesFeatureCollectionWithSomalilandMerged(
  worldTopo: unknown
): MinimalFeatureCollection {
  if (!isRecord(worldTopo)) return { type: "FeatureCollection", features: [] };

  const objects = worldTopo.objects;
  if (!isRecord(objects)) return { type: "FeatureCollection", features: [] };

  const countriesObj = objects.countries;
  if (!isRecord(countriesObj))
    return { type: "FeatureCollection", features: [] };

  // Convert full countries object to GeoJSON features first.
  const fcUnknown = feature(worldTopo, countriesObj) as unknown;
  const fc = isRecord(fcUnknown) ? (fcUnknown as JsonRecord) : null;
  const featsUnknown = fc ? fc.features : null;
  const feats = Array.isArray(featsUnknown) ? (featsUnknown as MinimalFeature[]) : [];

  const geometriesUnknown = countriesObj.geometries;
  const geometries = Array.isArray(geometriesUnknown) ? geometriesUnknown : [];

  // Find Somalia / Somaliland geometries by robust signals.
  const somaliaGeom =
    geometries.find((g) => {
      const id = getId(g);
      const name = getName(g);
      return id === 706 || nameIsSomalia(name);
    }) ?? null;

  const somalilandGeom =
    geometries.find((g) => {
      const id = getId(g);
      const name = getName(g);
      return id === 906 || nameIncludesSomaliland(name);
    }) ?? null;

  if (!somaliaGeom || !somalilandGeom) {
    // Nothing to merge (dataset may not include Somaliland separately).
    return { type: "FeatureCollection", features: feats };
  }

  const somaliaId = getId(somaliaGeom);
  const somalilandId = getId(somalilandGeom);

  const mergedGeometry = merge(worldTopo, [somaliaGeom, somalilandGeom]) as unknown;

  const mergedFeatures = feats
    .map((f) => {
      const fid = getId(f);
      const fname = getName(f);
      const isSomalia =
        (somaliaId !== null && fid === somaliaId) || nameIsSomalia(fname);
      if (!isSomalia) return f;
      return {
        ...f,
        geometry: (isRecord(mergedGeometry) || typeof mergedGeometry === "object"
          ? (mergedGeometry as MinimalGeometry)
          : f.geometry) as MinimalGeometry,
      };
    })
    .filter((f) => {
      const fid = getId(f);
      const fname = getName(f);
      const isSomaliland =
        (somalilandId !== null && fid === somalilandId) ||
        nameIncludesSomaliland(fname);
      return !isSomaliland;
    });

  return { type: "FeatureCollection", features: mergedFeatures };
}

export function normalizeSomaliaIdFromGeography(geo: unknown): number | null {
  if (!isRecord(geo)) return null;
  const idRaw = geo.id;
  const idNumeric = typeof idRaw === "number" ? idRaw : Number(idRaw);
  if (Number.isFinite(idNumeric)) return idNumeric;

  // Fallback: if this geography is Somaliland, treat it as Somalia (706).
  const name = getName(geo);
  if (nameIncludesSomaliland(name)) return 706;
  return null;
}


