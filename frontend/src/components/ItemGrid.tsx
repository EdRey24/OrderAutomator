import {
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  DndContext,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import ItemBox from "./ItemBox";
import type { ItemGridProps } from "../interfaces/ItemGridProps";
import { useState } from "react";

export default function ItemGrid({
  items,
  quantities,
  onAdd,
  onQuantityChange,
  onEdit,
  onDelete,
  onReorder,
}: ItemGridProps) {
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    onReorder?.(newItems.map((item) => item.id));
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={items.map((items) => items.id)}
        strategy={rectSortingStrategy}
      >
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {items.map((item) => (
            <ItemBox
              key={item.id}
              item={item}
              quantity={quantities[item.id] || 0}
              onAdd={onAdd}
              onQuantityChange={onQuantityChange}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeId ? (
          <ItemBox
            item={items.find((item) => item.id === activeId)!}
            quantity={quantities[activeId] || 0}
            onAdd={onAdd}
            onQuantityChange={onQuantityChange}
            onEdit={onEdit}
            onDelete={onDelete}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
