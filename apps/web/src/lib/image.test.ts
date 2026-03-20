import { compressImage } from "./image";

type ImageScenario = {
  width: number;
  height: number;
  shouldFail?: boolean;
};

function installImageMocks({
  scenario,
  blob,
}: {
  scenario: ImageScenario;
  blob: Blob | null;
}) {
  const drawImage = vi.fn();
  const revokeObjectURL = vi.fn();
  const createObjectURL = vi.fn(() => "blob:test-image");
  const originalCreateElement = document.createElement.bind(document);
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({
      drawImage,
    })),
    toBlob: vi.fn((callback: BlobCallback, _type?: string, _quality?: number) => {
      callback(blob);
    }),
  };

  class MockImage {
    width = scenario.width;
    height = scenario.height;
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;

    set src(_value: string) {
      Promise.resolve().then(() => {
        if (scenario.shouldFail) {
          this.onerror?.();
          return;
        }

        this.onload?.();
      });
    }
  }

  vi.stubGlobal("Image", MockImage);
  vi.stubGlobal("URL", {
    createObjectURL,
    revokeObjectURL,
  });
  vi.spyOn(document, "createElement").mockImplementation(((tagName: string) => {
    if (tagName === "canvas") {
      return canvas as unknown as HTMLCanvasElement;
    }

    return originalCreateElement(tagName);
  }) as typeof document.createElement);

  return {
    canvas,
    drawImage,
    createObjectURL,
    revokeObjectURL,
  };
}

describe("compressImage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("compresses and resizes landscape images to WebP", async () => {
    const blob = new Blob(["compressed"], { type: "image/webp" });
    const { canvas, drawImage, createObjectURL, revokeObjectURL } =
      installImageMocks({
        scenario: { width: 1200, height: 600 },
        blob,
      });
    const file = new File(["raw"], "logo.png", { type: "image/png" });

    const result = await compressImage(file, { maxSize: 512, quality: 0.7 });

    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-image");
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(256);
    expect(drawImage).toHaveBeenCalledWith(expect.any(Object), 0, 0, 512, 256);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.7);
    expect(result.name).toBe("logo.webp");
    expect(result.type).toBe("image/webp");
  });

  it("compresses and resizes portrait images", async () => {
    const blob = new Blob(["compressed"], { type: "image/webp" });
    const { canvas } = installImageMocks({
      scenario: { width: 600, height: 1200 },
      blob,
    });
    const file = new File(["raw"], "avatar.jpg", { type: "image/jpeg" });

    const result = await compressImage(file, { maxSize: 512 });

    expect(canvas.width).toBe(256);
    expect(canvas.height).toBe(512);
    expect(result.name).toBe("avatar.webp");
  });

  it("keeps smaller images at the original size", async () => {
    const blob = new Blob(["compressed"], { type: "image/webp" });
    const { canvas } = installImageMocks({
      scenario: { width: 128, height: 96 },
      blob,
    });
    const file = new File(["raw"], "small.gif", { type: "image/gif" });

    await compressImage(file);

    expect(canvas.width).toBe(128);
    expect(canvas.height).toBe(96);
  });

  it("rejects when canvas.toBlob fails", async () => {
    installImageMocks({
      scenario: { width: 128, height: 96 },
      blob: null,
    });
    const file = new File(["raw"], "broken.png", { type: "image/png" });

    await expect(compressImage(file)).rejects.toThrow(
      "compressImage: toBlob failed",
    );
  });

  it("rejects when the image cannot be loaded", async () => {
    const { revokeObjectURL } = installImageMocks({
      scenario: { width: 0, height: 0, shouldFail: true },
      blob: new Blob(["unused"], { type: "image/webp" }),
    });
    const file = new File(["raw"], "broken.png", { type: "image/png" });

    await expect(compressImage(file)).rejects.toThrow(
      "compressImage: failed to load image",
    );
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-image");
  });
});
