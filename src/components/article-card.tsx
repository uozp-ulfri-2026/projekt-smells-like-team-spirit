"use client"

import React, { useEffect, useState } from "react"

export default function ArticleCard({ id, onClose }: { id: string | null; onClose?: () => void }) {
  const [article, setArticle] = useState<any | null>(null)

  useEffect(() => {
    if (!id) {
      setArticle(null)
      return
    }

    fetch("/assets/mmc-llm.json")
      .then((r) => r.json())
      .then((rows: any[]) => {
        try {
          const found = rows.find((r) => r._id === id) ?? null
          if (!found) {
            // eslint-disable-next-line no-console
            console.debug("Article not found in mmc-llm.json for id:", id)
          }
          return found
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("Error finding article:", err)
          return null
        }
      })
      .then((a) => setArticle(a))
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch mmc-llm.json:", err)
        setArticle(null)
      })
  }, [id])

  if (!id) return null

  return (
    <div className="absolute top-4 right-4 z-20 h-[90vh] w-96 bg-white dark:bg-slate-950 rounded-lg shadow-lg border border-gray-200 dark:border-slate-800 overflow-hidden flex flex-col">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-2 left-2 z-30 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition"
        aria-label="Close article"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {!article && (
            <div className="text-sm text-gray-500">Loading article…</div>
          )}
          {article && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  {(article.title as string) ?? "Untitled"}
                </h2>
                {article.llm?.topic && (
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1 uppercase tracking-wide">
                    {article.llm.topic}
                  </p>
                )}
                {article.authors && article.authors.length > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    By {article.authors.join(", ")}
                  </p>
                )}
                {article.date && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {new Date(article.date).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Separator */}
              <div className="border-t border-gray-300 dark:border-slate-700" />

              {/* URL Link */}
              {article.url && (
                <div>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    Preberi originalni članek
                  </a>  
                </div>
              )}

              {/* Separator */}
              <div className="border-t border-gray-300 dark:border-slate-700" />

              {/* Lead/Abstract */}
              {article.lead && (
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                    {article.lead}
                  </p>
                </div>
              )}

              {/* Separator */}
              {article.lead && <div className="border-t border-gray-300 dark:border-slate-700" />}

              {/* Paragraphs */}
              {article.paragraphs && article.paragraphs.length > 0 && (
                <div className="space-y-3">
                  {article.paragraphs.map((para: string, idx: number) => (
                    <p key={idx} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              )}

              {/* Article ID (for debugging) */}
              <div className="pt-4 border-t border-gray-300 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-gray-500">ID: {article._id}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
