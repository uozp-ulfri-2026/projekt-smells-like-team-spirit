import { Card } from "./components/ui/card";
import { ClickableCountries } from "@/components/clickable-countries";
import { CountryDots } from "@/components/country-dots";
import { Map as MapComponent, MapControls } from "./components/map";
import { useState } from "react";
import type { CountryData } from "@/components/clickable-countries";
import Explorator from "@/components/explorator";
import ArticleCard from "@/components/article-card";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function App() {
  return (
    <main className="h-svh p-8 flex flex-col gap-8 overflow-hidden">
      <h1 className="text-4xl font-bold text-center shrink-0">Slovenski svet</h1>
      <MyMap />
    </main>
  );
}

export function MyMap() {
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      {/* Explorator Sidebar */}
      <Explorator
        country={selectedCountry}
        onSelectArticle={(id) => setSelectedArticleId(id)}
      />

      <Card className="p-0 flex-1 min-h-0 overflow-hidden relative">
        {selectedCountry && (
          <div className="absolute top-4 left-4 z-10 bg-background text-foreground px-4 py-2 rounded-md shadow-md border font-semibold flex items-center justify-between gap-4">
            <span>Selected: {selectedCountry.name}</span>
            <button
              onClick={() => setSelectedCountry(null)}
              className="text-sm underline hover:no-underline"
            >
              Clear
            </button>
          </div>
        )}

        <MapComponent center={[14.5058, 46.0569]} zoom={4}>
          <MapControls position="bottom-right" />
          <CountryDots
            country={selectedCountry}
            onDotClick={(ids) => {
              // prefer the first id
              if (ids && ids.length > 0) setSelectedArticleId(ids[0])
            }}
          />
          <ClickableCountries
            onCountryClick={(country) => {
              setSelectedCountry(country)
              setSidebarOpen(true)
            }}
          />
        </MapComponent>

        <ArticleCard id={selectedArticleId} onClose={() => setSelectedArticleId(null)} />
      </Card>
    </SidebarProvider>
  )
}