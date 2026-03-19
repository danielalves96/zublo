import { z } from "zod";

export interface ProfileFormValues {
  username: string;
  email: string;
  oldPwd: string;
  newPwd: string;
  confPwd: string;
  language: string;
}

export function buildProfileSchema(
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  return z
    .object({
      username: z.string().min(1, t("required")),
      email: z.string().min(1, t("required")).email(t("validation_invalid_email")),
      oldPwd: z.string(),
      newPwd: z.string(),
      confPwd: z.string(),
      language: z.string().min(1, t("required")),
    })
    .refine((data) => !data.newPwd || data.newPwd.length >= 8, {
      message: t("validation_min_chars", { count: 8 }),
      path: ["newPwd"],
    })
    .refine((data) => !data.newPwd || data.newPwd === data.confPwd, {
      message: t("passwords_no_match"),
      path: ["confPwd"],
    })
    .refine((data) => !data.newPwd || !!data.oldPwd, {
      message: t("required"),
      path: ["oldPwd"],
    });
}
