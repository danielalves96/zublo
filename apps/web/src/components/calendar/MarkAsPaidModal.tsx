import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils";
import {
  X,
  CheckCircle2,
  Upload,
  FileText,
  Eye,
} from "lucide-react";
import type { Subscription, PaymentRecord } from "@/types";
import pb from "@/lib/pb";
import { toast } from "@/lib/toast";
import { toDateStr, toDateOnly, getLogoUrl } from "./types";

interface MarkAsPaidModalProps {
  sub: Subscription;
  date: Date;
  userId: string;
  existingRecord: PaymentRecord | undefined;
  onClose: () => void;
  onSaved: () => void;
  t: (k: string) => string;
}

export function MarkAsPaidModal({
  sub,
  date,
  userId,
  existingRecord,
  onClose,
  onSaved,
  t,
}: MarkAsPaidModalProps) {
  const cur = sub.expand?.currency;
  const dueDate = toDateStr(date);
  const isViewOnly = !!existingRecord?.paid_at;

  const [amount, setAmount] = useState(
    existingRecord?.amount != null
      ? String(existingRecord.amount)
      : String(sub.price),
  );
  const [notes, setNotes] = useState(existingRecord?.notes ?? "");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const proofUrl = existingRecord?.proof
    ? pb.files.getUrl(
        {
          collectionId: "payment_records",
          id: existingRecord.id,
        } as Parameters<typeof pb.files.getUrl>[0],
        existingRecord.proof,
      )
    : null;

  const mut = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = {
        subscription_id: sub.id,
        user: userId,
        due_date: dueDate,
        paid_at: new Date().toISOString(),
        amount: parseFloat(amount) || sub.price,
        notes: notes || undefined,
      };
      if (proofFile) data.proof = proofFile;

      let recordId = existingRecord?.id;

      if (!recordId) {
        const candidates = await pb
          .collection("payment_records")
          .getFullList<PaymentRecord>({
            filter: `subscription_id = "${sub.id}" && user = "${userId}"`,
          });

        const matched = candidates.find(
          (r) => toDateOnly(r.due_date) === dueDate,
        );
        recordId = matched?.id;
      }

      if (recordId) {
        const saved = await pb
          .collection("payment_records")
          .update<PaymentRecord>(recordId, data);
        if (!saved?.id)
          throw new Error("Falha ao atualizar registro de pagamento");
        return;
      }

      const saved = await pb
        .collection("payment_records")
        .create<PaymentRecord>(data);
      if (!saved?.id) throw new Error("Falha ao criar registro de pagamento");
    },
    onSuccess: () => {
      toast.success(t("marked_as_paid") || "Payment recorded!");
      onSaved();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    },
  });

  const logo = getLogoUrl(sub);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="border-b bg-card/70 backdrop-blur px-6 py-5">
          <DialogTitle className="flex items-center gap-4">
            {logo ? (
              <div className="h-12 w-12 shrink-0 rounded-2xl overflow-hidden border bg-background p-1.5">
                <img
                  src={logo}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center text-base font-bold text-primary">
                {sub.name[0]?.toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold leading-tight truncate">
                {isViewOnly
                  ? t("view_payment") || "Payment details"
                  : t("mark_as_paid") || "Mark as Paid"}
              </p>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {sub.name} ·{" "}
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <Badge variant="outline" className="shrink-0">
              {formatPrice(sub.price, cur?.symbol ?? "$")}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="paid-amount">{t("amount") || "Amount"}</Label>
                <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30">
                  <span className="text-sm text-muted-foreground shrink-0">
                    {cur?.symbol ?? "$"}
                  </span>
                  <input
                    id="paid-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isViewOnly}
                    className="flex-1 bg-transparent text-sm font-medium outline-none disabled:opacity-60"
                  />
                  {cur?.code && (
                    <span className="text-xs text-muted-foreground shrink-0 font-medium">
                      {cur.code}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paid-notes">{t("notes") || "Notes"}</Label>
                <Textarea
                  id="paid-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isViewOnly}
                  placeholder={t("optional") || "Optional…"}
                  rows={5}
                  className="resize-none rounded-xl"
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <Label>{t("payment_proof") || "Payment proof"}</Label>

              {proofUrl ? (
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-primary hover:bg-accent/40 transition-colors"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span
                    className="min-w-0 flex-1 truncate"
                    title={existingRecord?.proof}
                  >
                    {existingRecord?.proof}
                  </span>
                  <Eye className="h-4 w-4 shrink-0" />
                </a>
              ) : !isViewOnly ? (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    className="hidden"
                    onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                  />

                  {proofFile ? (
                    <div className="flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span
                        className="min-w-0 flex-1 truncate text-muted-foreground"
                        title={proofFile.name}
                      >
                        {proofFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setProofFile(null)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-8 text-sm text-muted-foreground hover:bg-accent/40 hover:border-primary/40 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      {t("upload_proof") || "Upload proof (PDF or image)"}
                    </button>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {t("proof_hint") || "PDF or image up to 15 MB"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground rounded-xl border px-3 py-3">
                  {t("no_proof") || "No proof uploaded"}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              {t("close") || "Close"}
            </Button>
            {!isViewOnly && (
              <Button
                onClick={() => mut.mutate()}
                disabled={mut.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {mut.isPending
                  ? t("saving") || "Saving…"
                  : t("confirm_payment") || "Confirm payment"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
