"use client";

import { X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useMmcArticles } from "@/lib/mmc-data";
import { getTopicStyle } from "@/lib/topic-colors";

export default function ArticleCard({
  id,
  articlePath = "/mmc-lean.v6.json",
  onClose,
}: {
  id: string | null;
  articlePath?: string;
  onClose?: () => void;
}) {
  const { data } = useMmcArticles(articlePath);
  const article = useMemo(() => {
    if (!id) {
      return null;
    }

    return data?.byId[id] ?? null;
  }, [data, id]);

  useEffect(() => {
    if (!(id && data)) {
      return;
    }

    if (!data.byId[id]) {
      // eslint-disable-next-line no-console
      console.debug("Article not found in selected MMC dataset for id:", id);
    }
  }, [data, id]);

  if (!id) {
    return null;
  }

  const topicStyle = getTopicStyle(article?.["llm-topic"]);

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
        aria-label="Close article"
        className="absolute top-2 left-2 z-30"
        onClick={onClose}
        size="icon"
        variant="ghost"
      >
        <X className="h-4 w-4" />
      </Button>

      <ScrollArea className="flex-1">
        {!article && (
          <CardContent className="pt-4 text-muted-foreground text-sm">
            Loading article...
          </CardContent>
        )}
        {article && (
          <>
            <CardHeader className="pt-8">
              <CardTitle className="text-base leading-tight">
                {article.title?.trim() || "Untitled"}
              </CardTitle>
              {article["llm-topic"] && (
                <Badge
                  className="uppercase tracking-wide"
                  style={{ color: topicStyle.textColor }}
                  variant="secondary"
                >
                  {article["llm-topic"]}
                </Badge>
              )}
              {article.date && (
                <p className="text-muted-foreground text-xs">
                  {new Date(article.date).toLocaleDateString()}
                </p>
              )}
            </CardHeader>
            <Separator />
            <CardContent className="space-y-4 pt-4">
              {article.url && (
                <a
                  className="break-all text-sm hover:underline"
                  href={article.url}
                  rel="noopener noreferrer"
                  style={{ color: topicStyle.textColor }}
                  target="_blank"
                >
                  Preberi originalni clanek
                </a>
              )}
              <Separator />
              {article.lead && (
                <p className="text-muted-foreground text-sm italic">
                  {article.lead}
                </p>
              )}
              <Separator />
              <p className="text-muted-foreground text-xs">ID: {article._id}</p>
            </CardContent>
          </>
        )}
      </ScrollArea>
    </Card>
  );
}
