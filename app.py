from flask import Flask, request, jsonify
import json


class Item:
    id: int
    name: str
    price: float
    pdf_text: str
    color: str

    def __init__(self, id: int, name: str, price: float, pdf_text: str, color: str):
        self.id = id
        self.name = name
        self.price = price
        self.pdf_text = pdf_text
        self.color = color

    def toJSON(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "pdf_text": self.pdf_text,
            "color": self.color,
        }

    def __repr__(self):
        return f"Item(id={self.id}, name='{self.name}', price={self.price}, pdf_text='{self.pdf_text}', color='{self.color}')"


items: list[Item] = []

open_ID: int = 0


def create_item(name: str, price: float, pdf_text: str, color: str):
    global open_ID
    newItem: Item = Item(open_ID, name, price, pdf_text, color)
    open_ID += 1
    items.append(newItem)


app = Flask(__name__)


@app.get("/api/items")
def index():
    return jsonify([item.toJSON() for item in items])


@app.post("/api/items")
def add_item():
    data: dict = request.get_json()
    name: str = data.get("name")
    price: float = data.get("price")
    pdf_text: str = data.get("pdf_text")
    color: str = data.get("color")

    if name is None or price is None or price < 0 or pdf_text is None or color is None:
        return {"error": "Missing fields"}, 400

    create_item(name, price, pdf_text, color)

    return {"message": "Item created", "item": items[-1]}, 201


if __name__ == "__main__":
    create_item("test", 2.02, "test description", "red")
    create_item("test", 1.02, "test description", "blue")
    app.run(debug=True)
