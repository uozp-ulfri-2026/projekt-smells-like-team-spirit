"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CountryData } from "@/components/clickable-countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getTopicStyle, hexToRgba } from "@/lib/topic-colors";

interface CityFeature {
  city: string;
  country: string;
  ids: string[];
}

interface LeanArticle {
  _id: string;
  date?: string;
  lead?: string;
  "llm-topic"?: string;
  title?: string;
  url?: string;
}

interface SearchRow {
  city: string;
  country: string;
  id: string;
  title: string;
  topic: string;
}

const PAGE_SIZE = 10;

export default function Explorator({
  country,
  geoJson,
  articlesById,
  selectedArticleId,
  selectedDotArticleIds,
  selectedTopic,
  onSelectedTopicChange,
  onSelectArticle,
  onClearSelectedDot,
}: {
  country: CountryData | null;
  geoJson: GeoJSON.FeatureCollection<
    GeoJSON.Point,
    { city?: string; country?: string; ids?: string[] }
  >;
  articlesById: Record<string, LeanArticle>;
  selectedArticleId: string | null;
  selectedDotArticleIds: string[];
  selectedTopic: string;
  onSelectedTopicChange: (topic: string) => void;
  onSelectArticle: (id: string) => void;
  onClearSelectedDot: () => void;
}) {
  const { open } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const geoData = useMemo<CityFeature[]>(
    () =>
      (geoJson.features || [])
        .filter(
          (feature) =>
            feature.properties?.ids &&
            feature.properties?.city &&
            feature.properties?.country
        )
        .map((feature) => ({
          city: feature.properties?.city ?? "",
          country: feature.properties?.country ?? "",
          ids: Array.isArray(feature.properties?.ids)
            ? feature.properties.ids
            : [],
        })),
    [geoJson]
  );

  const rows = useMemo(() => {
    const dedup = new Set<string>();
    const out: SearchRow[] = [];

    for (const feature of geoData) {
      if (
        country &&
        feature.country.toLowerCase() !== country.name.toLowerCase()
      ) {
        continue;
      }

      for (const id of feature.ids) {
        if (dedup.has(id)) {
          continue;
        }
        dedup.add(id);

        const article = articlesById[id];
        if (!article) {
          continue;
        }

        out.push({
          id,
          title: article.title?.trim() || id,
          topic: article["llm-topic"] || "Brez teme",
          city: feature.city,
          country: feature.country,
        });
      }
    }

    return out;
  }, [geoData, articlesById, country]);

  const rowsById = useMemo(
    () => new Map(rows.map((row) => [row.id, row])),
    [rows]
  );

  const selectedDotRows = useMemo(() => {
    if (selectedDotArticleIds.length === 0) {
      return [];
    }

    return selectedDotArticleIds
      .map((id) => rowsById.get(id))
      .filter((row): row is SearchRow => Boolean(row));
  }, [rowsById, selectedDotArticleIds]);

  const topics = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.topic))).sort((a, b) =>
        a.localeCompare(b, "sl")
      ),
    [rows]
  );

  const topicOptions = useMemo(() => {
    const options = new Set(topics);

    if (selectedTopic !== "all") {
      options.add(selectedTopic);
    }

    return Array.from(options).sort((a, b) => a.localeCompare(b, "sl"));
  }, [selectedTopic, topics]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sourceRows = selectedDotRows.length > 0 ? selectedDotRows : rows;

    return sourceRows
      .filter((row) => {
        const cityMatch = q.length === 0 || row.city.toLowerCase().includes(q);
        const topicMatch =
          selectedTopic === "all" || row.topic === selectedTopic;
        return cityMatch && topicMatch;
      })
      .sort((a, b) => a.title.localeCompare(b.title, "sl"));
  }, [rows, searchQuery, selectedDotRows, selectedTopic]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    if (selectedDotArticleIds.length > 0) {
      setSearchQuery("");
      setCurrentPage(1);
    }
  }, [selectedDotArticleIds]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
  }, [currentPage, totalPages]);

  return (
    <>
      <Sidebar>
        <SidebarHeader className="border-b">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-xs uppercase tracking-widest">
              Cities & News
            </h2>
            <SidebarTrigger />
          </div>
          <Input
            className="h-7 text-xs"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Isci mesta..."
            value={searchQuery}
          />
          <Select onValueChange={onSelectedTopicChange} value={selectedTopic}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Izberi temo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Vse teme</SelectItem>
              {topicOptions.map((topic) => {
                const topicStyle = getTopicStyle(topic);

                return (
                  <SelectItem key={topic} value={topic}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-full"
                        style={{ backgroundColor: topicStyle.color }}
                      />
                      {topic}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </SidebarHeader>

        <SidebarContent>
          <div className="space-y-2 px-2 pb-2">
            {selectedDotRows.length > 0 && (
              <div className="border bg-muted/45 px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {selectedDotRows.length === 1
                      ? "Selected dot article"
                      : `${selectedDotRows.length} articles at selected dot`}
                  </span>
                  <Button
                    className="h-auto shrink-0 p-0"
                    onClick={onClearSelectedDot}
                    size="sm"
                    variant="link"
                  >
                    Clear
                  </Button>
                </div>
                <p className="mt-1 truncate text-muted-foreground">
                  {selectedDotRows[0].topic} - {selectedDotRows[0].city}
                </p>
              </div>
            )}

            {filteredRows.length === 0 ? (
              <div className="py-4 text-muted-foreground text-sm">
                Ni zadetkov za izbrane filtre.
              </div>
            ) : (
              pagedRows.map((row) => {
                const topicStyle = getTopicStyle(row.topic);
                const isSelected = row.id === selectedArticleId;

                return (
                  <button
                    className="flex w-full items-start gap-2 border border-l-4 px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    key={row.id}
                    onClick={() => onSelectArticle(row.id)}
                    style={{
                      borderLeftColor: topicStyle.color,
                      borderTopColor: isSelected
                        ? hexToRgba(topicStyle.color, 0.55)
                        : "transparent",
                      borderRightColor: isSelected
                        ? hexToRgba(topicStyle.color, 0.55)
                        : "transparent",
                      borderBottomColor: isSelected
                        ? hexToRgba(topicStyle.color, 0.55)
                        : "transparent",
                      backgroundColor: hexToRgba(
                        topicStyle.color,
                        isSelected ? 0.22 : 0.08
                      ),
                    }}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 size-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: topicStyle.color,
                        boxShadow: isSelected
                          ? `0 0 0 4px ${hexToRgba(topicStyle.color, 0.22)}`
                          : undefined,
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground text-xs">
                        {row.title}
                      </p>
                      <p
                        className="truncate text-[11px]"
                        style={{ color: topicStyle.textColor }}
                      >
                        {row.topic} - {row.city}
                      </p>
                    </div>
                  </button>
                );
              })
            )}

            {filteredRows.length > 0 && (
              <div className="pt-2">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) {
                            setCurrentPage((p) => p - 1);
                          }
                        }}
                        text="Prej"
                      />
                    </PaginationItem>

                    {pageNumbers.map((page, i) => {
                      const prev = pageNumbers[i - 1];
                      const showEllipsis = i > 0 && prev && page - prev > 1;
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
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </React.Fragment>
                      );
                    })}

                    <PaginationItem>
                      <PaginationNext
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) {
                            setCurrentPage((p) => p + 1);
                          }
                        }}
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

      {!open && (
        <div className="fixed top-4 left-4 z-20">
          <SidebarTrigger />
        </div>
      )}
    </>
  );
}
