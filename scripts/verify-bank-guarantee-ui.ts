/**
 * Targeted BG/WB UI mapping checks (no DB).
 * Run: npx tsx scripts/verify-bank-guarantee-ui.ts
 */
import {
  bankGuaranteeFromFormFields,
  composeBankGuarantee,
  formatBankGuaranteeCompact,
  normalizeBankGuaranteeFromExcel,
  parseBankGuaranteeUi,
  resolveCanonicalBankGuarantee,
} from "../src/lib/bank-guarantee-options";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// Four known statuses ↔ UI
assert(
  JSON.stringify(parseBankGuaranteeUi("In afwachting van bankgarantie")) ===
    JSON.stringify({ type: "BG", settled: false, legacy: null }),
  "waiting BG",
);
assert(
  JSON.stringify(parseBankGuaranteeUi("Bankgarantie geregeld")) ===
    JSON.stringify({ type: "BG", settled: true, legacy: null }),
  "settled BG",
);
assert(
  JSON.stringify(parseBankGuaranteeUi("In afwachting van waarborgsom")) ===
    JSON.stringify({ type: "WB", settled: false, legacy: null }),
  "waiting WB",
);
assert(
  JSON.stringify(parseBankGuaranteeUi("Waarborgsom geregeld")) ===
    JSON.stringify({ type: "WB", settled: true, legacy: null }),
  "settled WB",
);

// Compose round-trip
assert(
  composeBankGuarantee("BG", false) === "In afwachting van bankgarantie",
  "compose BG open",
);
assert(
  composeBankGuarantee("BG", true) === "Bankgarantie geregeld",
  "compose BG settled",
);
assert(
  composeBankGuarantee("WB", false) === "In afwachting van waarborgsom",
  "compose WB open",
);
assert(
  composeBankGuarantee("WB", true) === "Waarborgsom geregeld",
  "compose WB settled",
);

// Toggle settled via form fields
assert(
  bankGuaranteeFromFormFields({
    typeRaw: "BG",
    settled: false,
    legacyRaw: null,
  }).ok === true &&
    (
      bankGuaranteeFromFormFields({
        typeRaw: "BG",
        settled: false,
        legacyRaw: null,
      }) as { value: string }
    ).value === "In afwachting van bankgarantie",
  "form BG unchecked",
);
assert(
  (
    bankGuaranteeFromFormFields({
      typeRaw: "BG",
      settled: true,
      legacyRaw: null,
    }) as { ok: true; value: string }
  ).value === "Bankgarantie geregeld",
  "form BG checked",
);
assert(
  (
    bankGuaranteeFromFormFields({
      typeRaw: "WB",
      settled: true,
      legacyRaw: null,
    }) as { ok: true; value: string }
  ).value === "Waarborgsom geregeld",
  "form WB checked",
);

// Compact production aliases
assert(
  resolveCanonicalBankGuarantee("BG") === "In afwachting van bankgarantie",
  "alias BG",
);
assert(
  resolveCanonicalBankGuarantee("BG gesteld") === "Bankgarantie geregeld",
  "alias BG gesteld",
);
assert(
  resolveCanonicalBankGuarantee("WBS") === "In afwachting van waarborgsom",
  "alias WBS",
);
assert(
  resolveCanonicalBankGuarantee("WBS gesteld") === "Waarborgsom geregeld",
  "alias WBS gesteld",
);

assert(formatBankGuaranteeCompact("BG") === "BG ☐", "compact BG open");
assert(
  formatBankGuaranteeCompact("Bankgarantie geregeld") === "BG ☑",
  "compact BG settled",
);
assert(formatBankGuaranteeCompact("WBS gesteld") === "WB ☑", "compact WBS settled");
assert(formatBankGuaranteeCompact(null) === "—", "compact null");

// Ambiguous historical values must not be silently rewritten
assert(resolveCanonicalBankGuarantee("gesteld") == null, "gesteld ambiguous");
assert(resolveCanonicalBankGuarantee("(gesteld)") == null, "(gesteld) ambiguous");
assert(resolveCanonicalBankGuarantee("nvt") == null, "nvt ambiguous");
assert(
  resolveCanonicalBankGuarantee("niet van toepassing") == null,
  "nvt long ambiguous",
);
assert(
  resolveCanonicalBankGuarantee("Ingediend") == null,
  "Ingediend ambiguous",
);
assert(
  resolveCanonicalBankGuarantee("Afgehandeld") == null,
  "Afgehandeld ambiguous",
);

const legacyParse = parseBankGuaranteeUi("gesteld");
assert(legacyParse.legacy === "gesteld", "legacy kept in parse");
assert(legacyParse.type == null, "legacy has no type");

const preserve = bankGuaranteeFromFormFields({
  typeRaw: "",
  settled: false,
  legacyRaw: "gesteld",
});
assert(preserve.ok && preserve.value === "gesteld", "legacy preserved on save");

const clear = bankGuaranteeFromFormFields({
  typeRaw: "",
  settled: false,
  legacyRaw: null,
});
assert(clear.ok && clear.value == null, "empty → null");

// Choosing BG/WB overrides legacy
assert(
  (
    bankGuaranteeFromFormFields({
      typeRaw: "BG",
      settled: true,
      legacyRaw: "gesteld",
    }) as { ok: true; value: string }
  ).value === "Bankgarantie geregeld",
  "type overrides legacy",
);

// Excel import
assert(
  normalizeBankGuaranteeFromExcel("Bankgarantie geregeld") ===
    "Bankgarantie geregeld",
  "excel exact",
);
assert(
  normalizeBankGuaranteeFromExcel("BG gesteld") === "Bankgarantie geregeld",
  "excel alias",
);
assert(
  normalizeBankGuaranteeFromExcel("Aangevraagd") === "Aangevraagd",
  "excel unknown kept",
);
assert(
  normalizeBankGuaranteeFromExcel("gesteld") === "gesteld",
  "excel ambiguous kept",
);

console.log("verify-bank-guarantee-ui: OK");
