// Illustrative default tariffs (NOT any real provider's rates). Editable in the UI.
const DEFAULTS = {
  residential: { slabs: [{ upto: 100, rate: 3.5 }, { upto: 200, rate: 4.5 }, { upto: 300, rate: 6.0 }, { upto: Infinity, rate: 7.5 }], fixed: 50, fuel: 0.5, duty: 15 },
  commercial:  { slabs: [{ upto: 100, rate: 5.0 }, { upto: 300, rate: 6.5 }, { upto: Infinity, rate: 8.0 }], fixed: 150, fuel: 0.5, duty: 15 },
};

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function loadTariff(type) {
  const t = DEFAULTS[type];
  const box = $("slabs");
  box.innerHTML = "";
  let prev = 0;
  t.slabs.forEach((s, i) => {
    const label = s.upto === Infinity ? `Above ${prev} units` : `${prev + 1} – ${s.upto} units`;
    const div = document.createElement("div");
    div.className = "slab";
    div.innerHTML = `<span>${label}</span><label>Rate<input type="number" step="0.01" data-slab="${i}" value="${s.rate}"></label>`;
    box.appendChild(div);
    prev = s.upto;
  });
  $("fixed").value = t.fixed;
  $("fuel").value = t.fuel;
  $("duty").value = t.duty;
}

function getUnits() {
  const direct = parseFloat($("units").value);
  if (!isNaN(direct) && direct >= 0) return direct;
  const p = parseFloat($("prev").value), c = parseFloat($("curr").value);
  if (!isNaN(p) && !isNaN(c) && c >= p) return c - p;
  return null;
}

function calculate() {
  const type = $("type").value;
  const units = getUnits();
  if (units === null) { alert("Enter units consumed, or valid previous/current readings (current must be ≥ previous)."); return; }

  const base = DEFAULTS[type].slabs;
  const rates = [...document.querySelectorAll("[data-slab]")].map((i) => parseFloat(i.value) || 0);
  const rows = [];
  let remaining = units, prev = 0, energy = 0;

  base.forEach((s, i) => {
    if (remaining <= 0) return;
    const span = s.upto === Infinity ? remaining : Math.min(remaining, s.upto - prev);
    const amt = span * rates[i];
    energy += amt;
    rows.push([`Energy charge (slab ${i + 1})`, span.toFixed(1), rates[i].toFixed(2), amt]);
    remaining -= span;
    prev = s.upto;
  });

  const fixed = parseFloat($("fixed").value) || 0;
  const fuelRate = parseFloat($("fuel").value) || 0;
  const fuel = units * fuelRate;
  const dutyPct = parseFloat($("duty").value) || 0;
  const duty = (energy + fixed + fuel) * dutyPct / 100;

  rows.push(["Fixed charge", "-", "-", fixed]);
  rows.push(["Fuel surcharge", units.toFixed(1), fuelRate.toFixed(2), fuel]);
  rows.push([`Electricity duty (${dutyPct}%)`, "-", "-", duty]);

  const total = energy + fixed + fuel + duty;
  $("r-body").innerHTML = rows.map((r) => `<tr><td>${r[0]}</td><td class="num">${r[1]}</td><td class="num">${r[2]}</td><td class="num">${fmt(r[3])}</td></tr>`).join("");
  $("r-total").textContent = "₹ " + fmt(total);
  $("r-name").textContent = $("name").value.trim() || "-";
  $("r-month").textContent = $("month").value || "-";
  $("r-type").textContent = type[0].toUpperCase() + type.slice(1);
  $("r-units").textContent = units.toFixed(1) + " kWh";
  $("result-card").hidden = false;
  $("result-card").scrollIntoView({ behavior: "smooth" });
}

$("bill-form").addEventListener("submit", (e) => { e.preventDefault(); calculate(); });
$("type").addEventListener("change", () => loadTariff($("type").value));
$("reset").addEventListener("click", () => { $("bill-form").reset(); loadTariff("residential"); $("result-card").hidden = true; });
$("print").addEventListener("click", () => window.print());
loadTariff("residential");
