from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)


def init_db():
    conn = sqlite3.connect("items.db")
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            pdf_text TEXT NOT NULL,
            color TEXT NOT NULL
        )
    """
    )
    conn.commit()
    conn.close()


def seed_db():
    conn = sqlite3.connect("items.db")
    cursor = conn.cursor()
    # Check if table is empty
    cursor.execute("SELECT COUNT(*) FROM items")
    count = cursor.fetchone()[0]
    if count == 0:
        # Insert sample items
        sample_items = [
            ("Apple", 0.50, "Fresh red apple", "#FF0000"),
            ("Banana", 0.30, "Ripe yellow banana", "#FFFF00"),
            ("Orange", 0.80, "Juicy orange", "#FFA500"),
        ]
        cursor.executemany(
            "INSERT INTO items (name, price, pdf_text, color) VALUES (?, ?, ?, ?)",
            sample_items,
        )
        conn.commit()
        print("Sample items inserted.")
    conn.close()


@app.get("/api/items")
def index():
    conn = sqlite3.connect("items.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, price, pdf_text, color FROM items")
    rows = cursor.fetchall()
    conn.close()

    items = []
    for row in rows:
        items.append(
            {
                "id": row[0],
                "name": row[1],
                "price": row[2],
                "pdf_text": row[3],
                "color": row[4],
            }
        )
    return jsonify(items)


@app.post("/api/items")
def add_item():
    data: dict = request.get_json()
    name: str = data.get("name")
    price: float = data.get("price")
    pdf_text: str = data.get("pdf_text")
    color: str = data.get("color")

    if name is None or price is None or price < 0 or pdf_text is None or color is None:
        return {"error": "Missing fields"}, 400

    conn = sqlite3.connect("items.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO items (name, price, pdf_text, color) VALUES (?, ?, ?, ?)",
        (name, price, pdf_text, color),
    )
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    new_item = {
        "id": new_id,
        "name": name,
        "price": price,
        "pdf_text": pdf_text,
        "color": color,
    }
    return jsonify(new_item), 201


if __name__ == "__main__":
    init_db()
    seed_db()
    app.run(debug=True)
