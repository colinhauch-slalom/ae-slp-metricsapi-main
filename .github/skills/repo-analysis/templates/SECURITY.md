# Security Analysis

> **Repo:** <!-- repo name -->  
> **Date:** <!-- date -->  
> **Stack:** <!-- language / framework -->

---

## Severity Key

| Grade | Meaning |
|---|---|
| 🔴 Critical | Exploitable risk or data exposure that should be fixed immediately. |
| 🟡 Warning | Security weakness that increases attack surface or risk over time. |
| 🔵 Info | Hardening opportunity or minor misconfiguration with low direct impact. |

---

## Risk Summary

<!-- One row per concern. Fill in grade and a one-line verdict. -->

| Concern | Grade | Verdict |
|---|---|---|
| Secrets & Credentials | | |
| Authentication & Authorization | | |
| Injection Risks | | |
| Input Validation | | |
| Insecure Configuration | | |
| Dependency Exposure | | |
| Sensitive Data Handling | | |

---

## Secrets & Credentials

<!-- 2–4 bullets. Hardcoded secrets, API keys, tokens in source or config. -->

## Authentication & Authorization

<!-- 2–4 bullets. Missing auth guards, insecure sessions, overly permissive access. -->

## Injection Risks

<!-- 2–4 bullets. SQL, command, or template injection from unsanitized input; unparameterized queries. -->

## Input Validation

<!-- 2–4 bullets. Where does external input enter the system and is it validated at the boundary? -->

## Insecure Configuration

<!-- 2–4 bullets. Debug flags, permissive CORS, missing security headers, exposed error details. -->

## Dependency Exposure

<!-- 2–4 bullets. Obviously outdated or known-vulnerable packages noted from the manifest. -->

## Sensitive Data Handling

<!-- 2–4 bullets. PII or secrets logged, stored unencrypted, or leaked in API responses. -->

---

## Notable Observations

<!-- Patterns that cut across multiple areas, things done well, or anything a new contributor should know before modifying security-sensitive code. -->

## Follow-up & Open Questions

<!-- Areas that warrant a dedicated security audit, findings that need confirmation with a running system, or risks that depend on deployment configuration not visible in source. -->
