import { useCallback, useEffect, useMemo, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor, JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Image } from "@tiptap/extension-image";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageProvider";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Ban,
  Bold,
  FileDown,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Redo2,
  Strikethrough,
  TableIcon,
  Type,
  Underline,
  Undo2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const AUTOSAVE_MS = 2000;

const FONT_OPTIONS: { key: string; value: string; labelEn: string; labelEs: string }[] = [
  { key: "default", value: "", labelEn: "Default", labelEs: "Predeterminado" },
  { key: "inter", value: "Inter, system-ui, sans-serif", labelEn: "Inter", labelEs: "Inter" },
  { key: "arial", value: "Arial, Helvetica, sans-serif", labelEn: "Arial", labelEs: "Arial" },
  { key: "georgia", value: "Georgia, serif", labelEn: "Georgia", labelEs: "Georgia" },
  { key: "mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace", labelEn: "Mono", labelEs: "Monoespacio" },
];

const SIZE_OPTIONS: { key: string; value: string; label: string }[] = [
  { key: "default", value: "", label: "—" },
  { key: "11", value: "11px", label: "11" },
  { key: "12", value: "12px", label: "12" },
  { key: "14", value: "14px", label: "14" },
  { key: "16", value: "16px", label: "16" },
  { key: "18", value: "18px", label: "18" },
  { key: "24", value: "24px", label: "24" },
];

const TEXT_COLORS = [
  { key: "default", hex: "" },
  { key: "ink", hex: "#111827" },
  { key: "blue", hex: "#2563eb" },
  { key: "green", hex: "#15803d" },
  { key: "red", hex: "#dc2626" },
  { key: "orange", hex: "#ea580c" },
];

const HIGHLIGHT_COLORS = [
  { key: "yellow", hex: "#fef08a" },
  { key: "green", hex: "#bbf7d0" },
  { key: "blue", hex: "#bfdbfe" },
  { key: "pink", hex: "#fbcfe8" },
  { key: "none", hex: "" },
];

function isDocJson(value: unknown): value is JSONContent {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as { type?: string }).type === "doc"
  );
}

function legacyNotesToDoc(notes: string | null | undefined): JSONContent {
  if (!notes?.trim()) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }
  const blocks = notes
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: blocks.map((text) => ({
      type: "paragraph" as const,
      content: [{ type: "text" as const, text }],
    })),
  };
}

function parseInitialContent(
  notesDocument: unknown | null | undefined,
  legacyNotes: string | null | undefined,
): JSONContent {
  if (isDocJson(notesDocument)) return notesDocument;
  return legacyNotesToDoc(legacyNotes);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ToolbarGroup({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-0.5 rounded-lg border border-border/80 bg-background/95 px-1 py-1 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

function blockTypeValue(editor: Editor): string {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  return "paragraph";
}

function fontKeyFromEditor(editor: Editor): string {
  const raw = (editor.getAttributes("textStyle").fontFamily as string | undefined)?.trim() ?? "";
  if (!raw) return "default";
  const hit = FONT_OPTIONS.find((o) => o.value === raw);
  return hit?.key ?? "default";
}

function fontSizeKeyFromEditor(editor: Editor): string {
  const raw = (editor.getAttributes("textStyle").fontSize as string | undefined)?.trim() ?? "";
  if (!raw) return "default";
  const hit = SIZE_OPTIONS.find((o) => o.value === raw);
  return hit?.key ?? "default";
}

function textColorKeyFromEditor(editor: Editor): string {
  const raw = (editor.getAttributes("textStyle").color as string | undefined)?.trim() ?? "";
  if (!raw) return "default";
  const hit = TEXT_COLORS.find((c) => c.hex.toLowerCase() === raw.toLowerCase());
  return hit?.key ?? "default";
}

function NotesDocumentRuler() {
  return (
    <div
      className="lead-notes-ruler mx-auto w-full max-w-[816px] h-[20px] shrink-0 border-x border-black/[0.07] bg-[hsl(42_18%_86%)] dark:bg-zinc-800/95 select-none"
      aria-hidden
    >
      <div className="mx-10 mt-1 h-2 border-b border-black/15 dark:border-white/15 relative">
        <div
          className="absolute inset-0 opacity-70 dark:opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(0,0,0,0.14) 7px, rgba(0,0,0,0.14) 8px)",
          }}
        />
        <div className="absolute -left-1 -top-0.5 h-0 w-0 border-l-[3px] border-r-[3px] border-b-[5px] border-l-transparent border-r-transparent border-b-primary/70" />
        <div className="absolute -right-1 -top-0.5 h-0 w-0 border-l-[3px] border-r-[3px] border-b-[5px] border-l-transparent border-r-transparent border-b-primary/70" />
      </div>
    </div>
  );
}

type Props = {
  recordId: string;
  notesDocument: unknown | null | undefined;
  legacyNotes: string | null | undefined;
  onPersist: (json: Record<string, unknown>) => void | Promise<void>;
  exportNotes?: (format: "pdf" | "docx") => Promise<Blob>;
  exportDownloadBasename?: string;
};

export function LeadNotesEditor({
  recordId,
  notesDocument,
  legacyNotes,
  onPersist,
  exportNotes,
  exportDownloadBasename,
}: Props) {
  const { tx } = useLanguage();
  const lastSerialized = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: { class: "text-primary underline underline-offset-2" },
        },
      }),
      TextStyleKit.configure({
        backgroundColor: false,
        lineHeight: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: tx("Start writing notes…", "Empieza a escribir notas…"),
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        allowBase64: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    [tx],
  );

  const initKey = `${JSON.stringify(notesDocument ?? null)}\n${legacyNotes ?? ""}`;
  const initialContent = useMemo(
    () => parseInitialContent(notesDocument, legacyNotes),
    [initKey, notesDocument, legacyNotes],
  );

  const flushSave = useCallback(
    (editor: Editor) => {
      const json = editor.getJSON() as Record<string, unknown>;
      const serialized = JSON.stringify(json);
      if (serialized === lastSerialized.current) return;
      lastSerialized.current = serialized;
      void Promise.resolve(onPersist(json)).catch(() => {
        toast.error(tx("Could not save notes", "No se pudieron guardar las notas"));
      });
    },
    [onPersist, tx],
  );

  const scheduleSave = useCallback(
    (editor: Editor) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        flushSave(editor);
      }, AUTOSAVE_MS);
    },
    [flushSave],
  );

  const editor = useEditor(
    {
      immediatelyRender: true,
      shouldRerenderOnTransaction: true,
      extensions,
      content: initialContent,
      editorProps: {
        attributes: {
          class:
            "tiptap focus:outline-none min-h-[min(70vh,36rem)] w-full max-w-none px-14 py-12 text-[15px] text-foreground leading-[1.65] antialiased",
        },
      },
      onCreate: ({ editor: ed }) => {
        lastSerialized.current = JSON.stringify(ed.getJSON());
      },
      onUpdate: ({ editor: ed, transaction }) => {
        if (!transaction.docChanged) return;
        scheduleSave(ed);
      },
    },
    [recordId, extensions, initialContent],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const runExport = async (format: "pdf" | "docx") => {
    if (!exportNotes) return;
    try {
      const blob = await exportNotes(format);
      const stem = exportDownloadBasename ?? `notes-${recordId}`;
      downloadBlob(blob, `${stem}.${format}`);
    } catch {
      toast.error(
        tx(
          "Export failed. Ensure the server implements the notes export endpoint.",
          "Exportacion fallida. El servidor debe exponer el endpoint de exportacion de notas.",
        ),
      );
    }
  };

  const insertMeetingTemplate = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Meeting notes" }] },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Date: " }] }],
            },
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Attendees: " }] }],
            },
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Notes: " }] }],
            },
          ],
        },
        { type: "paragraph" },
      ])
      .run();
  };

  const insertEmailTemplate = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "paragraph", content: [{ type: "text", text: "Hi," }] },
        { type: "paragraph" },
        { type: "paragraph", content: [{ type: "text", text: "Thanks," }] },
        { type: "paragraph" },
      ])
      .run();
  };

  const insertChecklistTemplate = () => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
          },
          {
            type: "taskItem",
            attrs: { checked: false },
            content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
          },
        ],
      })
      .run();
  };

  if (!editor) {
    return (
      <div className="flex min-h-[min(70vh,28rem)] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
        {tx("Loading editor…", "Cargando editor…")}
      </div>
    );
  }

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const next = window.prompt(tx("Link URL", "URL del enlace"), prev ?? "https://");
    if (next === null) return;
    const t = next.trim();
    if (t === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: t }).run();
  };

  const compactSelectTrigger = "h-8 w-[min(100%,8.5rem)] gap-1 border-input/80 text-xs shadow-none";

  return (
    <div className="lead-notes-editor flex max-h-[min(75vh,calc(90vh-12rem))] min-h-[min(70vh,28rem)] flex-1 flex-col gap-0 overflow-hidden rounded-xl border border-border/90 bg-[hsl(42_12%_92%)] shadow-inner dark:bg-zinc-950/50">
      <div className="lead-notes-toolbar sticky top-0 z-20 flex shrink-0 flex-col gap-2 border-b border-border/80 bg-[hsl(42_10%_94%)]/95 px-2 py-2 backdrop-blur-md dark:bg-zinc-900/95">
        <div className="flex flex-wrap items-center gap-2">
          <ToolbarGroup>
            <Type className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1 hidden sm:block" aria-hidden />
            <Select
              value={blockTypeValue(editor)}
              onValueChange={(v) => {
                const chain = editor.chain().focus();
                if (v === "paragraph") chain.setParagraph().run();
                else if (v === "h1") chain.setHeading({ level: 1 }).run();
                else if (v === "h2") chain.setHeading({ level: 2 }).run();
                else if (v === "h3") chain.setHeading({ level: 3 }).run();
              }}
            >
              <SelectTrigger className={cn(compactSelectTrigger, "w-[128px]")} aria-label={tx("Text style", "Estilo de texto")}>
                <SelectValue placeholder={tx("Normal text", "Texto normal")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraph">{tx("Normal text", "Texto normal")}</SelectItem>
                <SelectItem value="h1">{tx("Heading 1", "Titulo 1")}</SelectItem>
                <SelectItem value="h2">{tx("Heading 2", "Titulo 2")}</SelectItem>
                <SelectItem value="h3">{tx("Heading 3", "Titulo 3")}</SelectItem>
              </SelectContent>
            </Select>
            <Separator orientation="vertical" className="mx-0.5 h-6 hidden sm:block" />
            <Select
              value={fontKeyFromEditor(editor)}
              onValueChange={(key) => {
                const opt = FONT_OPTIONS.find((o) => o.key === key);
                if (!opt) return;
                const chain = editor.chain().focus();
                if (!opt.value) chain.unsetFontFamily().run();
                else chain.setFontFamily(opt.value).run();
              }}
            >
              <SelectTrigger className={cn(compactSelectTrigger, "w-[104px]")} aria-label={tx("Font", "Fuente")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {tx(o.labelEn, o.labelEs)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={fontSizeKeyFromEditor(editor)}
              onValueChange={(key) => {
                const opt = SIZE_OPTIONS.find((o) => o.key === key);
                if (!opt) return;
                const chain = editor.chain().focus();
                if (!opt.value) chain.unsetFontSize().run();
                else chain.setFontSize(opt.value).run();
              }}
            >
              <SelectTrigger className={cn(compactSelectTrigger, "w-[56px]")} aria-label={tx("Font size", "Tamano")}>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ToolbarGroup>

          <ToolbarGroup>
            <Toggle
              size="sm"
              pressed={editor.isActive("bold")}
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
              aria-label={tx("Bold", "Negrita")}
            >
              <Bold className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("italic")}
              onPressedChange={() => editor.chain().focus().toggleItalic().run()}
              aria-label={tx("Italic", "Cursiva")}
            >
              <Italic className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("underline")}
              onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
              aria-label={tx("Underline", "Subrayado")}
            >
              <Underline className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("strike")}
              onPressedChange={() => editor.chain().focus().toggleStrike().run()}
              aria-label={tx("Strikethrough", "Tachado")}
            >
              <Strikethrough className="h-4 w-4" />
            </Toggle>
            <Separator orientation="vertical" className="mx-0.5 h-6" />
            <Select
              value={textColorKeyFromEditor(editor)}
              onValueChange={(key) => {
                const opt = TEXT_COLORS.find((c) => c.key === key);
                if (!opt) return;
                const chain = editor.chain().focus();
                if (!opt.hex) chain.unsetColor().run();
                else chain.setColor(opt.hex).run();
              }}
            >
              <SelectTrigger className={cn(compactSelectTrigger, "w-[88px]")} aria-label={tx("Text color", "Color de texto")}>
                <SelectValue placeholder={tx("Color", "Color")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{tx("Default color", "Color predeterminado")}</SelectItem>
                {TEXT_COLORS.filter((c) => c.hex).map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm border border-border" style={{ backgroundColor: c.hex }} />
                      {c.key}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-0.5 pl-0.5" title={tx("Highlight", "Resaltado")}>
              {HIGHLIGHT_COLORS.map((h) =>
                h.hex ? (
                  <button
                    key={h.key}
                    type="button"
                    title={tx("Highlight", "Resaltado")}
                    className="h-6 w-6 rounded border border-border/80 shadow-sm transition hover:scale-105"
                    style={{ backgroundColor: h.hex }}
                    onClick={() => editor.chain().focus().toggleHighlight({ color: h.hex }).run()}
                  />
                ) : (
                  <Button
                    key={h.key}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title={tx("Remove highlight", "Quitar resaltado")}
                    onClick={() => editor.chain().focus().unsetHighlight().run()}
                  >
                    <Ban className="h-3.5 w-3.5" />
                  </Button>
                ),
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", editor.isActive("link") && "bg-accent")}
              aria-label={tx("Link", "Enlace")}
              onClick={setLink}
            >
              <Link2 className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="mx-0.5 h-6" />
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: "left" })}
              onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
              aria-label={tx("Align left", "Alinear izquierda")}
            >
              <AlignLeft className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: "center" })}
              onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
              aria-label={tx("Align center", "Alinear centro")}
            >
              <AlignCenter className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: "right" })}
              onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
              aria-label={tx("Align right", "Alinear derecha")}
            >
              <AlignRight className="h-4 w-4" />
            </Toggle>
          </ToolbarGroup>

          <ToolbarGroup className="ml-auto">
            <Toggle
              size="sm"
              pressed={editor.isActive("bulletList")}
              onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
              aria-label={tx("Bullet list", "Lista con viñetas")}
            >
              <List className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("orderedList")}
              onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
              aria-label={tx("Numbered list", "Lista numerada")}
            >
              <ListOrdered className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor.isActive("taskList")}
              onPressedChange={() => editor.chain().focus().toggleTaskList().run()}
              aria-label={tx("Task list", "Lista de tareas")}
            >
              <ListTodo className="h-4 w-4" />
            </Toggle>
            <Separator orientation="vertical" className="mx-0.5 h-6" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
            >
              <TableIcon className="h-4 w-4 mr-1" />
              {tx("Table", "Tabla")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => {
                const src = window.prompt(tx("Image URL", "URL de imagen"));
                if (src?.trim()) editor.chain().focus().setImage({ src: src.trim() }).run();
              }}
            >
              <ImageIcon className="h-4 w-4 mr-1" />
              {tx("Image", "Imagen")}
            </Button>
            <Separator orientation="vertical" className="mx-0.5 h-6" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              aria-label={tx("Undo", "Deshacer")}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              aria-label={tx("Redo", "Rehacer")}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            {exportNotes ? (
              <>
                <Separator orientation="vertical" className="mx-0.5 h-6" />
                <Button type="button" variant="secondary" size="sm" className="h-8 text-xs" onClick={() => void runExport("pdf")}>
                  <FileDown className="h-3.5 w-3.5 mr-1" />
                  {tx("Download PDF", "Descargar PDF")}
                </Button>
                <Button type="button" variant="secondary" size="sm" className="h-8 text-xs" onClick={() => void runExport("docx")}>
                  <FileDown className="h-3.5 w-3.5 mr-1" />
                  {tx("Download DOCX", "Descargar DOCX")}
                </Button>
              </>
            ) : null}
          </ToolbarGroup>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mr-1">
            {tx("Templates", "Plantillas")}
          </span>
          <Button type="button" variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={insertMeetingTemplate}>
            {tx("Meeting notes", "Notas de reunion")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={insertEmailTemplate}>
            {tx("Email draft", "Borrador de correo")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={insertChecklistTemplate}>
            {tx("Checklist", "Lista de tareas")}
          </Button>
        </div>
      </div>

      <NotesDocumentRuler />

      <div className="lead-notes-scroll min-h-0 flex-1 overflow-y-auto bg-[hsl(42_22%_88%)] px-3 pb-5 pt-1 dark:bg-zinc-900/85">
        <div className="lead-notes-page mx-auto w-full max-w-[816px] rounded-sm border border-black/[0.09] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          <EditorContent editor={editor} />
        </div>
      </div>

      <p className="shrink-0 border-t border-border/80 bg-[hsl(42_10%_94%)]/90 px-3 py-2 text-[10px] text-muted-foreground dark:bg-zinc-900/90">
        {tx("Notes auto-save after you stop typing for 2 seconds.", "Las notas se guardan solas tras 2 s sin escribir.")}
      </p>
    </div>
  );
}
