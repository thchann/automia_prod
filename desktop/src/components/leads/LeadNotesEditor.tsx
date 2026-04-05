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
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Redo2,
  TableIcon,
  Undo2,
} from "lucide-react";

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
      immediatelyRender: false,
      extensions,
      content: initialContent,
      editorProps: {
        attributes: {
          class:
            "tiptap focus:outline-none min-h-[320px] px-6 py-6 text-sm text-foreground leading-relaxed",
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
      <div className="flex min-h-[360px] items-center justify-center text-sm text-muted-foreground">
        {tx("Loading editor…", "Cargando editor…")}
      </div>
    );
  }

  return (
    <div className="lead-notes-editor flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1 border-b border-border pb-2">
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

      <div className="min-h-0 flex-1 overflow-y-auto flex justify-center px-2 pb-4">
        <div className="w-full max-w-[800px] rounded-lg border border-border bg-card shadow-md">
          <EditorContent editor={editor} />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground px-1">
        {tx("Notes auto-save after you stop typing for 2 seconds.", "Las notas se guardan solas tras 2 s sin escribir.")}
      </p>
    </div>
  );
}
