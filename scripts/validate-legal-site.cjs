"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const REQUIRED_FILES = [
  "index.html",
  "terminos.html",
  "eliminar-cuenta.html",
  "aviso-legal.html",
  "consumer-health-data.html",
  "cookies.html",
];

const EXPECTED_PRIVACY_CONSENT_VERSION = "2026-10-07";
const EXPECTED_TERMS_VERSION = "2026-10-07";
const EXPECTED_REVIEW_DATE = "8 de octubre de 2026";

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

for (const file of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(ROOT, file))) {
    throw new Error(`Required legal file is missing: ${file}`);
  }
}

const pages = Object.fromEntries(
  REQUIRED_FILES.map((file) => [file, read(file)])
);

const allHtml = Object.values(pages).join("\n");

if (allHtml.includes("__NIF_PENDIENTE__")) {
  throw new Error(
    "Spanish legal notice is incomplete: replace __NIF_PENDIENTE__ before publication."
  );
}

const legalNotice = pages["aviso-legal.html"];
const nifMatch = legalNotice.match(
  /NIF:\s*<strong>((?:\d{8}|[XYZ]\d{7})[A-Z])<\/strong>/i
);
if (!nifMatch) {
  throw new Error(
    "Spanish legal notice must contain a valid DNI/NIE-style NIF."
  );
}

for (const requiredIdentityText of [
  "Luis Leonardo Valverde Cadena",
  "C. Cronista Remigi Vicedo, 4",
  "leonardovalverde19@gmail.com",
  "+34 634 136 078",
]) {
  if (!legalNotice.includes(requiredIdentityText)) {
    throw new Error(
      `Legal notice is missing provider identity/contact text: ${requiredIdentityText}`
    );
  }
}

const privacy = pages["index.html"];
if (!privacy.includes(
  `Versión de consentimiento de datos de salud: <strong>${EXPECTED_PRIVACY_CONSENT_VERSION}</strong>`
)) {
  throw new Error("Privacy consent version is not aligned with the Android/backend legal policy.");
}

const terms = pages["terminos.html"];
if (!terms.includes(
  `Versión de términos aceptada por la app: <strong>${EXPECTED_TERMS_VERSION}</strong>`
)) {
  throw new Error("Terms version is not aligned with the Android/backend legal policy.");
}

for (const [file, source] of Object.entries(pages)) {
  if (!source.includes(EXPECTED_REVIEW_DATE) && file !== "aviso-legal.html") {
    throw new Error(`${file} does not expose the current legal review date.`);
  }

  if (/http:\/\//i.test(source)) {
    throw new Error(`${file} contains an insecure http:// URL.`);
  }

  for (const tracker of [
    "googletagmanager.com",
    "google-analytics.com",
    "connect.facebook.net",
    "fbq(",
    "doubleclick.net",
  ]) {
    if (source.toLowerCase().includes(tracker)) {
      throw new Error(
        `${file} unexpectedly contains tracking/advertising code: ${tracker}`
      );
    }
  }
}

for (const requiredPrivacyStatement of [
  "no es un dispositivo médico",
  "No vendemos datos personales ni datos de salud",
  "artículos 6.1.a y 9.2.a RGPD",
  "Google Cloud Vertex AI",
  "aproximadamente 24 meses",
  "consumer-health-data.html",
  "eliminar-cuenta.html",
  "cookies.html",
  "aviso-legal.html",
]) {
  if (!privacy.includes(requiredPrivacyStatement)) {
    throw new Error(
      `Privacy policy is missing required disclosure: ${requiredPrivacyStatement}`
    );
  }
}

const health = pages["consumer-health-data.html"];
for (const requiredHealthStatement of [
  "MiBienestar no vende datos de salud del consumidor",
  "Google LLC / Google Cloud / Firebase",
  "APELACIÓN PRIVACIDAD",
  "no opera geocercas",
  "retirar su consentimiento",
  "lista de terceros y afiliados",
]) {
  if (!health.includes(requiredHealthStatement)) {
    throw new Error(
      `US consumer health policy is missing: ${requiredHealthStatement}`
    );
  }
}

const deletion = pages["eliminar-cuenta.html"];
for (const requiredDeletionStatement of [
  "eliminar la cuenta de MiBienestar no implica necesariamente cancelar",
  "Google Play",
  "Nunca solicitaremos su contraseña",
  "APELACIÓN PRIVACIDAD",
]) {
  if (!deletion.includes(requiredDeletionStatement)) {
    throw new Error(
      `Account deletion page is missing: ${requiredDeletionStatement}`
    );
  }
}

for (const requiredTermsStatement of [
  "no es un dispositivo médico",
  "no implica necesariamente cancelar una suscripción activa",
  "derechos imperativos",
  "No se impone mediante estos Términos un arbitraje obligatorio",
]) {
  if (!terms.includes(requiredTermsStatement)) {
    throw new Error(
      `Terms are missing required consumer protection: ${requiredTermsStatement}`
    );
  }
}

const cookies = pages["cookies.html"];
if (
  !cookies.includes("no incorpora en estas páginas cookies propias de analítica") ||
  !cookies.includes("GitHub Pages") ||
  !cookies.includes("GitHub Privacy Statement")
) {
  throw new Error("Cookies/hosting disclosure is incomplete.");
}

const internalHrefRegex = /href="([^"]+)"/g;
for (const [file, source] of Object.entries(pages)) {
  for (const match of source.matchAll(internalHrefRegex)) {
    const href = match[1];

    if (
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("#") ||
      href === "./"
    ) {
      continue;
    }

    const clean = href.split("#")[0].split("?")[0];
    const target = path.join(ROOT, clean);

    if (!fs.existsSync(target)) {
      throw new Error(
        `${file} links to missing internal resource: ${href}`
      );
    }
  }
}

console.log(
  "Legal site guard passed: identity, privacy, health-data, deletion, terms, cookies, links, versions and no-tracking invariants are valid."
);
