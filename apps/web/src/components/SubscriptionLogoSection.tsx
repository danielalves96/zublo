import { Upload } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LogoResult } from "@/hooks/useLogoSearch";

interface Props {
  logoSearch: string;
  setLogoSearch: (value: string) => void;
  logoSearchRef: RefObject<HTMLDivElement>;
  showLogoResults: boolean;
  setShowLogoResults: (show: boolean) => void;
  searching: boolean;
  logoResults: LogoResult[];
  logoPreview: string | null;
  handleSelectLogo: (result: LogoResult) => void;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  logoFile: File | null;
  logoUrl: string;
}

export function SubscriptionLogoSection({
  logoSearch,
  setLogoSearch,
  logoSearchRef,
  showLogoResults,
  setShowLogoResults,
  searching,
  logoResults,
  logoPreview,
  handleSelectLogo,
  handleFileChange,
  logoFile,
  logoUrl,
}: Props) {
  const { t } = useTranslation();

  /* v8 ignore next */
  const logoImgSrc = logoPreview || logoUrl;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Label className="text-sm font-medium">{t("logo")}</Label>
      <div className="flex gap-2 items-start">
        <div ref={logoSearchRef} className="relative flex-1">
          <Input
            placeholder={t("search_logo") + "..."}
            value={logoSearch}
            onChange={(e) => setLogoSearch(e.target.value)}
            onFocus={() => {
              if (logoSearch.trim().length >= 2) setShowLogoResults(true);
            }}
          />

          {showLogoResults && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border bg-popover shadow-md">
              {searching ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {t("loading")}
                </div>
              ) : logoResults.length > 0 ? (
                <div className="max-h-64 overflow-y-auto p-2">
                  <div className="grid grid-cols-3 gap-2">
                    {logoResults.map((result) => {
                      /* v8 ignore next */
                      const ringClass =
                        logoPreview === result.previewUrl
                          ? "ring-2 ring-primary"
                          : "";
                      return (
                        <button
                          key={result.source}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSelectLogo(result)}
                          className={`h-20 rounded border overflow-hidden bg-background p-2 ${ringClass}`}
                        >
                          <img
                            src={result.previewUrl}
                            alt=""
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {t("no_logos_found")}
                </div>
              )}
            </div>
          )}
        </div>

        <label>
          <Button type="button" variant="outline" size="sm" asChild>
            <span>
              <Upload className="h-4 w-4 mr-1" />
              {t("upload_avatar")}
            </span>
          </Button>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {(logoPreview || logoUrl) && (
        <div className="h-14 w-20 overflow-hidden rounded border bg-muted p-2">
          <img
            src={logoImgSrc}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>
      )}

      {logoFile && (
        <p className="text-xs text-muted-foreground">{logoFile.name}</p>
      )}
    </div>
  );
}
