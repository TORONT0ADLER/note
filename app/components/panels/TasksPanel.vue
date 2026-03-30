<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-semibold">Задачи · Kanban</h2>

        <UButton
          size="xs"
          color="primary"
          variant="soft"
          icon="i-lucide-columns-3"
          @click="createKanbanColumn"
        >
          Добавить колонку
        </UButton>
      </div>
    </template>

    <div
      class="overflow-x-auto overflow-y-auto pb-1 lg:max-h-[calc(100vh-13rem)]"
    >
      <div class="flex min-h-[65vh] gap-3">
        <div
          v-for="column in kanbanColumns"
          :key="column.id"
          class="group w-[18rem] shrink-0 rounded-lg border border-default bg-muted/20 p-3"
          @dragover.prevent
          @drop="
            onColumnDrop(column.id);
            onTaskDrop(column.id);
          "
          @click="onColumnFreeAreaClick(column.id, $event)"
        >
          <div
            class="mb-3 flex items-start justify-between gap-2"
            draggable="true"
            @dragstart="onColumnDragStart(column.id)"
            @dragend="onColumnDragEnd"
          >
            <div>
              <p class="text-sm font-semibold text-highlighted">
                {{ column.name }}
              </p>
              <p class="text-xs text-muted">
                {{ tasksInColumn(column.id).length }} задач
              </p>
            </div>

            <div
              class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <UButton
                size="xs"
                color="neutral"
                variant="ghost"
                icon="i-lucide-pencil"
                aria-label="Переименовать колонку"
                @click.stop="renameKanbanColumn(column.id)"
              />
              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                aria-label="Удалить колонку"
                @click.stop="requestDeleteKanbanColumn(column.id)"
              />
            </div>
          </div>

          <div class="space-y-2">
            <div
              v-for="task in tasksInColumn(column.id)"
              :key="task.id"
              draggable="true"
              class="group/task cursor-grab rounded-md border border-default bg-default p-3 active:cursor-grabbing"
              @pointerdown.stop
              @click.stop="openKanbanTask(task.id)"
              @dragstart="onTaskDragStart(task.id)"
              @dragend="onTaskDragEnd"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-medium text-highlighted">
                  {{ task.title }}
                </p>

                <div
                  class="flex items-center gap-1 opacity-0 transition-opacity group-hover/task:opacity-100"
                >
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    aria-label="Удалить задачу"
                    @click.stop="requestDeleteKanbanTask(task.id)"
                  />
                </div>
              </div>
            </div>

            <div
              v-if="draftTask?.columnId === column.id"
              class="rounded-md border border-primary/40 bg-default p-2"
            >
              <input
                v-model="draftTask.title"
                :data-draft-input-for="column.id"
                class="w-full bg-transparent text-sm outline-none"
                placeholder="Новая задача..."
                autofocus
                @keydown.enter.prevent="commitDraftTask"
                @keydown.esc.prevent="cancelDraftTask"
                @blur="commitDraftTask"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
type KanbanColumn = {
  id: string;
  name: string;
};

type KanbanTask = {
  id: string;
  columnId: string;
  title: string;
};

defineProps<{
  kanbanColumns: KanbanColumn[];
  tasksInColumn: (columnId: string) => KanbanTask[];
  draftTask: { columnId: string; title: string } | null;
  createKanbanColumn: () => void;
  onColumnDrop: (targetColumnId: string) => void;
  onTaskDrop: (targetColumnId: string) => void;
  onColumnFreeAreaClick: (columnId: string, event: MouseEvent) => void;
  onColumnDragStart: (columnId: string) => void;
  onColumnDragEnd: () => void;
  renameKanbanColumn: (columnId: string) => void;
  requestDeleteKanbanColumn: (columnId: string) => void;
  onTaskDragStart: (taskId: string) => void;
  onTaskDragEnd: () => void;
  openKanbanTask: (taskId: string) => void;
  requestDeleteKanbanTask: (taskId: string) => void;
  commitDraftTask: () => void;
  cancelDraftTask: () => void;
}>();
</script>
