declare module "world-countries" {
  const value: any;
  export default value;
}

declare module "world-atlas/countries-110m.json" {
  const value: any;
  export default value;
}

declare module "react-simple-maps" {
  export const ComposableMap: any;
  export const Geographies: any;
  export const Geography: any;
  export const ZoomableGroup: any;
  export const Graticule: any;
  export const Sphere: any;
  export const Marker: any;
  export const Annotation: any;
  export const Line: any;
}

declare module "topojson-client" {
  export function feature(topology: any, object: any): any;
  export function mesh(topology: any, object: any, filter?: any): any;
  export function neighbors(objects: any[]): any[][];
}
