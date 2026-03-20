import { Camera } from "lucide-react";
import type { MutableRefObject } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

interface ProfileAvatarCardProps {
  displayName: string;
  email?: string | null;
  fileRef: MutableRefObject<HTMLInputElement | null>;
  preview: string | null;
  onFileChange: (file: File) => void;
}

export function ProfileAvatarCard({
  displayName,
  email,
  fileRef,
  preview,
  onFileChange,
}: ProfileAvatarCardProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start p-6 rounded-2xl border bg-card/50 shadow-sm">
      <div className="relative group shrink-0">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="h-24 w-24 rounded-full overflow-hidden border-4 border-background shadow-lg transition-transform group-hover:scale-105"
        >
          {preview ? (
            <img src={preview} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="absolute -bottom-2 -right-2 p-2.5 bg-primary text-primary-foreground rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform duration-200"
        >
          <Camera className="w-4 h-4" />
        </button>
        <input
          ref={(node) => {
            fileRef.current = node;
          }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFileChange(e.target.files[0])}
        />
      </div>

      <div className="text-center sm:text-left space-y-2 flex-1 pt-2">
        <h3 className="font-semibold text-xl">{displayName}</h3>
        <p className="text-sm text-muted-foreground">{email}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 rounded-xl"
          type="button"
          onClick={() => fileRef.current?.click()}
        >
          {t("change_avatar")}
        </Button>
      </div>
    </div>
  );
}
