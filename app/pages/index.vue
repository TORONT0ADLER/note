<template>
  <UContainer class="py-4 pb-24 lg:pb-4 !max-w-none px-2 sm:px-3 lg:px-4">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">NoteForge</h1>
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

        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-settings-2"
          aria-label="Настройки"
          @click="isSettingsModalOpen = true"
        />
      </div>
    </div>

    <div class="flex flex-col gap-4 lg:flex-row">
      <div class="hidden lg:block lg:w-10 lg:shrink-0 lg:self-start">
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

          <UTooltip text="Библиотека" :delay-duration="0">
            <UButton
              color="neutral"
              :variant="leftPanel === 'library' ? 'soft' : 'ghost'"
              icon="i-lucide-library-big"
              aria-label="Библиотека"
              @click="leftPanel = 'library'"
            />
          </UTooltip>
        </div>
      </div>

      <div v-show="leftPanel === 'notes'" class="min-w-0 flex-1">
        <div
          ref="notesWorkspaceRef"
          class="min-w-0 flex-1 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-2"
          :style="notesWorkspaceStyle"
        >
          <div
            class="flex items-center justify-between gap-2 rounded-lg border border-default bg-muted/20 p-2 lg:hidden"
          >
            <div class="flex items-center gap-1">
              <UButton
                size="xs"
                color="neutral"
                :variant="mobileNotesView === 'list' ? 'soft' : 'ghost'"
                icon="i-lucide-list"
                @click="mobileNotesView = 'list'"
              >
                Список
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                :variant="mobileNotesView === 'editor' ? 'soft' : 'ghost'"
                icon="i-lucide-square-pen"
                :disabled="!activeNoteId"
                @click="mobileNotesView = 'editor'"
              >
                Редактор
              </UButton>
            </div>

            <UButton
              v-if="mobileNotesView === 'editor'"
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-chevron-left"
              @click="mobileNotesView = 'list'"
            >
              К заметкам
            </UButton>
          </div>

          <div
            class="notes-list-pane lg:shrink-0"
            :class="
              isMobileViewport && mobileNotesView !== 'list' ? 'hidden' : ''
            "
          >
            <UCard>
              <template #header>
                <div class="space-y-2">
                  <UInput
                    v-model="searchQuery"
                    class="h-10 w-full"
                    icon="i-lucide-search"
                    placeholder="Поиск заметок"
                  />
                </div>
              </template>

              <div
                class="space-y-0 overflow-y-auto lg:max-h-[calc(100vh-13rem)]"
                @contextmenu="onNotesListContextMenu"
              >
                <div v-if="rootFilteredNotes.length" class="space-y-0">
                  <p
                    class="px-1 text-xs font-medium uppercase tracking-wide text-muted"
                  >
                    Без папки
                  </p>

                  <div
                    v-for="note in rootFilteredNotes"
                    :key="note.id"
                    class="group flex items-center gap-1 rounded px-1 transition"
                    :class="
                      activeNoteId === note.id
                        ? 'bg-primary/10'
                        : 'hover:bg-muted/30'
                    "
                  >
                    <button
                      class="min-w-0 flex-1 px-1 py-1.5 text-left"
                      @click="openNote(note.id)"
                    >
                      <p class="truncate text-sm font-medium text-highlighted">
                        {{ noteTitle(note) }}
                      </p>
                    </button>

                    <UButton
                      size="xs"
                      color="error"
                      variant="ghost"
                      icon="i-lucide-trash-2"
                      aria-label="Удалить заметку"
                      class="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      @click.stop="requestDeleteNote(note.id)"
                    />
                  </div>
                </div>

                <div
                  v-for="folderEntry in visibleFolders"
                  :key="folderEntry.folder.id"
                  class="relative"
                >
                  <div
                    v-if="folderEntry.depth > 0"
                    class="pointer-events-none absolute -top-1 -bottom-1 left-1 z-10 w-0"
                    aria-hidden="true"
                  >
                    <span
                      v-for="level in folderEntry.depth"
                      :key="`folder-guide-${folderEntry.folder.id}-${level}`"
                      class="absolute inset-y-0 w-px bg-primary/35"
                      :style="{ left: `${(level - 1) * 0.75}rem` }"
                    />
                  </div>

                  <div
                    class="group relative flex items-center justify-between px-1"
                  >
                    <button
                      class="flex min-w-0 items-center gap-1 text-left"
                      :style="{
                        paddingLeft: `${0.5 + folderEntry.depth * 0.75}rem`,
                      }"
                      @click="toggleFolder(folderEntry.folder.id)"
                    >
                      <UIcon
                        class="h-4 w-4 shrink-0 text-muted transition-transform"
                        :class="{
                          'rotate-[-90deg]': isFolderCollapsed(
                            folderEntry.folder.id,
                          ),
                        }"
                        name="i-lucide-chevron-down"
                      />
                      <p
                        class="truncate text-xs font-medium uppercase tracking-wide text-muted"
                      >
                        {{ folderEntry.folder.name }}
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
                        @click="renameFolder(folderEntry.folder.id)"
                      />
                      <UButton
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-folder-plus"
                        aria-label="Создать подпапку"
                        @click="createFolder(folderEntry.folder.id)"
                      />
                      <UButton
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-file-plus"
                        aria-label="Создать заметку в папке"
                        @click="createNote(folderEntry.folder.id)"
                      />
                      <UButton
                        size="xs"
                        color="error"
                        variant="ghost"
                        icon="i-lucide-trash-2"
                        aria-label="Удалить папку"
                        @click="requestDeleteFolder(folderEntry.folder.id)"
                      />
                    </div>
                  </div>

                  <div
                    v-show="!isFolderCollapsed(folderEntry.folder.id)"
                    class="relative space-y-0"
                  >
                    <div
                      v-for="note in notesInFolder(folderEntry.folder.id)"
                      :key="note.id"
                      class="group relative flex items-center gap-1 rounded px-1 transition"
                      :class="
                        activeNoteId === note.id
                          ? 'bg-primary/10'
                          : 'hover:bg-muted/30'
                      "
                    >
                      <button
                        class="min-w-0 flex-1 px-1 py-1.5 text-left"
                        :style="{
                          paddingLeft: `${0.5 + (folderEntry.depth + 1) * 0.75}rem`,
                        }"
                        @click="openNote(note.id)"
                      >
                        <p
                          class="truncate text-sm font-medium text-highlighted"
                        >
                          {{ noteTitle(note) }}
                        </p>
                      </button>

                      <UButton
                        size="xs"
                        color="error"
                        variant="ghost"
                        icon="i-lucide-trash-2"
                        aria-label="Удалить заметку"
                        class="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                        @click.stop="requestDeleteNote(note.id)"
                      />
                    </div>
                  </div>
                </div>

                <div
                  v-for="note in orphanFilteredNotes"
                  :key="note.id"
                  class="group flex items-center gap-1 rounded px-1 transition"
                  :class="
                    activeNoteId === note.id
                      ? 'bg-primary/10'
                      : 'hover:bg-muted/30'
                  "
                >
                  <button
                    class="min-w-0 flex-1 px-1 py-1.5 text-left"
                    @click="openNote(note.id)"
                  >
                    <p class="truncate text-sm font-medium text-highlighted">
                      {{ noteTitle(note) }}
                    </p>
                  </button>

                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    aria-label="Удалить заметку"
                    class="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                    @click.stop="requestDeleteNote(note.id)"
                  />
                </div>

                <UAlert
                  v-if="!filteredNotes.length"
                  color="neutral"
                  variant="subtle"
                  title="Ничего не найдено"
                  description="Измените поиск или создайте новую заметку."
                />

                <div
                  v-if="isNotesContextMenuOpen"
                  ref="notesContextMenuRef"
                  class="fixed z-[120] min-w-48 rounded-md border border-default bg-default p-1 shadow-lg"
                  :style="notesContextMenuStyle"
                >
                  <div class="flex flex-col gap-0.5">
                    <UButton
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-file-plus"
                      class="justify-start"
                      @click="runNotesContextAction(() => createNote())"
                    >
                      Новая заметка
                    </UButton>
                    <UButton
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-folder-plus"
                      class="justify-start"
                      @click="runNotesContextAction(() => createFolder())"
                    >
                      Новая папка
                    </UButton>
                  </div>
                </div>
              </div>
            </UCard>
          </div>

          <div
            class="notes-panel-resizer hidden lg:block"
            role="separator"
            aria-orientation="vertical"
            aria-label="Изменить размер панели заметок"
            @pointerdown="startNotesResize"
          >
            <div class="notes-panel-resizer__handle" />
          </div>

          <div
            class="notes-editor-pane lg:min-w-0 lg:flex-1"
            :class="
              isMobileViewport && mobileNotesView !== 'editor' ? 'hidden' : ''
            "
          >
            <UCard>
              <template #header>
                <div class="space-y-2">
                  <!-- Editor toolbar -->
                  <div
                    class="flex flex-wrap items-center justify-between gap-2"
                  >
                    <div class="flex items-center gap-2">
                      <UTooltip
                        :text="
                          vaultPath
                            ? 'Сменить папку хранилища'
                            : 'Выбрать папку хранилища (как в Obsidian)'
                        "
                      >
                        <UButton
                          size="xs"
                          :color="vaultPath ? 'primary' : 'neutral'"
                          :variant="vaultPath ? 'soft' : 'outline'"
                          icon="i-lucide-folder-open"
                          :loading="isLoadingVault"
                          @click="pickVaultFolder"
                        >
                          {{ vaultPath ? vaultFolderName : "Открыть папку" }}
                        </UButton>
                      </UTooltip>
                    </div>

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
                        :class="{
                          'bg-muted': editor?.isActive('orderedList'),
                        }"
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
                          editor
                            ?.chain()
                            .focus()
                            .toggleHeading({ level: 2 })
                            .run()
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
                        icon="i-lucide-link-2"
                        @mousedown.prevent="insertNoteRelation"
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
                        icon="i-lucide-table-properties"
                        @mousedown.prevent="deleteTable"
                      />
                      <UButton
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-eraser"
                        @mousedown.prevent="clearFormatting"
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
                </div>
              </template>

              <div
                v-if="activeNote"
                class="space-y-3 overflow-y-auto lg:max-h-[calc(100vh-16rem)]"
                @contextmenu="onEditorContextMenu"
              >
                <EditorContent :editor="editor" class="prosemirror-editor" />

                <div
                  v-if="isTextContextMenuOpen"
                  ref="textContextMenuRef"
                  class="fixed z-[120] min-w-56 rounded-md border border-default bg-default p-1 shadow-lg"
                  :style="textContextMenuStyle"
                >
                  <div class="flex flex-col gap-0.5">
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-bold"
                      class="justify-start"
                      @click="runTextContextAction(toggleBold)"
                    >
                      Жирный
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-italic"
                      class="justify-start"
                      @click="runTextContextAction(toggleItalic)"
                    >
                      Курсив
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-underline"
                      class="justify-start"
                      @click="runTextContextAction(toggleUnderline)"
                    >
                      Подчеркнутый
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-code"
                      class="justify-start"
                      @click="runTextContextAction(toggleCode)"
                    >
                      Код
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-file-code-2"
                      class="justify-start"
                      @click="runTextContextAction(toggleCodeBlock)"
                    >
                      Блок кода
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-list"
                      class="justify-start"
                      @click="runTextContextAction(toggleBulletList)"
                    >
                      Маркированный список
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-list-ordered"
                      class="justify-start"
                      @click="runTextContextAction(toggleOrderedList)"
                    >
                      Нумерованный список
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-quote"
                      class="justify-start"
                      @click="runTextContextAction(toggleBlockquote)"
                    >
                      Цитата
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-heading-2"
                      class="justify-start"
                      @click="runTextContextAction(toggleHeadingLevel2)"
                    >
                      Заголовок H2
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-link"
                      class="justify-start"
                      @click="runTextContextAction(setLink)"
                    >
                      Ссылка
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-link-2"
                      class="justify-start"
                      @click="runTextContextAction(insertNoteRelation)"
                    >
                      Связь заметки
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-table"
                      class="justify-start"
                      @click="runTextContextAction(insertTable)"
                    >
                      Вставить таблицу
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-columns-2"
                      class="justify-start"
                      @click="runTextContextAction(addColumnAfter)"
                    >
                      Добавить колонку
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-rows-2"
                      class="justify-start"
                      @click="runTextContextAction(addRowAfter)"
                    >
                      Добавить строку
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-table-properties"
                      class="justify-start"
                      @click="runTextContextAction(deleteTable)"
                    >
                      Удалить таблицу
                    </UButton>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-eraser"
                      class="justify-start"
                      @click="runTextContextAction(clearFormatting)"
                    >
                      Очистить форматирование
                    </UButton>
                  </div>
                </div>
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
      </div>

      <div v-show="leftPanel === 'library'" class="lg:min-w-0 lg:flex-1">
        <UCard>
          <template #header>
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="libraryCurrentFolderId = null"
                >
                  Корень
                </UButton>
                <template v-for="crumb in libraryBreadcrumbs" :key="crumb.id">
                  <UIcon
                    name="i-lucide-chevron-right"
                    class="h-3.5 w-3.5 text-muted"
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    @click="libraryCurrentFolderId = crumb.id"
                  >
                    {{ crumb.name }}
                  </UButton>
                </template>
              </div>
              <p class="text-xs text-muted">
                Режим просмотра: редактирование отключено.
              </p>
            </div>
          </template>

          <div class="space-y-4 overflow-y-auto lg:max-h-[calc(100vh-13rem)]">
            <div
              class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            >
              <button
                v-for="folder in libraryChildFolders"
                :key="folder.id"
                type="button"
                class="library-folder-card"
                @click="libraryCurrentFolderId = folder.id"
              >
                <div
                  class="library-folder-cover"
                  :style="folderCoverStyle(folder)"
                >
                  <UIcon
                    v-if="!folder.coverPath"
                    name="i-lucide-folder"
                    class="h-8 w-8 text-primary"
                  />
                </div>
                <p class="truncate text-sm font-medium text-highlighted">
                  {{ folder.name }}
                </p>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-image-plus"
                  class="mt-1"
                  @click.stop="setFolderCover(folder.id)"
                >
                  Обложка
                </UButton>
              </button>
            </div>

            <div class="space-y-2">
              <button
                v-for="note in libraryVisibleNotes"
                :key="note.id"
                type="button"
                class="library-note-card"
                @click="openLibraryNote(note.id)"
              >
                <p class="text-sm font-medium text-highlighted">
                  {{ noteTitle(note) }}
                </p>
                <p class="mt-1 line-clamp-2 text-xs text-muted">
                  {{ notesMeta[note.id]?.preview || "Пустая заметка" }}
                </p>
              </button>

              <UAlert
                v-if="
                  !libraryChildFolders.length && !libraryVisibleNotes.length
                "
                color="neutral"
                variant="subtle"
                title="Пусто"
                description="В этой папке пока нет вложенных папок и заметок."
              />
            </div>
          </div>
        </UCard>
      </div>

      <div v-show="leftPanel === 'tasks'" class="lg:min-w-0 lg:flex-1">
        <TasksPanel
          :kanban-columns="kanbanColumns"
          :tasks-in-column="tasksInColumn"
          :draft-task="draftTask"
          :create-kanban-column="createKanbanColumn"
          :on-column-drop="onColumnDrop"
          :on-task-drop="onTaskDrop"
          :on-column-free-area-click="onColumnFreeAreaClick"
          :on-column-drag-start="onColumnDragStart"
          :on-column-drag-end="onColumnDragEnd"
          :rename-kanban-column="renameKanbanColumn"
          :request-delete-kanban-column="requestDeleteKanbanColumn"
          :on-task-drag-start="onTaskDragStart"
          :on-task-drag-end="onTaskDragEnd"
          :open-kanban-task="openKanbanTask"
          :request-delete-kanban-task="requestDeleteKanbanTask"
          :commit-draft-task="commitDraftTask"
          :cancel-draft-task="cancelDraftTask"
        />
      </div>

      <div v-show="leftPanel === 'graph'" class="lg:min-w-0 lg:flex-1">
        <GraphPanel
          :nodes="graphNodes"
          :edges="graphEdges"
          :active-node-id="activeNoteId"
          :active-outgoing="activeGraphOutgoing"
          :active-incoming="activeGraphIncoming"
          v-model:mode="graphMode"
          v-model:search-query="graphSearchQuery"
          v-model:labels-mode="graphLabelsMode"
          v-model:repulsion-strength="graphRepulsionStrength"
          v-model:link-strength="graphLinkStrength"
          v-model:edge-rigidity="graphEdgeRigidity"
          v-model:node-size="graphNodeSize"
          v-model:label-font-size="graphLabelFontSize"
          v-model:show-direction="graphShowDirection"
          @node-click="onGraphNodeClick"
        />
      </div>
    </div>

    <div
      class="fixed inset-x-0 bottom-0 z-40 border-t border-default bg-default/95 px-2 py-2 backdrop-blur lg:hidden"
    >
      <div class="grid grid-cols-4 gap-1">
        <UButton
          color="neutral"
          :variant="leftPanel === 'notes' ? 'soft' : 'ghost'"
          icon="i-lucide-notebook-pen"
          class="justify-center"
          @click="leftPanel = 'notes'"
        />
        <UButton
          color="neutral"
          :variant="leftPanel === 'tasks' ? 'soft' : 'ghost'"
          icon="i-lucide-kanban-square"
          class="justify-center"
          @click="leftPanel = 'tasks'"
        />
        <UButton
          color="neutral"
          :variant="leftPanel === 'library' ? 'soft' : 'ghost'"
          icon="i-lucide-library-big"
          class="justify-center"
          @click="leftPanel = 'library'"
        />
        <UButton
          color="neutral"
          :variant="leftPanel === 'graph' ? 'soft' : 'ghost'"
          icon="i-lucide-network"
          class="justify-center"
          @click="leftPanel = 'graph'"
        />
      </div>
    </div>

    <UModal
      v-model:open="isSettingsModalOpen"
      :ui="{
        content:
          'w-screen max-w-none h-[100dvh] rounded-none border-0 bg-default shadow-none sm:w-[80vw] sm:max-w-[80vw] sm:h-[80vh] sm:rounded-xl sm:border sm:border-primary/20 sm:shadow-2xl',
      }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            aria-label="Назад"
            @click="isSettingsModalOpen = false"
          />
          <p class="text-sm font-medium text-highlighted">Настройки</p>
        </div>
      </template>
      <template #body>
        <div
          class="h-full overflow-hidden p-1 grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]"
        >
          <div class="space-y-1 rounded-lg border border-default/60 p-1">
            <UButton
              block
              :color="settingsSection === 'appearance' ? 'primary' : 'neutral'"
              :variant="settingsSection === 'appearance' ? 'soft' : 'ghost'"
              icon="i-lucide-palette"
              class="justify-start"
              @click="settingsSection = 'appearance'"
            >
              Внешний вид
            </UButton>
            <UButton
              block
              :color="settingsSection === 'editor' ? 'primary' : 'neutral'"
              :variant="settingsSection === 'editor' ? 'soft' : 'ghost'"
              icon="i-lucide-pencil-line"
              class="justify-start"
              @click="settingsSection = 'editor'"
            >
              Редактор
            </UButton>
            <UButton
              block
              :color="settingsSection === 'hotkeys' ? 'primary' : 'neutral'"
              :variant="settingsSection === 'hotkeys' ? 'soft' : 'ghost'"
              icon="i-lucide-keyboard"
              class="justify-start"
              @click="settingsSection = 'hotkeys'"
            >
              Горячие клавиши
            </UButton>
            <UButton
              block
              :color="settingsSection === 'app' ? 'primary' : 'neutral'"
              :variant="settingsSection === 'app' ? 'soft' : 'ghost'"
              icon="i-lucide-layout-dashboard"
              class="justify-start"
              @click="settingsSection = 'app'"
            >
              Приложение
            </UButton>
          </div>

          <div class="min-h-0 space-y-4 overflow-y-auto px-1 pt-1 pb-1">
            <template v-if="settingsSection === 'appearance'">
              <div class="space-y-2">
                <p class="text-sm font-medium text-highlighted">Тема</p>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <UButton
                    v-for="option in themeOptions"
                    :key="option.value"
                    color="neutral"
                    :variant="
                      colorMode.preference === option.value ? 'solid' : 'soft'
                    "
                    @click="setThemePreference(option.value)"
                  >
                    {{ option.label }}
                  </UButton>
                </div>
              </div>

              <div class="space-y-2">
                <p class="text-sm font-medium text-highlighted">
                  Акцентный цвет
                </p>
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    v-for="option in accentOptions"
                    :key="option.value"
                    type="button"
                    class="h-6 w-6 rounded-full border-2 transition-transform hover:scale-105"
                    :class="[
                      option.value === 'blue' && 'bg-blue-500',
                      option.value === 'orange' && 'bg-orange-500',
                      option.value === 'cyan' && 'bg-cyan-500',
                      option.value === 'indigo' && 'bg-indigo-500',
                      option.value === 'violet' && 'bg-violet-500',
                      option.value === 'green' && 'bg-green-500',
                      accentColor === option.value
                        ? 'border-white ring-2 ring-primary/60 ring-offset-2 ring-offset-default'
                        : 'border-transparent',
                    ]"
                    :title="option.label"
                    :aria-label="option.label"
                    @click="setAccentColor(option.value)"
                  />
                </div>
              </div>
            </template>

            <template v-else-if="settingsSection === 'editor'">
              <UCard>
                <div class="space-y-3">
                  <div class="flex items-center justify-between gap-3">
                    <div class="space-y-1">
                      <p class="text-sm font-medium text-highlighted">
                        Проверка орфографии
                      </p>
                      <p class="text-sm text-muted">
                        Красное волнистое подчёркивание ошибок (RU/EN).
                      </p>
                    </div>

                    <USwitch
                      v-model="isSpellcheckEnabled"
                      color="primary"
                      :aria-label="
                        isSpellcheckEnabled
                          ? 'Отключить проверку орфографии'
                          : 'Включить проверку орфографии'
                      "
                    />
                  </div>
                </div>
              </UCard>

              <UCard>
                <div class="space-y-1">
                  <p class="text-sm font-medium text-highlighted">
                    Контекстное меню
                  </p>
                  <p class="text-sm text-muted">
                    По правому клику на выделенном тексте доступны быстрые
                    действия форматирования.
                  </p>
                </div>
              </UCard>
            </template>

            <template v-else-if="settingsSection === 'hotkeys'">
              <UCard>
                <div class="space-y-3">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-medium text-highlighted">
                      Настройка горячих клавиш
                    </p>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="soft"
                      icon="i-lucide-rotate-ccw"
                      @click="resetHotkeysToDefault"
                    >
                      Сбросить по умолчанию
                    </UButton>
                  </div>

                  <p class="text-xs text-muted">
                    Нажмите «Назначить», затем нужную комбинацию. Если сочетание
                    уже занято, оно будет автоматически переназначено.
                  </p>

                  <div class="space-y-2">
                    <div
                      v-for="action in HOTKEY_ACTIONS"
                      :key="action"
                      class="flex items-center justify-between gap-2 rounded-md border border-default p-2"
                    >
                      <div class="min-w-0">
                        <p class="truncate text-sm text-highlighted">
                          {{ HOTKEY_LABELS[action] }}
                        </p>
                        <p class="text-xs text-muted">
                          {{ formatHotkeyForDisplay(hotkeys[action]) }}
                        </p>
                      </div>

                      <UButton
                        size="xs"
                        color="neutral"
                        variant="soft"
                        icon="i-lucide-key-round"
                        @click="startHotkeyCapture(action)"
                      >
                        Назначить
                      </UButton>
                    </div>
                  </div>
                </div>
              </UCard>
            </template>

            <template v-else>
              <UCard>
                <div class="space-y-2">
                  <p class="text-sm font-medium text-highlighted">Хранилище</p>
                  <p class="text-sm text-muted">
                    Текущая папка:
                    <span class="font-medium text-highlighted">
                      {{ vaultPath || "Не выбрана" }}
                    </span>
                  </p>
                  <p class="text-sm text-muted">
                    Размер папки:
                    <span class="font-medium text-highlighted">
                      {{ isLoadingVaultSize ? "Считаем…" : formattedVaultSize }}
                    </span>
                  </p>

                  <div class="flex flex-wrap gap-2">
                    <UButton
                      size="sm"
                      color="primary"
                      variant="soft"
                      icon="i-lucide-folder-open"
                      @click="pickVaultFolder"
                    >
                      Выбрать папку
                    </UButton>
                    <UButton
                      v-if="vaultPath"
                      size="sm"
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-x"
                      @click="clearVault"
                    >
                      Отключить
                    </UButton>
                  </div>
                </div>
              </UCard>
            </template>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end">
          <UButton
            color="neutral"
            variant="soft"
            @click="isSettingsModalOpen = false"
          >
            Закрыть
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteModalOpen"
      :ui="{
        content:
          'w-screen max-w-none h-[100dvh] rounded-none border-0 bg-default shadow-none sm:h-auto sm:w-auto sm:max-w-lg sm:rounded-xl sm:border sm:border-default sm:shadow-2xl',
      }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            aria-label="Назад"
            @click="isDeleteModalOpen = false"
          />
          <p class="text-sm font-medium text-highlighted">Удалить заметку?</p>
        </div>
      </template>
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

    <UModal
      v-model:open="isLibraryNoteModalOpen"
      :ui="{
        content:
          'w-screen max-w-none h-[100dvh] rounded-none border-0 bg-default shadow-none sm:w-[80vw] sm:max-w-[80vw] sm:h-[80vh] sm:rounded-xl sm:border sm:border-default sm:shadow-2xl',
      }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            aria-label="Назад"
            @click="isLibraryNoteModalOpen = false"
          />
          <p class="truncate text-sm font-medium text-highlighted">
            {{ libraryActiveNoteTitle }}
          </p>
        </div>
      </template>
      <template #body>
        <div class="h-full overflow-y-auto">
          <EditorContent
            v-if="libraryPreviewEditor"
            :editor="libraryPreviewEditor"
            class="prosemirror-editor"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteKanbanColumnModalOpen"
      :ui="{
        content:
          'w-screen max-w-none h-[100dvh] rounded-none border-0 bg-default shadow-none sm:h-auto sm:w-auto sm:max-w-lg sm:rounded-xl sm:border sm:border-default sm:shadow-2xl',
      }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            aria-label="Назад"
            @click="cancelDeleteKanbanColumn"
          />
          <p class="text-sm font-medium text-highlighted">Удалить колонку?</p>
        </div>
      </template>
      <template #body>
        <p class="text-sm text-muted">
          Вы точно хотите удалить колонку
          <span class="font-medium text-highlighted">
            «{{ pendingDeleteColumn?.name || "Без названия" }}»
          </span>
          ? Все задачи в ней тоже будут удалены.
        </p>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="soft"
            @click="cancelDeleteKanbanColumn"
          >
            Отмена
          </UButton>
          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-trash-2"
            @click="confirmDeleteKanbanColumn"
          >
            Удалить
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteKanbanTaskModalOpen"
      :ui="{
        content:
          'w-screen max-w-none h-[100dvh] rounded-none border-0 bg-default shadow-none sm:h-auto sm:w-auto sm:max-w-lg sm:rounded-xl sm:border sm:border-default sm:shadow-2xl',
      }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            aria-label="Назад"
            @click="cancelDeleteKanbanTask"
          />
          <p class="text-sm font-medium text-highlighted">Удалить задачу?</p>
        </div>
      </template>
      <template #body>
        <p class="text-sm text-muted">
          Вы точно хотите удалить задачу
          <span class="font-medium text-highlighted">
            «{{ pendingDeleteTask?.title || "Без названия" }}»
          </span>
          ?
        </p>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="soft"
            @click="cancelDeleteKanbanTask"
          >
            Отмена
          </UButton>
          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-trash-2"
            @click="confirmDeleteKanbanTask"
          >
            Удалить
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isKanbanTaskModalOpen"
      :ui="{
        content:
          'w-screen max-w-none h-[100dvh] rounded-none border-0 bg-default shadow-none sm:w-[90vw] sm:max-w-[90vw] sm:h-[84vh] sm:rounded-xl sm:border sm:border-default sm:shadow-2xl',
      }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            aria-label="Назад"
            @click="isKanbanTaskModalOpen = false"
          />
          <p class="text-sm font-medium text-highlighted">Карточка задачи</p>
        </div>
      </template>
      <template #body>
        <div class="h-full grid grid-rows-[auto_minmax(0,1fr)] gap-3">
          <div class="flex items-center gap-2">
            <UInput
              v-if="isKanbanTaskEditMode && activeKanbanTask"
              v-model="activeKanbanTask.title"
              class="flex-1 text-lg"
              placeholder="Название задачи"
            />
            <p
              v-else
              class="flex-1 truncate text-lg font-semibold text-highlighted"
            >
              {{ activeKanbanTask?.title || "Без названия" }}
            </p>

            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-lucide-pencil"
              :aria-label="
                isKanbanTaskEditMode
                  ? 'Завершить редактирование задачи'
                  : 'Редактировать задачу'
              "
              @click="isKanbanTaskEditMode = !isKanbanTaskEditMode"
            />
          </div>

          <div class="min-h-0 grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
            <UCard class="min-h-0 overflow-hidden">
              <template #header>
                <div
                  v-if="isKanbanTaskEditMode"
                  class="flex flex-wrap items-center gap-1"
                >
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-bold"
                    @mousedown.prevent="
                      kanbanTaskEditor?.chain().focus().toggleBold().run()
                    "
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-italic"
                    @mousedown.prevent="
                      kanbanTaskEditor?.chain().focus().toggleItalic().run()
                    "
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-underline"
                    @mousedown.prevent="
                      kanbanTaskEditor?.chain().focus().toggleUnderline().run()
                    "
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-list"
                    @mousedown.prevent="
                      kanbanTaskEditor?.chain().focus().toggleBulletList().run()
                    "
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-list-ordered"
                    @mousedown.prevent="
                      kanbanTaskEditor
                        ?.chain()
                        .focus()
                        .toggleOrderedList()
                        .run()
                    "
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-heading-2"
                    @mousedown.prevent="
                      kanbanTaskEditor
                        ?.chain()
                        .focus()
                        .toggleHeading({ level: 2 })
                        .run()
                    "
                  />
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-eraser"
                    @mousedown.prevent="
                      kanbanTaskEditor
                        ?.chain()
                        .focus()
                        .clearNodes()
                        .unsetAllMarks()
                        .run()
                    "
                  />
                </div>
              </template>

              <div class="h-full overflow-y-auto">
                <EditorContent
                  v-if="kanbanTaskEditor"
                  :editor="kanbanTaskEditor"
                  class="prosemirror-editor"
                />
              </div>
            </UCard>

            <UCard class="min-h-0 overflow-hidden">
              <template #header>
                <p class="text-sm font-medium text-highlighted">Комментарии</p>
              </template>

              <div class="flex h-full flex-col gap-3">
                <div class="min-h-0 flex-1 space-y-2 overflow-y-auto">
                  <div
                    v-for="comment in activeKanbanTask?.comments || []"
                    :key="comment.id"
                    class="rounded-md border border-default bg-muted/20 p-2"
                  >
                    <p class="text-sm text-highlighted whitespace-pre-wrap">
                      {{ comment.text }}
                    </p>
                    <p class="mt-1 text-xs text-muted">
                      {{ new Date(comment.createdAt).toLocaleString() }}
                    </p>
                  </div>

                  <UAlert
                    v-if="!activeKanbanTask?.comments?.length"
                    color="neutral"
                    variant="subtle"
                    title="Комментариев пока нет"
                  />
                </div>

                <div v-if="isKanbanTaskEditMode" class="w-full space-y-2">
                  <UTextarea
                    v-model="draftKanbanComment"
                    class="w-full"
                    :rows="4"
                    placeholder="Оставьте комментарий..."
                  />
                  <UButton
                    block
                    color="primary"
                    variant="soft"
                    icon="i-lucide-send"
                    @click="addKanbanComment"
                  >
                    Добавить комментарий
                  </UButton>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteFolderModalOpen"
      :ui="{
        content:
          'w-screen max-w-none h-[100dvh] rounded-none border-0 bg-default shadow-none sm:h-auto sm:w-auto sm:max-w-lg sm:rounded-xl sm:border sm:border-default sm:shadow-2xl',
      }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            aria-label="Назад"
            @click="cancelDeleteFolder"
          />
          <p class="text-sm font-medium text-highlighted">Удалить папку?</p>
        </div>
      </template>
      <template #body>
        <p class="text-sm text-muted">
          Вы точно хотите удалить папку
          <span class="font-medium text-highlighted">
            «{{ pendingDeleteFolder?.name || "Без названия" }}»
          </span>
          ?
          <span v-if="pendingDeleteFolderHasNotes">
            Заметки из неё останутся и будут перенесены в «Без папки».
          </span>
        </p>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="soft" @click="cancelDeleteFolder">
            Отмена
          </UButton>
          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-trash-2"
            @click="confirmDeleteFolder"
          >
            Удалить
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isNoteRelationModalOpen"
      :ui="{
        content:
          'w-screen max-w-none h-[100dvh] rounded-none border-0 bg-default shadow-none sm:h-auto sm:w-auto sm:max-w-xl sm:rounded-xl sm:border sm:border-default sm:shadow-2xl',
      }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            aria-label="Назад"
            @click="isNoteRelationModalOpen = false"
          />
          <p class="text-sm font-medium text-highlighted">Связь с заметкой</p>
        </div>
      </template>

      <template #body>
        <div class="mx-auto w-full max-w-xl space-y-3">
          <UInput
            ref="noteRelationInputRef"
            v-model="noteRelationQuery"
            class="w-full"
            icon="i-lucide-search"
            placeholder="Начните вводить название заметки..."
            @keydown.enter.prevent="confirmNoteRelation"
          />

          <div class="max-h-64 space-y-1 overflow-y-auto">
            <button
              v-for="note in noteRelationSuggestions"
              :key="`relation-suggestion-${note.id}`"
              type="button"
              class="w-full rounded-md border border-default bg-muted/20 px-3 py-2 text-left transition hover:bg-muted/40"
              @click="selectNoteRelation(note.id)"
            >
              <p class="truncate text-sm font-medium text-highlighted">
                {{ noteTitle(note) }}
              </p>
              <p class="mt-0.5 line-clamp-1 text-xs text-muted">
                {{ notesMeta[note.id]?.preview || "Пустая заметка" }}
              </p>
            </button>

            <UAlert
              v-if="noteRelationQuery.trim() && !noteRelationSuggestions.length"
              color="neutral"
              variant="subtle"
              title="Ничего не найдено"
              description="Можно создать связь с введённым названием вручную."
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="soft"
            @click="isNoteRelationModalOpen = false"
          >
            Отмена
          </UButton>
          <UButton color="primary" @click="confirmNoteRelation">
            Вставить связь
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isTextInputModalOpen"
      :ui="{
        content:
          'w-screen max-w-none h-[100dvh] rounded-none border-0 bg-default shadow-none sm:h-auto sm:w-auto sm:max-w-lg sm:rounded-xl sm:border sm:border-default sm:shadow-2xl',
      }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            aria-label="Назад"
            @click="cancelTextInputModal"
          />
          <p class="text-sm font-medium text-highlighted">
            {{ textInputModalTitle }}
          </p>
        </div>
      </template>
      <template #body>
        <div class="mx-auto w-full max-w-md space-y-3">
          <p v-if="textInputModalDescription" class="text-sm text-muted">
            {{ textInputModalDescription }}
          </p>

          <UInput
            ref="textInputRef"
            v-model="textInputModalValue"
            class="w-full"
            :placeholder="textInputModalPlaceholder"
            @keydown.enter.prevent="confirmTextInputModal"
          />
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="soft" @click="cancelTextInputModal">
            Отмена
          </UButton>
          <UButton
            :color="textInputModalConfirmColor"
            @click="confirmTextInputModal"
          >
            {{ textInputModalConfirmLabel }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>

<script setup lang="ts">
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { mergeAttributes, Node } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import TasksPanel from "~/components/panels/TasksPanel.vue";
import GraphPanel from "~/components/panels/GraphPanel.vue";
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
import {
  buildMeta,
  createDocFromText,
  createEmptyDoc,
  createEmptyKanbanTaskDescription,
  docToMarkdown,
  markdownToDoc,
  parseWikiLinks,
  rewriteWikiLinksInDoc,
  type JSONContent,
  type NoteMeta,
  type ParsedWikiLink,
} from "~/utils/note-doc";

// ── Types ─────────────────────────────────────────────────────────────────────

type Note = {
  id: string;
  folderId: string | null;
  content: JSONContent;
  updatedAt: string;
  /** filename in vault, e.g. "My Note.md" (legacy field) */
  filename?: string;
  /** relative path in vault, e.g. "Work/Ideas/My Note.md" */
  relativePath?: string;
};

type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  coverPath?: string;
  coverDataUrl?: string;
};

type KanbanColumn = {
  id: string;
  name: string;
};

type KanbanTask = {
  id: string;
  columnId: string;
  title: string;
  description: JSONContent;
  comments: KanbanComment[];
};

type KanbanComment = {
  id: string;
  text: string;
  createdAt: string;
};

type LeftPanel = "notes" | "graph" | "tasks" | "library";
type SettingsSection = "appearance" | "editor" | "hotkeys" | "app";

type HotkeyAction =
  | "bold"
  | "italic"
  | "inlineCode"
  | "codeBlock"
  | "heading2"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "clearFormatting";

type TextInputModalOptions = {
  title: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  confirmColor?: "primary" | "neutral";
};

type VisibleFolder = {
  folder: Folder;
  depth: number;
};

type GraphDisplayMode = "global" | "local";
type GraphLabelsMode = "all" | "active" | "hover";

type GraphNode = {
  id: string;
  label: string;
  folderId: string | null;
  isPlaceholder: boolean;
  incomingCount: number;
  outgoingCount: number;
};

type GraphEdge = {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  type: "internal_link";
};

// Electron API bridge (only available in Electron)
interface ElectronAPI {
  getUiSettings: () => Promise<{ theme?: string; accent?: string }>;
  setUiSettings: (settings: {
    theme: string;
    accent: string;
  }) => Promise<{ theme?: string; accent?: string }>;
  selectFolder: () => Promise<string | null>;
  selectFiles: () => Promise<string[]>;
  getFolderSize: (
    folderPath: string,
  ) => Promise<{ ok: boolean; sizeBytes?: number; error?: string }>;
  openFilePath: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
  readImageAsDataUrl: (
    filePath: string,
  ) => Promise<{ ok: boolean; dataUrl?: string; error?: string }>;
  importCoverImage: (
    folderPath: string,
    sourcePath: string,
  ) => Promise<{
    ok: boolean;
    relativePath?: string;
    dataUrl?: string;
    error?: string;
  }>;
  readKanbanData: (
    folderPath: string,
  ) => Promise<{ columns: unknown[]; tasks: unknown[] }>;
  saveKanbanData: (
    folderPath: string,
    payload: { columns: KanbanColumn[]; tasks: KanbanTask[] },
  ) => Promise<{ ok: boolean; error?: string }>;
  saveKanbanDataSync: (
    folderPath: string,
    payload: { columns: KanbanColumn[]; tasks: KanbanTask[] },
  ) => { ok: boolean; error?: string };
  readFolderMetadata: (folderPath: string) => Promise<{ folders: unknown[] }>;
  saveFolderMetadata: (
    folderPath: string,
    payload: { folders: Folder[] },
  ) => Promise<{ ok: boolean; error?: string }>;
  readMarkdownFiles: (folderPath: string) => Promise<
    {
      filename: string;
      relativePath: string;
      content: string;
      updatedAt: string;
    }[]
  >;
  saveMarkdownFile: (
    folderPath: string,
    relativePath: string,
    content: string,
  ) => Promise<{
    ok: boolean;
    filename?: string;
    relativePath?: string;
    error?: string;
  }>;
  deleteMarkdownFile: (
    folderPath: string,
    filename: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  getVaultPath: () => Promise<string | null>;
  setVaultPath: (folderPath: string) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

const isElectron = () => typeof window !== "undefined" && !!window.electronAPI;

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "noteforge.notes.v3";
const NOTES_TREE_UI_STATE_KEY = "noteforge.notesTree.ui.v1";
const ACCENT_STORAGE_KEY = "noteforge.ui.accent.v1";
const THEME_STORAGE_KEY = "noteforge.ui.theme.v1";
const SPELLCHECK_STORAGE_KEY = "noteforge.editor.spellcheck.v1";
const HOTKEYS_STORAGE_KEY = "noteforge.editor.hotkeys.v1";
const GRAPH_SETTINGS_STORAGE_KEY = "noteforge.graph.settings.v1";
const NOTES_LIST_WIDTH_STORAGE_KEY = "noteforge.ui.notesListWidth.v2";
const NOTES_LIST_MIN_WIDTH = 220;
const NOTES_LIST_MAX_WIDTH = 420;
const NOTES_EDITOR_MIN_WIDTH = 360;
const NOTES_RESIZER_WIDTH = 16;
const NOTES_PANES_GAP = 8;
const lowlight = createLowlight(common);

const HOTKEY_ACTIONS: HotkeyAction[] = [
  "bold",
  "italic",
  "inlineCode",
  "codeBlock",
  "heading2",
  "bulletList",
  "orderedList",
  "blockquote",
  "clearFormatting",
];

const HOTKEY_LABELS: Record<HotkeyAction, string> = {
  bold: "Жирный",
  italic: "Курсив",
  inlineCode: "Инлайн-код",
  codeBlock: "Блок кода",
  heading2: "Заголовок H2",
  bulletList: "Маркированный список",
  orderedList: "Нумерованный список",
  blockquote: "Цитата",
  clearFormatting: "Очистить форматирование",
};

const DEFAULT_HOTKEYS: Record<HotkeyAction, string> = {
  bold: "Mod+B",
  italic: "Mod+I",
  inlineCode: "Mod+E",
  codeBlock: "Mod+Shift+E",
  heading2: "Mod+Shift+2",
  bulletList: "Mod+Shift+8",
  orderedList: "Mod+Shift+7",
  blockquote: "Mod+Shift+.",
  clearFormatting: "Mod+\\",
};

// ── State ─────────────────────────────────────────────────────────────────────

const searchQuery = ref("");
const notes = ref<Note[]>([]);
const folders = ref<Folder[]>([]);
const kanbanColumns = ref<KanbanColumn[]>([]);
const kanbanTasks = ref<KanbanTask[]>([]);
const leftPanel = ref<LeftPanel>("notes");
const collapsedFolders = ref<string[]>([]);
const draggedTaskId = ref<string | null>(null);
const draggedColumnId = ref<string | null>(null);
const draftTask = ref<{ columnId: string; title: string } | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const activeNoteId = ref<string | null>(null);
const isApplyingContent = ref(false);
const isDeleteModalOpen = ref(false);
const isDeleteKanbanColumnModalOpen = ref(false);
const isDeleteKanbanTaskModalOpen = ref(false);
const isDeleteFolderModalOpen = ref(false);
const isKanbanTaskModalOpen = ref(false);
const isKanbanTaskEditMode = ref(false);
const isTextInputModalOpen = ref(false);
const isNoteRelationModalOpen = ref(false);
const isMobileViewport = ref(false);
const mobileNotesView = ref<"list" | "editor">("list");
const pendingDeleteColumnId = ref<string | null>(null);
const pendingDeleteTaskId = ref<string | null>(null);
const pendingDeleteFolderId = ref<string | null>(null);
const activeKanbanTaskId = ref<string | null>(null);
const draftKanbanComment = ref("");
const textInputRef = ref<HTMLInputElement | null>(null);
const noteRelationInputRef = ref<HTMLInputElement | null>(null);
const textInputModalTitle = ref("");
const textInputModalDescription = ref("");
const textInputModalPlaceholder = ref("");
const textInputModalValue = ref("");
const textInputModalConfirmLabel = ref("Сохранить");
const textInputModalConfirmColor = ref<"primary" | "neutral">("primary");
const textInputModalResolver = ref<((value: string | null) => void) | null>(
  null,
);
const noteRelationQuery = ref("");
const graphMode = ref<GraphDisplayMode>("global");
const graphSearchQuery = ref("");
const graphLabelsMode = ref<GraphLabelsMode>("active");
const graphRepulsionStrength = ref(1400);
const graphLinkStrength = ref(0.05);
const graphEdgeRigidity = ref(1);
const graphNodeSize = ref(5);
const graphLabelFontSize = ref(10);
const graphShowDirection = ref(false);
const wikiLinksCache = ref<
  Map<string, { plain: string; links: ParsedWikiLink[] }>
>(new Map());
const isApplyingRenameSafeLinks = ref(false);
const accentColor = ref<AccentColor>("blue");
const notesWorkspaceRef = ref<HTMLElement | null>(null);
const notesListWidth = ref(260);
const isResizingNotesPane = ref(false);
const colorMode = useColorMode();
const libraryCurrentFolderId = ref<string | null>(null);
const isLibraryNoteModalOpen = ref(false);
const libraryPreviewNoteId = ref<string | null>(null);
const isTextContextMenuOpen = ref(false);
const textContextMenuRef = ref<HTMLElement | null>(null);
const textContextMenuX = ref(0);
const textContextMenuY = ref(0);
const isNotesContextMenuOpen = ref(false);
const notesContextMenuRef = ref<HTMLElement | null>(null);
const notesContextMenuX = ref(0);
const notesContextMenuY = ref(0);
const isSettingsModalOpen = ref(false);
const settingsSection = ref<SettingsSection>("appearance");
const isSpellcheckEnabled = ref(true);
const hotkeys = ref<Record<HotkeyAction, string>>({ ...DEFAULT_HOTKEYS });
const capturingHotkeyAction = ref<HotkeyAction | null>(null);
const vaultSizeBytes = ref<number | null>(null);
const isLoadingVaultSize = ref(false);
const isApplyingKanbanTaskDescription = ref(false);
const isHydratingVaultState = ref(false);

// Vault state
const vaultPath = ref<string | null>(null);
const isLoadingVault = ref(false);

// ── Computed ──────────────────────────────────────────────────────────────────

const isDark = computed(() => colorMode.value === "dark");

const vaultFolderName = computed(() => {
  if (!vaultPath.value) return "";
  const parts = vaultPath.value.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || vaultPath.value;
});

const formattedVaultSize = computed(() => {
  const bytes = vaultSizeBytes.value;
  if (bytes === null || Number.isNaN(bytes)) return "—";

  if (bytes < 1024) return `${bytes} Б`;

  const units = ["КБ", "МБ", "ГБ", "ТБ"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
});

const foldersById = computed(
  () => new Map(folders.value.map((folder) => [folder.id, folder])),
);

const libraryBreadcrumbs = computed<Folder[]>(() => {
  const crumbs: Folder[] = [];
  let currentId = libraryCurrentFolderId.value;

  while (currentId) {
    const folder = foldersById.value.get(currentId);
    if (!folder) break;
    crumbs.unshift(folder);
    currentId = folder.parentId;
  }

  return crumbs;
});

const libraryChildFolders = computed(() =>
  folders.value.filter(
    (folder) => folder.parentId === libraryCurrentFolderId.value,
  ),
);

const libraryVisibleNotes = computed(() =>
  notes.value.filter((note) => note.folderId === libraryCurrentFolderId.value),
);

// ── Accent ────────────────────────────────────────────────────────────────────

type AccentColor = "blue" | "orange" | "cyan" | "indigo" | "violet" | "green";
type ThemePreference = "light" | "dark" | "system";

const accentOptions: { label: string; value: AccentColor }[] = [
  { label: "Голубой", value: "blue" },
  { label: "Оранжевый", value: "orange" },
  { label: "Бирюзовый", value: "cyan" },
  { label: "Индиго", value: "indigo" },
  { label: "Фиолетовый", value: "violet" },
  { label: "Зелёный", value: "green" },
];

const themeOptions: { label: string; value: ThemePreference }[] = [
  { label: "Светлая", value: "light" },
  { label: "Тёмная", value: "dark" },
  { label: "Системная", value: "system" },
];

const isThemePreference = (value: string): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system";

const persistUiSettings = async () => {
  const theme = String(colorMode.preference || "system");
  const accent = accentColor.value;

  if (isElectron()) {
    await window.electronAPI!.setUiSettings({ theme, accent });
    return;
  }

  localStorage.setItem(THEME_STORAGE_KEY, theme);
  localStorage.setItem(ACCENT_STORAGE_KEY, accent);
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getNotesListMaxWidth = () => {
  const workspaceWidth = notesWorkspaceRef.value?.getBoundingClientRect().width;

  if (!workspaceWidth) return NOTES_LIST_MAX_WIDTH;

  const maxByWorkspace = Math.max(
    NOTES_LIST_MIN_WIDTH,
    workspaceWidth -
      NOTES_EDITOR_MIN_WIDTH -
      NOTES_RESIZER_WIDTH -
      NOTES_PANES_GAP * 2,
  );

  return Math.min(NOTES_LIST_MAX_WIDTH, maxByWorkspace);
};

const normalizeNotesListWidth = (value: number) =>
  clamp(value, NOTES_LIST_MIN_WIDTH, getNotesListMaxWidth());

const notesWorkspaceStyle = computed<Record<string, string>>(() => ({
  "--notes-list-pane-width": `${notesListWidth.value}px`,
  "--notes-resizer-width": `${NOTES_RESIZER_WIDTH}px`,
}));

const textContextMenuStyle = computed<Record<string, string>>(() => ({
  left: `${textContextMenuX.value}px`,
  top: `${textContextMenuY.value}px`,
}));

const notesContextMenuStyle = computed<Record<string, string>>(() => ({
  left: `${notesContextMenuX.value}px`,
  top: `${notesContextMenuY.value}px`,
}));

const isMacPlatform =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);

const runHotkeyAction = (action: HotkeyAction) => {
  if (action === "bold") return toggleBold();
  if (action === "italic") return toggleItalic();
  if (action === "inlineCode") return toggleCode();
  if (action === "codeBlock") return toggleCodeBlock();
  if (action === "heading2") return toggleHeadingLevel2();
  if (action === "bulletList") return toggleBulletList();
  if (action === "orderedList") return toggleOrderedList();
  if (action === "blockquote") return toggleBlockquote();
  return clearFormatting();
};

const normalizeHotkeyString = (value: string): string => {
  const rawParts = String(value || "")
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!rawParts.length) return "";

  const modifiers = new Set<string>();
  let key = "";

  for (const rawPart of rawParts) {
    const part = rawPart.toLowerCase();
    if (part === "mod" || part === "cmd" || part === "command") {
      modifiers.add("Mod");
      continue;
    }
    if (part === "ctrl" || part === "control") {
      modifiers.add("Ctrl");
      continue;
    }
    if (part === "alt" || part === "option") {
      modifiers.add("Alt");
      continue;
    }
    if (part === "shift") {
      modifiers.add("Shift");
      continue;
    }

    key = rawPart.length === 1 ? rawPart.toUpperCase() : rawPart;
  }

  if (!key) return "";

  return ["Mod", "Ctrl", "Alt", "Shift"]
    .filter((modifier) => modifiers.has(modifier))
    .concat(key)
    .join("+");
};

const hotkeyFromKeyboardEvent = (event: KeyboardEvent): string => {
  const code = event.code || "";
  const key = event.key || "";

  const codeMap: Record<string, string> = {
    Backslash: "\\",
    Slash: "/",
    Period: ".",
    Comma: ",",
    Semicolon: ";",
    Quote: "'",
    BracketLeft: "[",
    BracketRight: "]",
    Minus: "-",
    Equal: "=",
    Backquote: "`",
    Space: "Space",
  };

  const ignoredKeys = new Set([
    "Shift",
    "Control",
    "Alt",
    "Meta",
    "CapsLock",
    "Tab",
    "Escape",
  ]);

  if (ignoredKeys.has(key)) return "";

  let resolvedKey = "";

  if (code.startsWith("Key") && code.length === 4) {
    resolvedKey = code.slice(3).toUpperCase();
  } else if (code.startsWith("Digit") && code.length === 6) {
    resolvedKey = code.slice(5);
  } else if (codeMap[code]) {
    resolvedKey = codeMap[code];
  } else if (key.length === 1) {
    resolvedKey = key.toUpperCase();
  } else {
    resolvedKey = key;
  }

  if (!resolvedKey) return "";

  const parts: string[] = [];

  const modPressed = isMacPlatform ? event.metaKey : event.ctrlKey;
  if (modPressed) parts.push("Mod");

  if (!isMacPlatform && event.metaKey) parts.push("Meta");
  if (isMacPlatform && event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");

  parts.push(resolvedKey);

  return normalizeHotkeyString(parts.join("+"));
};

const formatHotkeyForDisplay = (hotkey: string): string => {
  if (!hotkey) return "Не назначено";

  return hotkey
    .split("+")
    .map((part) => {
      if (part === "Mod") return isMacPlatform ? "⌘" : "Ctrl";
      if (part === "Alt") return isMacPlatform ? "⌥" : "Alt";
      if (part === "Shift") return isMacPlatform ? "⇧" : "Shift";
      return part;
    })
    .join(" + ");
};

const assignHotkey = (action: HotkeyAction, hotkeyValue: string) => {
  const normalized = normalizeHotkeyString(hotkeyValue);
  const next = { ...hotkeys.value };

  for (const currentAction of HOTKEY_ACTIONS) {
    if (currentAction !== action && next[currentAction] === normalized) {
      next[currentAction] = "";
    }
  }

  next[action] = normalized;
  hotkeys.value = next;
};

const startHotkeyCapture = (action: HotkeyAction) => {
  capturingHotkeyAction.value = action;
};

const resetHotkeysToDefault = () => {
  hotkeys.value = { ...DEFAULT_HOTKEYS };
  capturingHotkeyAction.value = null;
};

const generateId = (): string => {
  const webCrypto = globalThis.crypto;

  if (webCrypto?.randomUUID) {
    return webCrypto.randomUUID();
  }

  if (webCrypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);

    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

// ── Resize ────────────────────────────────────────────────────────────────────

const resizeNotesPaneFromClientX = (clientX: number) => {
  const workspaceRect = notesWorkspaceRef.value?.getBoundingClientRect();
  if (!workspaceRect) return;

  const relativeWidth = clientX - workspaceRect.left;
  notesListWidth.value = normalizeNotesListWidth(relativeWidth);
};

const stopNotesResize = () => {
  if (!isResizingNotesPane.value) return;

  isResizingNotesPane.value = false;
  document.body.style.cursor = "";
  document.body.style.userSelect = "";

  window.removeEventListener("pointermove", onNotesResizePointerMove);
  window.removeEventListener("pointerup", stopNotesResize);
  window.removeEventListener("pointercancel", stopNotesResize);

  localStorage.setItem(
    NOTES_LIST_WIDTH_STORAGE_KEY,
    String(Math.round(notesListWidth.value)),
  );
};

const onNotesResizePointerMove = (event: PointerEvent) => {
  if (!isResizingNotesPane.value) return;
  resizeNotesPaneFromClientX(event.clientX);
};

const startNotesResize = (event: PointerEvent) => {
  if (window.innerWidth < 1024) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  isResizingNotesPane.value = true;
  document.body.style.cursor = "ew-resize";
  document.body.style.userSelect = "none";

  (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(
    event.pointerId,
  );

  resizeNotesPaneFromClientX(event.clientX);

  window.addEventListener("pointermove", onNotesResizePointerMove);
  window.addEventListener("pointerup", stopNotesResize);
  window.addEventListener("pointercancel", stopNotesResize);
};

const syncNotesListWidthToViewport = () => {
  isMobileViewport.value = window.innerWidth < 1024;

  if (!isMobileViewport.value) {
    mobileNotesView.value = "list";
  }

  notesListWidth.value = normalizeNotesListWidth(notesListWidth.value);
};

const openNote = (noteId: string) => {
  activeNoteId.value = noteId;

  if (isMobileViewport.value) {
    mobileNotesView.value = "editor";
  }
};

// ── Tiptap custom nodes ───────────────────────────────────────────────────────

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
  renderHTML(props) {
    const HTMLAttributes = props.HTMLAttributes as Record<string, unknown>;
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
  renderHTML(props) {
    const HTMLAttributes = props.HTMLAttributes as Record<string, unknown>;
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
      path: { default: null },
      filename: { default: "Файл" },
      mime: { default: "application/octet-stream" },
    };
  },
  addKeyboardShortcuts() {
    const removeIfSelected = () => {
      const { selection } = this.editor.state;

      if (
        selection instanceof NodeSelection &&
        selection.node.type.name === this.name
      ) {
        return this.editor.commands.deleteSelection();
      }

      return false;
    };

    return {
      Backspace: removeIfSelected,
      Delete: removeIfSelected,
    };
  },
  parseHTML() {
    return [{ tag: "a[data-note-file='true']" }];
  },
  renderHTML(props) {
    const HTMLAttributes = props.HTMLAttributes as Record<string, unknown>;
    const filePath = String(HTMLAttributes.path || "");
    const filename = String(HTMLAttributes.filename || "Файл");
    return [
      "a",
      {
        "data-note-file": "true",
        "data-file-path": filePath,
        href: "#",
        class: "note-file-link",
        contenteditable: "false",
      },
      ["span", { class: "note-file-icon", "aria-hidden": "true" }, "📎"],
      ["span", { class: "note-file-name" }, filename],
    ];
  },
});

// ── Note helpers ──────────────────────────────────────────────────────────────

const nowIso = () => new Date().toISOString();

const createDefaultKanbanColumns = (): KanbanColumn[] => [
  { id: generateId(), name: "В планах" },
  { id: generateId(), name: "В работе" },
  { id: generateId(), name: "На проверке" },
  { id: generateId(), name: "Решено" },
];

const normalizeKanbanColumns = (rawColumns: unknown[]): KanbanColumn[] =>
  rawColumns
    .map((column) => {
      if (!column || typeof column !== "object") return null;
      const c = column as Record<string, unknown>;
      if (typeof c.id !== "string" || typeof c.name !== "string") return null;
      return {
        id: c.id,
        name: c.name.trim() || "Без названия",
      } as KanbanColumn;
    })
    .filter((column): column is KanbanColumn => column !== null);

const normalizeKanbanTasks = (rawTasks: unknown[]): KanbanTask[] =>
  rawTasks
    .map((task) => {
      if (!task || typeof task !== "object") return null;
      const t = task as Record<string, unknown>;
      if (
        typeof t.id !== "string" ||
        typeof t.columnId !== "string" ||
        typeof t.title !== "string"
      )
        return null;
      return {
        id: t.id,
        columnId: t.columnId,
        title: t.title.trim() || "Новая задача",
        description:
          t.description && typeof t.description === "object"
            ? (t.description as JSONContent)
            : createEmptyKanbanTaskDescription(),
        comments: Array.isArray(t.comments)
          ? t.comments
              .map((comment) => {
                if (!comment || typeof comment !== "object") return null;
                const c = comment as Record<string, unknown>;
                if (typeof c.id !== "string" || typeof c.text !== "string") {
                  return null;
                }

                return {
                  id: c.id,
                  text: c.text,
                  createdAt:
                    typeof c.createdAt === "string" ? c.createdAt : nowIso(),
                } as KanbanComment;
              })
              .filter((comment): comment is KanbanComment => comment !== null)
          : [],
      } as KanbanTask;
    })
    .filter((task): task is KanbanTask => task !== null);

const applyKanbanState = (rawColumns: unknown[], rawTasks: unknown[]) => {
  kanbanColumns.value = normalizeKanbanColumns(rawColumns);
  ensureKanbanColumns();

  const validColumnIds = new Set(
    kanbanColumns.value.map((column) => column.id),
  );
  kanbanTasks.value = normalizeKanbanTasks(rawTasks).filter((task) =>
    validColumnIds.has(task.columnId),
  );
};

const ensureKanbanColumns = () => {
  if (!kanbanColumns.value.length) {
    kanbanColumns.value = createDefaultKanbanColumns();
  }
};

const toggleColorMode = () => {
  colorMode.preference = isDark.value ? "light" : "dark";
  void persistUiSettings();
};

const setThemePreference = (theme: ThemePreference) => {
  colorMode.preference = theme;
  void persistUiSettings();
};

const setAccentColor = (
  color: AccentColor,
  options: { persist?: boolean } = {},
) => {
  accentColor.value = color;
  updateAppConfig({
    ui: {
      colors: {
        primary: color,
      },
    },
  });

  if (options.persist === false) return;
  void persistUiSettings();
};

const normalizeRawNote = (raw: unknown): Note | null => {
  if (!raw || typeof raw !== "object") return null;

  const note = raw as Record<string, unknown>;
  const id = typeof note.id === "string" && note.id ? note.id : generateId();
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
      filename: typeof note.filename === "string" ? note.filename : undefined,
      relativePath:
        typeof note.relativePath === "string" ? note.relativePath : undefined,
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
  id: generateId(),
  folderId: null,
  content: createEmptyDoc(),
  updatedAt: nowIso(),
});

const sortByRecent = (items: Note[]) =>
  [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

// ── Vault / Markdown file operations ─────────────────────────────────────────

const sanitizeVaultPathSegment = (value: string) =>
  value.replace(/[/\\:*?"<>|]/g, "_").trim();

const noteStoredFilename = (note: Note): string => {
  if (note.relativePath) {
    const parts = note.relativePath.split("/");
    const basename = parts[parts.length - 1];
    if (basename) return basename;
  }

  if (note.filename) return note.filename;

  const meta = buildMeta(note.content);
  const safe = sanitizeVaultPathSegment(meta.title)
    .replace(/\s+/g, " ")
    .slice(0, 100);

  return `${safe || note.id}.md`;
};

const folderPathSegments = (folderId: string | null): string[] => {
  if (!folderId) return [];

  const byId = new Map(folders.value.map((folder) => [folder.id, folder]));
  const chain: string[] = [];
  const visited = new Set<string>();

  let currentId: string | null = folderId;
  while (currentId) {
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const folder = byId.get(currentId);
    if (!folder) break;

    const safeName = sanitizeVaultPathSegment(folder.name) || "Folder";
    chain.unshift(safeName);
    currentId = folder.parentId;
  }

  return chain;
};

const noteRelativePath = (note: Note): string => {
  const filename = noteStoredFilename(note);
  const segments = folderPathSegments(note.folderId);
  return [...segments, filename].join("/");
};

const buildKanbanPayload = (): {
  columns: KanbanColumn[];
  tasks: KanbanTask[];
} => {
  const columnsPayload: KanbanColumn[] = kanbanColumns.value.map((column) => ({
    id: column.id,
    name: column.name,
  }));

  const tasksPayload: KanbanTask[] = kanbanTasks.value.map((task) => ({
    id: task.id,
    columnId: task.columnId,
    title: task.title,
    // Важно: перед IPC отправляем только plain JSON, без Vue Proxy
    description: JSON.parse(
      JSON.stringify(task.description || {}),
    ) as JSONContent,
    comments: task.comments.map((comment) => ({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
    })),
  }));

  return { columns: columnsPayload, tasks: tasksPayload };
};

const saveKanbanToVault = async () => {
  if (!vaultPath.value || !isElectron()) return;

  const payload = buildKanbanPayload();
  const result = await window.electronAPI!.saveKanbanData(
    vaultPath.value,
    payload,
  );
  if (!result?.ok) {
    console.error(
      "Не удалось сохранить kanban:",
      result?.error || "unknown error",
    );
  }
};

const saveKanbanToVaultSync = () => {
  if (!vaultPath.value || !isElectron()) return;

  const payload = buildKanbanPayload();
  const result = window.electronAPI!.saveKanbanDataSync(
    vaultPath.value,
    payload,
  );
  if (!result?.ok) {
    console.error(
      "Не удалось синхронно сохранить kanban:",
      result?.error || "unknown error",
    );
  }
};

let kanbanSaveTimer: ReturnType<typeof setTimeout> | null = null;

const flushKanbanSaveSync = () => {
  if (kanbanSaveTimer) {
    clearTimeout(kanbanSaveTimer);
    kanbanSaveTimer = null;
  }

  saveKanbanToVaultSync();
};

const saveFoldersToVault = async () => {
  if (!vaultPath.value || !isElectron()) return;

  const foldersPayload: Folder[] = folders.value.map((folder) => ({
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    coverPath: folder.coverPath,
    coverDataUrl: folder.coverDataUrl,
  }));

  await window.electronAPI!.saveFolderMetadata(vaultPath.value, {
    folders: foldersPayload,
  });
};

const scheduleKanbanSave = () => {
  if (!vaultPath.value || isHydratingVaultState.value) return;

  if (kanbanSaveTimer) {
    clearTimeout(kanbanSaveTimer);
  }

  kanbanSaveTimer = setTimeout(() => {
    void saveKanbanToVault();
    kanbanSaveTimer = null;
  }, 500);
};

const scheduleFoldersSave = () => {
  if (!vaultPath.value || isHydratingVaultState.value) return;
  void saveFoldersToVault();
};

/**
 * Save a single note to the vault folder as a .md file.
 */
const saveNoteToVault = async (note: Note) => {
  if (!vaultPath.value || !isElectron()) return;

  const md = docToMarkdown(note.content);
  const previousRelativePath = note.relativePath || note.filename;
  const targetRelativePath = noteRelativePath(note);

  const result = await window.electronAPI!.saveMarkdownFile(
    vaultPath.value,
    targetRelativePath,
    md,
  );

  if (!result.ok) return;

  const finalRelativePath = result.relativePath || targetRelativePath;

  if (previousRelativePath && previousRelativePath !== finalRelativePath) {
    await window.electronAPI!.deleteMarkdownFile(
      vaultPath.value,
      previousRelativePath,
    );
  }

  note.relativePath = finalRelativePath;
  note.filename = result.filename || noteStoredFilename(note);
};

/**
 * Delete a note's file from the vault.
 */
const deleteNoteFromVault = async (note: Note) => {
  if (!vaultPath.value || !isElectron()) return;

  const targetPath = note.relativePath || note.filename;
  if (!targetPath) return;

  await window.electronAPI!.deleteMarkdownFile(vaultPath.value, targetPath);
};

/**
 * Load all .md files from the vault folder and replace current notes.
 */
const loadVaultFiles = async (folderPath: string) => {
  if (!isElectron()) return;

  isLoadingVault.value = true;
  isHydratingVaultState.value = true;
  try {
    const kanbanData = await window.electronAPI!.readKanbanData(folderPath);
    applyKanbanState(kanbanData.columns, kanbanData.tasks);

    const foldersMetadata =
      await window.electronAPI!.readFolderMetadata(folderPath);
    const savedFolders = Array.isArray(foldersMetadata?.folders)
      ? foldersMetadata.folders
          .map((folder) => {
            if (!folder || typeof folder !== "object") return null;
            const f = folder as Record<string, unknown>;
            if (typeof f.id !== "string" || typeof f.name !== "string") {
              return null;
            }

            return {
              id: f.id,
              name: f.name.trim() || "Без названия",
              parentId: typeof f.parentId === "string" ? f.parentId : null,
              coverPath:
                typeof f.coverPath === "string" ? f.coverPath : undefined,
              coverDataUrl:
                typeof f.coverDataUrl === "string" ? f.coverDataUrl : undefined,
            } as Folder;
          })
          .filter((folder): folder is Folder => folder !== null)
      : [];

    const savedFolderIds = new Set(savedFolders.map((folder) => folder.id));
    const normalizedSavedFolders = savedFolders.map((folder) => ({
      ...folder,
      parentId:
        folder.parentId && savedFolderIds.has(folder.parentId)
          ? folder.parentId
          : null,
    }));

    const savedFoldersById = new Map(
      normalizedSavedFolders.map((folder) => [folder.id, folder]),
    );
    const savedFolderPathById = new Map<string, string>();

    const resolveSavedFolderPath = (folderId: string): string => {
      const cached = savedFolderPathById.get(folderId);
      if (cached !== undefined) return cached;

      const visited = new Set<string>();
      const segments: string[] = [];
      let currentId: string | null = folderId;

      while (currentId) {
        if (visited.has(currentId)) break;
        visited.add(currentId);

        const currentFolder = savedFoldersById.get(currentId);
        if (!currentFolder) break;

        segments.unshift(
          sanitizeVaultPathSegment(currentFolder.name) || "Folder",
        );
        currentId = currentFolder.parentId;
      }

      const resolvedPath = segments.join("/");
      savedFolderPathById.set(folderId, resolvedPath);
      return resolvedPath;
    };

    const savedFoldersByPath = new Map<
      string,
      Pick<Folder, "coverPath" | "coverDataUrl">
    >();

    for (const folder of normalizedSavedFolders) {
      const key = resolveSavedFolderPath(folder.id);
      if (!key) continue;
      savedFoldersByPath.set(key, {
        coverPath: folder.coverPath,
        coverDataUrl: folder.coverDataUrl,
      });
    }

    const files = await window.electronAPI!.readMarkdownFiles(folderPath);

    if (!files.length) {
      notes.value = [];
      folders.value = normalizedSavedFolders;
      restoreNotesTreeUiState(folderPath);
      return;
    }

    const folderByPath = new Map<string, string>();
    const loadedFolders: Folder[] = [...normalizedSavedFolders];

    for (const folder of normalizedSavedFolders) {
      const folderPathKey = resolveSavedFolderPath(folder.id);
      if (folderPathKey) {
        folderByPath.set(folderPathKey, folder.id);
      }
    }

    const ensureFolderPath = (relativeFolderPath: string): string | null => {
      const normalized = relativeFolderPath
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, "");

      if (!normalized) return null;

      const parts = normalized.split("/").filter(Boolean);
      let currentPath = "";
      let parentId: string | null = null;

      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        const existingId = folderByPath.get(currentPath);
        if (existingId) {
          parentId = existingId;
          continue;
        }

        const id = generateId();
        const folderPathKey = currentPath;
        const savedMetadata = savedFoldersByPath.get(folderPathKey);
        loadedFolders.push({
          id,
          name: part,
          parentId,
          coverPath: savedMetadata?.coverPath,
          coverDataUrl: savedMetadata?.coverDataUrl,
        });
        folderByPath.set(currentPath, id);
        parentId = id;
      }

      return parentId;
    };

    const loadedNotes: Note[] = files.map((file) => {
      const normalizedPath = (file.relativePath || file.filename || "")
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");
      const lastSlashIndex = normalizedPath.lastIndexOf("/");
      const folderPath =
        lastSlashIndex >= 0 ? normalizedPath.slice(0, lastSlashIndex) : "";

      return {
        id: generateId(),
        folderId: ensureFolderPath(folderPath),
        content: markdownToDoc(file.content),
        updatedAt: file.updatedAt,
        filename: file.filename,
        relativePath: normalizedPath || file.filename,
      };
    });

    notes.value = sortByRecent(loadedNotes);
    folders.value = loadedFolders;
    restoreNotesTreeUiState(folderPath);

    if (loadedFolders.length) {
      void saveFoldersToVault();
    }
  } finally {
    isHydratingVaultState.value = false;
    isLoadingVault.value = false;
  }
};

/**
 * Open the macOS folder picker and set the vault.
 */
const pickVaultFolder = async () => {
  if (!isElectron()) return;

  const selected = await window.electronAPI!.selectFolder();
  if (!selected) return;

  vaultPath.value = selected;
  await loadVaultFiles(selected);
  await refreshVaultSize();
};

/**
 * Disconnect the vault (stop syncing to disk).
 */
const clearVault = async () => {
  if (!isElectron()) return;

  vaultPath.value = null;
  vaultSizeBytes.value = null;
  await window.electronAPI!.setVaultPath("");
};

const refreshVaultSize = async () => {
  if (!isElectron() || !vaultPath.value) {
    vaultSizeBytes.value = null;
    return;
  }

  isLoadingVaultSize.value = true;
  try {
    const result = await window.electronAPI!.getFolderSize(vaultPath.value);
    vaultSizeBytes.value = result.ok ? (result.sizeBytes ?? 0) : null;
  } finally {
    isLoadingVaultSize.value = false;
  }
};

// ── Storage (localStorage fallback) ──────────────────────────────────────────

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
      kanbanColumns.value = createDefaultKanbanColumns();
      kanbanTasks.value = [];
      restoreNotesTreeUiState(null);
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
      kanbanColumns.value = createDefaultKanbanColumns();
      kanbanTasks.value = [];
      restoreNotesTreeUiState(null);
      return;
    } catch {
      const first = createEmptyNote();
      notes.value = [first];
      folders.value = [];
      kanbanColumns.value = createDefaultKanbanColumns();
      kanbanTasks.value = [];
      restoreNotesTreeUiState(null);
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
    const rawKanbanColumns =
      (parsed as { kanbanColumns?: unknown[] }).kanbanColumns || [];
    const rawKanbanTasks =
      (parsed as { kanbanTasks?: unknown[] }).kanbanTasks || [];

    const normalized = rawNotes
      .map(normalizeRawNote)
      .filter((note): note is Note => note !== null);

    const normalizedFolders = rawFolders
      .map((folder) => {
        if (!folder || typeof folder !== "object") return null;
        const f = folder as Record<string, unknown>;
        if (typeof f.id !== "string" || typeof f.name !== "string") return null;
        return {
          id: f.id,
          name: f.name.trim() || "Без названия",
          parentId: typeof f.parentId === "string" ? f.parentId : null,
          coverPath: typeof f.coverPath === "string" ? f.coverPath : undefined,
          coverDataUrl:
            typeof f.coverDataUrl === "string" ? f.coverDataUrl : undefined,
        } as Folder;
      })
      .filter((folder): folder is Folder => folder !== null);

    const folderIds = new Set(normalizedFolders.map((folder) => folder.id));
    const sanitizedFolders = normalizedFolders.map((folder) => ({
      ...folder,
      parentId:
        folder.parentId &&
        folder.parentId !== folder.id &&
        folderIds.has(folder.parentId)
          ? folder.parentId
          : null,
    }));

    if (!normalized.length) {
      throw new Error("Invalid notes payload");
    }

    notes.value = sortByRecent(normalized);
    folders.value = sanitizedFolders;
    applyKanbanState(rawKanbanColumns, rawKanbanTasks);
    restoreNotesTreeUiState(null);
  } catch {
    const first = createEmptyNote();
    notes.value = [first];
    folders.value = [];
    kanbanColumns.value = createDefaultKanbanColumns();
    kanbanTasks.value = [];
    restoreNotesTreeUiState(null);
  }
};

const persistNotes = () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      notes: notes.value,
      folders: folders.value,
      kanbanColumns: kanbanColumns.value,
      kanbanTasks: kanbanTasks.value,
    }),
  );
};

// ── Kanban ────────────────────────────────────────────────────────────────────

const tasksInColumn = (columnId: string) =>
  kanbanTasks.value.filter((task) => task.columnId === columnId);

const openTextInputModal = (options: TextInputModalOptions) =>
  new Promise<string | null>((resolve) => {
    textInputModalTitle.value = options.title;
    textInputModalDescription.value = options.description || "";
    textInputModalPlaceholder.value = options.placeholder || "";
    textInputModalValue.value = options.initialValue || "";
    textInputModalConfirmLabel.value = options.confirmLabel || "Сохранить";
    textInputModalConfirmColor.value = options.confirmColor || "primary";
    textInputModalResolver.value = resolve;
    isTextInputModalOpen.value = true;
  });

const closeTextInputModal = (value: string | null) => {
  const resolver = textInputModalResolver.value;

  isTextInputModalOpen.value = false;
  textInputModalResolver.value = null;

  resolver?.(value);
};

const cancelTextInputModal = () => {
  closeTextInputModal(null);
};

const confirmTextInputModal = () => {
  closeTextInputModal(textInputModalValue.value);
};

const createKanbanColumn = async () => {
  const name = (
    await openTextInputModal({
      title: "Новая колонка",
      description: "Введите название новой колонки kanban.",
      placeholder: "Например: Бэклог",
      initialValue: "Новая колонка",
      confirmLabel: "Создать",
    })
  )?.trim();

  if (!name) return;

  const id = generateId();
  kanbanColumns.value.push({ id, name });
};

const renameKanbanColumn = async (columnId: string) => {
  const column = kanbanColumns.value.find((item) => item.id === columnId);
  if (!column) return;

  const name = (
    await openTextInputModal({
      title: "Переименовать колонку",
      placeholder: "Новое название",
      initialValue: column.name,
      confirmLabel: "Сохранить",
    })
  )?.trim();

  if (!name) return;

  column.name = name;
};

const deleteKanbanColumn = (columnId: string) => {
  const column = kanbanColumns.value.find((item) => item.id === columnId);
  if (!column) return;

  kanbanColumns.value = kanbanColumns.value.filter(
    (item) => item.id !== columnId,
  );
  kanbanTasks.value = kanbanTasks.value.filter(
    (task) => task.columnId !== columnId,
  );

  if (draftTask.value?.columnId === columnId) {
    draftTask.value = null;
  }

  ensureKanbanColumns();
};

const requestDeleteKanbanColumn = (columnId: string) => {
  pendingDeleteColumnId.value = columnId;
  isDeleteKanbanColumnModalOpen.value = true;
};

const cancelDeleteKanbanColumn = () => {
  isDeleteKanbanColumnModalOpen.value = false;
  pendingDeleteColumnId.value = null;
};

const confirmDeleteKanbanColumn = () => {
  const id = pendingDeleteColumnId.value;
  if (id) {
    deleteKanbanColumn(id);
  }

  cancelDeleteKanbanColumn();
};

const deleteKanbanTask = (taskId: string) => {
  kanbanTasks.value = kanbanTasks.value.filter((task) => task.id !== taskId);

  if (activeKanbanTaskId.value === taskId) {
    isKanbanTaskModalOpen.value = false;
    activeKanbanTaskId.value = null;
    draftKanbanComment.value = "";
  }
};

const requestDeleteKanbanTask = (taskId: string) => {
  pendingDeleteTaskId.value = taskId;
  isDeleteKanbanTaskModalOpen.value = true;
};

const cancelDeleteKanbanTask = () => {
  isDeleteKanbanTaskModalOpen.value = false;
  pendingDeleteTaskId.value = null;
};

const confirmDeleteKanbanTask = () => {
  const id = pendingDeleteTaskId.value;
  if (id) {
    deleteKanbanTask(id);
  }

  cancelDeleteKanbanTask();
};

const pendingDeleteColumn = computed(() =>
  kanbanColumns.value.find(
    (column) => column.id === pendingDeleteColumnId.value,
  ),
);

const pendingDeleteTask = computed(() =>
  kanbanTasks.value.find((task) => task.id === pendingDeleteTaskId.value),
);

const pendingDeleteFolder = computed(() =>
  folders.value.find((folder) => folder.id === pendingDeleteFolderId.value),
);

const pendingDeleteFolderHasNotes = computed(() =>
  notes.value.some((note) => note.folderId === pendingDeleteFolderId.value),
);

const openDraftTask = (columnId: string) => {
  draftTask.value = {
    columnId,
    title: "",
  };

  nextTick(() => {
    const selector = `[data-draft-input-for="${columnId}"]`;
    const input = document.querySelector<HTMLInputElement>(selector);

    input?.focus();

    requestAnimationFrame(() => {
      input?.focus();
    });
  });
};

const commitDraftTask = () => {
  if (!draftTask.value) return;

  const title = draftTask.value.title.trim();
  const columnId = draftTask.value.columnId;

  if (title) {
    kanbanTasks.value.push({
      id: generateId(),
      columnId,
      title,
      description: createEmptyKanbanTaskDescription(),
      comments: [],
    });
  }

  draftTask.value = null;
};

const cancelDraftTask = () => {
  draftTask.value = null;
};

const onColumnFreeAreaClick = (columnId: string, event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const interactive = target.closest(
    "button, input, textarea, [draggable='true']",
  );

  if (interactive) return;

  if (draftTask.value) {
    commitDraftTask();
  }

  openDraftTask(columnId);
};

const onTaskDragStart = (taskId: string) => {
  draggedTaskId.value = taskId;
  draggedColumnId.value = null;
};

const onTaskDragEnd = () => {
  draggedTaskId.value = null;
};

const onColumnDragStart = (columnId: string) => {
  draggedColumnId.value = columnId;
  draggedTaskId.value = null;
};

const onColumnDragEnd = () => {
  draggedColumnId.value = null;
};

const onColumnDrop = (targetColumnId: string) => {
  if (!draggedColumnId.value) return;

  const fromIndex = kanbanColumns.value.findIndex(
    (column) => column.id === draggedColumnId.value,
  );
  const toIndex = kanbanColumns.value.findIndex(
    (column) => column.id === targetColumnId,
  );

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    draggedColumnId.value = null;
    return;
  }

  const [moved] = kanbanColumns.value.splice(fromIndex, 1);
  if (!moved) {
    draggedColumnId.value = null;
    return;
  }

  kanbanColumns.value.splice(toIndex, 0, moved);
  draggedColumnId.value = null;
};

const onTaskDrop = (targetColumnId: string) => {
  if (!draggedTaskId.value) return;

  const task = kanbanTasks.value.find(
    (item) => item.id === draggedTaskId.value,
  );
  if (task) {
    task.columnId = targetColumnId;
  }

  draggedTaskId.value = null;
};

const activeKanbanTask = computed(
  () =>
    kanbanTasks.value.find((task) => task.id === activeKanbanTaskId.value) ||
    null,
);

const openKanbanTask = (taskId: string) => {
  const task = kanbanTasks.value.find((item) => item.id === taskId);
  if (!task) return;

  activeKanbanTaskId.value = taskId;
  isKanbanTaskEditMode.value = false;
  draftKanbanComment.value = "";
  isKanbanTaskModalOpen.value = true;
};

const addKanbanComment = () => {
  if (!isKanbanTaskEditMode.value) return;

  const task = activeKanbanTask.value;
  const text = draftKanbanComment.value.trim();
  if (!task || !text) return;

  task.comments.push({
    id: generateId(),
    text,
    createdAt: nowIso(),
  });
  draftKanbanComment.value = "";
  scheduleKanbanSave();
};

const kanbanTaskEditor = useEditor({
  content: createEmptyKanbanTaskDescription(),
  autofocus: false,
  editable: false,
  extensions: [
    StarterKit.configure({ codeBlock: false }),
    Underline,
    Placeholder.configure({
      placeholder: "Добавьте описание задачи...",
    }),
  ],
  editorProps: {
    attributes: {
      spellcheck: "true",
      class: "note-editor focus:outline-none",
    },
  },
  onUpdate: ({ editor }) => {
    const task = activeKanbanTask.value;
    if (!task || isApplyingKanbanTaskDescription.value) return;

    task.description = editor.getJSON();
    scheduleKanbanSave();
  },
});

watch(
  activeKanbanTask,
  (task) => {
    const taskEditor = kanbanTaskEditor.value;
    if (!taskEditor) return;

    isApplyingKanbanTaskDescription.value = true;
    taskEditor.commands.setContent(
      task?.description || createEmptyKanbanTaskDescription(),
      { emitUpdate: false },
    );
    isApplyingKanbanTaskDescription.value = false;
  },
  { immediate: true },
);

watch(isKanbanTaskModalOpen, (open) => {
  if (open) return;

  activeKanbanTaskId.value = null;
  isKanbanTaskEditMode.value = false;
  draftKanbanComment.value = "";
});

watch(isKanbanTaskEditMode, (canEdit) => {
  kanbanTaskEditor.value?.setEditable(canEdit);
});

// ── Notes ─────────────────────────────────────────────────────────────────────

const activeNote = computed(() =>
  notes.value.find((note) => note.id === activeNoteId.value),
);

const notesMeta = computed<Record<string, NoteMeta>>(() =>
  Object.fromEntries(
    notes.value.map((note) => [note.id, buildMeta(note.content)]),
  ),
);

const libraryActiveNote = computed(
  () =>
    notes.value.find((note) => note.id === libraryPreviewNoteId.value) || null,
);

const libraryActiveNoteTitle = computed(() =>
  libraryActiveNote.value ? noteTitle(libraryActiveNote.value) : "Просмотр",
);

const noteTitle = (note: Note) =>
  notesMeta.value[note.id]?.title || "Без названия";

type NotesTreeUiState = {
  activeNoteId: string | null;
  collapsedFolders: string[];
};

const notesTreeUiStateStorageKey = (targetVaultPath?: string | null) => {
  const scope = targetVaultPath ?? vaultPath.value;
  return scope
    ? `${NOTES_TREE_UI_STATE_KEY}:${scope}`
    : `${NOTES_TREE_UI_STATE_KEY}:local`;
};

const loadNotesTreeUiState = (
  targetVaultPath?: string | null,
): NotesTreeUiState | null => {
  const raw = localStorage.getItem(notesTreeUiStateStorageKey(targetVaultPath));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<NotesTreeUiState>;
    const activeId =
      typeof parsed.activeNoteId === "string" ? parsed.activeNoteId : null;
    const collapsed = Array.isArray(parsed.collapsedFolders)
      ? parsed.collapsedFolders.filter(
          (id): id is string => typeof id === "string" && !!id,
        )
      : [];

    return {
      activeNoteId: activeId,
      collapsedFolders: collapsed,
    };
  } catch {
    return null;
  }
};

const restoreNotesTreeUiState = (targetVaultPath?: string | null) => {
  const state = loadNotesTreeUiState(targetVaultPath);
  const noteIds = new Set(notes.value.map((note) => note.id));
  const folderIds = new Set(folders.value.map((folder) => folder.id));

  collapsedFolders.value = (state?.collapsedFolders || []).filter((id) =>
    folderIds.has(id),
  );

  const preferredActiveId = state?.activeNoteId;
  if (preferredActiveId && noteIds.has(preferredActiveId)) {
    activeNoteId.value = preferredActiveId;
    return;
  }

  activeNoteId.value = notes.value[0]?.id ?? null;
};

const persistNotesTreeUiState = () => {
  localStorage.setItem(
    notesTreeUiStateStorageKey(),
    JSON.stringify({
      activeNoteId: activeNoteId.value,
      collapsedFolders: [...new Set(collapsedFolders.value)],
    } satisfies NotesTreeUiState),
  );
};

const normalizeWikiTitle = (value: string) => value.trim().toLowerCase();

const parseNoteLinks = (
  noteId: string,
  plainText: string,
): ParsedWikiLink[] => {
  const cached = wikiLinksCache.value.get(noteId);
  if (cached?.plain === plainText) {
    return cached.links;
  }

  const links = parseWikiLinks(plainText);
  wikiLinksCache.value.set(noteId, { plain: plainText, links });
  return links;
};

const noteTitlesById = computed<Record<string, string>>(() =>
  Object.fromEntries(notes.value.map((note) => [note.id, noteTitle(note)])),
);

const noteExtractedLinks = computed<Record<string, ParsedWikiLink[]>>(() => {
  const next: Record<string, ParsedWikiLink[]> = {};
  const validIds = new Set(notes.value.map((note) => note.id));

  for (const [cachedId] of wikiLinksCache.value) {
    if (!validIds.has(cachedId)) {
      wikiLinksCache.value.delete(cachedId);
    }
  }

  for (const note of notes.value) {
    const plain = notesMeta.value[note.id]?.plain || "";
    next[note.id] = parseNoteLinks(note.id, plain);
  }

  return next;
});

const graphBase = computed(() => {
  const nodesById = new Map<string, GraphNode>();
  const titleToNoteId = new Map<string, string>();

  for (const note of notes.value) {
    const title = noteTitle(note);
    const normalized = normalizeWikiTitle(title);
    if (normalized && !titleToNoteId.has(normalized)) {
      titleToNoteId.set(normalized, note.id);
    }

    nodesById.set(note.id, {
      id: note.id,
      label: title,
      folderId: note.folderId,
      isPlaceholder: false,
      incomingCount: 0,
      outgoingCount: 0,
    });
  }

  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();
  const placeholderByNormalizedTitle = new Map<string, string>();
  const incomingById = new Map<string, Set<string>>();
  const outgoingById = new Map<string, Set<string>>();

  for (const note of notes.value) {
    const sourceNode = nodesById.get(note.id);
    if (!sourceNode) continue;

    for (const link of noteExtractedLinks.value[note.id] || []) {
      const normalizedTarget = normalizeWikiTitle(link.targetTitle);
      if (!normalizedTarget) continue;

      let targetId = titleToNoteId.get(normalizedTarget);

      if (!targetId) {
        targetId = placeholderByNormalizedTitle.get(normalizedTarget);

        if (!targetId) {
          targetId = `placeholder:${normalizedTarget}`;
          placeholderByNormalizedTitle.set(normalizedTarget, targetId);
          nodesById.set(targetId, {
            id: targetId,
            label: link.targetTitle,
            folderId: null,
            isPlaceholder: true,
            incomingCount: 0,
            outgoingCount: 0,
          });
        }
      }

      if (!targetId || targetId === note.id) continue;

      const edgeId = `${note.id}->${targetId}`;
      if (seenEdges.has(edgeId)) continue;
      seenEdges.add(edgeId);

      edges.push({
        id: edgeId,
        sourceNoteId: note.id,
        targetNoteId: targetId,
        type: "internal_link",
      });

      sourceNode.outgoingCount += 1;

      const targetNode = nodesById.get(targetId);
      if (targetNode) {
        targetNode.incomingCount += 1;
      }

      if (!outgoingById.has(note.id)) {
        outgoingById.set(note.id, new Set());
      }
      outgoingById.get(note.id)!.add(targetId);

      if (!incomingById.has(targetId)) {
        incomingById.set(targetId, new Set());
      }
      incomingById.get(targetId)!.add(note.id);
    }
  }

  const nodes = Array.from(nodesById.values()).sort((a, b) => {
    if (a.isPlaceholder !== b.isPlaceholder) {
      return a.isPlaceholder ? 1 : -1;
    }
    return a.label.localeCompare(b.label, "ru");
  });

  return {
    nodes,
    edges,
    incomingById,
    outgoingById,
  };
});

const graphVisibleNodeIds = computed(() => {
  const allIds = new Set(graphBase.value.nodes.map((node) => node.id));
  const activeId = activeNoteId.value;

  if (graphMode.value === "local" && activeId && allIds.has(activeId)) {
    const visible = new Set<string>([activeId]);

    for (const toId of graphBase.value.outgoingById.get(activeId) || []) {
      visible.add(toId);
    }

    for (const fromId of graphBase.value.incomingById.get(activeId) || []) {
      visible.add(fromId);
    }

    return visible;
  }

  return allIds;
});

const graphNodes = computed<GraphNode[]>(() => {
  const query = graphSearchQuery.value.trim().toLowerCase();
  const visible = graphVisibleNodeIds.value;

  return graphBase.value.nodes.filter((node) => {
    if (!visible.has(node.id)) return false;
    if (!query) return true;
    return node.label.toLowerCase().includes(query);
  });
});

const graphNodeIds = computed(
  () => new Set(graphNodes.value.map((node) => node.id)),
);

const graphEdges = computed<GraphEdge[]>(() =>
  graphBase.value.edges.filter(
    (edge) =>
      graphNodeIds.value.has(edge.sourceNoteId) &&
      graphNodeIds.value.has(edge.targetNoteId),
  ),
);

const activeGraphOutgoing = computed(() => {
  const activeId = activeNoteId.value;
  if (!activeId) return [];

  return Array.from(graphBase.value.outgoingById.get(activeId) || []).filter(
    (id) => graphNodeIds.value.has(id),
  );
});

const activeGraphIncoming = computed(() => {
  const activeId = activeNoteId.value;
  if (!activeId) return [];

  return Array.from(graphBase.value.incomingById.get(activeId) || []).filter(
    (id) => graphNodeIds.value.has(id),
  );
});

const onGraphNodeClick = (noteId: string) => {
  if (noteId.startsWith("placeholder:")) return;
  if (!notes.value.some((note) => note.id === noteId)) return;
  leftPanel.value = "notes";
  openNote(noteId);
};

watch(
  noteTitlesById,
  (next, previous) => {
    if (isApplyingRenameSafeLinks.value) return;

    const previousEntries = Object.entries(previous || {});
    if (!previousEntries.length) return;

    const renamedPairs = previousEntries
      .map(([noteId, previousTitle]) => {
        const nextTitle = next[noteId];
        if (!nextTitle) return null;

        const prevNormalized = normalizeWikiTitle(previousTitle);
        const nextNormalized = normalizeWikiTitle(nextTitle);

        if (
          !prevNormalized ||
          !nextNormalized ||
          prevNormalized === nextNormalized
        ) {
          return null;
        }

        return {
          fromTitle: previousTitle,
          toTitle: nextTitle,
        };
      })
      .filter(
        (
          pair,
        ): pair is {
          fromTitle: string;
          toTitle: string;
        } => pair !== null,
      );

    if (!renamedPairs.length) return;

    isApplyingRenameSafeLinks.value = true;

    for (const note of notes.value) {
      let nextDoc = note.content;
      let changed = false;

      for (const pair of renamedPairs) {
        const result = rewriteWikiLinksInDoc(
          nextDoc,
          pair.fromTitle,
          pair.toTitle,
        );
        if (result.changed) {
          nextDoc = result.doc;
          changed = true;
        }
      }

      if (!changed) continue;

      note.content = nextDoc;
      note.updatedAt = nowIso();

      if (note.id === activeNoteId.value && editor.value) {
        isApplyingContent.value = true;
        editor.value.commands.setContent(nextDoc, { emitUpdate: false });
        isApplyingContent.value = false;
      }

      if (vaultPath.value) {
        scheduleVaultSave(note);
      }
    }

    isApplyingRenameSafeLinks.value = false;
  },
  { deep: false },
);

const noteRelationSuggestions = computed(() => {
  const query = noteRelationQuery.value.trim().toLowerCase();

  if (!query) {
    return notes.value.slice(0, 12);
  }

  return notes.value
    .filter((note) => {
      const meta = notesMeta.value[note.id];
      return (meta?.plain || "").toLowerCase().includes(query);
    })
    .slice(0, 12);
});

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

const visibleFolders = computed<VisibleFolder[]>(() => {
  const byParent = new Map<string | null, Folder[]>();

  for (const folder of folders.value) {
    const parentId = folder.parentId;
    const siblings = byParent.get(parentId) || [];
    siblings.push(folder);
    byParent.set(parentId, siblings);
  }

  const result: VisibleFolder[] = [];

  const walk = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId) || [];

    for (const folder of children) {
      result.push({ folder, depth });

      if (!isFolderCollapsed(folder.id)) {
        walk(folder.id, depth + 1);
      }
    }
  };

  walk(null, 0);

  return result;
});

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
  openNote(note.id);

  // Save to vault immediately
  if (vaultPath.value) {
    void saveNoteToVault(note);
  }
};

const createLinkedNoteByTitle = (title: string): Note => {
  const note: Note = {
    id: generateId(),
    folderId: activeNote.value?.folderId ?? null,
    content: createDocFromText(title),
    updatedAt: nowIso(),
  };

  notes.value.unshift(note);

  if (vaultPath.value) {
    void saveNoteToVault(note);
  }

  return note;
};

const createFolder = async (parentId: string | null = null) => {
  const isNested = !!parentId;

  const name = (
    await openTextInputModal({
      title: isNested ? "Новая подпапка" : "Новая папка",
      description: isNested ? "" : "Введите название папки для заметок.",
      placeholder: "Например: Идеи",
      initialValue: "",
      confirmLabel: "Создать",
    })
  )?.trim();

  if (!name) return;

  const id = generateId();
  folders.value.unshift({
    id,
    name,
    parentId,
    coverPath: undefined,
    coverDataUrl: undefined,
  });
  collapsedFolders.value = collapsedFolders.value.filter(
    (folderId) => folderId !== id,
  );

  if (parentId) {
    collapsedFolders.value = collapsedFolders.value.filter(
      (folderId) => folderId !== parentId,
    );
  }
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

const requestDeleteFolder = (folderId: string) => {
  pendingDeleteFolderId.value = folderId;
  isDeleteFolderModalOpen.value = true;
};

const cancelDeleteFolder = () => {
  isDeleteFolderModalOpen.value = false;
  pendingDeleteFolderId.value = null;
};

const deleteFolder = (folderId: string) => {
  const targetFolder = folders.value.find((folder) => folder.id === folderId);
  if (!targetFolder) return;

  const targetParentId = targetFolder.parentId;

  notes.value = notes.value.map((note) =>
    note.folderId === folderId ? { ...note, folderId: targetParentId } : note,
  );
  folders.value = folders.value
    .map((folder) =>
      folder.parentId === folderId
        ? { ...folder, parentId: targetParentId }
        : folder,
    )
    .filter((folder) => folder.id !== folderId);
  collapsedFolders.value = collapsedFolders.value.filter(
    (id) => id !== folderId,
  );
};

const confirmDeleteFolder = () => {
  const id = pendingDeleteFolderId.value;
  if (id) {
    deleteFolder(id);
  }

  cancelDeleteFolder();
};

const renameFolder = async (folderId: string) => {
  const targetFolder = folders.value.find((folder) => folder.id === folderId);
  if (!targetFolder) return;

  const nextName = (
    await openTextInputModal({
      title: "Переименовать папку",
      placeholder: "Новое название папки",
      initialValue: targetFolder.name,
      confirmLabel: "Сохранить",
    })
  )?.trim();

  if (!nextName) return;

  targetFolder.name = nextName;
};

const setFolderCover = async (folderId: string) => {
  const folder = folders.value.find((item) => item.id === folderId);
  if (!folder) return;

  if (!isElectron()) return;

  const selected = await window.electronAPI!.selectFiles();
  if (!selected.length) return;

  const selectedPath = selected[0];
  if (!selectedPath) return;

  if (vaultPath.value) {
    const imported = await window.electronAPI!.importCoverImage(
      vaultPath.value,
      selectedPath,
    );

    if (!imported.ok || !imported.relativePath) return;

    folder.coverPath = imported.relativePath;
    if (imported.dataUrl) {
      folder.coverDataUrl = imported.dataUrl;
    }

    void saveFoldersToVault();
    return;
  }

  const previewResult =
    await window.electronAPI!.readImageAsDataUrl(selectedPath);

  folder.coverPath = selectedPath;
  if (previewResult.ok && previewResult.dataUrl) {
    folder.coverDataUrl = previewResult.dataUrl;
  }

  if (vaultPath.value) {
    void saveFoldersToVault();
  }
};

const toFileUrl = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, "/");
  return encodeURI(`file://${normalized}`);
};

const isAbsoluteFilePath = (value: string) =>
  value.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(value);

const absolutePathFromVault = (basePath: string, relativePath: string) => {
  const cleanBase = basePath.replace(/[\\/]+$/, "");
  const cleanRelative = relativePath.replace(/^[\\/]+/, "");
  return `${cleanBase}/${cleanRelative}`;
};

const resolveCoverImageUrl = (folder: Folder): string => {
  if (folder.coverDataUrl) return folder.coverDataUrl;
  if (!folder.coverPath) return "";

  if (isAbsoluteFilePath(folder.coverPath)) {
    return toFileUrl(folder.coverPath);
  }

  if (!vaultPath.value) return "";
  return toFileUrl(absolutePathFromVault(vaultPath.value, folder.coverPath));
};

const folderCoverStyle = (folder: Folder): Record<string, string> => {
  const imageUrl = resolveCoverImageUrl(folder);
  if (!imageUrl) return {};

  return {
    backgroundImage: `url("${imageUrl}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
};

const openLibraryNote = (noteId: string) => {
  const note = notes.value.find((item) => item.id === noteId);
  const previewEditor = libraryPreviewEditor.value;
  if (!note || !previewEditor) return;

  libraryPreviewNoteId.value = noteId;
  previewEditor.commands.setContent(note.content, {
    emitUpdate: false,
  });
  isLibraryNoteModalOpen.value = true;
};

const deleteActiveNote = async () => {
  if (!activeNote.value) return;

  const note = activeNote.value;

  // Delete from vault
  if (vaultPath.value) {
    await deleteNoteFromVault(note);
  }

  notes.value = notes.value.filter((n) => n.id !== note.id);

  if (!notes.value.length) {
    const fallback = createEmptyNote();
    notes.value = [fallback];
    activeNoteId.value = fallback.id;
    return;
  }

  activeNoteId.value = notes.value[0]?.id ?? null;
};

const requestDeleteNote = (noteId: string) => {
  activeNoteId.value = noteId;
  isDeleteModalOpen.value = true;
};

const confirmDelete = () => {
  void deleteActiveNote();
  isDeleteModalOpen.value = false;
};

// ── Editor ────────────────────────────────────────────────────────────────────

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
    handleClickOn: (_view, _pos, node, _nodePos, event) => {
      if (node.type.name !== "noteFile") return false;

      const filePath = String((node.attrs as { path?: unknown }).path || "");
      if (!filePath || !isElectron()) return false;

      event.preventDefault();
      void window.electronAPI!.openFilePath(filePath);
      return true;
    },
    attributes: {
      spellcheck: "true",
      class: "note-editor focus:outline-none",
    },
  },
  onUpdate: ({ editor }) => {
    if (!activeNote.value || isApplyingContent.value) return;
    activeNote.value.content = editor.getJSON();
    touchActiveNote();

    // Debounced vault save
    scheduleVaultSave(activeNote.value);
  },
});

const libraryPreviewEditor = useEditor({
  content: createEmptyDoc(),
  editable: false,
  extensions: [
    NoteImage,
    NotePdf,
    NoteFile,
    StarterKit.configure({ codeBlock: false }),
    Underline,
    Link.configure({
      openOnClick: true,
      defaultProtocol: "https",
      autolink: true,
    }),
    CodeBlockLowlight.configure({ lowlight }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  editorProps: {
    handleClickOn: (_view, _pos, node, _nodePos, event) => {
      if (node.type.name !== "noteFile") return false;

      const filePath = String((node.attrs as { path?: unknown }).path || "");
      if (!filePath || !isElectron()) return false;

      event.preventDefault();
      void window.electronAPI!.openFilePath(filePath);
      return true;
    },
    attributes: {
      spellcheck: "true",
      class: "note-editor focus:outline-none",
    },
  },
});

// Debounce vault saves to avoid hammering the filesystem on every keystroke
let vaultSaveTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleVaultSave = (note: Note) => {
  if (!vaultPath.value) return;
  if (vaultSaveTimer) clearTimeout(vaultSaveTimer);
  vaultSaveTimer = setTimeout(() => {
    void saveNoteToVault(note);
    vaultSaveTimer = null;
  }, 800);
};

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

// ── Editor actions ────────────────────────────────────────────────────────────

const setLink = async () => {
  if (!editor.value) return;

  const url = await openTextInputModal({
    title: "Вставить ссылку",
    description:
      "Введите полный URL (например, https://example.com). Оставьте пустым, чтобы убрать ссылку.",
    placeholder: "https://",
    initialValue: "https://",
    confirmLabel: "Применить",
  });

  if (url === null) return;

  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    editor.value.chain().focus().unsetLink().run();
    return;
  }

  editor.value.chain().focus().setLink({ href: normalizedUrl }).run();
};

const insertNoteRelation = async () => {
  if (!editor.value) return;
  noteRelationQuery.value = "";
  isNoteRelationModalOpen.value = true;
};

const applyNoteRelation = (value: string) => {
  const currentEditor = editor.value;
  if (!currentEditor) return;

  const normalizedInput = value
    .trim()
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .trim();
  if (!normalizedInput) return;

  let targetNote = notes.value.find(
    (note) =>
      normalizeWikiTitle(noteTitle(note)) ===
      normalizeWikiTitle(normalizedInput),
  );

  if (!targetNote) {
    targetNote = createLinkedNoteByTitle(normalizedInput);
  }

  const targetTitle = noteTitle(targetNote);

  currentEditor.chain().focus().insertContent(`[[${targetTitle}]]`).run();
  isNoteRelationModalOpen.value = false;
};

const selectNoteRelation = (noteId: string) => {
  const note = notes.value.find((item) => item.id === noteId);
  if (!note) return;

  applyNoteRelation(noteTitle(note));
};

const confirmNoteRelation = () => {
  if (!noteRelationQuery.value.trim()) return;

  const exact = notes.value.find(
    (note) =>
      normalizeWikiTitle(noteTitle(note)) ===
      normalizeWikiTitle(noteRelationQuery.value),
  );

  if (exact) {
    applyNoteRelation(noteTitle(exact));
    return;
  }

  const firstSuggestion = noteRelationSuggestions.value[0];
  if (firstSuggestion) {
    applyNoteRelation(noteTitle(firstSuggestion));
    return;
  }

  applyNoteRelation(noteRelationQuery.value);
};

const clearFormatting = () => {
  editor.value?.chain().focus().clearNodes().unsetAllMarks().run();
};

const toggleBold = () => {
  editor.value?.chain().focus().toggleBold().run();
};

const toggleItalic = () => {
  editor.value?.chain().focus().toggleItalic().run();
};

const toggleUnderline = () => {
  editor.value?.chain().focus().toggleUnderline().run();
};

const toggleCode = () => {
  editor.value?.chain().focus().toggleCode().run();
};

const toggleCodeBlock = () => {
  editor.value?.chain().focus().toggleCodeBlock().run();
};

const toggleBulletList = () => {
  editor.value?.chain().focus().toggleBulletList().run();
};

const toggleOrderedList = () => {
  editor.value?.chain().focus().toggleOrderedList().run();
};

const toggleBlockquote = () => {
  editor.value?.chain().focus().toggleBlockquote().run();
};

const toggleHeadingLevel2 = () => {
  editor.value?.chain().focus().toggleHeading({ level: 2 }).run();
};

const closeTextContextMenu = () => {
  isTextContextMenuOpen.value = false;
};

const closeNotesContextMenu = () => {
  isNotesContextMenuOpen.value = false;
};

const updateTextContextMenuPosition = (x: number, y: number) => {
  const menuWidth = textContextMenuRef.value?.offsetWidth ?? 240;
  const menuHeight = textContextMenuRef.value?.offsetHeight ?? 320;
  const horizontalOffset = 8;
  const verticalOffset = 8;

  textContextMenuX.value = Math.max(
    horizontalOffset,
    Math.min(x, window.innerWidth - menuWidth - horizontalOffset),
  );
  textContextMenuY.value = Math.max(
    verticalOffset,
    Math.min(y, window.innerHeight - menuHeight - verticalOffset),
  );
};

const updateNotesContextMenuPosition = (x: number, y: number) => {
  const menuWidth = notesContextMenuRef.value?.offsetWidth ?? 200;
  const menuHeight = notesContextMenuRef.value?.offsetHeight ?? 120;
  const horizontalOffset = 8;
  const verticalOffset = 8;

  notesContextMenuX.value = Math.max(
    horizontalOffset,
    Math.min(x, window.innerWidth - menuWidth - horizontalOffset),
  );
  notesContextMenuY.value = Math.max(
    verticalOffset,
    Math.min(y, window.innerHeight - menuHeight - verticalOffset),
  );
};

const onEditorContextMenu = (event: MouseEvent) => {
  const currentEditor = editor.value;
  if (!currentEditor || !activeNote.value) return;

  event.preventDefault();

  const { from, to } = currentEditor.state.selection;
  if (from === to) {
    closeTextContextMenu();
    return;
  }

  closeNotesContextMenu();
  updateTextContextMenuPosition(event.clientX, event.clientY);
  isTextContextMenuOpen.value = true;

  nextTick(() => {
    updateTextContextMenuPosition(event.clientX, event.clientY);
  });
};

const onNotesListContextMenu = (event: MouseEvent) => {
  event.preventDefault();

  closeTextContextMenu();
  updateNotesContextMenuPosition(event.clientX, event.clientY);
  isNotesContextMenuOpen.value = true;

  nextTick(() => {
    updateNotesContextMenuPosition(event.clientX, event.clientY);
  });
};

const runTextContextAction = async (action: () => void | Promise<void>) => {
  await action();
  closeTextContextMenu();
};

const runNotesContextAction = async (action: () => void | Promise<void>) => {
  await action();
  closeNotesContextMenu();
};

const handleGlobalPointerDown = (event: PointerEvent) => {
  const target = event.target as globalThis.Node | null;
  if (!target) return;

  if (
    isTextContextMenuOpen.value &&
    textContextMenuRef.value?.contains(target)
  ) {
    return;
  }

  if (
    isNotesContextMenuOpen.value &&
    notesContextMenuRef.value?.contains(target)
  ) {
    return;
  }

  closeTextContextMenu();
  closeNotesContextMenu();
};

const handleGlobalEscape = (event: KeyboardEvent) => {
  if (capturingHotkeyAction.value) {
    event.preventDefault();

    if (event.key === "Escape") {
      capturingHotkeyAction.value = null;
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      assignHotkey(capturingHotkeyAction.value, "");
      capturingHotkeyAction.value = null;
      return;
    }

    const captured = hotkeyFromKeyboardEvent(event);
    if (!captured) return;

    assignHotkey(capturingHotkeyAction.value, captured);
    capturingHotkeyAction.value = null;
    return;
  }

  const pressedHotkey = hotkeyFromKeyboardEvent(event);
  if (pressedHotkey && editor.value?.isFocused) {
    const matchedAction = HOTKEY_ACTIONS.find(
      (action) =>
        normalizeHotkeyString(hotkeys.value[action]) === pressedHotkey,
    );

    if (matchedAction) {
      event.preventDefault();
      runHotkeyAction(matchedAction);
      return;
    }
  }

  if (event.key !== "Escape") return;

  closeTextContextMenu();
  closeNotesContextMenu();
};

const handleWindowBeforeUnload = () => {
  persistNotesTreeUiState();
  flushKanbanSaveSync();
};

const triggerFilePicker = () => {
  if (!isElectron()) {
    fileInputRef.value?.click();
    return;
  }

  void (async () => {
    const selectedPaths = await window.electronAPI!.selectFiles();
    if (!selectedPaths.length) return;
    await handleFilesFromPaths(selectedPaths);
  })();
};

const basenameFromPath = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || "Файл";
};

const mimeByExtension: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  pdf: "application/pdf",
};

const mimeFromFileName = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return mimeByExtension[ext] || "application/octet-stream";
};

const insertLinkedFile = async (
  filePath: string,
  fileName?: string,
  mime?: string,
) => {
  if (!editor.value) return;

  const normalizedPath = filePath.trim();
  if (!normalizedPath) return;

  const resolvedName = fileName || basenameFromPath(normalizedPath);
  const resolvedMime = mime || mimeFromFileName(resolvedName);

  editor.value
    .chain()
    .focus()
    .insertContent({
      type: "noteFile",
      attrs: {
        path: normalizedPath,
        filename: resolvedName,
        mime: resolvedMime,
      },
    })
    .run();
};

const handleFilesUpload = async (files: File[]) => {
  for (const file of files) {
    const filePath = String(
      (file as File & { path?: string }).path || "",
    ).trim();
    if (!filePath) continue;

    await insertLinkedFile(
      filePath,
      file.name || basenameFromPath(filePath),
      file.type || undefined,
    );
  }
};

const handleFilesFromPaths = async (filePaths: string[]) => {
  for (const filePath of filePaths) {
    await insertLinkedFile(filePath);
  }
};

const onFileInputChange = async (event: Event) => {
  const input = event.target as HTMLInputElement | null;
  const fileList = input?.files;
  if (!fileList?.length) return;

  const files = Array.from(fileList);
  const paths = files
    .map((file) => String((file as File & { path?: string }).path || "").trim())
    .filter(Boolean);

  if (paths.length) {
    await handleFilesFromPaths(paths);
  }

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

const deleteTable = () => {
  editor.value?.chain().focus().deleteTable().run();
};

const syncSpellcheckToEditors = () => {
  const spellcheckValue = isSpellcheckEnabled.value ? "true" : "false";

  editor.value?.view.dom.setAttribute("spellcheck", spellcheckValue);
  libraryPreviewEditor.value?.view.dom.setAttribute(
    "spellcheck",
    spellcheckValue,
  );
};

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  const isAccentColor = (value: string): value is AccentColor =>
    accentOptions.some((option) => option.value === value);

  if (isElectron()) {
    const uiSettings = await window.electronAPI!.getUiSettings();
    const savedTheme =
      typeof uiSettings?.theme === "string" ? uiSettings.theme : "";
    const savedAccent =
      typeof uiSettings?.accent === "string" ? uiSettings.accent : "";

    if (savedTheme && isThemePreference(savedTheme)) {
      colorMode.preference = savedTheme;
    }

    if (savedAccent === "sky") {
      setAccentColor("orange", { persist: false });
    } else if (savedAccent && isAccentColor(savedAccent)) {
      setAccentColor(savedAccent, { persist: false });
    }
  } else {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const savedAccent = localStorage.getItem(ACCENT_STORAGE_KEY);

    if (savedTheme && isThemePreference(savedTheme)) {
      colorMode.preference = savedTheme;
    }

    if (savedAccent === "sky") {
      setAccentColor("orange", { persist: false });
    } else if (savedAccent && isAccentColor(savedAccent)) {
      setAccentColor(savedAccent, { persist: false });
    }
  }

  const savedNotesListWidth = Number(
    localStorage.getItem(NOTES_LIST_WIDTH_STORAGE_KEY),
  );

  const savedSpellcheck = localStorage.getItem(SPELLCHECK_STORAGE_KEY);
  if (savedSpellcheck === "true" || savedSpellcheck === "false") {
    isSpellcheckEnabled.value = savedSpellcheck === "true";
  }

  const savedHotkeysRaw = localStorage.getItem(HOTKEYS_STORAGE_KEY);
  if (savedHotkeysRaw) {
    try {
      const parsed = JSON.parse(savedHotkeysRaw) as Partial<
        Record<HotkeyAction, string>
      >;
      const nextHotkeys: Record<HotkeyAction, string> = { ...DEFAULT_HOTKEYS };

      for (const action of HOTKEY_ACTIONS) {
        if (typeof parsed[action] === "string") {
          nextHotkeys[action] = normalizeHotkeyString(parsed[action] || "");
        }
      }

      hotkeys.value = nextHotkeys;
    } catch {
      hotkeys.value = { ...DEFAULT_HOTKEYS };
    }
  }

  const savedGraphSettingsRaw = localStorage.getItem(
    GRAPH_SETTINGS_STORAGE_KEY,
  );
  if (savedGraphSettingsRaw) {
    try {
      const parsed = JSON.parse(savedGraphSettingsRaw) as Partial<{
        mode: GraphDisplayMode;
        searchQuery: string;
        labelsMode: GraphLabelsMode;
        repulsionStrength: number;
        linkStrength: number;
        edgeRigidity: number;
        nodeSize: number;
        labelFontSize: number;
        showDirection: boolean;
      }>;

      if (parsed.mode === "global" || parsed.mode === "local") {
        graphMode.value = parsed.mode;
      }

      if (typeof parsed.searchQuery === "string") {
        graphSearchQuery.value = parsed.searchQuery;
      }

      if (
        parsed.labelsMode === "all" ||
        parsed.labelsMode === "active" ||
        parsed.labelsMode === "hover"
      ) {
        graphLabelsMode.value = parsed.labelsMode;
      }

      if (typeof parsed.repulsionStrength === "number") {
        graphRepulsionStrength.value = clamp(
          parsed.repulsionStrength,
          200,
          3000,
        );
      }

      if (typeof parsed.linkStrength === "number") {
        graphLinkStrength.value = clamp(parsed.linkStrength, 0.01, 0.25);
      }

      if (typeof parsed.edgeRigidity === "number") {
        graphEdgeRigidity.value = clamp(parsed.edgeRigidity, 0.2, 3);
      }

      if (typeof parsed.nodeSize === "number") {
        graphNodeSize.value = clamp(parsed.nodeSize, 3, 12);
      }

      if (typeof parsed.labelFontSize === "number") {
        graphLabelFontSize.value = clamp(parsed.labelFontSize, 8, 20);
      }

      if (typeof parsed.showDirection === "boolean") {
        graphShowDirection.value = parsed.showDirection;
      }
    } catch {
      // ignore invalid saved graph settings
    }
  }

  if (Number.isFinite(savedNotesListWidth) && savedNotesListWidth > 0) {
    notesListWidth.value = savedNotesListWidth;
  }

  loadNotes();

  nextTick(() => {
    syncNotesListWidthToViewport();
    syncSpellcheckToEditors();
  });

  window.addEventListener("resize", syncNotesListWidthToViewport);
  window.addEventListener("pointerdown", handleGlobalPointerDown, true);
  window.addEventListener("keydown", handleGlobalEscape);
  window.addEventListener("beforeunload", handleWindowBeforeUnload);

  // Restore vault path from Electron store
  if (isElectron()) {
    const savedVault = await window.electronAPI!.getVaultPath();
    if (savedVault) {
      vaultPath.value = savedVault;
      await loadVaultFiles(savedVault);
      await refreshVaultSize();
    }
  }
});

onBeforeUnmount(() => {
  stopNotesResize();
  window.removeEventListener("resize", syncNotesListWidthToViewport);
  window.removeEventListener("pointerdown", handleGlobalPointerDown, true);
  window.removeEventListener("keydown", handleGlobalEscape);
  window.removeEventListener("beforeunload", handleWindowBeforeUnload);

  if (vaultSaveTimer) {
    clearTimeout(vaultSaveTimer);
    vaultSaveTimer = null;
    if (activeNote.value) {
      void saveNoteToVault(activeNote.value);
    }
  }

  flushKanbanSaveSync();
  void saveFoldersToVault();

  editor.value?.destroy();
  libraryPreviewEditor.value?.destroy();
});

watch(notes, persistNotes, { deep: true });
watch([activeNoteId, collapsedFolders, vaultPath], () => {
  persistNotesTreeUiState();
});
watch(
  folders,
  () => {
    persistNotes();
    scheduleFoldersSave();
  },
  { deep: true },
);
watch(
  kanbanColumns,
  () => {
    persistNotes();
    scheduleKanbanSave();
  },
  { deep: true },
);
watch(
  kanbanTasks,
  () => {
    persistNotes();
    scheduleKanbanSave();
  },
  { deep: true },
);
watch(isTextInputModalOpen, (open) => {
  if (!open) return;

  nextTick(() => {
    textInputRef.value?.focus();
  });
});

watch(isNoteRelationModalOpen, (open) => {
  if (!open) return;

  nextTick(() => {
    noteRelationInputRef.value?.focus();
  });
});

watch(isLibraryNoteModalOpen, (open) => {
  if (open) return;
  libraryPreviewNoteId.value = null;
});

watch(isSpellcheckEnabled, (enabled) => {
  localStorage.setItem(SPELLCHECK_STORAGE_KEY, enabled ? "true" : "false");
  syncSpellcheckToEditors();
});

watch(
  hotkeys,
  (value) => {
    localStorage.setItem(HOTKEYS_STORAGE_KEY, JSON.stringify(value));
  },
  { deep: true },
);

watch(isSettingsModalOpen, (open) => {
  if (open) return;
  capturingHotkeyAction.value = null;
});

watch(
  [
    graphMode,
    graphSearchQuery,
    graphLabelsMode,
    graphRepulsionStrength,
    graphLinkStrength,
    graphEdgeRigidity,
    graphNodeSize,
    graphLabelFontSize,
    graphShowDirection,
  ],
  () => {
    localStorage.setItem(
      GRAPH_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        mode: graphMode.value,
        searchQuery: graphSearchQuery.value,
        labelsMode: graphLabelsMode.value,
        repulsionStrength: graphRepulsionStrength.value,
        linkStrength: graphLinkStrength.value,
        edgeRigidity: graphEdgeRigidity.value,
        nodeSize: graphNodeSize.value,
        labelFontSize: graphLabelFontSize.value,
        showDirection: graphShowDirection.value,
      }),
    );
  },
);

watch(leftPanel, (panel) => {
  if (!isMobileViewport.value) return;
  if (panel === "notes") {
    mobileNotesView.value = "list";
  }
});
</script>
