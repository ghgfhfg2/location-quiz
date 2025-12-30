import { Badge } from "@/components/ui/badge";
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
  CheckCircle2Icon,
  HeartIcon,
  Maximize2Icon,
  MinusIcon,
  PlusIcon,
  RefreshCwIcon,
  XCircleIcon,
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
import {
  getCountriesFeatureCollectionWithSomalilandMerged,
  normalizeSomaliaIdFromGeography,
  type MinimalFeature,
} from "@/lib/worldGeographies";

type PlayableCountry = {
  idNumeric: number;
  meta: CountryMeta;
};

type Feedback = "idle" | "correct" | "wrong" | "failed";

type RsmGeo = MinimalFeature & { rsmKey: string };

export function CountryQuizScreen({ onBack }: { onBack: () => void }) {
  const [worldTopo, setWorldTopo] = React.useState<unknown | null>(null);
  const [worldTopoError, setWorldTopoError] = React.useState<string | null>(
    null
  );
  const [position, setPosition] = React.useState({
    coordinates: [0, 0],
    zoom: 1,
  });

  const handleZoomIn = () => {
    if (position.zoom >= 40) return;
    setPosition((pos) => ({ ...pos, zoom: Math.min(pos.zoom * 1.5, 40) }));
  };

  const handleZoomOut = () => {
    if (position.zoom <= 1) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 1.5 }));
  };

  const handleReset = () => {
    setPosition({ coordinates: [0, 0], zoom: 1 });
  };

  const handleMoveEnd = (newPosition: {
    coordinates: [number, number];
    zoom: number;
  }) => {
    setPosition(newPosition);
  };

  React.useEffect(() => {
    let cancelled = false;
    // 110m -> 50m 정밀 지도로 교체
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

  const countriesFc = React.useMemo(
    () => getCountriesFeatureCollectionWithSomalilandMerged(worldTopo),
    [worldTopo]
  );

  const playable = React.useMemo<PlayableCountry[]>(() => {
    if (countriesFc.features.length === 0) return [];
    const byNumeric = new Map<number, CountryMeta>();
    for (const c of countryMetas) {
      const n = getCountryNumericCode(c);
      if (n === null) continue;
      byNumeric.set(n, c);
    }

    const out: PlayableCountry[] = [];
    for (const f of countriesFc.features) {
      // 1. 형상 데이터가 없으면 제외
      if (
        !f.geometry ||
        (f.geometry.type === "MultiPolygon" &&
          Array.isArray(f.geometry.coordinates) &&
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
  }, [countriesFc.features]);

  const [guessed, setGuessed] = React.useState<Set<number>>(() => new Set());
  const [targetId, setTargetId] = React.useState<number | null>(null);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [feedback, setFeedback] = React.useState<Feedback>("idle");
  const [query, setQuery] = React.useState("");
  const [attempts, setAttempts] = React.useState(0);
  const [isGameOver, setIsGameOver] = React.useState(false);
  const [showResultModal, setShowResultModal] = React.useState(false);
  const MAX_ATTEMPTS = 3;

  const guessedCount = guessed.size;
  const totalCount = playable.length;

  const target = React.useMemo(() => {
    if (targetId === null) return null;
    return playable.find((p) => p.idNumeric === targetId) ?? null;
  }, [playable, targetId]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return playable;
    return playable.filter((p) =>
      getCountryDisplayName(p.meta).toLowerCase().includes(q)
    );
  }, [playable, query]);

  const pickNext = React.useCallback(
    (nextGuessed: Set<number>) => {
      const nextRemaining = playable.filter(
        (p) => !nextGuessed.has(p.idNumeric)
      );
      if (nextRemaining.length === 0) {
        setTargetId(null);
        return;
      }
      const idx = Math.floor(Math.random() * nextRemaining.length);
      const nextCountry = nextRemaining[idx]!;
      setTargetId(nextCountry.idNumeric);
      setSelectedId(null);
      setFeedback("idle");
      setAttempts(0);

      // 해당 국가로 지도 중심 이동
      if (nextCountry.meta.latlng) {
        const [lat, lng] = nextCountry.meta.latlng;
        setPosition((pos) => ({
          ...pos,
          coordinates: [lng, lat],
          // 어느 정도 확대한 상태로 보여주기 (너무 작으면 보기 힘드므로)
          zoom: Math.max(pos.zoom, 2),
        }));
      }
    },
    [playable]
  );

  React.useEffect(() => {
    if (playable.length === 0) return;
    if (targetId !== null) return;
    if (guessed.size === 0) pickNext(new Set());
  }, [pickNext, playable.length, targetId, guessed.size]);

  const onReset = () => {
    const empty = new Set<number>();
    setGuessed(empty);
    setQuery("");
    setIsGameOver(false);
    setShowResultModal(false);
    setAttempts(0);
    pickNext(empty);
  };

  const onSelect = (idNumeric: number) => {
    if (!target || feedback !== "idle" || isGameOver) return;
    if (guessed.has(idNumeric)) return;

    setSelectedId(idNumeric);
    if (idNumeric === target.idNumeric) {
      setFeedback("correct");
      const next = new Set(guessed);
      next.add(idNumeric);
      setGuessed(next);
      window.setTimeout(() => pickNext(next), 800);
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      if (nextAttempts >= MAX_ATTEMPTS) {
        setFeedback("failed");
        // 3번 틀리면 정답을 잠시 보여준 후 게임 오버
        window.setTimeout(() => {
          setIsGameOver(true);
          setShowResultModal(true);
        }, 1500);
      } else {
        setFeedback("wrong");
        window.setTimeout(() => {
          setFeedback("idle");
          setSelectedId(null);
        }, 650);
      }
    }
  };

  const isComplete = guessedCount > 0 && guessedCount === totalCount;

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">국가명 맞추기</div>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                국기를 선택하세요
              </h2>
              <Badge variant="secondary">
                {guessedCount} / {totalCount}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBack}>
              모드 선택
            </Button>
            <Button variant="outline" onClick={onReset}>
              <RefreshCwIcon data-icon="inline-start" />
              다시 시작
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          {isGameOver && showResultModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
              <Card className="w-full max-w-md shadow-2xl border-primary/20 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4 rounded-full"
                  onClick={() => setShowResultModal(false)}
                >
                  <XCircleIcon className="size-6 text-muted-foreground" />
                </Button>
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl font-bold text-rose-600">
                    GAME OVER
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                  {target && (
                    <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 border border-muted">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                        정답이었던 나라
                      </p>
                      <div className="text-5xl shadow-sm rounded overflow-hidden border bg-background">
                        <ReactCountryFlag
                          countryCode={target.meta.cca2!}
                          svg
                          style={{ width: "1.5em", height: "1.1em" }}
                        />
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {getCountryDisplayName(target.meta)}
                      </p>
                    </div>
                  )}
                  <div className="py-2">
                    <p className="text-muted-foreground text-sm">최종 점수</p>
                    <p className="text-5xl font-black text-primary mt-1">
                      {guessedCount}{" "}
                      <span className="text-2xl font-normal text-muted-foreground">
                        / {totalCount}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      size="lg"
                      className="w-full text-lg h-12"
                      onClick={onReset}
                    >
                      <RefreshCwIcon className="mr-2 size-5" /> 다시 도전하기
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full text-lg h-12"
                      onClick={onBack}
                    >
                      메인으로 돌아가기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="text-base font-medium text-muted-foreground">
                  지도에 표시된 국가를 맞춰요
                </span>
                <span className="inline-flex items-center gap-1 text-sm">
                  {feedback === "idle" && !isGameOver && (
                    <div className="flex gap-0.5 mr-2">
                      {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                        <HeartIcon
                          key={i}
                          className={cn(
                            "size-4 transition-colors",
                            i < MAX_ATTEMPTS - attempts
                              ? "fill-rose-500 text-rose-500"
                              : "fill-muted text-muted"
                          )}
                        />
                      ))}
                    </div>
                  )}
                  {feedback === "correct" && (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2Icon className="size-4" /> 정답!
                    </span>
                  )}
                  {feedback === "wrong" && (
                    <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                      <XCircleIcon className="size-4" /> 다시 시도 (
                      {MAX_ATTEMPTS - attempts}번 남음)
                    </span>
                  )}
                  {feedback === "failed" && (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                      <XCircleIcon className="size-4" /> 기회 소진! 게임 종료...
                    </span>
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative rounded-2xl border bg-card/50 p-2 overflow-hidden">
                {worldTopoError ? (
                  <div className="flex h-[52vh] w-full items-center justify-center p-6 text-sm text-muted-foreground">
                    지도를 불러오지 못했어요. ({worldTopoError})
                  </div>
                ) : !worldTopo ? (
                  <div className="flex h-[52vh] w-full items-center justify-center p-6 text-sm text-muted-foreground">
                    지도 불러오는 중...
                  </div>
                ) : (
                  <>
                    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        onClick={handleZoomIn}
                        title="확대"
                        className="bg-background/80 backdrop-blur shadow-sm"
                      >
                        <PlusIcon className="size-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        onClick={handleZoomOut}
                        title="축소"
                        className="bg-background/80 backdrop-blur shadow-sm"
                      >
                        <MinusIcon className="size-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon-sm"
                        onClick={handleReset}
                        title="초기화"
                        className="bg-background/80 backdrop-blur shadow-sm"
                      >
                        <Maximize2Icon className="size-4" />
                      </Button>
                    </div>

                    <ComposableMap
                      projection="geoMercator" // 왜곡이 적고 익숙한 메르카토르 투영법
                      projectionConfig={{ scale: 140 }}
                      className="h-[52vh] w-full focus:outline-none"
                    >
                      <ZoomableGroup
                        zoom={position.zoom}
                        center={position.coordinates as [number, number]}
                        onMoveEnd={handleMoveEnd}
                        maxZoom={40}
                      >
                        {/* 지도 배경 구 효과 (바다) */}
                        <Sphere
                          id="sphere"
                          fill="oklch(0.92 0.04 230)"
                          stroke="var(--border)"
                          strokeWidth={0.5}
                        />
                        {/* 위도/경도 격자선 추가 (정교함 상승) */}
                        <Graticule
                          stroke="var(--border)"
                          strokeWidth={0.2 / position.zoom}
                          fill="none"
                          step={[15, 15]}
                        />

                        <Geographies geography={countriesFc}>
                          {({
                            geographies: renderedGeos,
                          }: {
                            geographies: RsmGeo[];
                          }) =>
                            renderedGeos.map((geo) => {
                              const idNumeric =
                                normalizeSomaliaIdFromGeography(geo) ??
                                Number(geo.id);

                              const isGuessed = guessed.has(idNumeric);
                              const isTarget =
                                targetId !== null && idNumeric === targetId;
                              const fill = isTarget
                                ? "var(--primary)"
                                : isGuessed
                                ? "oklch(0.72 0.18 145)"
                                : "var(--background)";
                              const stroke = isTarget
                                ? "var(--primary)"
                                : "#999";
                              const strokeWidth =
                                (isTarget ? 0.8 : 0.4) / position.zoom;
                              const fillOpacity = isTarget
                                ? 1
                                : isGuessed
                                ? 0.6
                                : 0.8;
                              return (
                                <Geography
                                  key={geo.rsmKey}
                                  geography={geo}
                                  fill={fill}
                                  stroke={stroke}
                                  strokeWidth={strokeWidth}
                                  className="outline-none"
                                  style={{
                                    default: { outline: "none", fillOpacity },
                                    hover: {
                                      outline: "none",
                                      fillOpacity: 1,
                                      cursor: "pointer",
                                      strokeWidth: 0.8 / position.zoom,
                                    },
                                    pressed: {
                                      outline: "none",
                                      fillOpacity: 1,
                                    },
                                  }}
                                />
                              );
                            })
                          }
                        </Geographies>
                      </ZoomableGroup>
                    </ComposableMap>
                  </>
                )}
              </div>

              {isComplete && (
                <div className="mt-4 rounded-2xl border bg-emerald-500/10 p-4 text-sm">
                  <div className="font-medium text-emerald-700">클리어!</div>
                  <div className="mt-1 text-muted-foreground">
                    모든 국가를 맞췄어. 다시 시작해서 기록을 단축해봐.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">국기 선택</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="국가 검색 (한글/영문)"
                />
              </div>

              <div className="mt-3 max-h-[52vh] overflow-auto rounded-2xl border bg-card/40 p-3">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((p) => {
                    const isGuessed = guessed.has(p.idNumeric);
                    const isSelected = selectedId === p.idNumeric;
                    const isWrongSelected = feedback === "wrong" && isSelected;
                    const isRightSelected =
                      (feedback === "correct" && isSelected) ||
                      (feedback === "failed" && p.idNumeric === targetId);
                    const isFailedSelected =
                      feedback === "failed" &&
                      isSelected &&
                      p.idNumeric !== targetId;

                    return (
                      <button
                        key={p.idNumeric}
                        type="button"
                        onClick={() => onSelect(p.idNumeric)}
                        disabled={
                          isGuessed || targetId === null || feedback !== "idle"
                        }
                        className={cn(
                          "group relative flex flex-col items-center justify-center gap-1 rounded-xl border bg-background/70 px-2 py-2 text-left transition",
                          "hover:bg-muted/50",
                          "disabled:cursor-not-allowed disabled:opacity-60",
                          isGuessed && "opacity-55",
                          isSelected && "ring-2 ring-primary",
                          isWrongSelected && "ring-2 ring-rose-500",
                          isFailedSelected && "ring-2 ring-rose-700",
                          isRightSelected &&
                            "ring-2 ring-emerald-500 animate-pulse"
                        )}
                        title={getCountryDisplayName(p.meta)}
                      >
                        <div
                          className={cn("text-2xl", isGuessed && "opacity-70")}
                        >
                          <ReactCountryFlag
                            countryCode={p.meta.cca2!}
                            svg
                            style={{
                              width: "1.6em",
                              height: "1.2em",
                              borderRadius: "0.2em",
                              boxShadow: "0 0 0 1px var(--border) inset",
                            }}
                          />
                        </div>
                        <div className="w-full truncate text-[11px] text-muted-foreground">
                          {getCountryDisplayName(p.meta)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                - 정답은 <span className="text-foreground">국기 선택</span>
                으로만 입력해요.
                <br />- 맞춘 국기는{" "}
                <span className="text-foreground">반투명</span> 상태로 계속
                유지돼요.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
