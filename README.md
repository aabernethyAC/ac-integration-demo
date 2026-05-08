# ACDemoIntegration

ActiveCampaign integration demo — small workspace for experimenting with the [ActiveCampaign](https://www.activecampaign.com/) API and related integrations.

## Local setup

1. Copy environment template and add your credentials (keep `.env` out of Git):

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your API URL and key from ActiveCampaign (**Settings → Developer → API**).

## Git: save work

```bash
git status
git add -A
git commit -m "Describe your change"
```

Update commit identity for this repo only if needed:

```bash
git config user.name "Your Name"
git config user.email "you@example.com"
```

## GitHub: first-time push

Remote is already set to **aabernethyAC / ACDemoIntegration**:

- HTTPS: `https://github.com/aabernethyAC/ACDemoIntegration.git`
- SSH: `git@github.com:aabernethyAC/ACDemoIntegration.git`

**On GitHub:** create the repository **ACDemoIntegration** under **aabernethyAC** if it does not exist. Use an **empty** repo (no README, no `.gitignore`, no license) so your first push matches.

**Authenticate before pushing** (pick one):

1. **Cursor** — Use **Source Control** and click **Publish Branch** / **Push**. Cursor can sign in to GitHub for you; that avoids terminal credential errors.
2. **HTTPS in Terminal** — Use a [Personal Access Token](https://github.com/settings/tokens) when Git asks for a password (not your GitHub account password). Install [Git Credential Manager](https://github.com/git-ecosystem/git-credential-manager) if you want tokens saved.
3. **SSH in Terminal** — [Add an SSH key to GitHub](https://docs.github.com/en/authentication/connecting-to-github-with-ssh), then:

   ```bash
   git remote set-url origin git@github.com:aabernethyAC/ACDemoIntegration.git
   git push -u origin main
   ```

**Push (after GitHub auth works):**

```bash
git push -u origin main
```

Later updates: `git push`.

## Security

Never commit API keys or `.env`. This repo’s `.gitignore` excludes them by design.
