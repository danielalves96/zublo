import { ArrowRight, Bot, Trash2, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  savings?: string | null;
}

interface AIRecommendationsCardProps {
  recommendations?: Recommendation[];
  isLoading: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onDelete: (id: string) => void;
}

export function AIRecommendationsCard({
  recommendations,
  isLoading,
  isGenerating,
  onGenerate,
  onDelete,
}: AIRecommendationsCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden rounded-3xl border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent pb-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-yellow-500" />
            {t("ai_recommendations")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("ai_smart_insights")}</p>
        </div>
        <Button
          className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 font-semibold text-yellow-600 shadow-md transition-all hover:bg-yellow-500/20 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            t("loading")
          ) : (
            <span className="flex items-center gap-2">
              {t("generate_recommendations")} <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-2xl bg-muted/30"
              />
            ))}
          </div>
        ) : !recommendations || recommendations.length === 0 ? (
          <div className="py-8 text-center">
            <Bot className="mx-auto mb-3 h-10 w-10 text-yellow-500" />
            <p className="text-muted-foreground">{t("no_recommendations")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("ai_generate_hint")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className="relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-300 hover:shadow-md"
              >
                <div className="absolute right-0 top-0 -z-10 h-24 w-24 rounded-bl-full bg-gradient-to-bl from-yellow-500/10 to-transparent" />

                <div className="mb-3 flex items-start justify-between gap-4">
                  <h4 className="line-clamp-2 text-base font-bold leading-tight">
                    {recommendation.title}
                  </h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onDelete(recommendation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {recommendation.description}
                </p>
                {recommendation.savings ? (
                  <div className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-sm font-semibold text-green-600 dark:text-green-400">
                    <TrendingUp className="h-4 w-4" />
                    {t("savings")}: {recommendation.savings}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
