import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FlagIcon, MapIcon, BookOpenIcon } from "lucide-react";
import { AdSense } from "@/components/AdSense";

export type GameMode = "country" | "find-on-map" | "learning";

export function ModeSelectScreen({
  onBack,
  onSelectMode,
}: {
  onBack: () => void;
  onSelectMode: (mode: GameMode) => void;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">모드 선택</div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              어떤 모드를 시작할까?
            </h2>
          </div>
          <Button variant="outline" onClick={onBack}>
            메인으로
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="relative overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlagIcon className="size-5 text-primary" />
                국가명 맞추기
              </CardTitle>
              <CardDescription>
                지도에 표시된 국가 영역을 보고 국기를 선택해 정답을 맞춰요.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex-1">
              - 전 세계 랜덤 출제
              <br />
              - 맞춘 국기는 계속 유지
              <br />- 3번의 기회 제공
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => onSelectMode("country")}
              >
                시작하기
              </Button>
            </CardFooter>
          </Card>

          <Card className="relative overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapIcon className="size-5 text-primary" />
                지도에서 찾기
              </CardTitle>
              <CardDescription>
                제시된 국기와 이름을 보고 지도에서 해당 국가를 직접 클릭하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex-1">
              - 국기/이름 랜덤 제시
              <br />
              - 지도 영역 직접 클릭
              <br />- 3번의 기회 제공
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => onSelectMode("find-on-map")}
              >
                시작하기
              </Button>
            </CardFooter>
          </Card>

          <Card className="relative overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenIcon className="size-5 text-primary" />
                학습 모드
              </CardTitle>
              <CardDescription>
                지도를 자유롭게 클릭하거나 목록에서 국가를 선택해 정보를
                학습하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground flex-1">
              - 국가 자유 탐색
              <br />
              - 지도 클릭 시 정보 표시
              <br />- 목록에서 위치 찾기
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => onSelectMode("learning")}
              >
                학습하기
              </Button>
            </CardFooter>
          </Card>
        </div>
        <AdSense />
      </div>
    </div>
  );
}
