import io
import os
from datetime import datetime, timedelta

import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from pypdf import PdfReader, PdfWriter
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")


def get_db_connection():
    """Create and return a PostgreSQL database connection."""
    return psycopg2.connect(
        host=os.environ["DB_HOST"],
        dbname=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
    )


def init_db():
    """Initialize the database table if it doesn't exist."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            pdf_text TEXT NOT NULL,
            htsus TEXT NOT NULL,
            display_order INTEGER DEFAULT 0,
            bg_color TEXT DEFAULT '#f0f0f0'
        )
    """
    )
    # For existing installations, add the column if it doesn't exist
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS user_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            port_code TEXT,
            vessel TEXT,
            country_of_export TEXT,
            marks_numbers TEXT,
            importer_first_name TEXT,
            importer_last_name TEXT,
            importer_address TEXT
        )
    """
    )
    cur.execute(
        """
        INSERT INTO user_settings (id)
        SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM user_settings WHERE id = 1)
    """
    )
    conn.commit()
    cur.close()
    conn.close()


init_db()


@app.get("/api/items")
def index():
    """Return all items as JSON."""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM items ORDER BY display_order")
    items = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(items)


@app.post("/api/items/reorder")
def reorder_items():
    data = request.get_json()
    ordered_ids = data.get("ordered_ids")
    if not isinstance(ordered_ids, list):
        return {"error": "ordered_ids must be a list"}, 400

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        for index, item_id in enumerate(ordered_ids):
            cur.execute(
                "UPDATE items SET display_order = %s WHERE id = %s", (index, item_id)
            )
        conn.commit()
    except Exception as e:
        conn.rollback()
        return {"error": str(e)}, 500
    finally:
        cur.close()
        conn.close()
    return {"message": "Order updated"}, 200


@app.post("/api/items")
def add_item():
    """Add a new item and return it."""
    data = request.get_json()
    name = data.get("name")
    price = data.get("price")
    pdf_text = data.get("pdf_text")
    htsus = data.get("htsus")
    bg_color = data.get("bg_color", "#f0f0f0")

    if name is None or price is None or price < 0 or pdf_text is None or htsus is None:
        return {"error": "Missing or invalid fields"}, 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO items (name, price, pdf_text, htsus, bg_color) VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (name, price, pdf_text, htsus, bg_color),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    new_item = {
        "id": new_id,
        "name": name,
        "price": price,
        "pdf_text": pdf_text,
        "htsus": htsus,
        "bg_color": bg_color,
    }
    return jsonify(new_item), 201


@app.post("/api/finish_order")
def finish_order():
    """Generate a filled PDF order form."""
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
    cur = conn.cursor()
    detailed_order = []
    for item in order_items:
        cur.execute(
            "SELECT name, price, pdf_text, htsus FROM items WHERE id=%s",
            (item["id"],),
        )
        row = cur.fetchone()
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
    cur.close()

    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM user_settings WHERE id = 1")
    settings = cur.fetchone()
    cur.close()
    conn.close()

    if not detailed_order:
        return {"error": "No valid items"}, 400

    description_lines = []
    value_lines = []
    htsus_lines = []
    for item in detailed_order:
        description_lines.append(f"{item['quantity']} {item['pdf_text']}")
        value_lines.append(f"${item['price'] * item['quantity']:.2f}")
        htsus_lines.append(item["htsus"])

    description_multiline = "\n".join(description_lines)
    value_multiline = "\n".join(value_lines)
    htsus_multiline = "\n".join(htsus_lines)

    importer_parts = []
    if settings and settings.get("importer_first_name"):
        importer_parts.append(settings["importer_first_name"])
    if settings and settings.get("importer_last_name"):
        importer_parts.append(settings["importer_last_name"])
    importer_name = " ".join(importer_parts)
    if settings and settings.get("importer_address"):
        importer_record = (
            f"{importer_name} {settings['importer_address']}"
            if importer_name
            else settings["importer_address"]
        )
    else:
        importer_record = importer_name

    template_path = os.path.join("templates", "CBP Form.pdf")
    reader = PdfReader(template_path)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)

    for i in range(len(writer.pages) - 1, 0, -1):
        writer.remove_page(i)

    page = writer.pages[0]
    writer.update_page_form_field_values(
        page,
        {
            "F[0].P1[0].F[0]-P1[0]-portcode[0]": (
                (settings.get("port_code") or "") if settings else ""
            ),
            "F[0].P1[0].F[0]-P1[0]-Date[0]": arrival_date,
            "F[0].P1[0].F[0]-P1[0]-vessel[0]": (
                (settings.get("vessel") or "") if settings else ""
            ),
            "F[0].P1[0].F[0]-P1[0]-arrivaldate[0]": arrival_date,
            "F[0].P1[0].F[0]-P1[0]-countryofexportation[0]": (
                (settings.get("country_of_export") or "") if settings else ""
            ),
            "F[0].P1[0].F[0]-P1[0]-MarsandNumbers[0]": (
                (settings.get("marks_numbers") or "") if settings else ""
            ),
            "F[0].P1[0].F[0]-P1[0]-description[0]": description_multiline,
            "F[0].P1[0].F[0]-P1[0]-val[0]": value_multiline,
            "F[0].P1[0].F[0]-P1[0]-HTSUSheadingNumber[0]": htsus_multiline,
            "F[0].P1[0].F[0]-P1[0]-ImporterRecord[0]": importer_record,
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
    """Update an existing item."""
    data = request.get_json()
    name = data.get("name")
    price = data.get("price")
    pdf_text = data.get("pdf_text")
    htsus = data.get("htsus")
    bg_color = data.get("bg_color")

    if name is None or price is None or price < 0 or pdf_text is None or htsus is None:
        return {"error": "Missing or invalid fields"}, 400

    set_fields = []
    values = []
    set_fields.append("name = %s")
    values.append(name)
    set_fields.append("price = %s")
    values.append(price)
    set_fields.append("pdf_text = %s")
    values.append(pdf_text)
    set_fields.append("htsus = %s")
    values.append(htsus)

    if "bg_color" in data:
        set_fields.append("bg_color = %s")
        values.append(data["bg_color"])

    values.append(item_id)
    set_clause = ", ".join(set_fields)

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        f"UPDATE items SET {set_clause} WHERE id = %s",
        values,
    )
    conn.commit()
    rows_affected = cur.rowcount
    cur.close()
    conn.close()

    if rows_affected == 0:
        return {"error": "Item not found"}, 404

    updated_item = {
        "id": item_id,
        "name": name,
        "price": price,
        "pdf_text": pdf_text,
        "htsus": htsus,
        "bg_color": bg_color,
    }
    return jsonify(updated_item), 200


@app.delete("/api/items/<int:item_id>")
def delete_item(item_id):
    """Delete an item."""
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM items WHERE id = %s", (item_id,))
    conn.commit()
    rows_affected = cur.rowcount
    cur.close()
    conn.close()

    if rows_affected == 0:
        return {"error": "Item not found"}, 404

    return "", 204


@app.get("/api/settings")
def get_settings():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM user_settings WHERE id = 1")
    settings = cur.fetchone()
    cur.close()
    conn.close()
    if settings is None:
        return {"error": "Settings not found"}, 404
    settings.pop("id", None)
    return jsonify(settings)


@app.post("/api/settings")
def update_settings():
    data = request.get_json()
    allowed_fields = [
        "port_code",
        "vessel",
        "country_of_export",
        "marks_numbers",
        "importer_first_name",
        "importer_last_name",
        "importer_address",
    ]
    set_clause = ", ".join(
        f"{field} = %({field})s" for field in allowed_fields if field in data
    )
    if not set_clause:
        return {"error": "No valid fields provided"}, 400
    values = {field: data.get(field) for field in allowed_fields if field in data}
    values["id"] = 1

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        f"""
        UPDATE user_settings
        SET {set_clause}
        WHERE id = %(id)s
    """,
        values,
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Settings updated"}, 200


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    """Serve the built frontend (Vue/React/etc.) from /frontend/dist."""
    if path and os.path.exists(os.path.join(frontend_dist, path)):
        return send_from_directory(frontend_dist, path)
    return send_from_directory(frontend_dist, "index.html")


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
