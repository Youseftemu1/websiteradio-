# GitHub Command Guide 🚀

This guide explains how to manually save and push your code to GitHub.

## 1. The Standard "Save & Push" Flow
Whenever you make changes and want them live on Render, run these three commands in order in your terminal:

```powershell
# 1. Prepare all modified files for "saving"
git add .

# 2. Save your changes with a descriptive note
git commit -m "Describe what you changed here"

# 3. Upload (Push) your changes to GitHub
git push origin master
```

## 2. Common Helper Commands
| Command | What it does |
| :--- | :--- |
| `git status` | Shows which files have been changed but not yet "saved". |
| `git log -n 5` | Shows the last 5 "saves" (commits) you made. |
| `git pull origin master` | Downloads any changes from GitHub to your local machine (good for syncing). |
| `git checkout .` | **WARNING**: Discards ALL local changes and resets to the last save. |

## 3. Signing In (Authentication)
If GitHub asks you to sign in via the terminal, you have two main options:

### Option A: Web Browser (easiest)
If you have the **GitHub CLI** installed, run:
```powershell
gh auth login
```
Follow the prompts, choose **GitHub.com**, and select **HTTPS**. It will open a browser window for you to click "Authorize".

### Option B: Personal Access Token (PAT)
If the terminal asks for your **Username** and **Password**:
1.  Go to GitHub.com -> Settings -> Developer Settings -> **Personal Access Tokens**.
2.  Generate a "Classic" token with `repo` permissions.
3.  **Copy this token.**
4.  When the terminal asks for `Password`, **paste the token** instead of your real password (it will be invisible as you paste).

## 4. Why This Matters
Render.com is linked to your GitHub. As soon as you run `git push origin master`, Render sees the new code and automatically starts building and deploying your website.

---
*Keep this file as a cheat sheet for your future manual edits!* 🏁🎙️✨
