import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { countryMetas, getCountryDisplayName, getCountryNumericCode, type CountryMeta } from "@/lib/country-data"
import ReactCountryFlag from "react-country-flag"
import { CheckCircle2Icon, HeartIcon, Maximize2Icon, MinusIcon, PlusIcon, RefreshCwIcon, XCircleIcon } from "lucide-react"
import * as React from "react"
import { ComposableMap, Geographies, Geography, ZoomableGroup, Graticule, Sphere } from "react-simple-maps"
import { feature } from "topojson-client"

type PlayableCountry = {
  idNumeric: number
  meta: CountryMeta
}

type Feedback = "idle" | "correct" | "wrong" | "failed"

export function FindOnMapQuizScreen({
  onBack,
}: {
  onBack: () => void
}) {
  const [worldTopo, setWorldTopo] = React.useState<any | null>(null)
  const [position, setPosition] = React.useState({ coordinates: [0, 0], zoom: 1 })

  const [guessedCount, setGuessedCount] = React.useState(0)
  const [guessedIds, setGuessedIds] = React.useState<Set<number>>(() => new Set())
  const [targetCountry, setTargetCountry] = React.useState<PlayableCountry | null>(null)
  const [clickedId, setClickedId] = React.useState<number | null>(null)
  const [feedback, setFeedback] = React.useState<Feedback>("idle")
  const [attempts, setAttempts] = React.useState(0)
  const [isGameOver, setIsGameOver] = React.useState(false)
  const MAX_ATTEMPTS = 3

  const playable = React.useMemo<PlayableCountry[]>(() => {
    if (!worldTopo) return []
    const byNumeric = new Map<number, CountryMeta>()
    for (const c of countryMetas) {
      const n = getCountryNumericCode(c)
      if (n === null) continue
      byNumeric.set(n, c)
    }

    const topo = worldTopo as any
    const fc = feature(topo, topo.objects.countries) as any
    const feats: any[] = fc.features ?? []

    const out: PlayableCountry[] = []
    for (const f of feats) {
      const idNumeric = Number(f.id)
      if (!Number.isFinite(idNumeric)) continue
      const meta = byNumeric.get(idNumeric)
      if (!meta) continue
      if (!meta.cca2) continue
      out.push({ idNumeric, meta })
    }
    return out
  }, [worldTopo])

  React.useEffect(() => {
    let cancelled = false
    const url = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json"
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setWorldTopo(json)
      })
      .catch(() => {
        // Error handling could be added here if needed
      })
    return () => { cancelled = true }
  }, [])

  const pickNext = React.useCallback((currentGuessedIds?: Set<number>) => {
    if (playable.length === 0) return
    
    // 인자로 받은 currentGuessedIds가 있으면 그걸 쓰고, 없으면 상태값인 guessedIds를 사용
    const activeGuessedIds = currentGuessedIds || guessedIds
    const remaining = playable.filter(p => !activeGuessedIds.has(p.idNumeric))
    
    if (remaining.length === 0) {
      setIsGameOver(true)
      return
    }

    const idx = Math.floor(Math.random() * remaining.length)
    setTargetCountry(remaining[idx])
    setClickedId(null)
    setFeedback("idle")
    setAttempts(0)
  }, [playable, guessedIds])

  React.useEffect(() => {
    if (playable.length > 0 && !targetCountry && !isGameOver) {
      pickNext(new Set())
    }
  }, [playable.length, targetCountry, isGameOver, pickNext])

  const onReset = () => {
    setGuessedCount(0)
    setGuessedIds(new Set())
    setIsGameOver(false)
    setAttempts(0)
    pickNext()
  }

  const handleCountryClick = (geoId: number) => {
    if (!targetCountry || feedback !== "idle" || isGameOver) return
    // 이미 맞춘 국가는 다시 클릭하지 않도록 처리
    if (guessedIds.has(geoId)) return

    setClickedId(geoId)
    if (geoId === targetCountry.idNumeric) {
      setFeedback("correct")
      setGuessedCount(prev => prev + 1)
      const nextGuessed = new Set(guessedIds)
      nextGuessed.add(geoId)
      setGuessedIds(nextGuessed)
      
      window.setTimeout(() => pickNext(nextGuessed), 1000)
    } else {
      const nextAttempts = attempts + 1
      setAttempts(nextAttempts)
      if (nextAttempts >= MAX_ATTEMPTS) {
        setFeedback("failed")
        window.setTimeout(() => setIsGameOver(true), 1500)
      } else {
        setFeedback("wrong")
        window.setTimeout(() => {
          setFeedback("idle")
          setClickedId(null)
        }, 800)
      }
    }
  }

  const handleZoomIn = () => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.5, 12) }))
  const handleZoomOut = () => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }))
  const handleResetPos = () => setPosition({ coordinates: [0, 0], zoom: 1 })

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-sm text-muted-foreground">지도에서 찾기 모드</div>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">제시된 국가를 클릭하세요</h2>
              <Badge variant="secondary">{guessedCount} 맞춤</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onBack}>모드 선택</Button>
            <Button variant="outline" onClick={onReset}>
              <RefreshCwIcon className="mr-2 size-4" /> 다시 시작
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Target Display Card */}
          <Card className="bg-primary/5 border-primary/20 shadow-sm overflow-hidden">
            <CardContent className="flex items-center justify-center p-8 gap-8">
              {targetCountry ? (
                <>
                  <div className="text-7xl sm:text-8xl shadow-sm rounded-lg overflow-hidden border">
                    <ReactCountryFlag
                      countryCode={targetCountry.meta.cca2!}
                      svg
                      style={{ width: '1.5em', height: '1.1em' }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1 uppercase tracking-widest font-semibold">찾아야 할 국가</p>
                    <h3 className="text-4xl sm:text-6xl font-black text-primary">
                      {getCountryDisplayName(targetCountry.meta)}
                    </h3>
                  </div>
                </>
              ) : (
                <div className="h-24 flex items-center justify-center text-muted-foreground animate-pulse">국가 불러오는 중...</div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
            {/* Map Card */}
            <Card className="relative overflow-hidden h-[65vh]">
              <div className="absolute top-4 left-4 z-10">
                 <span className="inline-flex items-center gap-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full border shadow-sm text-sm font-medium">
                  {feedback === "idle" && !isGameOver && (
                    <div className="flex gap-1">
                      {[...Array(MAX_ATTEMPTS)].map((_, i) => (
                        <HeartIcon key={i} className={cn("size-4 transition-colors", i < MAX_ATTEMPTS - attempts ? "fill-rose-500 text-rose-500" : "fill-muted text-muted")} />
                      ))}
                    </div>
                  )}
                  {feedback === "correct" && <span className="text-emerald-600 flex items-center gap-1 font-bold animate-bounce"><CheckCircle2Icon className="size-4" /> 정답입니다!</span>}
                  {feedback === "wrong" && <span className="text-rose-600 flex items-center gap-1 font-bold animate-shake"><XCircleIcon className="size-4" /> 틀렸습니다!</span>}
                  {feedback === "failed" && <span className="text-rose-700 flex items-center gap-1 font-bold"><XCircleIcon className="size-4" /> 게임 종료</span>}
                </span>
              </div>

              <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                <Button variant="secondary" size="icon" onClick={handleZoomIn} className="bg-background/80 backdrop-blur shadow-sm"><PlusIcon className="size-5" /></Button>
                <Button variant="secondary" size="icon" onClick={handleZoomOut} className="bg-background/80 backdrop-blur shadow-sm"><MinusIcon className="size-5" /></Button>
                <Button variant="secondary" size="icon" onClick={handleResetPos} className="bg-background/80 backdrop-blur shadow-sm"><Maximize2Icon className="size-5" /></Button>
              </div>

              <CardContent className="p-0 h-full bg-card/20">
                {!worldTopo ? (
                   <div className="h-full w-full flex items-center justify-center text-muted-foreground">지도를 불러오는 중입니다...</div>
                ) : (
                  <ComposableMap projection="geoMercator" projectionConfig={{ scale: 140 }} className="h-full w-full outline-none">
                    <ZoomableGroup zoom={position.zoom} center={position.coordinates as [number, number]} onMoveEnd={setPosition} maxZoom={12}>
                      <Sphere id="sphere" fill="oklch(0.92 0.04 230)" stroke="var(--border)" strokeWidth={0.5} />
                      <Graticule stroke="var(--border)" strokeWidth={0.2 / position.zoom} step={[15, 15]} />
                      <Geographies geography={worldTopo}>
                        {({ geographies }: { geographies: any[] }) => geographies.map((geo: any) => {
                          const idNumeric = Number(geo.id)
                          
                          const isClicked = clickedId === idNumeric
                          const isGuessed = guessedIds.has(idNumeric)
                          const isTarget = feedback === "failed" && idNumeric === targetCountry?.idNumeric
                          
                          const fill = isClicked
                            ? (feedback === "correct" ? "oklch(0.72 0.18 145)" : "oklch(0.6 0.18 20)")
                            : isGuessed
                              ? "oklch(0.72 0.18 145 / 0.7)" // 이미 맞춘 국가는 약간 투명한 초록색
                              : isTarget ? "var(--primary)" : "var(--background)"
                          
                          const stroke = isClicked || isGuessed || isTarget ? "white" : "var(--border)"
                          const strokeWidth = (isClicked || isGuessed || isTarget ? 0.8 : 0.3) / position.zoom

                          return (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              fill={fill}
                              stroke={stroke}
                              strokeWidth={strokeWidth}
                              onClick={() => handleCountryClick(idNumeric)}
                              className="outline-none"
                              style={{
                                default: { outline: "none", transition: "fill 0.2s" },
                                hover: { 
                                  outline: "none",
                                  fill: isGuessed ? "oklch(0.72 0.18 145)" : "var(--muted)", 
                                  cursor: isGuessed ? "default" : "pointer", 
                                  transition: "fill 0.2s" 
                                },
                                pressed: { outline: "none", fill: isGuessed ? "oklch(0.72 0.18 145)" : "var(--primary-foreground)" }
                              }}
                            />
                          )
                        })}
                      </Geographies>
                    </ZoomableGroup>
                  </ComposableMap>
                )}
              </CardContent>
            </Card>

            {/* Instruction Side Card */}
            <Card className="h-fit">
              <CardHeader><CardTitle className="text-lg">게임 방법</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-4">
                <p>1. 화면 상단에 제시된 <strong>국기</strong>와 <strong>이름</strong>을 확인하세요.</p>
                <p>2. 지도에서 해당 국가의 영역을 찾아 <strong>클릭</strong>하세요.</p>
                <p>3. 총 <strong>3번의 기회</strong>가 주어지며, 모두 소진하면 게임이 종료됩니다.</p>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between font-medium text-foreground">
                    <span>맞춘 개수</span>
                    <span className="text-primary text-xl">{guessedCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-6 animate-in fade-in duration-300">
          <Card className="w-full max-w-md shadow-2xl border-primary/20 scale-in-center">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 bg-rose-100 text-rose-600 rounded-full p-3 w-fit">
                <XCircleIcon size={48} />
              </div>
              <CardTitle className="text-4xl font-black text-rose-600 tracking-tighter">GAME OVER</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 text-center pt-4">
              <div>
                <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">최종 기록</p>
                <p className="text-7xl font-black text-primary mt-2 tabular-nums">
                  {guessedCount}
                </p>
                <p className="text-sm text-muted-foreground mt-1">개의 국가를 찾았습니다</p>
              </div>
              
              <div className="flex flex-col gap-3">
                <Button size="lg" className="w-full text-lg h-14 font-bold rounded-xl shadow-lg shadow-primary/20" onClick={onReset}>
                  <RefreshCwIcon className="mr-2 size-5" /> 다시 도전하기
                </Button>
                <Button size="lg" variant="outline" className="w-full text-lg h-14 font-bold rounded-xl" onClick={onBack}>
                  메인으로 돌아가기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

