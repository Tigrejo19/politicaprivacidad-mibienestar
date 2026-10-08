"use strict";

const fs = require("fs");
const path = require("path");

const requiredPages = [
  "index.html",
  "terminos.html",
  "eliminar-cuenta.html",
  "privacidad-salud-eeuu.html",
  "cookies.html",
  "aviso-legal.html",
];

for (const file of requiredPages) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required legal page: ${file}`);
  }
}

if (!fs.existsSync("assets/legal.css")) {
  throw new Error("Missing shared legal stylesheet.");
}

const pages = Object.fromEntries(
  requiredPages.map((file) => [file, fs.readFileSync(file, "utf8")])
);

for (const [file, html] of Object.entries(pages)) {
  for (const required of [
    '<html lang="es">',
    'name="viewport"',
    'assets/legal.css',
    'aria-label="Documentos legales"',
    "© 2026 tigredev · MiBienestar",
  ]) {
    if (!html.includes(required)) {
      throw new Error(`${file} is missing required legal/accessibility contract: ${required}`);
    }
  }

  if (/<script\b/i.test(html)) {
    throw new Error(`${file} must remain tracker/script-free unless specifically reviewed.`);
  }
}

if (!pages["index.html"].includes("Versión de consentimiento: <strong>2026-10-07</strong>")) {
  throw new Error("Privacy consent version drifted from the certified app policy.");
}

if (!pages["terminos.html"].includes("Versión de términos: <strong>2026-10-07</strong>")) {
  throw new Error("Terms version drifted from the certified app policy.");
}

for (const required of [
  "Luis Leonardo Valverde Cadena",
  "C. Cronista Remigi Vicedo, 4, Entlo iz, 03802 Alcoi (Alicante), España",
  "leonardovalverde19@gmail.com",
  "+34 634 136 078",
]) {
  if (!pages["aviso-legal.html"].includes(required)) {
    throw new Error(`Legal notice is missing verified public provider data: ${required}`);
  }
}

for (const required of [
  "Washington",
  "Nevada",
  "California",
  "No vendemos datos de salud",
  "geofencing",
  "FTC Health Breach Notification Rule",
]) {
  if (!pages["privacidad-salud-eeuu.html"].includes(required)) {
    throw new Error(`US health privacy notice is missing: ${required}`);
  }
}

for (const forbidden of [
  "Diagnóstico Avanzado",
  "Diagnóstico Dual",
  "riesgo cardiovascular elevado",
  "error mínimo",
  "sin error",
  "sueño profundo (REM)",
  "ciclos de aproximadamente 90 minutos",
]) {
  for (const [file, html] of Object.entries(pages)) {
    if (html.includes(forbidden)) {
      throw new Error(`${file} contains forbidden medical/accuracy claim: ${forbidden}`);
    }
  }
}

for (const [file, html] of Object.entries(pages)) {
  const hrefRegex = /href="([^"]+)"/g;
  for (const match of html.matchAll(hrefRegex)) {
    const href = match[1];
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("#")
    ) {
      continue;
    }

    const target = href === "./" ? "index.html" : href.split("#")[0].split("?")[0];
    if (!target) continue;

    const resolved = path.normalize(target);
    if (!fs.existsSync(resolved)) {
      throw new Error(`${file} links to missing local resource: ${href}`);
    }
  }
}

const legalNotice = pages["aviso-legal.html"];
if (!legalNotice.includes("<strong>NIF:</strong>")) {
  throw new Error("Legal notice must contain an NIF field.");
}

if (legalNotice.includes("PENDIENTE DE INCORPORAR")) {
  console.warn(
    "LEGAL BLOCKER: verified NIF is still pending. Do not publish/merge this revision as final."
  );
}

console.log(
  "Legal site structural guard passed: required pages, consent-version alignment, accessibility, US health notice, local links and medical-claim guard are intact."
);
