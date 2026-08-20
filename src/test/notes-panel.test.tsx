import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const rpc = vi.fn();
const maybeSingle = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpc(...a),
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => maybeSingle() }),
      }),
    }),
  },
}));

import NotesPanel from "@/components/learning/NotesPanel";

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("NotesPanel", () => {
  beforeEach(() => {
    rpc.mockReset();
    maybeSingle.mockReset();
  });

  it("hydrates an existing note from the server (survives reload)", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: "n1",
        body: "earlier note",
        shared_with_user_id: null,
        shared_at: null,
        updated_at: new Date().toISOString(),
      },
      error: null,
    });
    wrap(<NotesPanel contentItemId="ci-1" />);
    const ta = (await screen.findByPlaceholderText(/Notes for yourself/i)) as HTMLTextAreaElement;
    expect(ta.value).toBe("earlier note");
  });

  it("autosaves via bw_learning_note_save after idle, with no Save button", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    rpc.mockResolvedValue({ data: { shared_with_user_id: null }, error: null });
    const user = userEvent.setup();
    wrap(<NotesPanel contentItemId="ci-1" />);
    const ta = await screen.findByPlaceholderText(/Notes for yourself/i);
    expect(screen.queryByRole("button", { name: /save/i })).toBeNull();
    await user.type(ta, "hello");
    await waitFor(
      () =>
        expect(rpc).toHaveBeenCalledWith("bw_learning_note_save", {
          p_content_item_id: "ci-1",
          p_body: "hello",
        }),
      { timeout: 3000 },
    );
    expect(await screen.findByText("Saved")).toBeTruthy();
  });

  it("shows a plain message when the account has no mentor", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: "n1",
        body: "x",
        shared_with_user_id: null,
        shared_at: null,
        updated_at: new Date().toISOString(),
      },
      error: null,
    });
    rpc.mockResolvedValue({ data: null, error: { message: "no_active_mentor" } });
    const user = userEvent.setup();
    wrap(<NotesPanel contentItemId="ci-1" />);
    const sw = await screen.findByRole("switch");
    await act(async () => {
      await user.click(sw);
    });
    expect(
      await screen.findByText(/don't have a certification mentor assigned yet/i),
    ).toBeTruthy();
    expect((await screen.findByRole("switch")).getAttribute("data-state")).toBe("unchecked");
  });

  it("renders read-only when the item is archived", async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: "n1",
        body: "archived body",
        shared_with_user_id: null,
        shared_at: null,
        updated_at: new Date().toISOString(),
      },
      error: null,
    });
    rpc.mockResolvedValue({ data: null, error: { message: "content_item_archived" } });
    const user = userEvent.setup();
    wrap(<NotesPanel contentItemId="ci-1" />);
    const ta = await screen.findByPlaceholderText(/Notes for yourself/i);
    await user.type(ta, "!");
    expect(await screen.findByText(/no longer active/i)).toBeTruthy();
    expect(screen.queryByPlaceholderText(/Notes for yourself/i)).toBeNull();
  });
});
