import { Card } from "./components/ui/card";
import { Map as MapComponent, MapControls } from "./components/map";
import { useState } from "react";

export default function App() {
  return (
    <main className="h-svh p-8 flex flex-col gap-8 overflow-hidden">
      <h1 className="text-4xl font-bold text-center shrink-0">Slovenski svet</h1>
      <MyMap />
    </main>
  );
}
import { ClickableCountries } from "@/components/clickable-countries";

export function MyMap() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  return (
    <Card className="p-0 w-full flex-1 min-h-0 overflow-hidden relative">

      {/* Optional: Simple floating Shadcn-like UI to show selected country */}
      {selectedCountry && (
        <div className="absolute top-4 left-4 z-10 bg-background text-foreground px-4 py-2 rounded-md shadow-md border font-semibold">
          Selected: {selectedCountry}
        </div>
      )}

      {/* MMC mostly covers Slovenia, zoom centered on SI */}
      <MapComponent center={[14.5058, 46.0569]} zoom={4}>
        <MapControls position="bottom-right" />

        {/* Drop the component right here */}
        <ClickableCountries
          onCountryClick={(country) => setSelectedCountry(country.name)}
        />

        {/* 
          HOW TO RENDER YOUR 73K ARTICLES: 
          Use mapcn's built-in cluster layer. It easily handles tens 
          of thousands of points without lagging the browser. 
        */}
        {/*  
        <MapClusterLayer
          data={mySlovenianArticlesGeoJSON}
          clusterColors={["#3b82f6", "#8b5cf6", "#d946ef"]}
        /> 
        */}
      </MapComponent>
    </Card>
  );
}