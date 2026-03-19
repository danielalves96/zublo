import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ImageOff, Upload, X } from "lucide-react";

interface IconPickerProps {
  currentSrc: string | null;
  hasUploadedIcon: boolean;
  onClear: () => void;
  onFileChange: (file: File, previewUrl: string) => void;
}

export function IconPicker({
  currentSrc,
  hasUploadedIcon,
  onClear,
  onFileChange,
}: IconPickerProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3">
      {currentSrc ? (
        <img
          src={currentSrc}
          alt={t("icon")}
          className="w-10 h-10 rounded-lg object-contain bg-white p-0.5 border"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground">
          <ImageOff className="w-4 h-4" />
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-lg text-xs"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="w-3 h-3 mr-1" />
        {currentSrc ? t("change_icon") : t("icon")}
      </Button>

      {hasUploadedIcon && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="rounded-lg text-xs text-destructive/70 hover:text-destructive"
          onClick={onClear}
        >
          <X className="w-3 h-3 mr-1" />
          {t("remove_icon")}
        </Button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const url = URL.createObjectURL(file);
          onFileChange(file, url);
          e.target.value = "";
        }}
      />
    </div>
  );
}
