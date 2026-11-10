const json = (message, status = 200) => Response.json({ message }, {
  status, headers: { "Cache-Control": "no-store" }
});

async function requestBonus(request, env) {
  if (request.method !== "POST") return json("Método no permitido.", 405);
  if (request.headers.get("Origin") !== new URL(request.url).origin) return json("Origen no permitido.", 403);
  if (!request.headers.get("Content-Type")?.startsWith("application/json")) return json("Formato no válido.", 415);
  if (Number(request.headers.get("Content-Length")) > 1024) return json("Solicitud demasiado grande.", 413);
  let payload;
  try { payload = await request.json(); } catch { return json("Solicitud no válida.", 400); }
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (payload?.consent !== true || email.length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) {
    return json("Ingresa un correo válido y acepta el envío del bono.", 400);
  }
  if (!env.DB) return json("La captura de correos aún no está habilitada. Usa LUNA15 para probar la bolsa.", 503);

  try {
    await env.DB.prepare("INSERT INTO bonos (email) VALUES (?) ON CONFLICT (email) DO NOTHING").bind(email).run();
    if (!env.RESEND_API_KEY || !env.BONUS_FROM) {
      return json("Correo registrado. El envío automático está pendiente de activación. Para esta prueba, usa LUNA15 en la bolsa.");
    }
    const lead = await env.DB.prepare("SELECT enviado_en FROM bonos WHERE email = ?").bind(email).first();
    if (!lead.enviado_en) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
      const key = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      const sent = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + env.RESEND_API_KEY,
          "Content-Type": "application/json",
          "Idempotency-Key": "maison-luna-bono-v1/" + key
        },
        body: JSON.stringify({
          from: env.BONUS_FROM,
          to: [email],
          subject: "Tu bono de temporada de SANETTY BAZY",
          text: "Usa el código LUNA15 en tu bolsa para aplicar el 15% de descuento de temporada a tu primera compra. Solicitaste este mensaje en SANETTY BAZY."
        }),
        signal: AbortSignal.timeout(8000)
      });
      if (!sent.ok) return json("Guardamos tu solicitud. El correo no se pudo enviar; puedes intentarlo de nuevo.", 502);
      await env.DB.prepare("UPDATE bonos SET enviado_en = CURRENT_TIMESTAMP WHERE email = ?").bind(email).run();
    }
    return json("Tu bono fue enviado. Revisa tu bandeja de entrada.");
  } catch {
    return json("No pudimos completar la solicitud. Inténtalo de nuevo.", 503);
  }
}

async function exportBonuses(request, env) {
  if (request.method !== "GET" || !env.BONUS_EXPORT_TOKEN ||
      request.headers.get("Authorization") !== "Bearer " + env.BONUS_EXPORT_TOKEN) {
    return new Response("No encontrado", { status: 404 });
  }
  const { results } = await env.DB.prepare("SELECT email, solicitado_en, enviado_en FROM bonos ORDER BY solicitado_en DESC").all();
  return Response.json(results, { headers: { "Cache-Control": "no-store", "Content-Disposition": "attachment; filename=bonos.json" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/bono") return requestBonus(request, env);
    if (url.pathname === "/api/bonos/exportar") return exportBonuses(request, env);
    if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405 });
    const file = assets[url.pathname === "/" ? "/index.html" : url.pathname];
    if (!file) return new Response("No encontrado", { status: 404 });
    const [type, base64] = file;
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    const headers = new Headers({
      "Content-Type": type,
      "Content-Length": String(bytes.length),
      "Cache-Control": url.pathname.startsWith("/assets/") ? "public, max-age=3600" : "no-cache",
      "X-Content-Type-Options": "nosniff"
    });
    if (type === "video/webm") {
      headers.set("Accept-Ranges", "bytes");
      const range = request.headers.get("Range");
      if (range && request.method === "GET") {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (match && (match[1] || match[2])) {
          const start = match[1] ? Number(match[1]) : Math.max(0, bytes.length - Number(match[2]));
          const end = match[1] && match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
          if (start <= end) {
            headers.set("Content-Range", "bytes " + start + "-" + end + "/" + bytes.length);
            headers.set("Content-Length", String(end - start + 1));
            return new Response(bytes.subarray(start, end + 1), { status: 206, headers });
          }
          return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + bytes.length } });
        }
      }
    }
    return new Response(request.method === "HEAD" ? null : bytes, { headers });
  }
};
