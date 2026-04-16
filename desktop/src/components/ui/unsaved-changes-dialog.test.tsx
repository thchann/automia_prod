import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { UnsavedChangesDialog } from "./unsaved-changes-dialog";

describe("UnsavedChangesDialog", () => {
  it("shows a loading spinner and disables actions while saving", () => {
    const onSaveAndExit = vi.fn();
    const onDiscardAndExit = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <UnsavedChangesDialog
        open
        onOpenChange={onOpenChange}
        onSaveAndExit={onSaveAndExit}
        onDiscardAndExit={onDiscardAndExit}
        saving
        title="Save your changes before leaving?"
        description="You have unsaved edits in this modal."
        saveLabel="Save and exit"
        discardLabel="Discard"
        cancelLabel="Keep editing"
      />,
    );

    expect(screen.getByText("Save and exit…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save and exit…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Keep editing" })).toBeDisabled();
    expect(document.querySelector(".animate-spin")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Save and exit…" }));
    expect(onSaveAndExit).not.toHaveBeenCalled();
  });
});
