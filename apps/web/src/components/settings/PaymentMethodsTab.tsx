import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { paymentMethodsService } from "@/services/paymentMethods";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  CreditCard,
  Upload,
  ImageOff,
  GripVertical,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { PaymentMethod } from "@/types";

// Static icon map: method name (lowercase) → filename in /assets/payments/
const PAYMENT_ICON_MAP: Record<string, string> = {
  visa: "Visa.png",
  mastercard: "Mastercard.png",
  "american express": "Amex.png",
  amex: "Amex.png",
  discover: "Discover.png",
  "diners club": "DinersClub.png",
  jcb: "JCB.png",
  unionpay: "unionpay.png",
  "union pay": "unionpay.png",
  maestro: "Maestro.png",
  paypal: "PayPal.png",
  "apple pay": "ApplePay.png",
  "google pay": "GooglePay.png",
  "samsung pay": "samsungpay.png",
  "amazon pay": "amazonpay.png",
  alipay: "alipay.png",
  "wechat pay": "wechat.png",
  wechat: "wechat.png",
  venmo: "venmo.png",
  stripe: "Stripe.png",
  klarna: "Klarna.png",
  affirm: "affirm.png",
  skrill: "skrill.png",
  paysafecard: "paysafe.png",
  paysafe: "paysafe.png",
  ideal: "ideal.png",
  bancontact: "bancontact.png",
  giropay: "gitopay.png",
  sofort: "sofort.png",
  payoneer: "Payoneer.png",
  interac: "Interac.png",
  bitcoin: "Bitcoin.png",
  "bitcoin cash": "BitcoinCash.png",
  ethereum: "Etherium.png",
  litecoin: "Lightcoin.png",
  yandex: "Yandex.png",
  elo: "elo.png",
  qiwi: "qiwi.png",
  bitpay: "bitpay.png",
  "direct debit": "directdebit.png",
  directdebit: "directdebit.png",
  poli: "poli.png",
  webmoney: "webmoney.png",
  verifone: "verifone.png",
  "shop pay": "shoppay.png",
  shoppay: "shoppay.png",
  "facebook pay": "facebookpay.png",
  citadele: "citadele.png",
};

function getMethodIconSrc(method: PaymentMethod): string | null {
  const uploaded = paymentMethodsService.iconUrl(method);
  if (uploaded) return uploaded;
  const key = method.name.toLowerCase();
  if (PAYMENT_ICON_MAP[key]) {
    return `/assets/payments/${PAYMENT_ICON_MAP[key]}`;
  }
  return null;
}

function MethodIcon({
  method,
  size = 40,
}: {
  method: PaymentMethod;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const src = getMethodIconSrc(method);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={method.name}
        width={size}
        height={size}
        className="rounded-lg object-contain bg-white p-0.5"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  const initials = method.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="rounded-lg bg-muted flex items-center justify-center font-semibold text-muted-foreground text-xs shrink-0"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

function IconPicker({
  currentSrc,
  onFileChange,
  onClear,
  hasUploadedIcon,
}: {
  currentSrc: string | null;
  onFileChange: (file: File, previewUrl: string) => void;
  onClear: () => void;
  hasUploadedIcon: boolean;
}) {
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

export function PaymentMethodsTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIconFile, setNewIconFile] = useState<File | null>(null);
  const [newIconPreview, setNewIconPreview] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editIconFile, setEditIconFile] = useState<File | null>(null);
  const [editIconPreview, setEditIconPreview] = useState<string | null>(null);
  const [editClearIcon, setEditClearIcon] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: methods = [], isLoading } = useQuery({
    queryKey: queryKeys.paymentMethods.all(user?.id ?? ""),
    queryFn: () => paymentMethodsService.list(user!.id),
    enabled: !!user?.id,
  });

  function resetAddForm() {
    setNewName("");
    if (newIconPreview) URL.revokeObjectURL(newIconPreview);
    setNewIconFile(null);
    setNewIconPreview(null);
    setIsAdding(false);
  }

  function resetEditState() {
    setEditingId(null);
    setEditingName("");
    if (editIconPreview) URL.revokeObjectURL(editIconPreview);
    setEditIconFile(null);
    setEditIconPreview(null);
    setEditClearIcon(false);
  }

  const createMut = useMutation({
    mutationFn: (data: { name: string; file: File | null }) => {
      const fd = new FormData();
      fd.append("name", data.name);
      fd.append("user", user!.id);
      fd.append("order", String(methods.length));
      if (data.file) fd.append("icon", data.file);
      return paymentMethodsService.create(fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.paymentMethods.all(user?.id ?? ""),
      });
      resetAddForm();
      toast.success(t("success_create"));
    },
    onError: () => toast.error(t("error")),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<PaymentMethod> & {
        _file?: File | null;
        _clearIcon?: boolean;
      };
    }) => {
      const { _file, _clearIcon, ...rest } = data;
      if (_file || _clearIcon) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) fd.append(k, String(v));
        }
        if (_file) fd.append("icon", _file);
        if (_clearIcon) fd.append("icon-", "icon"); // PocketBase: "field-" to delete file
        return paymentMethodsService.update(id, fd);
      }
      return paymentMethodsService.update(id, rest);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.paymentMethods.all(user?.id ?? ""),
      });
      resetEditState();
      toast.success(t("success_update"));
    },
    onError: () => toast.error(t("error")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => paymentMethodsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.paymentMethods.all(user?.id ?? ""),
      });
      toast.success(t("success_delete"));
    },
    onError: () => toast.error(t("error")),
  });

  const handleAdd = () => {
    if (!newName.trim()) return;
    createMut.mutate({ name: newName, file: newIconFile });
  };

  const handleUpdateName = (id: string) => {
    if (!editingName.trim()) return;
    updateMut.mutate({
      id,
      data: {
        name: editingName,
        _file: editIconFile,
        _clearIcon: editClearIcon,
      },
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index)
      return;

    const reordered = Array.from(methods);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Optimistic update
    qc.setQueryData<PaymentMethod[]>(
      queryKeys.paymentMethods.all(user?.id ?? ""),
      reordered,
    );

    // Persist only items whose order changed
    reordered.forEach((m, i) => {
      if (m.order !== i) {
        paymentMethodsService.update(m.id, { order: i }).catch(() => {
          qc.invalidateQueries({
            queryKey: queryKeys.paymentMethods.all(user?.id ?? ""),
          });
        });
      }
    });
  };

  const startEdit = (method: PaymentMethod) => {
    setEditingId(method.id);
    setEditingName(method.name);
    setEditIconFile(null);
    setEditIconPreview(null);
    setEditClearIcon(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary" />
            {t("payment_methods")}
          </h2>
          <p className="text-muted-foreground">{t("payment_methods_desc")}</p>
        </div>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            className="rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("add")}
          </Button>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        {isAdding && (
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-primary/50 bg-primary/5">
            <div className="flex items-center gap-3">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("payment_method_name_placeholder")}
                className="border-0 bg-transparent focus-visible:ring-0 text-base"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                onClick={handleAdd}
              >
                <Check className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 text-muted-foreground"
                onClick={resetAddForm}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <IconPicker
              currentSrc={newIconPreview}
              hasUploadedIcon={!!newIconFile}
              onFileChange={(file, url) => {
                if (newIconPreview) URL.revokeObjectURL(newIconPreview);
                setNewIconFile(file);
                setNewIconPreview(url);
              }}
              onClear={() => {
                if (newIconPreview) URL.revokeObjectURL(newIconPreview);
                setNewIconFile(null);
                setNewIconPreview(null);
              }}
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : methods.length === 0 && !isAdding ? (
          <div className="text-center py-12 border border-dashed rounded-3xl text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{t("no_payment_methods")}</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="payment-methods">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-3"
                >
                  {methods.map((method, idx) => (
                    <Draggable
                      key={method.id}
                      draggableId={method.id}
                      index={idx}
                      isDragDisabled={editingId === method.id}
                    >
                      {(drag, snapshot) => (
                        <div
                          ref={drag.innerRef}
                          {...drag.draggableProps}
                          className={`flex items-center justify-between p-4 rounded-2xl border bg-card transition-colors group ${
                            snapshot.isDragging
                              ? "shadow-lg ring-2 ring-primary/30 bg-muted/50"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          {editingId === method.id ? (
                            <div className="flex flex-col w-full gap-3">
                              <div className="flex items-center gap-3">
                                <Input
                                  autoFocus
                                  value={editingName}
                                  onChange={(e) =>
                                    setEditingName(e.target.value)
                                  }
                                  className="border-muted bg-background focus-visible:ring-primary h-10 text-base"
                                  onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    handleUpdateName(method.id)
                                  }
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="shrink-0 text-green-500 hover:text-green-600"
                                  onClick={() => handleUpdateName(method.id)}
                                >
                                  <Check className="w-5 h-5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="shrink-0"
                                  onClick={resetEditState}
                                >
                                  <X className="w-5 h-5" />
                                </Button>
                              </div>
                              <IconPicker
                                currentSrc={
                                  editClearIcon
                                    ? null
                                    : (editIconPreview ??
                                      paymentMethodsService.iconUrl(method))
                                }
                                hasUploadedIcon={
                                  !editClearIcon &&
                                  (!!editIconFile || !!method.icon)
                                }
                                onFileChange={(file, url) => {
                                  if (editIconPreview)
                                    URL.revokeObjectURL(editIconPreview);
                                  setEditIconFile(file);
                                  setEditIconPreview(url);
                                  setEditClearIcon(false);
                                }}
                                onClear={() => {
                                  if (editIconPreview)
                                    URL.revokeObjectURL(editIconPreview);
                                  setEditIconFile(null);
                                  setEditIconPreview(null);
                                  setEditClearIcon(true);
                                }}
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <div
                                  {...drag.dragHandleProps}
                                  className="p-1 rounded text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <MethodIcon method={method} size={40} />
                                <span className="font-medium text-lg">
                                  {method.name}
                                </span>
                              </div>
                              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-foreground"
                                  onClick={() => startEdit(method)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setPendingDeleteId(method.id);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      <ConfirmDialog
                        open={!!pendingDeleteId}
                        onOpenChange={(open) => {
                          if (!open) setPendingDeleteId(null);
                        }}
                        title={t("delete")}
                        description={t("confirm_delete")}
                        onConfirm={() => {
                          if (!pendingDeleteId) return;
                          deleteMut.mutate(pendingDeleteId);
                          setPendingDeleteId(null);
                        }}
                      />
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
