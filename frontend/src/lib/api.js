const API_BASE = import.meta.env.VITE_API_BASE || '/api'


export async function api(path, options = {}) {
const res = await fetch(`${API_BASE}${path}`, {
credentials: 'include',
headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
...options
})
if (!res.ok) {
let msg = 'Request failed'
try { const j = await res.json(); msg = j.error || msg } catch {}
throw new Error(msg)
}
try { return await res.json() } catch { return null }
}