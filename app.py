import io
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from pypdf import PdfReader, PdfWriter
from datetime import datetime, timedelta
import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///items.db")
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")
frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")


def is_sqlite():
    return DATABASE_URL.startswith("sqlite://")


def execute_query(cursor, query, params=None):
    if is_sqlite():
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
    else:
        pg_query = query.replace("?", "%s")
        if params:
            cursor.execute(pg_query, params)
        else:
            cursor.execute(pg_query)


def get_db_connection():
    if DATABASE_URL.startswith("sqlite://"):
        conn = sqlite3.connect(DATABASE_URL.replace("sqlite:///", ""))
    else:
        import psycopg2

        conn = psycopg2.connect(DATABASE_URL)
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            pdf_text TEXT NOT NULL,
            htsus TEXT NOT NULL
        )
    """
    )
    conn.commit()
    conn.close()


@app.get("/api/items")
def index():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, price, pdf_text, htsus FROM items")
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
                "htsus": row[4],
            }
        )
    return jsonify(items)


@app.post("/api/items")
def add_item():
    data: dict = request.get_json()
    name: str = data.get("name")
    price: float = data.get("price")
    pdf_text: str = data.get("pdf_text")
    htsus: str = data.get("htsus")

    if name is None or price is None or price < 0 or pdf_text is None or htsus is None:
        return {"error": "Missing fields"}, 400

    conn = get_db_connection()
    cursor = conn.cursor()
    if is_sqlite():
        cursor.execute(
            "INSERT INTO items (name, price, pdf_text, htsus) VALUES (?, ?, ?, ?)",
            (name, price, pdf_text, htsus),
        )
        new_id = cursor.lastrowid
        conn.commit()
    else:
        cursor.execute(
            "INSERT INTO items (name, price, pdf_text, htsus) VALUES (%s, %s, %s, %s) RETURNING id",
            (name, price, pdf_text, htsus),
        )
        new_id = cursor.fetchone()[0]
        conn.commit()
    conn.close()

    new_item = {
        "id": new_id,
        "name": name,
        "price": price,
        "pdf_text": pdf_text,
        "htsus": htsus,
    }
    return jsonify(new_item), 201


@app.post("/api/finish_order")
def finish_order():
    data = request.get_json()
    order_items = data["items"]
    arrival_date = data.get("arrival_date")

    if not arrival_date:
        tomorrow = datetime.now() + timedelta(days=1)
        arrival_date = tomorrow.strftime("%m/%d/%y")
    else:
        try:
            parsed = datetime.strptime(arrival_date, "%Y-%m-%d")
            arrival_date = parsed.strftime("%m/%d/%y")
        except ValueError:
            arrival_date = datetime.now().strftime("%m/%d/%y")

    conn = get_db_connection()
    cursor = conn.cursor()
    detailed_order = []
    for item in order_items:
        if is_sqlite():
            cursor.execute(
                "SELECT name, price, pdf_text, htsus FROM items WHERE id=?",
                (item["id"],),
            )
        else:
            cursor.execute(
                "SELECT name, price, pdf_text, htsus FROM items WHERE id=%s",
                (item["id"],),
            )
        row = cursor.fetchone()
        if row:
            detailed_order.append(
                {
                    "name": row[0],
                    "price": row[1],
                    "pdf_text": row[2],
                    "htsus": row[3],
                    "quantity": item["quantity"],
                }
            )
    conn.close()

    if not detailed_order:
        return {"error": "No valid items"}, 400

    description_lines = []
    value_lines = []
    htsus_lines = []

    for item in detailed_order:
        desc_line = f"{item['quantity']} {item['pdf_text']}"
        description_lines.append(desc_line)

        total = item["price"] * item["quantity"]
        value_lines.append(f"${total:.2f}")

        htsus_lines.append(item["htsus"])

    description_multiline = "\n".join(description_lines)
    value_multiline = "\n".join(value_lines)
    htsus_multiline = "\n".join(htsus_lines)

    template_path = os.path.join("templates", "CBP Form.pdf")

    reader = PdfReader(template_path)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)

    # Remove all pages except the first
    for i in range(len(writer.pages) - 1, 0, -1):
        writer.remove_page(i)

    page = writer.pages[0]

    writer.update_page_form_field_values(
        page,
        {
            "F[0].P1[0].F[0]-P1[0]-description[0]": description_multiline,
            "F[0].P1[0].F[0]-P1[0]-val[0]": value_multiline,
            "F[0].P1[0].F[0]-P1[0]-HTSUSheadingNumber[0]": htsus_multiline,
            "F[0].P1[0].F[0]-P1[0]-Date[0]": arrival_date,
            "F[0].P1[0].F[0]-P1[0]-arrivaldate[0]": arrival_date,
            "F[0].P1[0].F[0]-P1[0]-Date16[0]": arrival_date,
        },
    )

    buffer = io.BytesIO()
    writer.write(buffer)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="filled_order.pdf",
        mimetype="application/pdf",
    )


@app.put("/api/items/<int:item_id>")
def update_item(item_id):
    data = request.get_json()
    name = data.get("name")
    price = data.get("price")
    pdf_text = data.get("pdf_text")
    htsus = data.get("htsus")

    if name is None or price is None or price < 0 or pdf_text is None or htsus is None:
        return {"error": "Missing or invalid fields"}, 400

    conn = get_db_connection()
    cursor = conn.cursor()
    if is_sqlite():
        cursor.execute(
            "UPDATE items SET name=?, price=?, pdf_text=?, htsus=? WHERE id=?",
            (name, price, pdf_text, htsus, item_id),
        )
    else:
        cursor.execute(
            "UPDATE items SET name=%s, price=%s, pdf_text=%s, htsus=%s WHERE id=%s",
            (name, price, pdf_text, htsus, item_id),
        )
    conn.commit()
    rows_affected = cursor.rowcount
    conn.close()

    if rows_affected == 0:
        return {"error": "Item not found"}, 404

    updated_item = {
        "id": item_id,
        "name": name,
        "price": price,
        "pdf_text": pdf_text,
        "htsus": htsus,
    }
    return jsonify(updated_item), 200


@app.delete("/api/items/<int:item_id>")
def delete_item(item_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    if is_sqlite():
        cursor.execute("DELETE FROM items WHERE id=?", (item_id,))
    else:
        cursor.execute("DELETE FROM items WHERE id=%s", (item_id,))
    conn.commit()
    rows_affected = cursor.rowcount
    conn.close()

    if rows_affected == 0:
        return {"error": "Item not found"}, 404

    return "", 204


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path and os.path.exists(os.path.join(frontend_dist, path)):
        return send_from_directory(frontend_dist, path)
    else:
        return send_from_directory(frontend_dist, "index.html")


init_db()

if __name__ == "__main__":
    init_db()
    app.run(debug=True)
