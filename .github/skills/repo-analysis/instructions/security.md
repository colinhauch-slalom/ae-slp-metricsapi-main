# Security Analysis Instructions

## Goal

Identify the most significant security risks in the codebase at an overview level. This is a code-reading audit, not a penetration test. Flag patterns and structural issues — do not enumerate every vulnerable line.

## Steps

1. Read `templates/SECURITY.md` — its sections and comments define what to look for and how to present findings.
2. Scan the source with these areas in mind:
   - **Secrets & credentials** — hardcoded secrets, API keys, tokens, or passwords in source or config files
   - **Authentication & authorization** — missing auth guards, insecure session handling, overly permissive access
   - **Injection risks** — SQL, command, or template injection from unsanitized input; unparameterized queries
   - **Input validation** — trust boundaries: where does user/external input enter the system, and is it validated?
   - **Insecure configuration** — debug flags in production paths, permissive CORS, missing security headers, exposed stack traces
   - **Dependency exposure** — obviously outdated or known-vulnerable packages (check manifest; don't run a full audit)
   - **Sensitive data handling** — PII or secrets logged, stored unencrypted, or returned in API responses
3. Populate the template. Cite representative files as examples; do not list every occurrence.

## Conciseness Rule

This is a risk overview, not a security audit report. Surface patterns and the most impactful issues. If a section has many findings, summarize the pattern and offer a drill-down rather than listing each one.
