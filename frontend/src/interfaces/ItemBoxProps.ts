import type { Item } from "./Item";

export interface ItemBoxProps {
    item: Item;
    quantity: number;
    onAdd: (id: number) => void;
    onQuantityChange: (id: number, newQuantity: number) => void;

}