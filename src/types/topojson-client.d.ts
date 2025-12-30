declare module "topojson-client" {
  // The repo already consumes topojson-client but the available type declarations
  // are incomplete in this workspace (notably missing `merge`).
  //
  // We add a minimal signature that is sufficient for our usage.
  export function merge(topology: unknown, objects: unknown[]): unknown;
}


