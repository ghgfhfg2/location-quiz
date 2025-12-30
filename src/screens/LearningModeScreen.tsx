import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  countryMetas,
  getCountryDisplayName,
  getCountryNumericCode,
  type CountryMeta,
} from "@/lib/country-data";
import ReactCountryFlag from "react-country-flag";
import {
  Maximize2Icon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  InfoIcon,
} from "lucide-react";
import * as React from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Graticule,
  Sphere,
} from "react-simple-maps";
import { feature } from "topojson-client";

type PlayableCountry = {
  idNumeric: number;
  meta: CountryMeta;
};

export function LearningModeScreen({ onBack }: { onBack: () => void }) {
  const [worldTopo, setWorldTopo] = React.useState<any | null>(null);
  const [worldTopoError, setWorldTopoError] = React.useState<string | null>(
    null
  );
  const [position, setPosition] = React.useState({
    coordinates: [0, 0],
    zoom: 1,
  });
  const [selectedCountry, setSelectedCountry] =
    React.useState<PlayableCountry | null>(null);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    const url = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load map: ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setWorldTopo(json);
      })
      .catch((e) => {
        if (cancelled) return;
        setWorldTopoError(
          e instanceof Error ? e.message : "Failed to load map"
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const playable = React.useMemo<PlayableCountry[]>(() => {
    if (!worldTopo) return [];
    const byNumeric = new Map<number, CountryMeta>();
    for (const c of countryMetas) {
      const n = getCountryNumericCode(c);
      if (n === null) continue;
      byNumeric.set(n, c);
    }

    const topo = worldTopo as any;
    const fc = feature(topo, topo.objects.countries) as any;
    const feats: any[] = fc.features ?? [];

    const out: PlayableCountry[] = [];
    for (const f of feats) {
      // 1. 형상 데이터가 없으면 제외
      if (
        !f.geometry ||
        (f.geometry.type === "MultiPolygon" &&
          f.geometry.coordinates.length === 0)
      )
        continue;

      const idNumeric = Number(f.id);
      if (!Number.isFinite(idNumeric)) continue;
      const meta = byNumeric.get(idNumeric);
      if (!meta) continue;
      if (!meta.cca2) continue;
      out.push({ idNumeric, meta });
    }

    out.sort((a, b) =>
      getCountryDisplayName(a.meta).localeCompare(
        getCountryDisplayName(b.meta),
        "ko"
      )
    );

    return out;
  }, [worldTopo]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return playable;
    return playable.filter((p) =>
      getCountryDisplayName(p.meta).toLowerCase().includes(q)
    );
  }, [playable, query]);

  const handleCountryClick = (geo: any) => {
    const idNumeric = Number(geo.id);
    const found = playable.find((p) => p.idNumeric === idNumeric);
    if (found) {
      setSelectedCountry(found);
    }
  };

  const handleListSelect = (country: PlayableCountry) => {
    setSelectedCountry(country);
    // 리스트에서 선택 시 해당 국가가 잘 보이도록 이동
    if (country.meta.latlng) {
      const [lat, lng] = country.meta.latlng;
      setPosition((pos) => ({
        ...pos,
        coordinates: [lng, lat],
        zoom: Math.max(pos.zoom, 2),
      }));
    }
  };

  const handleZoomIn = () =>
    setPosition((p) => ({ ...p, zoom: Math.min(p.zoom * 1.5, 12) }));
  const handleZoomOut = () =>
    setPosition((p) => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }));
  const handleResetPos = () => setPosition({ coordinates: [0, 0], zoom: 1 });

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-sm text-muted-foreground">학습 모드</div>
            <h2 className="text-2xl font-semibold tracking-tight">
              국가 정보를 확인하세요
            </h2>
          </div>
          <Button variant="outline" onClick={onBack}>
            모드 선택
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Top Info Display (Find on Map UI Reuse) */}
          <Card className="bg-primary/5 border-primary/20 shadow-sm overflow-hidden">
            <CardContent className="flex items-center justify-center p-8 gap-8">
              {selectedCountry ? (
                <>
                  <div className="text-7xl sm:text-8xl shadow-sm rounded-lg overflow-hidden border bg-background">
                    <ReactCountryFlag
                      countryCode={selectedCountry.meta.cca2!}
                      svg
                      style={{ width: "1.5em", height: "1.1em" }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1 uppercase tracking-widest font-semibold">
                      선택된 국가
                    </p>
                    <h3 className="text-4xl sm:text-6xl font-black text-primary">
                      {getCountryDisplayName(selectedCountry.meta)}
                    </h3>
                  </div>
                </>
              ) : (
                <div className="h-24 flex items-center justify-center text-muted-foreground gap-2">
                  <InfoIcon className="size-6" />
                  지도에서 국가를 클릭하거나 목록에서 선택하세요
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 items-start">
            {/* Map Area */}
            <Card className="relative overflow-hidden h-[65vh]">
              <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleZoomIn}
                  className="bg-background/80 backdrop-blur shadow-sm"
                >
                  <PlusIcon className="size-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleZoomOut}
                  className="bg-background/80 backdrop-blur shadow-sm"
                >
                  <MinusIcon className="size-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleResetPos}
                  className="bg-background/80 backdrop-blur shadow-sm"
                >
                  <Maximize2Icon className="size-5" />
                </Button>
              </div>

              <CardContent className="p-0 h-full">
                {worldTopoError ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    {worldTopoError}
                  </div>
                ) : !worldTopo ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    지도를 불러오는 중...
                  </div>
                ) : (
                  <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{ scale: 140 }}
                    className="h-full w-full outline-none"
                  >
                    <ZoomableGroup
                      zoom={position.zoom}
                      center={position.coordinates as [number, number]}
                      onMoveEnd={setPosition}
                      maxZoom={12}
                    >
                      <Sphere
                        id="sphere"
                        fill="oklch(0.92 0.04 230)"
                        stroke="var(--border)"
                        strokeWidth={0.5}
                      />
                      <Graticule
                        stroke="var(--border)"
                        strokeWidth={0.2 / position.zoom}
                        step={[15, 15]}
                      />
                      <Geographies geography={worldTopo}>
                        {({ geographies }: { geographies: any[] }) =>
                          geographies.map((geo: any) => {
                            const idNumeric = Number(geo.id);

                            const isSelected =
                              selectedCountry?.idNumeric === idNumeric;

                            return (
                              <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                fill={
                                  isSelected
                                    ? "var(--primary)"
                                    : "var(--background)"
                                }
                                stroke={isSelected ? "white" : "var(--border)"}
                                strokeWidth={
                                  (isSelected ? 0.8 : 0.3) / position.zoom
                                }
                                onClick={() => handleCountryClick(geo)}
                                className="outline-none"
                                style={{
                                  default: {
                                    outline: "none",
                                    transition: "fill 0.2s",
                                    fillOpacity: isSelected ? 1 : 0.8,
                                  },
                                  hover: {
                                    outline: "none",
                                    fill: "var(--muted)",
                                    cursor: "pointer",
                                    fillOpacity: 1,
                                  },
                                  pressed: {
                                    outline: "none",
                                    fill: "var(--primary-foreground)",
                                  },
                                }}
                              />
                            );
                          })
                        }
                      </Geographies>
                    </ZoomableGroup>
                  </ComposableMap>
                )}
              </CardContent>
            </Card>

            {/* Country List (Country Quiz UI Reuse) */}
            <Card className="flex flex-col h-[65vh] overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">국가 목록</CardTitle>
                <div className="relative mt-2">
                  <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="국가 검색..."
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-3 pt-0">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((p) => {
                    const isSelected =
                      selectedCountry?.idNumeric === p.idNumeric;
                    return (
                      <button
                        key={p.idNumeric}
                        onClick={() => handleListSelect(p)}
                        className={cn(
                          "group relative flex flex-col items-center justify-center gap-2 rounded-xl border bg-background px-2 py-3 text-center transition",
                          "hover:bg-muted/80",
                          isSelected &&
                            "ring-2 ring-primary bg-primary/5 border-primary/30"
                        )}
                      >
                        <div className="text-2xl shadow-sm rounded overflow-hidden">
                          <ReactCountryFlag
                            countryCode={p.meta.cca2!}
                            svg
                            style={{ width: "1.4em", height: "1em" }}
                          />
                        </div>
                        <div
                          className={cn(
                            "text-[11px] leading-tight font-medium truncate w-full",
                            isSelected
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {getCountryDisplayName(p.meta)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
