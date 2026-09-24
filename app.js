const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?"
};
const AMBIGUOUS = /[0OlI1]/g;
const output = document.querySelector("#passwordOutput");
const lengthRange = document.querySelector("#lengthRange");
const lengthValue = document.querySelector("#lengthValue");
const strengthLabel = document.querySelector("#strengthLabel");
const strengthText = document.querySelector("#strengthText");
const strengthDescription = document.querySelector("#strengthDescription");
const entropyLabel = document.querySelector("#entropyLabel");
const crackTime = document.querySelector("#crackTime");
const toast = document.querySelector("#toast");
const settingsHint = document.querySelector("#settingsHint");
const options = ["lowercase", "uppercase", "numbers", "symbols"];

function secureRandomInt(max) {
  if (!window.crypto?.getRandomValues) throw new Error("Web Crypto API wird von diesem Browser nicht unterstützt.");
  const limit = Math.floor(0x100000000 / max) * max;
  const values = new Uint32Array(1);
  do window.crypto.getRandomValues(values); while (values[0] >= limit);
  return values[0] % max;
}

function activeCharsets() {
  const exclude = document.querySelector("#excludeAmbiguous").checked;
  return options.filter((name) => document.querySelector(`#${name}`).checked)
    .map((name) => exclude ? CHARSETS[name].replace(AMBIGUOUS, "") : CHARSETS[name]);
}

function generatePassword(length = Number(lengthRange.value)) {
  const sets = activeCharsets();
  if (!sets.length) {
    settingsHint.textContent = "Wähle mindestens einen Zeichensatz aus.";
    settingsHint.classList.add("error");
    return "";
  }
  settingsHint.textContent = "Mindestens ein Zeichensatz muss ausgewählt sein.";
  settingsHint.classList.remove("error");
  const pool = sets.join("");
  const chars = sets.map((set) => set[secureRandomInt(set.length)]);
  while (chars.length < length) chars.push(pool[secureRandomInt(pool.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function formatCrackTime(seconds) {
  if (seconds < 1) return "weniger als 1 Sekunde";
  if (seconds < 60) return `${Math.round(seconds)} Sekunden`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} Minuten`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} Stunden`;
  if (seconds < 31557600) return `${Math.round(seconds / 86400)} Tage`;
  if (seconds < 3155760000) return `${Math.round(seconds / 31557600)} Jahre`;
  return "Jahrhunderte";
}

function updateStrength(password) {
  if (!password) return;
  const poolSize = activeCharsets().join("").length;
  const entropy = Math.round(password.length * Math.log2(poolSize));
  const score = entropy >= 100 ? 5 : entropy >= 70 ? 4 : entropy >= 50 ? 3 : entropy >= 35 ? 2 : 1;
  const labels = ["Sehr schwach", "Schwach", "Mittel", "Stark", "Sehr stark"];
  const descriptions = [
    "Zu kurz oder zu vorhersehbar. Bitte erhöhe die Länge.",
    "Verbesserbar. Nutze mehr Zeichentypen und eine größere Länge.",
    "Solide für weniger wichtige Konten, für wichtige Konten bitte stärker.",
    "Gut geschützt. Für besonders sensible Daten empfehlen wir 64 Zeichen.",
    "Hervorragend. Dieses Passwort hält selbst modernen Angriffen stand."
  ];
  strengthLabel.textContent = labels[score - 1];
  strengthText.textContent = labels[score - 1];
  strengthDescription.textContent = descriptions[score - 1];
  entropyLabel.textContent = `${entropy} bit Entropie`;
  document.querySelectorAll(".strength-meter i").forEach((bar, index) => bar.classList.toggle("on", index < score));
  document.querySelectorAll(".mini-bars i").forEach((bar, index) => bar.classList.toggle("on", index < score));
  const guessesPerSecond = 100_000_000_000;
  crackTime.textContent = formatCrackTime(Math.pow(2, entropy) / guessesPerSecond / 2);
}

function refresh() {
  const password = generatePassword();
  if (!password) return;
  output.value = password;
  output.textContent = password;
  updateStrength(password);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

document.querySelector("#generateButton").addEventListener("click", refresh);
document.querySelector("#copyButton").addEventListener("click", async () => {
  try {
    const password = output.value || output.textContent;
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(password);
    showToast("Passwort in die Zwischenablage kopiert");
  } catch {
    showToast("Kopieren nicht möglich — bitte manuell markieren");
  }
});
lengthRange.addEventListener("input", () => { lengthValue.textContent = lengthRange.value; document.querySelectorAll(".preset").forEach((button) => button.classList.toggle("active", button.dataset.length === lengthRange.value)); refresh(); });
document.querySelectorAll(".preset").forEach((button) => button.addEventListener("click", () => { lengthRange.value = button.dataset.length; lengthValue.textContent = button.dataset.length; document.querySelectorAll(".preset").forEach((item) => item.classList.toggle("active", item === button)); refresh(); }));
document.querySelectorAll(".toggle-option input, #excludeAmbiguous").forEach((input) => input.addEventListener("change", refresh));
document.querySelector("#exportButton").addEventListener("click", () => {
  const input = document.querySelector("#batchCount");
  const count = Math.min(500, Math.max(1, Number(input.value) || 1));
  input.value = count;
  const passwords = Array.from({ length: count }, () => generatePassword()).filter(Boolean);
  if (passwords.length !== count) return;
  const blob = new Blob([`${passwords.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `keycraft-passwoerter-${count}.txt`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showToast(`${count} Passwörter als TXT exportiert`);
});

refresh();
