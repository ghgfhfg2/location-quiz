import { Button } from "@/components/ui/button"
import { Globe2Icon, PlayIcon } from "lucide-react"
import * as React from "react"

export function HeroScreen({ onStart }: { onStart: () => void }) {
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      el.style.setProperty("--mx", `${Math.round(x * 100)}%`)
      el.style.setProperty("--my", `${Math.round(y * 100)}%`)
    }

    el.addEventListener("pointermove", onMove)
    return () => el.removeEventListener("pointermove", onMove)
  }, [])

  return (
    <div
      ref={ref}
      className="relative min-h-dvh overflow-hidden bg-background"
      style={
        {
          // default spotlight position
          ["--mx" as never]: "50%",
          ["--my" as never]: "40%",
        } as React.CSSProperties
      }
    >
      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -inset-[40%] bg-[radial-gradient(circle_at_var(--mx)_var(--my),oklch(0.59_0.20_277/0.30),transparent_42%),radial-gradient(circle_at_15%_85%,oklch(0.72_0.18_330/0.18),transparent_46%),radial-gradient(circle_at_85%_20%,oklch(0.75_0.17_230/0.18),transparent_46%)] blur-2xl" />
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(circle_at_50%_35%,black,transparent_68%)]" />
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(color-mix(in_oklch,var(--foreground)_18%,transparent)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(circle_at_50%_35%,black,transparent_65%)]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-center justify-center px-6 py-16">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-sm text-muted-foreground backdrop-blur">
          <Globe2Icon className="size-4" />
          지도 기반 지역명(나라/도시) 맞추기
        </div>

        <div className="w-full rounded-3xl border bg-card/70 p-8 shadow-sm backdrop-blur md:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
              지도만 보고 <span className="text-primary">국가</span>를 맞춰보자
            </h1>
            <p className="mt-4 text-pretty text-muted-foreground md:text-lg">
              랜덤으로 표시되는 국가 영역을 보고, 아래 국기 리스트에서 정답 국기를 선택해
              맞추는 퀴즈야.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" onClick={onStart} className="h-11 px-6">
                <PlayIcon data-icon="inline-start" />
                게임 시작
              </Button>
              <div className="text-xs text-muted-foreground">
                도시/랜덤 모드는 준비 중
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-muted-foreground">
          팁: 국기 리스트는 맞춘 국가가 계속 남아있고, 모두 맞추면 클리어!
        </div>
      </div>
    </div>
  )
}


