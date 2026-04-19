import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/i18n/LanguageProvider";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { normalizeNotesDocument } from "@/lib/editDialogDirtyState";
import {
  Bold,
  ChevronDown,
  FileDown,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  MoreHorizontal,
  TableIcon,
} from "lucide-react";

const AUTOSAVE_MS = 2000;

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

function parseInitialContent(
  notesDocument: unknown | null | undefined,
  legacyNotes: string | null | undefined,
): JSONContent {
  return normalizeNotesDocument(notesDocument, legacyNotes);
}

/** Stable key for editor init; must never throw (bad API data would otherwise white-screen the app). */
function notesDocumentInitKey(
  notesDocument: unknown | null | undefined,
  legacyNotes: string | null | undefined,
): string {
  try {
    return `${JSON.stringify(notesDocument ?? null)}\n${legacyNotes ?? ""}`;
  } catch {
    return `<unserializable_notes>\n${legacyNotes ?? ""}`;
  }
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
        "flex shrink-0 flex-nowrap items-center gap-0.5 rounded-lg border border-border/80 bg-background/95 px-1 py-1 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
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

type Props = {
  recordId: string;
  notesDocument: unknown | null | undefined;
  legacyNotes: string | null | undefined;
  onPersist: (json: Record<string, unknown>) => void | Promise<void>;
  exportNotes?: (format: "pdf" | "docx") => Promise<Blob>;
  exportDownloadBasename?: string;
  /** Override root sizing (e.g. `min-h-0 flex-1` when filling a fixed-height dialog panel). */
  className?: string;
};

export type LeadNotesEditorHandle = {
  /** Clears debounce and persists the latest editor JSON (e.g. before dialog Save). */
  flushPendingSave: () => Promise<void>;
};

export const LeadNotesEditor = forwardRef<LeadNotesEditorHandle, Props>(function LeadNotesEditor(
  { recordId, notesDocument, legacyNotes, onPersist, exportNotes, exportDownloadBasename, className },
  ref,
) {
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

  const initKey = notesDocumentInitKey(notesDocument, legacyNotes);
  const initialContent = useMemo(
    () => parseInitialContent(notesDocument, legacyNotes),
    [initKey, notesDocument, legacyNotes],
  );

  const flushSave = useCallback(
    (editor: Editor) => {
      let json: Record<string, unknown>;
      try {
        json = editor.getJSON() as Record<string, unknown>;
      } catch {
        toast.error(tx("Could not save notes", "No se pudieron guardar las notas"));
        return;
      }
      let serialized: string;
      try {
        serialized = JSON.stringify(json);
      } catch {
        toast.error(tx("Could not save notes", "No se pudieron guardar las notas"));
        return;
      }
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
            "tiptap focus:outline-none min-h-[min(70vh,36rem)] w-full max-w-none px-10 py-9 text-[15px] text-foreground leading-[1.65] antialiased",
        },
      },
      onCreate: ({ editor: ed }) => {
        try {
          lastSerialized.current = JSON.stringify(ed.getJSON());
        } catch {
          lastSerialized.current = "";
        }
      },
      onUpdate: ({ editor: ed, transaction }) => {
        if (!transaction.docChanged) return;
        scheduleSave(ed);
      },
    },
    [recordId, extensions, initialContent],
  );

  useImperativeHandle(
    ref,
    () => ({
      flushPendingSave: async () => {
        if (saveTimer.current) {
          clearTimeout(saveTimer.current);
          saveTimer.current = null;
        }
        const ed = editor;
        if (!ed) return;
        let json: Record<string, unknown>;
        try {
          json = ed.getJSON() as Record<string, unknown>;
        } catch {
          toast.error(tx("Could not save notes", "No se pudieron guardar las notas"));
          return;
        }
        let serialized: string;
        try {
          serialized = JSON.stringify(json);
        } catch {
          toast.error(tx("Could not save notes", "No se pudieron guardar las notas"));
          return;
        }
        lastSerialized.current = serialized;
        await Promise.resolve(onPersist(json)).catch(() => {
          toast.error(tx("Could not save notes", "No se pudieron guardar las notas"));
        });
      },
    }),
    [editor, onPersist, tx],
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

  if (!editor) {
    return (
      <div
        className={cn(
          "flex min-h-[12rem] flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground",
          className,
        )}
      >
        {tx("Loading editor…", "Cargando editor…")}
      </div>
    );
  }

  const compactSelectTrigger = "h-8 w-[min(100%,5.5rem)] gap-1 border-input/80 text-xs shadow-none shrink-0";

  return (
    <div
      className={cn(
        "lead-notes-editor flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-xl border border-border/90 bg-[hsl(42_12%_92%)] shadow-inner dark:bg-zinc-900/50",
        className,
      )}
    >
      <div className="lead-notes-toolbar sticky top-0 z-20 flex shrink-0 flex-col gap-0 border-b border-border/80 bg-[hsl(42_10%_94%)]/95 px-2 py-2 backdrop-blur-md dark:bg-zinc-900/95">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:flex-nowrap sm:overflow-x-scroll">
          <ToolbarGroup>
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
              <SelectTrigger className={cn(compactSelectTrigger, "w-[74px]")} aria-label={tx("Font size", "Tamaño")}>
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
          </ToolbarGroup>
          <ToolbarGroup>
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
              <SelectTrigger
                className={cn(compactSelectTrigger, "w-[min(100%,6.25rem)]")}
                aria-label={tx("Text color", "Color de texto")}
              >
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
          </ToolbarGroup>

          <ToolbarGroup>
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
          </ToolbarGroup>
          <ToolbarGroup>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              aria-label={tx("Insert table", "Insertar tabla")}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </ToolbarGroup>

          <div className="min-w-[0.5rem] flex-1 basis-full sm:basis-auto sm:flex-1" aria-hidden />

          {exportNotes ? (
            <ToolbarGroup className="ml-auto sm:ml-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 border-border/90 px-2 shadow-sm"
                    aria-label={tx("Export notes", "Exportar notas")}
                  >
                    <MoreHorizontal className="h-4 w-4 shrink-0" />
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={6} className="min-w-[12rem]">
                  <DropdownMenuItem onClick={() => void runExport("pdf")}>
                    <FileDown className="mr-2 h-4 w-4" />
                    {tx("Download PDF", "Descargar PDF")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void runExport("docx")}>
                    <FileDown className="mr-2 h-4 w-4" />
                    {tx("Download DOCX", "Descargar DOCX")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ToolbarGroup>
          ) : null}
        </div>
      </div>

      <div className="lead-notes-scroll min-h-0 flex-1 overflow-y-auto bg-[hsl(42_22%_88%)] px-2 pb-3 pt-0.5 dark:bg-zinc-900/80">
        <div className="lead-notes-page mx-auto w-full max-w-[816px] rounded-sm border border-black/[0.09] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});

LeadNotesEditor.displayName = "LeadNotesEditor";
