import {
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  DndContext,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import ItemBox from "./ItemBox";
import type { ItemGridProps } from "../interfaces/ItemGridProps";

export default function ItemGrid({
  items,
  quantities,
  onAdd,
  onQuantityChange,
  onEdit,
  onDelete,
  onReorder,
}: ItemGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    onReorder?.(newItems.map((item) => item.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((items) => items.id)}
        strategy={verticalListSortingStrategy}
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
    </DndContext>
  );
}
