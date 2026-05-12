import { Pause, Play, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface TimelineSliderProps {
  articleCount: number;
  endLabel: string;
  isPlaying: boolean;
  max: number;
  min: number;
  onPlayPause: () => void;
  onRestart: () => void;
  onValueChange: (value: [number, number]) => void;
  startLabel: string;
  step: number;
  value: [number, number];
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
    <div className="fixed right-8 bottom-8 left-8 z-1000 border bg-background/95 px-4 py-3 shadow-md backdrop-blur">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-xs">
        <div className="flex items-center gap-2">
          <button
            aria-label={isPlaying ? "Pause timeline" : "Play timeline"}
            className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-foreground shadow-xs transition hover:bg-accent"
            onClick={onPlayPause}
            title={isPlaying ? "Pause timeline" : "Play timeline"}
            type="button"
          >
            {isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </button>
          <button
            aria-label="Restart timeline playback"
            className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-foreground shadow-xs transition hover:bg-accent"
            onClick={onRestart}
            title="Restart timeline playback"
            type="button"
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
        max={max}
        min={min}
        onValueChange={(nextValue) => {
          if (nextValue.length >= 2) {
            onValueChange([nextValue[0], nextValue[1]]);
          }
        }}
        step={step}
        value={value}
      />
    </div>
  );
}
