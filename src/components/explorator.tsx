"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInput,
  SidebarProvider,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { CountryData } from "@/components/clickable-countries"

type Feature = {
  properties: { city: string; country: string; ids: string[] }
}

export default function Explorator({
  country,
  open,
  onOpenChange,
  onSelectArticle,
}: {
  country: CountryData | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSelectArticle: (id: string) => void
}) {
  const [query, setQuery] = useState("")
  const [features, setFeatures] = useState<Feature[]>([])

  useEffect(() => {
    fetch("/output.geojson")
      .then((r) => r.json())
      .then((geo) => setFeatures(geo.features || []))
      .catch(() => setFeatures([]))
  }, [])

  const localizedCountry = useMemo(() => {
    if (!country) return null
    try {
      const displayNames = new Intl.DisplayNames(["sl"], { type: "region" })
      return displayNames.of(country.isoA3) ?? country.name
    } catch {
      return country.name
    }
  }, [country])

  const filtered = useMemo(() => {
    if (!localizedCountry) return [] as Feature[]
    return features
      .filter((f) => f.properties.country === localizedCountry)
      .filter((f) => f.properties.city.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.properties.ids.length - a.properties.ids.length)
  }, [features, localizedCountry, query])

  return (
    <SidebarProvider open={open} onOpenChange={onOpenChange}>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Explorator</h3>
            <div className="text-xs text-muted-foreground">{country?.name ?? ""}</div>
          </div>
          <SidebarInput placeholder="Search city…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel> Cities </SidebarGroupLabel>
            <Accordion type="single" collapsible>
              {filtered.map((f) => (
                <AccordionItem value={f.properties.city} key={f.properties.city}>
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full">
                      <span>{f.properties.city}</span>
                      <span className="text-xs text-muted-foreground">{f.properties.ids.length}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="flex flex-col gap-1">
                      {f.properties.ids.map((id) => (
                        <li key={id}>
                          <button
                            className="w-full text-left text-xs underline"
                            onClick={() => onSelectArticle(id)}
                          >
                            {id}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}
