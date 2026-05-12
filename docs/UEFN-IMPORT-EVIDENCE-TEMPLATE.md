# UEFN Import Evidence Template

Use this template when importing a reference scaffold into UEFN. Save a copy next to the imported reference notes, for example `references/_reports/tycoon-lumber-starter-uefn-import.md`.

## Import summary

| Field | Value |
|---|---|
| Reference scaffold | `tycoon-lumber-starter` |
| Scaffold path | `references/tycoon-lumber-starter` |
| Archive path | `references/tycoon-lumber-starter.zip` |
| UEFN version |  |
| Fortnite/UEFN release channel |  |
| Importer |  |
| Import date |  |
| Result | Not started / Passed / Passed with manual fixes / Failed |

## Pre-import repo checks

- [ ] `uefn-ai validate <absolute project path>` passes.
- [ ] `unzip -t references/tycoon-lumber-starter.zip` passes.
- [ ] `.ai/validation/summary.json` shows all validators passed.
- [ ] `README-UEFN-IMPORT.md` and `docs/HANDOFF-CHECKLIST.md` were reviewed before opening UEFN.

## Verse import evidence

- [ ] All files from `Verse/` were created in Verse Explorer.
- [ ] Verse build completed with no compiler errors.
- [ ] Every `@editable` device reference was assigned to a placed device.

Evidence links or paths:

- Verse Explorer screenshot:
- Verse build success screenshot:
- Compiler log export, if any:

Compiler errors or warnings:

```text
Paste any UEFN compiler output here.
```

## Device placement evidence

- [ ] All entries in `manifests/device_manifest.json` were placed or intentionally skipped below.
- [ ] Device channels match `docs/DEVICE-WIRING.md`.
- [ ] Required tycoon devices are present: trigger, button, tracker, barrier, resource spawner/granter.

Intentionally skipped devices:

| Device ID | Reason | Replacement/manual setup |
|---|---|---|
|  |  |  |

Evidence links or paths:

- Device layout screenshot:
- Channel wiring screenshot:
- Editable references screenshot:

## Core loop playtest evidence

| Check | Expected | Observed | Pass? |
|---|---|---|---|
| Spawn | Player starts in Starter Grove with HUD visible |  |  |
| Earn currency | Player earns Wood without admin setup |  |  |
| First upgrade | Sharper Axe reachable in 45–90 seconds |  |  |
| Gate unlock | At least one locked zone opens after purchase |  |  |
| HUD/tracker | Currency changes display after earn/spend |  |  |
| Save/rejoin | Currency and upgrades persist |  |  |
| Prestige/rebirth | Functional or intentionally disabled in docs |  |  |

Evidence links or paths:

- Core loop video:
- Save/rejoin video:
- Prestige/rebirth screenshot or note:

## Manual fixes applied

Record every change made inside UEFN that was not present in the generated scaffold.

| Area | Manual fix | Why it was needed | Should ForgeAI automate it? |
|---|---|---|---|
| Verse / Device / Layout / Balance / Docs |  |  | Yes / No |

## Follow-up code tasks

Convert repeated manual fixes into deterministic generator improvements.

- [ ] Packager:
- [ ] Template:
- [ ] Device mapper:
- [ ] Validator:
- [ ] Docs:

## Final sign-off

- [ ] Import evidence is complete.
- [ ] Screenshots/video are linked or stored in a stable location.
- [ ] Manual fixes are recorded in this document.
- [ ] Repeated fixes are added to `TODO.md` or an issue tracker.

Reviewer:

Date:
