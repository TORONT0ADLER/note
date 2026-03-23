<template>
  <UContainer class="py-4 !max-w-none px-2 sm:px-3 lg:px-4">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <p class="text-sm text-muted">Noteforge</p>
        <h1 class="text-2xl font-semibold">Заметки</h1>
      </div>

      <div class="flex items-center gap-2">
        <UTooltip text="Переключить тему">
          <UButton
            color="neutral"
            variant="soft"
            :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
            aria-label="Переключить тему"
            @click="toggleColorMode"
          />
        </UTooltip>

        <UPopover>
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-settings-2"
            aria-label="Настройки"
          />

          <template #content>
            <div class="w-64 space-y-3 p-3">
              <div>
                <p class="text-sm font-medium text-highlighted">Настройки</p>
                <p class="text-xs text-muted">
                  Пока доступна только тема акцента.
                </p>
              </div>

              <div class="space-y-2">
                <p class="text-xs text-muted">Акцентный цвет</p>
                <div class="grid grid-cols-2 gap-2">
                  <UButton
                    v-for="option in accentOptions"
                    :key="option.value"
                    size="xs"
                    color="neutral"
                    :variant="accentColor === option.value ? 'solid' : 'soft'"
                    @click="setAccentColor(option.value)"
                  >
                    {{ option.label }}
                  </UButton>
                </div>
              </div>
            </div>
          </template>
        </UPopover>
      </div>
    </div>

    <div class="flex flex-col gap-4 lg:flex-row">
      <div class="lg:w-10 lg:shrink-0">
        <div class="flex flex-col items-start gap-2">
          <UTooltip text="Заметки" :delay-duration="0">
            <UButton
              color="neutral"
              :variant="leftPanel === 'notes' ? 'soft' : 'ghost'"
              icon="i-lucide-notebook-pen"
              aria-label="Заметки"
              @click="leftPanel = 'notes'"
            />
          </UTooltip>

          <UTooltip text="Граф" :delay-duration="0">
            <UButton
              color="neutral"
              :variant="leftPanel === 'graph' ? 'soft' : 'ghost'"
              icon="i-lucide-network"
              aria-label="Граф"
              @click="leftPanel = 'graph'"
            />
          </UTooltip>

          <UTooltip text="Задачи" :delay-duration="0">
            <UButton
              color="neutral"
              :variant="leftPanel === 'tasks' ? 'soft' : 'ghost'"
              icon="i-lucide-kanban-square"
              aria-label="Задачи"
              @click="leftPanel = 'tasks'"
            />
          </UTooltip>
        </div>
      </div>

      <div class="lg:w-[22rem] lg:shrink-0">
        <UCard>
          <template #header>
            <div class="space-y-2">
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                placeholder="Поиск заметок"
              />

              <div class="flex gap-2">
                <UButton
                  size="xs"
                  icon="i-lucide-folder-plus"
                  color="neutral"
                  variant="soft"
                  @click="createFolder"
                >
                  Папка
                </UButton>
                <UButton
                  size="xs"
                  icon="i-lucide-file-plus"
                  color="primary"
                  variant="soft"
                  @click="createNote()"
                >
                  Заметка
                </UButton>
              </div>
            </div>
          </template>

          <div class="max-h-[65vh] space-y-2 overflow-auto">
            <div v-if="rootFilteredNotes.length" class="space-y-2">
              <p
                class="px-1 text-xs font-medium uppercase tracking-wide text-muted"
              >
                Без папки
              </p>

              <button
                v-for="note in rootFilteredNotes"
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
            </div>

            <div v-for="folder in folders" :key="folder.id" class="space-y-2">
              <div class="group flex items-center justify-between px-1">
                <button
                  class="flex min-w-0 items-center gap-1 text-left"
                  @click="toggleFolder(folder.id)"
                >
                  <UIcon
                    class="h-4 w-4 text-muted transition-transform"
                    :class="{ 'rotate-[-90deg]': isFolderCollapsed(folder.id) }"
                    name="i-lucide-chevron-down"
                  />
                  <p
                    class="truncate text-xs font-medium uppercase tracking-wide text-muted"
                  >
                    {{ folder.name }}
                  </p>
                </button>

                <div
                  class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                >
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-pencil"
                    aria-label="Переименовать папку"
                    @click="renameFolder(folder.id)"
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :icon="
                      isFolderCollapsed(folder.id)
                        ? 'i-lucide-folder-open'
                        : 'i-lucide-folder'
                    "
                    aria-label="Свернуть или развернуть папку"
                    @click="toggleFolder(folder.id)"
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-file-plus"
                    aria-label="Создать заметку в папке"
                    @click="createNote(folder.id)"
                  />
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    aria-label="Удалить папку"
                    @click="deleteFolder(folder.id)"
                  />
                </div>
              </div>

              <button
                v-show="!isFolderCollapsed(folder.id)"
                v-for="note in notesInFolder(folder.id)"
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
            </div>

            <button
              v-for="note in orphanFilteredNotes"
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

      <div class="lg:min-w-0 lg:flex-1">
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-lg font-semibold">Редактор</h2>

              <div class="flex flex-wrap items-center gap-1">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-paperclip"
                  aria-label="Прикрепить файл"
                  @click="triggerFilePicker"
                />
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
                  aria-label="Удалить заметку"
                  :disabled="!activeNote"
                  @click="isDeleteModalOpen = true"
                />

                <input
                  ref="fileInputRef"
                  type="file"
                  class="hidden"
                  multiple
                  accept="image/*,.pdf,*/*"
                  @change="onFileInputChange"
                />
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

    <UModal v-model:open="isDeleteModalOpen" title="Удалить заметку?">
      <template #body>
        <p class="text-sm text-muted">
          Вы точно хотите удалить заметку? Это действие нельзя отменить.
        </p>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="soft"
            @click="isDeleteModalOpen = false"
          >
            Отмена
          </UButton>
          <UButton color="error" icon="i-lucide-trash-2" @click="confirmDelete">
            Удалить
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { mergeAttributes, Node } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import Underline from "@tiptap/extension-underline";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import StarterKit from "@tiptap/starter-kit";
import { createLowlight } from "lowlight";
import { common } from "lowlight";

type JSONContent = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
};

type Note = {
  id: string;
  folderId: string | null;
  content: JSONContent;
  updatedAt: string;
};

type Folder = {
  id: string;
  name: string;
};

type LeftPanel = "notes" | "graph" | "tasks";

type UploadKind = "image" | "pdf" | "file";

type NoteMeta = {
  plain: string;
  title: string;
  preview: string;
};

const STORAGE_KEY = "noteforge.notes.v3";
const ACCENT_STORAGE_KEY = "noteforge.ui.accent.v1";
const lowlight = createLowlight(common);

const searchQuery = ref("");
const notes = ref<Note[]>([]);
const folders = ref<Folder[]>([]);
const leftPanel = ref<LeftPanel>("notes");
const collapsedFolders = ref<string[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const activeNoteId = ref<string | null>(null);
const isApplyingContent = ref(false);
const isDeleteModalOpen = ref(false);
const accentColor = ref<AccentColor>("blue");
const colorMode = useColorMode();

const isDark = computed(() => colorMode.value === "dark");

type AccentColor = "blue" | "orange" | "cyan" | "indigo" | "violet" | "green";

const accentOptions: { label: string; value: AccentColor }[] = [
  { label: "Голубой", value: "blue" },
  { label: "Оранжевый", value: "orange" },
  { label: "Бирюзовый", value: "cyan" },
  { label: "Индиго", value: "indigo" },
  { label: "Фиолетовый", value: "violet" },
  { label: "Зелёный", value: "green" },
];

const NoteImage = Node.create({
  name: "noteImage",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "img[data-note-image='true']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        "data-note-image": "true",
        class: "note-image-block",
      }),
    ];
  },
});

const NotePdf = Node.create({
  name: "notePdf",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      filename: { default: "PDF" },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-note-pdf='true']" }];
  },
  renderHTML({ HTMLAttributes }) {
    const src = String(HTMLAttributes.src || "");
    const filename = String(HTMLAttributes.filename || "PDF");
    return [
      "div",
      {
        "data-note-pdf": "true",
        class: "note-pdf-block",
        contenteditable: "false",
      },
      ["embed", { src, type: "application/pdf", class: "note-pdf-embed" }],
      [
        "a",
        {
          href: src,
          target: "_blank",
          rel: "noopener noreferrer",
          class: "note-file-link",
        },
        `Открыть ${filename}`,
      ],
    ];
  },
});

const NoteFile = Node.create({
  name: "noteFile",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      filename: { default: "Файл" },
      mime: { default: "application/octet-stream" },
    };
  },
  parseHTML() {
    return [{ tag: "a[data-note-file='true']" }];
  },
  renderHTML({ HTMLAttributes }) {
    const src = String(HTMLAttributes.src || "");
    const filename = String(HTMLAttributes.filename || "Файл");
    return [
      "a",
      {
        "data-note-file": "true",
        href: src,
        target: "_blank",
        rel: "noopener noreferrer",
        class: "note-file-link",
        contenteditable: "false",
      },
      ["span", { class: "note-file-icon", "aria-hidden": "true" }, "📎"],
      ["span", { class: "note-file-name" }, filename],
    ];
  },
});

const nowIso = () => new Date().toISOString();

const toggleColorMode = () => {
  colorMode.preference = isDark.value ? "light" : "dark";
};

const setAccentColor = (color: AccentColor) => {
  accentColor.value = color;
  updateAppConfig({
    ui: {
      colors: {
        primary: color,
      },
    },
  });

  localStorage.setItem(ACCENT_STORAGE_KEY, color);
};

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
      folderId: typeof note.folderId === "string" ? note.folderId : null,
      updatedAt,
      content: note.content as JSONContent,
    };
  }

  const legacyTitle = typeof note.title === "string" ? note.title : "";
  const legacyBody = typeof note.content === "string" ? note.content : "";
  const merged = [legacyTitle, legacyBody].filter(Boolean).join("\n");

  return {
    id,
    folderId: null,
    updatedAt,
    content: createDocFromText(merged),
  };
};

const createEmptyNote = (): Note => ({
  id: crypto.randomUUID(),
  folderId: null,
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
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const rawLegacy =
      localStorage.getItem("noteforge.notes.v2") ??
      localStorage.getItem("noteforge.notes.v1");

    if (!rawLegacy) {
      const first = createEmptyNote();
      notes.value = [first];
      folders.value = [];
      activeNoteId.value = first.id;
      return;
    }

    try {
      const parsedLegacy = JSON.parse(rawLegacy) as unknown[];
      const normalizedLegacy = Array.isArray(parsedLegacy)
        ? parsedLegacy
            .map(normalizeRawNote)
            .filter((note): note is Note => note !== null)
        : [];

      if (!normalizedLegacy.length) throw new Error("Invalid notes payload");

      notes.value = sortByRecent(normalizedLegacy);
      folders.value = [];
      activeNoteId.value = notes.value[0]?.id ?? null;
      return;
    } catch {
      const first = createEmptyNote();
      notes.value = [first];
      folders.value = [];
      activeNoteId.value = first.id;
      return;
    }
  }

  try {
    const parsed = JSON.parse(raw) as {
      notes?: unknown[];
      folders?: unknown[];
    };

    const rawNotes = Array.isArray(parsed.notes) ? parsed.notes : [];
    const rawFolders = Array.isArray(parsed.folders) ? parsed.folders : [];

    const normalized = rawNotes
      .map(normalizeRawNote)
      .filter((note): note is Note => note !== null);

    const normalizedFolders = rawFolders
      .map((folder) => {
        if (!folder || typeof folder !== "object") return null;
        const f = folder as Record<string, unknown>;
        if (typeof f.id !== "string" || typeof f.name !== "string") return null;
        return { id: f.id, name: f.name.trim() || "Без названия" } as Folder;
      })
      .filter((folder): folder is Folder => folder !== null);

    if (!normalized.length) {
      throw new Error("Invalid notes payload");
    }

    notes.value = sortByRecent(normalized);
    folders.value = normalizedFolders;
    activeNoteId.value = notes.value[0]?.id ?? null;
  } catch {
    const first = createEmptyNote();
    notes.value = [first];
    folders.value = [];
    activeNoteId.value = first.id;
  }
};

const persistNotes = () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ notes: notes.value, folders: folders.value }),
  );
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

const rootFilteredNotes = computed(() =>
  filteredNotes.value.filter((note) => !note.folderId),
);

const notesInFolder = (folderId: string) =>
  filteredNotes.value.filter((note) => note.folderId === folderId);

const orphanFilteredNotes = computed(() =>
  filteredNotes.value.filter(
    (note) =>
      !!note.folderId &&
      !folders.value.some((folder) => folder.id === note.folderId),
  ),
);

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

const createNote = (folderId: string | null = null) => {
  const note = createEmptyNote();
  note.folderId = folderId;

  if (folderId) {
    collapsedFolders.value = collapsedFolders.value.filter(
      (id) => id !== folderId,
    );
  }

  notes.value.unshift(note);
  activeNoteId.value = note.id;
};

const createFolder = () => {
  const name = window.prompt("Название папки", "Новая папка")?.trim();
  if (!name) return;
  const id = crypto.randomUUID();
  folders.value.unshift({ id, name });
  collapsedFolders.value = collapsedFolders.value.filter(
    (folderId) => folderId !== id,
  );
};

const isFolderCollapsed = (folderId: string) =>
  collapsedFolders.value.includes(folderId);

const toggleFolder = (folderId: string) => {
  if (isFolderCollapsed(folderId)) {
    collapsedFolders.value = collapsedFolders.value.filter(
      (id) => id !== folderId,
    );
    return;
  }
  collapsedFolders.value = [...collapsedFolders.value, folderId];
};

const deleteFolder = (folderId: string) => {
  const targetFolder = folders.value.find((folder) => folder.id === folderId);
  if (!targetFolder) return;

  const hasNotes = notes.value.some((note) => note.folderId === folderId);
  const confirmed = window.confirm(
    hasNotes
      ? `Удалить папку «${targetFolder.name}»? Заметки из неё останутся и будут перенесены в «Без папки».`
      : `Удалить папку «${targetFolder.name}»?`,
  );

  if (!confirmed) return;

  notes.value = notes.value.map((note) =>
    note.folderId === folderId ? { ...note, folderId: null } : note,
  );
  folders.value = folders.value.filter((folder) => folder.id !== folderId);
  collapsedFolders.value = collapsedFolders.value.filter(
    (id) => id !== folderId,
  );
};

const renameFolder = (folderId: string) => {
  const targetFolder = folders.value.find((folder) => folder.id === folderId);
  if (!targetFolder) return;

  const nextName = window
    .prompt("Новое название папки", targetFolder.name)
    ?.trim();

  if (!nextName) return;

  targetFolder.name = nextName;
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

const confirmDelete = () => {
  deleteActiveNote();
  isDeleteModalOpen.value = false;
};

const editor = useEditor({
  content: createEmptyDoc(),
  autofocus: true,
  extensions: [
    NoteImage,
    NotePdf,
    NoteFile,
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
    handleDOMEvents: {
      drop: (_view, event) => {
        const dragEvent = event as DragEvent;
        const files = dragEvent.dataTransfer?.files;
        if (!files?.length) return false;

        dragEvent.preventDefault();
        void handleFilesUpload(Array.from(files));
        return true;
      },
    },
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
    editor.value.commands.setContent(note.content, { emitUpdate: false });
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

const triggerFilePicker = () => {
  fileInputRef.value?.click();
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsDataURL(file);
  });

const fileKind = (file: File): UploadKind => {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) {
    return "image";
  }

  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }

  return "file";
};

const insertUploadedFile = async (file: File) => {
  if (!editor.value) return;

  const src = await fileToDataUrl(file);
  const kind = fileKind(file);

  if (kind === "image") {
    editor.value
      .chain()
      .focus()
      .insertContent({
        type: "noteImage",
        attrs: {
          src,
          alt: file.name,
          title: file.name,
        },
      })
      .run();
    return;
  }

  if (kind === "pdf") {
    editor.value
      .chain()
      .focus()
      .insertContent({
        type: "notePdf",
        attrs: {
          src,
          filename: file.name,
        },
      })
      .run();
    return;
  }

  editor.value
    .chain()
    .focus()
    .insertContent({
      type: "noteFile",
      attrs: {
        src,
        filename: file.name,
        mime: file.type || "application/octet-stream",
      },
    })
    .run();
};

const handleFilesUpload = async (files: File[]) => {
  for (const file of files) {
    await insertUploadedFile(file);
  }
};

const onFileInputChange = async (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  const fileList = input?.files;
  if (!fileList?.length) return;

  await handleFilesUpload(Array.from(fileList));

  if (input) {
    input.value = "";
  }
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
  const savedAccent = localStorage.getItem(ACCENT_STORAGE_KEY);
  const isAccentColor = (value: string): value is AccentColor =>
    accentOptions.some((option) => option.value === value);

  if (savedAccent === "sky") {
    setAccentColor("orange");
    loadNotes();
    return;
  }

  if (savedAccent && isAccentColor(savedAccent)) {
    setAccentColor(savedAccent);
  }

  loadNotes();
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});

watch(notes, persistNotes, { deep: true });
watch(folders, persistNotes, { deep: true });
</script>
