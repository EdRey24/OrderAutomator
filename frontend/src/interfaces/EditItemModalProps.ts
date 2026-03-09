import type { Item } from "./Item";

export interface EditItemModalProps {
    item: Item | null;
    onClose: () => void;
    onSave: (item: Omit<Item, "id">) => void;
    onUpdate?: (id: number, item: Omit<Item, "id">) => void
}