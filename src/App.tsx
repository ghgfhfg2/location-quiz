import { CountryQuizScreen } from "@/screens/CountryQuizScreen"
import { HeroScreen } from "@/screens/HeroScreen"
import { ModeSelectScreen, type GameMode } from "@/screens/ModeSelectScreen"
import { FindOnMapQuizScreen } from "@/screens/FindOnMapQuizScreen"
import { LearningModeScreen } from "@/screens/LearningModeScreen"
import * as React from "react"

export function App() {
  const [screen, setScreen] = React.useState<"hero" | "mode" | "country" | "find-on-map" | "learning">("hero")

  const onStart = () => setScreen("mode")
  const onBackToHero = () => setScreen("hero")

  const onSelectMode = (mode: GameMode) => {
    if (mode === "country") setScreen("country")
    if (mode === "find-on-map") setScreen("find-on-map")
    if (mode === "learning") setScreen("learning")
  }

  if (screen === "hero") {
    return <HeroScreen onStart={onStart} />
  }

  if (screen === "mode") {
    return (
      <ModeSelectScreen
        onBack={onBackToHero}
        onSelectMode={onSelectMode}
      />
    )
  }

  if (screen === "country") {
    return <CountryQuizScreen onBack={() => setScreen("mode")} />
  }

  if (screen === "find-on-map") {
    return <FindOnMapQuizScreen onBack={() => setScreen("mode")} />
  }

  return <LearningModeScreen onBack={() => setScreen("mode")} />
}

export default App;
