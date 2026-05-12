"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getTopicStyle, hexToRgba } from "@/lib/topic-colors"

type LeanArticle = {
  _id: string
  url?: string
  date?: string
  "llm-topic"?: string
  title?: string
  lead?: string
}

export default function ArticleCard({
  id,
  articlePath = "/mmc-lean.json",
  onClose,
}: {
  id: string | null
  articlePath?: string
  onClose?: () => void
}) {
  const [articlesById, setArticlesById] = useState<Record<string, LeanArticle>>({})
  const [article, setArticle] = useState<LeanArticle | null>(null)

  useEffect(() => {
    fetch(articlePath)
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
        console.error(`Failed to fetch ${articlePath}:`, err)
        setArticlesById({})
      })
  }, [articlePath])

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
    <Card
      className="absolute top-4 right-4 z-20 h-[90vh] w-96 border overflow-hidden shadow-lg"
      style={{
        borderColor: article ? hexToRgba(topicStyle.color, 0.55) : undefined,
        boxShadow: article
          ? `0 18px 48px rgba(0, 0, 0, 0.32), 0 0 0 1px ${hexToRgba(topicStyle.color, 0.16)}`
          : undefined,
      }}
    >
      {article && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: topicStyle.color }}
        />
      )}
      <button
        onClick={onClose}
        className="absolute top-2 left-2 z-30 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition"
        aria-label="Close article"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex-1 overflow-y-auto">
        {!article && <CardContent className="pt-4 text-sm text-muted-foreground">Loading article...</CardContent>}
        {article && (
          <>
            <CardHeader className="pt-8">
              <CardTitle className="text-base leading-tight">{article.title?.trim() || "Untitled"}</CardTitle>
              {article["llm-topic"] && (
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: topicStyle.textColor }}
                >
                  {article["llm-topic"]}
                </p>
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
      </div>
    </Card>
  )
}
