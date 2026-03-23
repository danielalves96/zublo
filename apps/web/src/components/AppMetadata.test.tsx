import { render } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
    i18n: {
      resolvedLanguage: "en",
      language: "en",
    },
  }),
}));

import { AppMetadata } from "./AppMetadata";

describe("AppMetadata", () => {
  it("renders null (nothing in the DOM)", () => {
    const { container } = render(<AppMetadata />);
    expect(container.firstChild).toBeNull();
  });

  it("sets the document title on mount", () => {
    render(<AppMetadata />);
    // The title includes app_name and meta_subtitle as defaultValue fallbacks
    expect(document.title).toContain("Zublo");
  });

  it("sets meta description on mount", () => {
    render(<AppMetadata />);
    const meta = document.head.querySelector('meta[name="description"]');
    expect(meta).not.toBeNull();
    expect(meta?.getAttribute("content")).toBeTruthy();
  });

  it("sets og:title meta tag on mount", () => {
    render(<AppMetadata />);
    const meta = document.head.querySelector('meta[property="og:title"]');
    expect(meta).not.toBeNull();
  });

  it("sets application-name meta tag on mount", () => {
    render(<AppMetadata />);
    const meta = document.head.querySelector('meta[name="application-name"]');
    expect(meta).not.toBeNull();
  });

  it("updates existing meta tag instead of duplicating", () => {
    render(<AppMetadata />);
    render(<AppMetadata />);
    const metas = document.head.querySelectorAll('meta[name="description"]');
    expect(metas.length).toBe(1);
  });
});
