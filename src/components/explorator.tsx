"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { CountryData } from "@/components/clickable-countries"

interface CityFeature {
  city: string
  country: string
  ids: string[]
}

interface LeanArticle {
  _id: string
  url?: string
  date?: string
  "llm-topic"?: string
  title?: string
  lead?: string
}

interface ExplorerData {
  [country: string]: {
    [city: string]: string[]
  }
}

export default function Explorator({
  country,
  onSelectArticle,
}: {
  country: CountryData | null
  onSelectArticle: (id: string) => void
}) {
  const { open } = useSidebar()
  const [geoData, setGeoData] = useState<CityFeature[]>([])
  const [articlesById, setArticlesById] = useState<Record<string, LeanArticle>>({})
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch geo points and lean article metadata used by the sidebar.
  useEffect(() => {
    Promise.all([
      fetch("/output.geojson").then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: Failed to fetch /output.geojson`)
        }
        return r.json()
      }),
      fetch("/mmc-lean.json").then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: Failed to fetch /mmc-lean.json`)
        }
        return r.json()
      }),
    ])
      .then(([geoJson, leanRows]) => {
        const features = (geoJson.features || [])
          .filter((f: any) => f.properties?.ids && f.properties?.city && f.properties?.country)
          .map((f: any) => ({
            city: f.properties.city,
            country: f.properties.country,
            ids: Array.isArray(f.properties.ids) ? f.properties.ids : [],
          }))

        const byId: Record<string, LeanArticle> = {}
        for (const row of (leanRows as LeanArticle[])) {
          if (row && typeof row._id === "string") {
            byId[row._id] = row
          }
        }

        setGeoData(features)
        setArticlesById(byId)
      })
      .catch((err) => console.error("Failed to initialize explorator data:", err))
  }, [])

  // Filter and organize data
  const filtered = useMemo(() => {
    let data = geoData

    // Filter by country if selected
    if (country) {
      data = data.filter((f) => f.country.toLowerCase() === country.name.toLowerCase())
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      data = data.filter(
        (f) => f.city.toLowerCase().includes(query) || f.country.toLowerCase().includes(query)
      )
    }

    // Group by country and sort cities by article count
    const grouped: ExplorerData = {}
    data.forEach((feature) => {
      if (!grouped[feature.country]) {
        grouped[feature.country] = {}
      }
      grouped[feature.country][feature.city] = feature.ids
    })

    // Sort countries and cities
    const sorted: ExplorerData = {}
    Object.keys(grouped)
      .sort()
      .forEach((countryName) => {
        const cities: { [key: string]: string[] } = {}
        Object.keys(grouped[countryName])
          .sort((a, b) => {
            // Sort by article count (descending)
            const countA = grouped[countryName][a].length
            const countB = grouped[countryName][b].length
            return countB - countA
          })
          .forEach((cityName) => {
            cities[cityName] = grouped[countryName][cityName]
          })
        sorted[countryName] = cities
      })

    return sorted
  }, [geoData, country, searchQuery])

  return (
    <>
      <Sidebar className="border-r border-gray-200 dark:border-slate-800">
        <SidebarHeader>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Cities & News</h2>
            <SidebarTrigger className="-mr-2" />
          </div>
          <Separator className="mt-2" />
          <Input
            placeholder="Search cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm"
          />
        </SidebarHeader>

        <SidebarContent>
          <div className="space-y-4">
            {Object.keys(filtered).length === 0 ? (
              <div className="px-2 py-4 text-sm text-gray-500">
                {searchQuery ? "No cities match your search" : "No data available"}
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={Object.keys(filtered)} className="w-full">
                {Object.keys(filtered).map((countryName) => (
                  <AccordionItem key={countryName} value={countryName} className="border-0">
                    <AccordionTrigger className="py-2 px-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded">
                      <span className="font-semibold text-sm">{countryName}</span>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      <div className="space-y-2 pl-2">
                        {Object.keys(filtered[countryName]).map((cityName) => {
                          const ids = filtered[countryName][cityName]
                          return (
                            <div
                              key={`${countryName}-${cityName}`}
                              className="border-l border-gray-300 dark:border-slate-700 pl-3"
                            >
                              <div className="flex items-start justify-between gap-2 py-1">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {cityName}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {ids.length} article{ids.length !== 1 ? "s" : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-1 mt-1">
                                {ids.map((id) => (
                                  <Button
                                    key={id}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      onSelectArticle(id)
                                    }}
                                    className="w-full justify-start text-xs h-8 px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800"
                                  >
                                    <span className="truncate">
                                      {articlesById[id]?.title?.trim() || id}
                                    </span>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </SidebarContent>
      </Sidebar>

      {/* Trigger button when sidebar is closed */}
      {!open && (
        <div className="fixed top-4 left-4 z-20">
          <SidebarTrigger />
        </div>
      )}
    </>
  )
}
