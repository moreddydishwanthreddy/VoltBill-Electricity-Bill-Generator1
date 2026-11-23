"""Flask server for the Electricity Bill Estimator.

Run:
    pip install flask
    python app.py
Then open http://127.0.0.1:5000
"""
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
app = Flask(__name__, static_folder=None)

INF = float("inf")

# Illustrative tariffs (not any real provider's rates).
TARIFFS = {
    "residential": {
        "slabs": [(100, 3.5), (200, 4.5), (300, 6.0), (INF, 7.5)],
        "fixed": 50.0, "fuel": 0.5, "duty": 15.0,
    },
    "commercial": {
        "slabs": [(100, 5.0), (300, 6.5), (INF, 8.0)],
        "fixed": 150.0, "fuel": 0.5, "duty": 15.0,
    },
}


def estimate(units, conn_type):
    t = TARIFFS[conn_type]
    items, remaining, prev, energy = [], units, 0, 0.0
    for i, (upto, rate) in enumerate(t["slabs"], start=1):
        if remaining <= 0:
            break
        span = remaining if upto == INF else min(remaining, upto - prev)
        amount = span * rate
        energy += amount
        items.append({"item": f"Energy charge (slab {i})", "qty": round(span, 1),
                      "rate": rate, "amount": round(amount, 2)})
        remaining -= span
        prev = upto
    fuel = units * t["fuel"]
    duty = (energy + t["fixed"] + fuel) * t["duty"] / 100
    items.append({"item": "Fixed charge", "qty": None, "rate": None, "amount": round(t["fixed"], 2)})
    items.append({"item": "Fuel surcharge", "qty": round(units, 1), "rate": t["fuel"], "amount": round(fuel, 2)})
    items.append({"item": f"Electricity duty ({t['duty']}%)", "qty": None, "rate": None, "amount": round(duty, 2)})
    total = energy + t["fixed"] + fuel + duty
    return {"units": units, "type": conn_type, "items": items, "total": round(total, 2),
            "note": "Estimate only. Not an official bill."}


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    if filename in {"style.css", "script.js"}:
        return send_from_directory(BASE_DIR, filename)
    return ("Not found", 404)


@app.route("/api/estimate", methods=["POST"])
def api_estimate():
    data = request.get_json(silent=True) or {}
    conn_type = data.get("type", "residential")
    if conn_type not in TARIFFS:
        return jsonify(error="type must be 'residential' or 'commercial'"), 400
    try:
        units = float(data["units"])
    except (KeyError, TypeError, ValueError):
        return jsonify(error="'units' must be a number"), 400
    if units < 0:
        return jsonify(error="'units' must be 0 or more"), 400
    return jsonify(estimate(units, conn_type))


if __name__ == "__main__":
    app.run(debug=True)
