#!/bin/zsh
# Kavach walkthrough, built frame by frame.
#
#   npm run dev -- -p 3100
#   scripts/record-walkthrough.sh kavach-walkthrough.mp4 /tmp/kavach-frames
#
# Needs the agent-browser CLI and ffmpeg. The sample case's drafts are written
# by the model on first open, so the first run takes a minute longer than the
# film it produces.
#
# A screen recording of this leaves the pacing to the recorder, which collapses
# every second the page is not moving — so captions flashed past in one place
# and hung in another. Capturing the beats and assembling them gives an exact
# running time, which is the one hard requirement: under two minutes.
set -u
B() { agent-browser --session kavach "$@"; }
OUT="$1"
SHOTS="$2"
mkdir -p "$SHOTS"
rm -f "$SHOTS"/*.png "$SHOTS"/list.txt
N=0

CAP_JS='(() => {
  const mount = () => {
    let el = document.getElementById("__cap");
    if (el) return el;
    el = document.createElement("div");
    el.id = "__cap";
    el.style.cssText = "position:fixed;left:50%;bottom:30px;transform:translateX(-50%);z-index:2147483647;background:rgba(15,20,18,.95);color:#fdfcf3;font:600 18px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:13px 24px;border-radius:13px;max-width:min(900px,86vw);text-align:center;box-shadow:0 16px 48px rgba(0,0,0,.42);pointer-events:none;";
    document.documentElement.appendChild(el);
    return el;
  };
  window.__cap = (t) => { const el = mount(); el.textContent = t; return t; };
  return "ready";
})()'

# shot <seconds> <caption>
shot() {
  N=$((N + 1))
  local file
  file=$(printf "%s/%03d.png" "$SHOTS" $N)
  B eval "$CAP_JS" >/dev/null 2>&1
  if [ -n "$2" ]; then B eval "window.__cap(\"$2\")" >/dev/null 2>&1; fi
  B screenshot "$file" >/dev/null 2>&1
  print "file '$file'\nduration $1" >> "$SHOTS/list.txt"
}

js() { B eval "$1" >/dev/null 2>&1; }
click() { B eval "(() => { const b = Array.from(document.querySelectorAll('button,a')).find(x => x.textContent.trim().startsWith(\"$1\")); if (!b) return 'missing'; b.click(); return 'ok'; })()" >/dev/null 2>&1; }

B set viewport 1280 800 >/dev/null 2>&1

# ── The landing page ────────────────────────────────────────────────────────
B open "http://localhost:3100/" >/dev/null 2>&1; sleep 4
shot 5 "Kavach — for the hour after somebody in India is defrauded, in 23 languages"

js "document.querySelector('#voice-demo').scrollIntoView(); window.scrollBy(0, 220); 1"; sleep 2
shot 6 "A real call with our voice agent. It asked what to call him and heard 'प्रणव' in Hindi."

js "window.scrollBy(0, 640); 1"; sleep 2
shot 6 "Ten facts it captured on its own — he never typed a word or chose a category"

js "document.querySelector('section[aria-label=\"System status\"]').scrollIntoView({block:'center'}); 1"; sleep 2
shot 5 "Every service it runs on, checked live — not a variable that happens to be set"

# ── The case that call produced ─────────────────────────────────────────────
js "location.href = '/case/demo-vaani-call'"; sleep 5
shot 6 "That call became a case file, and its link opens on any device"

js "window.scrollBy(0, 560); 1"; sleep 2
shot 5 "The recovery window, the one thing to do next, and ten action tracks"

js "window.scrollTo(0, 0); 1"; sleep 1
click "Call"; sleep 3
shot 6 "The recording and the whole transcript stay with the case"

click "Documents"; sleep 2
# The drafts are written by a model on first open. Generating them here, before
# any frame is taken, keeps a thirty-second wait out of a two-minute film.
B eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'Write my documents'); if (b) { b.click(); return 'generating'; } return 'ready'; })()" >/dev/null 2>&1
while [ "$(B eval "(() => { const c = JSON.parse(localStorage.getItem('kavach.cases.v1') || '[]')[0]; return Object.keys(c && c.docs || {}).length > 2 ? 'done' : 'busy'; })()" 2>/dev/null | tr -d '\"')" != "done" ]; do sleep 4; done
sleep 2
click "Letter to your bank"; sleep 3
js "document.querySelector('article').scrollIntoView({block:'start'}); window.scrollBy(0,-90); 1"; sleep 1
shot 6 "Letters drafted from what he said — and every blank left in them is a field on the right"

# The letter filling in, four frames apart.
for i in 3 6 10 10; do
  js "(() => { const f = document.getElementById('fill-bankName'); if (!f) return 0; const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; set.call(f, 'ICICI Bank'.slice(0, $i)); f.dispatchEvent(new Event('input', {bubbles:true})); return 1; })()"
  sleep 1
  shot 0.9 "Type once, and the letter fills in as you go"
done

shot 6 "One answer closes the same gap in every letter — and the download carries no reference of ours"

click "Evidence"; sleep 3
js "window.scrollTo(0, 320); 1"; sleep 1
shot 5 "An evidence checklist, so nothing is missing at the counter"

# ── Starting a report ───────────────────────────────────────────────────────
js "location.href = '/start'"; sleep 4
shot 5 "Starting a report: two safety questions, and always from a clean slate"

click "No, I am safe right now"; sleep 1
click "No child is involved"; sleep 2
shot 5 "Then you choose how to tell us"

click "Type it out"; sleep 4
js "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('WhatsApp preview')); if (b) b.click(); return 1; })()"; sleep 3
js "(() => { const s = document.querySelector('section[aria-label=\"Kavach Saathi\"]'); if (s) s.scrollIntoView({block:'center'}); return 1; })()"; sleep 1
shot 6 "A WhatsApp-style chat, because that is the app people already have"

js "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.startsWith('Yes, money left')); if (b) b.click(); return 1; })()"; sleep 2
js "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.startsWith('Within the last hour')); if (b) b.click(); return 1; })()"; sleep 3
js "(() => { const s = document.querySelector('section[aria-label=\"Kavach Saathi\"]'); if (s) s.scrollIntoView({block:'center'}); return 1; })()"; sleep 1
shot 6 "It answers in taps, and the microphone sits beside send rather than replacing it"

js "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('Vaani call')); if (b) b.click(); return 1; })()"; sleep 3
js "(() => { const h = Array.from(document.querySelectorAll('button')).find(x => x.getAttribute('aria-label') === 'Start voice session'); if (h) h.scrollIntoView({block:'center'}); return 1; })()"; sleep 1
shot 6 "Or just talk. When the call ends, the case opens by itself."

js "location.href = '/'"; sleep 4
shot 5 "Kavach. Nothing is filed on your behalf — everything is ready for you to file."

# The concat demuxer ignores the last entry's duration unless the file repeats.
tail -2 "$SHOTS/list.txt" | head -1 >> "$SHOTS/list.txt"

ffmpeg -v error -f concat -safe 0 -i "$SHOTS/list.txt" \
  -vf "fps=30,format=yuv420p,scale=1280:-2" -c:v libx264 -crf 23 -movflags +faststart -y "$OUT"
print "wrote $OUT"
