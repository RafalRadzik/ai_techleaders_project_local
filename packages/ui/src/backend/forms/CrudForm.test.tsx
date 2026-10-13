import type { ApiResult } from "@devmentor/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CrudForm, type CrudFormField } from "./CrudForm";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("Enter a valid email address"),
});

type Values = z.output<typeof schema>;

const fields: readonly CrudFormField<"name" | "email">[] = [
  { name: "name", label: "Name", autoComplete: "name", placeholder: "Ada", description: "Full name" },
  { name: "email", label: "Email", type: "email" },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function renderForm(props: Partial<Parameters<typeof CrudForm<typeof schema, { id: string }>>[0]> = {}) {
  const onSubmit = vi.fn<(values: Values) => Promise<ApiResult<{ id: string }>>>();
  const view = render(<CrudForm schema={schema} fields={fields} onSubmit={onSubmit} {...props} />);
  return { ...view, onSubmit, form: view.container.querySelector("form") as HTMLFormElement };
}

async function fillValid() {
  await userEvent.type(screen.getByLabelText("Name"), "Ada");
  await userEvent.type(screen.getByLabelText("Email"), "ada@example.com");
}

describe("CrudForm", () => {
  it("renders the fields with their attributes and the default submit label", () => {
    renderForm();

    const name = screen.getByLabelText("Name");
    expect(name).toHaveAttribute("type", "text");
    expect(name).toHaveAttribute("placeholder", "Ada");
    expect(name).toHaveAttribute("autocomplete", "name");
    expect(name).toHaveAccessibleDescription("Full name");
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-describedby");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("shows the schema errors for untouched fields without submitting", async () => {
    const { onSubmit } = renderForm({ submitLabel: "Add user" });

    await userEvent.click(screen.getByRole("button", { name: "Add user" }));

    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription("Name is required");
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter a valid email address");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the parsed values, resets to the initial values and calls onSuccess", async () => {
    const onSuccess = vi.fn();
    const { onSubmit } = renderForm({ onSuccess, initialValues: { name: "Initial" } });
    onSubmit.mockResolvedValue({ ok: true, data: { id: "1" } });

    await userEvent.clear(screen.getByLabelText("Name"));
    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({ name: "Ada", email: "ada@example.com" });
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: "1" }));
    expect(screen.getByLabelText("Name")).toHaveValue("Initial");
    expect(screen.getByLabelText("Email")).toHaveValue("");
  });

  it("works without onSuccess", async () => {
    const { onSubmit } = renderForm();
    onSubmit.mockResolvedValue({ ok: true, data: { id: "1" } });

    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
  });

  it("shows server field errors and the form error", async () => {
    const { onSubmit } = renderForm();
    onSubmit.mockResolvedValue({
      ok: false,
      error: { code: "conflict", message: "Already exists", fieldErrors: { email: ["Taken"] } },
    });

    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Already exists");
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Taken");
    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
  });

  it("shows a server error without field errors", async () => {
    const { onSubmit } = renderForm();
    onSubmit.mockResolvedValue({ ok: false, error: { code: "internal_error", message: "Try again" } });

    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Try again");
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
  });

  it("disables the form while submitting and ignores repeated submits", async () => {
    const pending = deferred<ApiResult<{ id: string }>>();
    const { onSubmit, form } = renderForm({ onCancel: vi.fn() });
    onSubmit.mockReturnValue(pending.promise);

    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByLabelText("Name")).toBeDisabled();
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledOnce();

    pending.resolve({ ok: true, data: { id: "1" } });
    expect(await screen.findByRole("button", { name: "Save" })).toBeEnabled();
  });

  it.each([{ metaKey: true }, { ctrlKey: true }])("submits on Enter with %o", async (modifier) => {
    const { onSubmit, form } = renderForm();
    onSubmit.mockResolvedValue({ ok: true, data: { id: "1" } });
    await fillValid();

    fireEvent.keyDown(form, { key: "Enter", ...modifier });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  });

  it("ignores Enter without a modifier and other keys", async () => {
    const onCancel = vi.fn();
    const { onSubmit, form } = renderForm({ onCancel });

    fireEvent.keyDown(form, { key: "Enter" });
    fireEvent.keyDown(form, { key: "a", ctrlKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels with Escape and the cancel button", async () => {
    const onCancel = vi.fn();
    const { form } = renderForm({ onCancel });

    fireEvent.keyDown(form, { key: "Escape" });
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("ignores Escape without onCancel", () => {
    const { form } = renderForm();

    expect(fireEvent.keyDown(form, { key: "Escape" })).toBe(true);
  });
});
