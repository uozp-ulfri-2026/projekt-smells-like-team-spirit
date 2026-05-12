import { Slider } from "@/components/ui/slider";

interface TimelineSliderProps {
  articleCount: number;
  endLabel: string;
  max: number;
  min: number;
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
  onValueChange,
}: TimelineSliderProps) {
  return (
    <div className="fixed right-8 bottom-8 left-8 z-1000 border bg-background/95 px-4 py-3 shadow-md backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-3 text-muted-foreground text-xs">
        <span className="font-medium text-foreground">{startLabel}</span>
        <span>{articleCount.toLocaleString("sl-SI")} novic</span>
        <span className="font-medium text-foreground">{endLabel}</span>
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
