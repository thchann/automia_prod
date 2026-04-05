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
import { exportLeadNotes } from "@automia/api";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useLanguage } from "@/i18n/LanguageProvider";
import { toast } from "@/components/ui/sonner";
import {
  Bold,
  FileDown,
  Heading1,
  Heading2,
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Pilcrow,
  Redo2,
  TableIcon,
  Undo2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const AUTOSAVE_MS = 2000;

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

type Props = {
  leadId: string;
  notesDocument: unknown | null | undefined;
  legacyNotes: string | null | undefined;
  onPersist: (json: Record<string, unknown>) => void | Promise<void>;
};

export function LeadNotesEditor({ leadId, notesDocument, legacyNotes, onPersist }: Props) {
  const { tx } = useLanguage();
  const lastSerialized = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: tx("Start writing notes…", "Empieza a escribir notas…"),
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        // Prefer HTTPS URLs from your upload API; base64 bloats payloads.
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
      // Client-only app: render on first paint so the doc surface is visible (no SSR).
      immediatelyRender: true,
      // Toolbar toggles read `isActive()`; re-render when selection/format changes.
      shouldRerenderOnTransaction: true,
      extensions,
      content: initialContent,
      editorProps: {
        attributes: {
          class:
            "tiptap focus:outline-none min-h-[min(70vh,36rem)] w-full max-w-none px-10 py-10 text-[15px] text-foreground leading-[1.6] antialiased",
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
    [leadId, extensions, initialContent],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const runExport = async (format: "pdf" | "docx") => {
    try {
      const blob = await exportLeadNotes(leadId, format);
      downloadBlob(blob, `lead-${leadId}-notes.${format}`);
    } catch {
      toast.error(
        tx(
          "Export failed. Ensure the server implements GET /leads/:id/notes/export.",
          "Exportacion fallida. El servidor debe implementar GET /leads/:id/notes/export.",
        ),
      );
    }
  };

  if (!editor) {
    return (
      <div className="flex min-h-[min(70vh,28rem)] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
        {tx("Loading editor…", "Cargando editor…")}
      </div>
    );
  }

  return (
    <div className="lead-notes-editor flex max-h-[min(75vh,calc(90vh-12rem))] min-h-[min(70vh,28rem)] flex-1 flex-col gap-0 overflow-hidden rounded-xl border border-border bg-muted/30">
      <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-muted/80 px-2 py-2 backdrop-blur-sm">
        <span className="hidden sm:inline text-[11px] font-medium uppercase tracking-wide text-muted-foreground px-2">
          {tx("Document", "Documento")}
        </span>
        <Separator orientation="vertical" className="hidden sm:block h-6" />
        <Toggle
          size="sm"
          pressed={
            !editor.isActive("heading", { level: 1 }) &&
            !editor.isActive("heading", { level: 2 }) &&
            !editor.isActive("heading", { level: 3 })
          }
          onPressedChange={() => editor.chain().focus().setParagraph().run()}
          aria-label={tx("Normal text", "Texto normal")}
        >
          <Pilcrow className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 1 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          aria-label={tx("Heading 1", "Titulo 1")}
        >
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label={tx("Heading 2", "Titulo 2")}
        >
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Separator orientation="vertical" className="h-6" />
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
        <Separator orientation="vertical" className="h-6" />
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
        <Separator orientation="vertical" className="h-6" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2"
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
          className="h-9 px-2"
          onClick={() => {
            const src = window.prompt(tx("Image URL", "URL de imagen"));
            if (src?.trim()) editor.chain().focus().setImage({ src: src.trim() }).run();
          }}
        >
          <ImageIcon className="h-4 w-4 mr-1" />
          {tx("Image", "Imagen")}
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <div className="ml-auto flex flex-wrap gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => void runExport("pdf")}>
            <FileDown className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void runExport("docx")}>
            <FileDown className="h-4 w-4 mr-1" />
            DOCX
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[hsl(50_25%_91%)] px-3 py-4 dark:bg-zinc-900/80">
        <div className="mx-auto w-full max-w-[816px] rounded-sm border border-black/[0.08] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_12px_28px_rgba(0,0,0,0.07)] dark:border-white/10 dark:bg-zinc-950 dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
          <EditorContent editor={editor} />
        </div>
      </div>

      <p className="shrink-0 border-t border-border bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
        {tx("Notes auto-save after you stop typing for 2 seconds.", "Las notas se guardan solas tras 2 s sin escribir.")}
      </p>
    </div>
  );
}
