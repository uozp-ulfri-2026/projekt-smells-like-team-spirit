"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X } from "lucide-react"
import { getTopicStyle } from "@/lib/topic-colors"

type LeanArticle = {
  _id: string
  url?: string
  date?: string
  "llm-topic"?: string
  title?: string
  lead?: string
}

export default function ArticleCard({ id, onClose }: { id: string | null; onClose?: () => void }) {
  const [articlesById, setArticlesById] = useState<Record<string, LeanArticle>>({})
  const [article, setArticle] = useState<LeanArticle | null>(null)

  useEffect(() => {
    fetch("/mmc-lean.json")
      .then((r) => r.json())
      .then((rows: LeanArticle[]) => {
        const byId: Record<string, LeanArticle> = {}
        for (const row of rows) {
          if (row && typeof row._id === "string") {
            byId[row._id] = row
          }
        }
        setArticlesById(byId)
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch mmc-lean.json:", err)
        setArticlesById({})
      })
  }, [])

  useEffect(() => {
    if (!id) {
      setArticle(null)
      return
    }

    const found = articlesById[id] ?? null
    if (!found) {
      // eslint-disable-next-line no-console
      console.debug("Article not found in mmc-lean.json for id:", id)
    }
    setArticle(found)
  }, [id, articlesById])

  if (!id) return null

  const topicStyle = getTopicStyle(article?.["llm-topic"])

  return (
    <Card className="absolute top-4 right-4 z-20 h-[90vh] w-96 border shadow-lg">
      {article && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: topicStyle.color }}
        />
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-2 left-2 z-30"
        aria-label="Close article"
      >
        <X className="h-4 w-4" />
      </Button>

      <ScrollArea className="flex-1">
        {!article && <CardContent className="pt-4 text-sm text-muted-foreground">Loading article...</CardContent>}
        {article && (
          <>
            <CardHeader className="pt-8">
              <CardTitle className="text-base leading-tight">{article.title?.trim() || "Untitled"}</CardTitle>
              {article["llm-topic"] && (
                <Badge variant="secondary" className="uppercase tracking-wide" style={{ color: topicStyle.textColor }}>
                  {article["llm-topic"]}
                </Badge>
              )}
              {article.date && (
                <p className="text-xs text-muted-foreground">{new Date(article.date).toLocaleDateString()}</p>
              )}
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-4">
              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-sm hover:underline"
                  style={{ color: topicStyle.textColor }}
                >
                  Preberi originalni clanek
                </a>
              )}
              <Separator />
              {article.lead && <p className="text-sm italic text-muted-foreground">{article.lead}</p>}
              <Separator />
              <p className="text-xs text-muted-foreground">ID: {article._id}</p>
            </CardContent>
          </>
        )}
      </ScrollArea>
    </Card>
  )
}
