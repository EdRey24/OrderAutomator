import type { Item } from "./Item";

export interface ItemGridProps {
    items: Item[];
    quantities: Record<number, number>;
    onAdd: (id: number) => void;
    onQuantityChange: (id: number, newQuantity: number) => void;
    onEdit: (item: Item) => void;
    onDelete: (id: number) => void;
}