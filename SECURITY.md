# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | ✅        |
| < 1.0   | ❌        |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately via [GitHub's private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) on this repository.

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any suggested fix if you have one

You will receive a response within **72 hours**. If the issue is confirmed, a patch will be released as soon as possible — typically within 7 days for critical issues.

## Scope

This project handles Anthropic API calls and may process API keys passed through MCP tool arguments. Key concerns:

- **API key leakage**: Never log or persist API keys. If you find a path where keys could leak to disk or stdout, report it.
- **Prompt injection**: Cached content should not be able to override system-level instructions.
- **Dependency vulnerabilities**: Run `npm audit` regularly; PRs that introduce vulnerable dependencies will be rejected.
