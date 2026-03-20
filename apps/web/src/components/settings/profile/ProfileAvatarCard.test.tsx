import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProfileAvatarCard } from "./ProfileAvatarCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ProfileAvatarCard", () => {
  it("renders the fallback initial and opens the file picker from both triggers", async () => {
    const fileRef = { current: null as HTMLInputElement | null };
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");

    render(
      <ProfileAvatarCard
        displayName="Daniel"
        email="daniel@example.com"
        fileRef={fileRef}
        preview={null}
        onFileChange={vi.fn()}
      />,
    );

    expect(screen.getByText("D")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "change_avatar" }));
    await userEvent.click(screen.getAllByRole("button")[0]);

    expect(clickSpy).toHaveBeenCalledTimes(2);
    clickSpy.mockRestore();
  });

  it("renders the preview image and forwards the selected file", async () => {
    const onFileChange = vi.fn();
    const fileRef = { current: null as HTMLInputElement | null };
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });

    const { container } = render(
      <ProfileAvatarCard
        displayName="Daniel"
        email="daniel@example.com"
        fileRef={fileRef}
        preview="https://example.com/avatar.png"
        onFileChange={onFileChange}
      />,
    );

    expect(screen.getByRole("img", { name: "avatar" })).toHaveAttribute(
      "src",
      "https://example.com/avatar.png",
    );

    await userEvent.upload(
      container.querySelector('input[type="file"]') as HTMLInputElement,
      file,
    );

    expect(onFileChange).toHaveBeenCalledWith(file);
  });
});
