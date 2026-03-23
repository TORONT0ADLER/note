<template>
  <UContainer class="py-6">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <p class="text-sm text-muted">Noteforge</p>
        <h1 class="text-2xl font-semibold">Заметки</h1>
      </div>
      <UButton icon="i-lucide-plus" @click="createNote">Новая</UButton>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <div class="col-span-12 lg:col-span-4">
        <UCard>
          <template #header>
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Поиск заметок"
            />
          </template>

          <div class="max-h-[65vh] space-y-2 overflow-auto">
            <button
              v-for="note in filteredNotes"
              :key="note.id"
              class="w-full rounded-md border p-3 text-left transition"
              :class="
                activeNoteId === note.id
                  ? 'border-primary bg-primary/10'
                  : 'border-default hover:bg-muted/40'
              "
              @click="activeNoteId = note.id"
            >
              <p class="truncate text-sm font-medium text-highlighted">
                {{ noteTitle(note) }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ notePreview(note) }}
              </p>
              <p class="mt-1 text-xs text-muted">
                {{ formatDate(note.updatedAt) }}
              </p>
            </button>

            <UAlert
              v-if="!filteredNotes.length"
              color="neutral"
              variant="subtle"
              title="Ничего не найдено"
              description="Измените поиск или создайте новую заметку."
            />
          </div>
        </UCard>
      </div>

      <div class="col-span-12 lg:col-span-8">
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-lg font-semibold">Редактор</h2>

              <div class="flex flex-wrap items-center gap-1">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-bold"
                  :class="{ 'bg-muted': editor?.isActive('bold') }"
                  @mousedown.prevent="
                    editor?.chain().focus().toggleBold().run()
                  "
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-italic"
                  :class="{ 'bg-muted': editor?.isActive('italic') }"
                  @mousedown.prevent="
                    editor?.chain().focus().toggleItalic().run()
                  "
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-underline"
                  :class="{ 'bg-muted': editor?.isActive('underline') }"
                  @mousedown.prevent="
                    editor?.chain().focus().toggleUnderline().run()
                  "
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-code"
                  :class="{ 'bg-muted': editor?.isActive('code') }"
                  @mousedown.prevent="
                    editor?.chain().focus().toggleCode().run()
                  "
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-file-code-2"
                  :class="{ 'bg-muted': editor?.isActive('codeBlock') }"
                  @mousedown.prevent="
                    editor?.chain().focus().toggleCodeBlock().run()
                  "
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-list"
                  :class="{ 'bg-muted': editor?.isActive('bulletList') }"
                  @mousedown.prevent="
                    editor?.chain().focus().toggleBulletList().run()
                  "
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-list-ordered"
                  :class="{ 'bg-muted': editor?.isActive('orderedList') }"
                  @mousedown.prevent="
                    editor?.chain().focus().toggleOrderedList().run()
                  "
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-quote"
                  :class="{ 'bg-muted': editor?.isActive('blockquote') }"
                  @mousedown.prevent="
                    editor?.chain().focus().toggleBlockquote().run()
                  "
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-heading-2"
                  :class="{
                    'bg-muted': editor?.isActive('heading', { level: 2 }),
                  }"
                  @mousedown.prevent="
                    editor?.chain().focus().toggleHeading({ level: 2 }).run()
                  "
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-link"
                  @mousedown.prevent="setLink"
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-table"
                  @mousedown.prevent="insertTable"
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-columns-2"
                  @mousedown.prevent="addColumnAfter"
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-rows-2"
                  @mousedown.prevent="addRowAfter"
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-eraser"
                  @mousedown.prevent="clearFormatting"
                />
                <UButton
                  size="xs"
                  color="error"
                  variant="soft"
                  icon="i-lucide-trash-2"
                  :disabled="!activeNote"
                  @click="deleteActiveNote"
                >
                  Удалить
                </UButton>
              </div>
            </div>
          </template>

          <div v-if="activeNote" class="space-y-3">
            <EditorContent :editor="editor" class="prosemirror-editor" />
          </div>

          <UAlert
            v-else
            color="neutral"
            variant="subtle"
            title="Нет активной заметки"
            description="Выберите заметку слева или создайте новую."
          />
        </UCard>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Table from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import StarterKit from "@tiptap/starter-kit";
import { createLowlight } from "lowlight";
import { common } from "lowlight";

type Note = {
  id: string;
  content: JSONContent;
  updatedAt: string;
};

type NoteMeta = {
  plain: string;
  title: string;
  preview: string;
};

const STORAGE_KEY = "noteforge.notes.v2";
const lowlight = createLowlight(common);

const searchQuery = ref("");
const notes = ref<Note[]>([]);
const activeNoteId = ref<string | null>(null);
const isApplyingContent = ref(false);

const nowIso = () => new Date().toISOString();

const createDocFromText = (text: string): JSONContent => {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const lines = normalized ? normalized.split("\n") : [];
  const firstLine = lines[0]?.trim() || "Новая заметка";
  const body = lines.slice(1).join("\n").trim();

  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: firstLine }],
      },
      {
        type: "paragraph",
        content: body ? [{ type: "text", text: body }] : undefined,
      },
    ],
  };
};

const createEmptyDoc = (): JSONContent => createDocFromText("Новая заметка");

const normalizeRawNote = (raw: unknown): Note | null => {
  if (!raw || typeof raw !== "object") return null;

  const note = raw as Record<string, unknown>;
  const id =
    typeof note.id === "string" && note.id ? note.id : crypto.randomUUID();
  const updatedAt =
    typeof note.updatedAt === "string" && note.updatedAt
      ? note.updatedAt
      : nowIso();

  if (note.content && typeof note.content === "object") {
    return {
      id,
      updatedAt,
      content: note.content as JSONContent,
    };
  }

  const legacyTitle = typeof note.title === "string" ? note.title : "";
  const legacyBody = typeof note.content === "string" ? note.content : "";
  const merged = [legacyTitle, legacyBody].filter(Boolean).join("\n");

  return {
    id,
    updatedAt,
    content: createDocFromText(merged),
  };
};

const createEmptyNote = (): Note => ({
  id: crypto.randomUUID(),
  content: createEmptyDoc(),
  updatedAt: nowIso(),
});

const sortByRecent = (items: Note[]) =>
  [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

const readText = (node: JSONContent | undefined): string => {
  if (!node) return "";

  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";

  const children = (node.content || []).map(readText).join("");

  if (node.type === "tableCell" || node.type === "tableHeader") {
    return `${children}\t`;
  }

  if (
    node.type === "paragraph" ||
    node.type === "heading" ||
    node.type === "blockquote" ||
    node.type === "codeBlock" ||
    node.type === "listItem" ||
    node.type === "tableRow"
  ) {
    return `${children}\n`;
  }

  return children;
};

const buildMeta = (doc: JSONContent): NoteMeta => {
  const plain = readText(doc)
    .replace(/\t+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
  const lines = plain
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    plain,
    title: lines[0] || "Без названия",
    preview: lines.slice(1).join(" ") || "Пустая заметка",
  };
};

const loadNotes = () => {
  const raw =
    localStorage.getItem(STORAGE_KEY) ??
    localStorage.getItem("noteforge.notes.v1");

  if (!raw) {
    const first = createEmptyNote();
    notes.value = [first];
    activeNoteId.value = first.id;
    return;
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];
    const normalized = Array.isArray(parsed)
      ? parsed.map(normalizeRawNote).filter(Boolean)
      : [];

    if (!normalized.length) {
      throw new Error("Invalid notes payload");
    }

    notes.value = sortByRecent(normalized);
    activeNoteId.value = notes.value[0]?.id ?? null;
  } catch {
    const first = createEmptyNote();
    notes.value = [first];
    activeNoteId.value = first.id;
  }
};

const persistNotes = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes.value));
};

const activeNote = computed(() =>
  notes.value.find((note) => note.id === activeNoteId.value),
);

const notesMeta = computed<Record<string, NoteMeta>>(() =>
  Object.fromEntries(
    notes.value.map((note) => [note.id, buildMeta(note.content)]),
  ),
);

const noteTitle = (note: Note) =>
  notesMeta.value[note.id]?.title || "Без названия";
const notePreview = (note: Note) =>
  notesMeta.value[note.id]?.preview || "Пустая заметка";

const filteredNotes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return notes.value;

  return notes.value.filter((note) => {
    const meta = notesMeta.value[note.id];
    return (meta?.plain || "").toLowerCase().includes(q);
  });
});

const touchActiveNote = () => {
  if (!activeNote.value) return;

  activeNote.value.updatedAt = nowIso();

  const index = notes.value.findIndex(
    (note) => note.id === activeNote.value?.id,
  );
  if (index > 0) {
    const [note] = notes.value.splice(index, 1);
    if (note) notes.value.unshift(note);
  }
};

const createNote = () => {
  const note = createEmptyNote();
  notes.value.unshift(note);
  activeNoteId.value = note.id;
};

const deleteActiveNote = () => {
  if (!activeNote.value) return;

  const id = activeNote.value.id;
  notes.value = notes.value.filter((note) => note.id !== id);

  if (!notes.value.length) {
    const fallback = createEmptyNote();
    notes.value = [fallback];
    activeNoteId.value = fallback.id;
    return;
  }

  activeNoteId.value = notes.value[0]?.id ?? null;
};

const editor = useEditor({
  content: createEmptyDoc(),
  autofocus: true,
  extensions: [
    StarterKit.configure({ codeBlock: false }),
    Underline,
    Link.configure({
      openOnClick: false,
      defaultProtocol: "https",
      autolink: true,
    }),
    Placeholder.configure({
      placeholder:
        "Первая строка — это название заметки. Ниже пишите текст, вставляйте код, таблицы и списки.",
    }),
    CodeBlockLowlight.configure({ lowlight }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  editorProps: {
    attributes: {
      class: "note-editor focus:outline-none",
    },
  },
  onUpdate: ({ editor }) => {
    if (!activeNote.value || isApplyingContent.value) return;
    activeNote.value.content = editor.getJSON();
    touchActiveNote();
  },
});

watch(
  activeNote,
  (note) => {
    if (!note || !editor.value) return;
    isApplyingContent.value = true;
    editor.value.commands.setContent(note.content, false);
    isApplyingContent.value = false;
  },
  { immediate: true },
);

const setLink = () => {
  const url = window.prompt("Введите URL (https://...)", "https://");
  if (!editor.value) return;
  if (!url) {
    editor.value.chain().focus().unsetLink().run();
    return;
  }
  editor.value.chain().focus().setLink({ href: url }).run();
};

const clearFormatting = () => {
  editor.value?.chain().focus().clearNodes().unsetAllMarks().run();
};

const insertTable = () => {
  editor.value
    ?.chain()
    .focus()
    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    .run();
};

const addColumnAfter = () => {
  editor.value?.chain().focus().addColumnAfter().run();
};

const addRowAfter = () => {
  editor.value?.chain().focus().addRowAfter().run();
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));

onMounted(() => {
  loadNotes();
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

watch(notes, persistNotes, { deep: true });
</script>
