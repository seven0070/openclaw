const params = new URLSearchParams(location.hash.slice(1));
const token = params.get("token") || "";
history.replaceState(null, "", location.pathname);
const chat = document.getElementById("chat"), status = document.getElementById("status");
const prompt = document.getElementById("prompt"), send = document.getElementById("send");
function message(role, content) {
  const el = document.createElement("div");
  el.className = "msg " + role;
  el.textContent = content;
  chat.append(el);
  chat.scrollTop = chat.scrollHeight;
}
async function api(path, body) {
  const res = await fetch(path, { method: body === undefined ? "GET" : "POST",
    headers: { "x-jane-token": token, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await res.json();
  if (!res.ok) throw Error(data.error || "Request failed");
  return data;
}
async function init() {
  try {
    const data = await api("/api/history");
    for (const m of data.messages) message(m.role, m.content);
    status.textContent = "Ready · Jane only operates within your local workspace.";
  } catch (e) { status.textContent = "Access denied. Open the private URL printed by Jane in your terminal."; }
}
document.getElementById("form").addEventListener("submit", async e => {
  e.preventDefault();
  const value = prompt.value.trim(); if (!value) return;
  send.disabled = true; prompt.disabled = true; status.textContent = "Jane is thinking…";
  try { const result = await api("/api/chat", { prompt: value }); message("user", value); message("assistant", result.answer); prompt.value = ""; status.textContent = "Ready"; }
  catch (e) { status.textContent = e.message; }
  finally { send.disabled = false; prompt.disabled = false; prompt.focus(); }
});
document.getElementById("forget").addEventListener("click", async () => {
  if (!confirm("Delete Jane's saved conversation history?")) return;
  try { await api("/api/forget", {}); chat.replaceChildren(); status.textContent = "Conversation cleared."; }
  catch (e) { status.textContent = e.message; }
});
init();
