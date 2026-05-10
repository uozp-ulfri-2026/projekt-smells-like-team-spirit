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
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
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

interface SearchRow {
  id: string
  title: string
  topic: string
  city: string
  country: string
}

const PAGE_SIZE = 10

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
  const [selectedTopic, setSelectedTopic] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)

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

  const rows = useMemo(() => {
    const dedup = new Set<string>()
    const out: SearchRow[] = []

    for (const feature of geoData) {
      if (
        country &&
        feature.country.toLowerCase() !== country.name.toLowerCase()
      ) {
        continue
      }

      for (const id of feature.ids) {
        if (dedup.has(id)) continue
        dedup.add(id)

        const article = articlesById[id]
        if (!article) continue

        out.push({
          id,
          title: article.title?.trim() || id,
          topic: article["llm-topic"] || "Brez teme",
          city: feature.city,
          country: feature.country,
        })
      }
    }

    return out
  }, [geoData, articlesById, country])

  const topics = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.topic))).sort((a, b) => a.localeCompare(b, "sl"))
  }, [rows])

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return rows
      .filter((row) => {
        const cityMatch = q.length === 0 || row.city.toLowerCase().includes(q)
        const topicMatch = selectedTopic === "all" || row.topic === selectedTopic
        return cityMatch && topicMatch
      })
      .sort((a, b) => a.title.localeCompare(b.title, "sl"))
  }, [rows, searchQuery, selectedTopic])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedTopic, country])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredRows.slice(start, start + PAGE_SIZE)
  }, [filteredRows, currentPage])

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (currentPage <= 3) return [1, 2, 3, 4, totalPages]
    if (currentPage >= totalPages - 2) {
      return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, currentPage - 1, currentPage, currentPage + 1, totalPages]
  }, [currentPage, totalPages])

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Cities & News</h2>
            <SidebarTrigger />
          </div>
          <Separator className="mt-2" />
          <Input
            placeholder="Isci mesta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger>
              <SelectValue placeholder="Izberi temo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vse teme</SelectItem>
              {topics.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SidebarHeader>

        <SidebarContent>
          <div className="space-y-2 px-2 pb-2">
            {filteredRows.length === 0 ? (
              <div className="py-4 text-sm text-gray-500">Ni zadetkov za izbrane filtre.</div>
            ) : (
              pagedRows.map((row) => (
                <Button
                  key={row.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectArticle(row.id)}
                  className="h-auto w-full justify-start px-2 py-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{row.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{row.topic} · {row.city}</p>
                  </div>
                </Button>
              ))
            )}

            {filteredRows.length > 0 && (
              <div className="pt-2">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (currentPage > 1) setCurrentPage((p) => p - 1)
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        text="Prej"
                      />
                    </PaginationItem>

                    {pageNumbers.map((page, i) => {
                      const prev = pageNumbers[i - 1]
                      const showEllipsis = i > 0 && prev && page - prev > 1
                      return (
                        <React.Fragment key={`page-${page}`}>
                          {showEllipsis && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              isActive={page === currentPage}
                              onClick={(e) => {
                                e.preventDefault()
                                setCurrentPage(page)
                              }}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </React.Fragment>
                      )
                    })}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault()
                          if (currentPage < totalPages) setCurrentPage((p) => p + 1)
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        text="Naprej"
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
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
