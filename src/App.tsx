import { Card } from "./components/ui/card";
import { Map as MapComponent, MapControls } from "./components/ui/map";

export default function App() {
  return (
    <main className="h-svh p-8 flex flex-col gap-8 overflow-hidden">
      <h1 className="text-4xl font-bold text-center shrink-0">Slovenski svet</h1>
      <MyMap />
    </main>
  );
}

export function MyMap() {
  return (
    <Card className="p-0 w-full flex-1 min-h-0 overflow-hidden">
      <MapComponent center={[14.5058, 46.0569]} zoom={11}>
        <MapControls />
      </MapComponent>
    </Card>
  );
}
