# Security Policy

## Supported Versions

Zublo is currently maintained as a rolling project. Security fixes are expected to land on the default branch and in the latest published container image.

| Version line | Supported |
|---|---|
| Latest `main` branch state | Yes |
| Older commits and untagged snapshots | No |

## Reporting a Vulnerability

Please do not open public GitHub issues for suspected security vulnerabilities.

Preferred disclosure path:

1. Use GitHub's private vulnerability reporting for this repository, if enabled
2. If private reporting is unavailable, contact the maintainer via the repository owner profile at `@danielalves96` and request a private channel

## What to Include

Please include:

- a clear description of the issue
- affected area or file path
- impact assessment
- reproduction steps or proof of concept
- any suggested mitigation if you already have one

## Response Goals

Best-effort targets:

- initial acknowledgement within 7 days
- follow-up once triage is complete
- public disclosure only after a fix or mitigation path exists

## Security Boundaries

Use the security channel for:

- authentication or authorization flaws
- sensitive data exposure
- remote code execution
- privilege escalation
- vulnerabilities in published images or distribution artifacts

Use the normal support path for:

- setup help
- documentation gaps
- general bug reports without security impact
