const $ = (selector) => document.querySelector(selector);
const products = [
  { id: "aurora", name: "Aurora", type: "Tacones", color: "Negro charol", price: 189, description: "Slingback de punta fina con tacón bajo y hebilla dorada." },
  { id: "catalina", name: "Catalina", type: "Planos", color: "Chocolate", price: 179, description: "Mocasín de silueta clásica, con antifaz y suela de perfil bajo." },
  { id: "brisa", name: "Brisa", type: "Zapatillas", color: "Marfil / arena", price: 199, description: "Zapatilla retro de caña baja en tonos marfil y arena." },
  { id: "vera", name: "Vera", type: "Planos", color: "Burdeos", price: 159, description: "Mary Jane de punta fina con correa y hebilla dorada." },
  { id: "alba", name: "Alba", type: "Sandalias", color: "Caramelo", price: 189, description: "Sandalia de tiras finas con tacón cuadrado y cierre al tobillo." },
  { id: "noche", name: "Noche", type: "Botines", color: "Espresso", price: 239, description: "Botín al tobillo con tacón cuadrado y acabado granulado." }
];
const sizes = [35, 36, 37, 38, 39, 40];
const categories = ["Todos", ...new Set(products.map(({ type }) => type))];
const currency = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const price = (amount) => currency.format(amount);
const model = (id) => products.find((item) => item.id === id);
const photo = (item) => "assets/" + item.id + ".webp";
const productDialog = $("#product-dialog");
const cartDialog = $("#cart-dialog");
const bonusDialog = $("#bonus-dialog");
const bagKey = "maison-luna:bag";
const couponCode = "LUNA15";
let cart = [];
let couponActive = false;
try {
  const saved = JSON.parse(localStorage.getItem(bagKey) || "{}");
  if (Array.isArray(saved.items)) cart = saved.items.filter((line) =>
    line && model(line.id) && sizes.includes(line.size) && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 10
  );
  couponActive = saved.coupon === couponCode;
} catch { /* Storage may be unavailable in a restricted browser. */ }
function persistCart() {
  try { localStorage.setItem(bagKey, JSON.stringify({ items: cart, coupon: couponActive ? couponCode : "" })); }
  catch { /* The open tab still keeps the current bag. */ }
  renderCart();
}

function renderCatalog(category) {
  const items = category === "Todos" ? products : products.filter(({ type }) => type === category);
  $("#model-count").textContent = items.length + (items.length === 1 ? " modelo" : " modelos");
  $("#product-grid").innerHTML = items.map((item) => `
    <article class="product-card">
      <button class="product-photo" type="button" data-model="${item.id}" aria-label="Ver ${item.name}" aria-haspopup="dialog">
        <img src="${photo(item)}" alt="${item.description}" width="512" height="512" loading="lazy">
        <small>${item.type}</small>
      </button>
      <div class="product-info"><div><h3>${item.name}</h3><p>${item.color}</p></div><strong>${price(item.price)}</strong></div>
      <button class="product-add" type="button" data-model="${item.id}" aria-label="Elegir talla para ${item.name}" aria-haspopup="dialog">Elegir talla <span aria-hidden="true">+</span></button>
    </article>`).join("");
}
$("#filters").innerHTML = categories.map((category, index) =>
  `<button type="button" aria-pressed="${index === 0}">${category}</button>`).join("");
$("#filters").addEventListener("click", (event) => {
  const filter = event.target.closest("button");
  if (!filter) return;
  $("#filters [aria-pressed=true]").setAttribute("aria-pressed", "false");
  filter.setAttribute("aria-pressed", "true");
  renderCatalog(filter.textContent);
});

let toastTimeout;
function showToast(message) {
  const toast = $("#toast");
  clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.hidden = false;
  toastTimeout = setTimeout(() => { toast.hidden = true; }, 3200);
}
function showProduct(item) {
  $("#product-detail").innerHTML = `
    <div class="detail-grid">
      <img src="${photo(item)}" alt="${item.description}">
      <div class="detail-copy">
        <button type="button" class="close" data-close aria-label="Cerrar producto">×</button>
        <div class="eyebrow"><span></span> ${item.type.toUpperCase()} · ${item.color.toUpperCase()}</div>
        <h2 id="product-title">${item.name}</h2><p>${item.description}</p><p><strong>${price(item.price)}</strong></p>
        <form id="add-form">
          <fieldset><legend>Elige tu talla (EU)</legend><div class="sizes">${sizes.map((size) =>
            `<label><input class="sr-only" type="radio" name="size" value="${size}" required><span>${size}</span></label>`).join("")}</div></fieldset>
          <button class="button primary" type="submit">Agregar a la bolsa <span aria-hidden="true">+</span></button>
          <p class="form-status" role="status"></p>
        </form>
      </div>
    </div>`;
  $("#add-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const size = Number(new FormData(event.currentTarget).get("size"));
    const existing = cart.find((line) => line.id === item.id && line.size === size);
    if (existing?.quantity >= 10) {
      $("#add-form .form-status").textContent = "Puedes agregar hasta 10 pares por modelo y talla.";
      return;
    }
    if (existing) existing.quantity++;
    else cart.push({ id: item.id, size, quantity: 1 });
    persistCart();
    productDialog.close();
    showToast(item.name + " se agregó a tu bolsa.");
  });
  productDialog.showModal();
}
$("#product-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-model]");
  if (button) showProduct(model(button.dataset.model));
});

function renderCart() {
  $("#cart-count").textContent = cart.reduce((sum, line) => sum + line.quantity, 0);
  $("#cart-summary").hidden = !cart.length;
  $("#cart-items").innerHTML = cart.length ? cart.map(({ id, size, quantity }, index) => {
    const item = model(id);
    return `<article class="cart-item">
      <img src="${photo(item)}" alt="">
      <div><h3>${item.name}</h3><p class="fine">Talla ${size} · ${item.color}</p>
        <div class="quantity">
          <button type="button" data-index="${index}" data-change="-1" aria-label="Reducir cantidad de ${item.name}, talla ${size}" ${quantity === 1 ? "disabled" : ""}>−</button>
          <span>${quantity}</span>
          <button type="button" data-index="${index}" data-change="1" aria-label="Aumentar cantidad de ${item.name}, talla ${size}" ${quantity === 10 ? "disabled" : ""}>+</button>
        </div>
      </div>
      <div><strong>${price(item.price * quantity)}</strong><br><button type="button" class="remove" data-index="${index}" data-change="remove" aria-label="Quitar ${item.name}, talla ${size}">Quitar</button></div>
    </article>`;
  }).join("") : '<div class="empty"><p>Tu bolsa está vacía.</p><button class="button primary" type="button" data-close>Seguir explorando <span aria-hidden="true">↗</span></button></div>';
  const subtotal = cart.reduce((sum, line) => sum + model(line.id).price * line.quantity, 0);
  const discount = couponActive ? Math.round(subtotal * 15) / 100 : 0;
  $("#subtotal").textContent = price(subtotal);
  $("#discount-row").hidden = !discount;
  $("#discount").textContent = "−" + price(discount);
  $("#total").textContent = price(subtotal - discount);
}
$("#cart-items").addEventListener("click", (event) => {
  const button = event.target.closest("[data-index]");
  if (!button) return;
  const { index, change } = button.dataset;
  if (change === "remove") cart.splice(Number(index), 1);
  else cart[index].quantity += Number(change);
  persistCart();
  const replacement = $("#cart-items [data-index='" + index + "'][data-change='" + change + "']:not(:disabled)");
  (replacement || $("#cart-items button:not(:disabled)") || $("#cart-dialog .close")).focus();
});
$("#open-cart").addEventListener("click", () => cartDialog.showModal());
$("#coupon-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = $("#coupon").value.trim().toUpperCase();
  couponActive = value === couponCode;
  $("#coupon-status").textContent = couponActive ? "Bono aplicado a tu bolsa." : "Ese código no es válido.";
  persistCart();
});

function openBonus() {
  if (!document.querySelector("dialog[open]")) bonusDialog.showModal();
}
document.addEventListener("click", (event) => {
  if (event.target.closest("[data-bonus]")) openBonus();
  const close = event.target.closest("[data-close]");
  if (close) close.closest("dialog").close();
});
bonusDialog.addEventListener("close", () => {
  try { sessionStorage.setItem("maison-luna:seen", "1"); } catch {}
});
setTimeout(() => {
  try { if (sessionStorage.getItem("maison-luna:seen")) return; } catch {}
  if (!document.querySelector("dialog[open]") && !document.hidden) openBonus();
}, 12000);

$("#bonus-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector("button");
  const status = $("#bonus-status");
  submit.disabled = true;
  status.textContent = "Registrando tu solicitud…";
  try {
    const response = await fetch("api/bono", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: $("#email").value.trim(), consent: form.querySelector("[type=checkbox]").checked })
    });
    const result = await response.json();
    status.textContent = result.message;
    if (response.ok) form.reset();
  } catch {
    status.textContent = "La captura requiere el servidor de la tienda. Para probar el descuento, usa LUNA15 en la bolsa.";
  } finally {
    submit.disabled = false;
  }
});

const reel = $("#reel");
const toggleReel = $("#toggle-reel");
function updateVideoButton() {
  toggleReel.setAttribute("aria-label", reel.paused ? "Reproducir video" : "Pausar video");
  toggleReel.firstElementChild.textContent = reel.paused ? "▶" : "Ⅱ";
}
toggleReel.addEventListener("click", () => {
  if (reel.paused) reel.play().catch(() => {});
  else reel.pause();
});
reel.addEventListener("play", updateVideoButton);
reel.addEventListener("pause", updateVideoButton);
reel.addEventListener("timeupdate", () => {
  const index = Math.min(products.length - 1, Math.floor(reel.currentTime / 2.8));
  $("#film-name").textContent = "0" + (index + 1) + " / 06 · " + products[index].name.toUpperCase();
});
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) reel.play().catch(() => {});

renderCatalog("Todos");
renderCart();
if (couponActive) $("#coupon").value = couponCode;
