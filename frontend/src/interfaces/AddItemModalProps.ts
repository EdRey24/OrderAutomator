import type { Item } from "./Item";

export interface AddItemModalProps {
    onSubmit: (item: Omit<Item, "id">) => void;
}