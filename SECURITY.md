# Security Policy

## Reporting a Vulnerability

If you discover a security issue, please **do not** open a public GitHub issue.

Instead, email **ignbritos@gmail.com** with:
- A description of the issue
- Steps to reproduce
- The affected version (`pnpm list forgeai` or git commit SHA)

You should receive an acknowledgment within 7 days. Once a fix is available, the issue will be disclosed publicly with credit to the reporter (unless you prefer to remain anonymous).

## Scope

In scope:
- Pipeline code execution paths (CLI, packager, validators)
- Generated Verse code that could violate UEFN sandboxing
- API key handling and configuration loading
- Local file-system operations (job cache, knowledge store, output directory)

Out of scope:
- LLM provider API behavior (report to the provider directly)
- Issues requiring physical access to the user's machine
- Vulnerabilities in third-party dependencies — please report upstream and open a non-security issue here so we can bump the version
