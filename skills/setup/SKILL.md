---
name: setup
description: Configure Jev Agent Draft's default permission ceiling, maintenance window, minimum score, and winning margin after installation.
---

# Set up Jev Agent Draft

Help the user choose defaults for future comparisons:

- permitted read scopes and any explicitly allowed write scopes;
- maximum days since a candidate's last maintenance update (default 180);
- minimum eligible score (default 70/100);
- minimum lead over the runner-up (default 5 points).

Explain that setup stores no credentials and grants no permissions. Return the preferences as a compact JSON `policy` object that can be pasted into a candidate file. Do not edit global configuration or install anything unless the user separately asks.
