import { Slider } from "@/components/ui/slider"
import { Pause, Play, RotateCcw } from "lucide-react"

type TimelineSliderProps = {
  value: [number, number]
  min: number
  max: number
  step: number
  startLabel: string
  endLabel: string
  articleCount: number
  isPlaying: boolean
  onPlayPause: () => void
  onRestart: () => void
  onValueChange: (value: [number, number]) => void
}

export function TimelineSlider({
  value,
  min,
  max,
  step,
  startLabel,
  endLabel,
  articleCount,
  isPlaying,
  onPlayPause,
  onRestart,
  onValueChange,
}: TimelineSliderProps) {
  return (
    <div className="fixed right-8 bottom-8 left-8 z-[1000] border bg-background/95 px-4 py-3 shadow-md backdrop-blur">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPlayPause}
            title={isPlaying ? "Pause timeline" : "Play timeline"}
            aria-label={isPlaying ? "Pause timeline" : "Play timeline"}
            className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-foreground shadow-xs transition hover:bg-accent"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            type="button"
            onClick={onRestart}
            title="Restart timeline playback"
            aria-label="Restart timeline playback"
            className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-foreground shadow-xs transition hover:bg-accent"
          >
            <RotateCcw className="size-4" />
          </button>
          <span className="hidden sm:inline">
            {isPlaying ? "Predvajanje casovnice" : "Casovnica"}
          </span>
        </div>

        <span className="font-medium text-foreground">
          {startLabel} - {endLabel}
        </span>
        <span>{articleCount.toLocaleString("sl-SI")} novic</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue.length >= 2) {
            onValueChange([nextValue[0], nextValue[1]])
          }
        }}
      />
    </div>
  )
}
