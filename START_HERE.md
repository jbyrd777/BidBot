# Start here

This folder is BidBot, ready for Claude Code on your Mac.

## One time setup (about five minutes)

1. Open Terminal and go to this folder: `cd ~/Desktop/BidBot`
2. Install the project's packages: `npm install`
   (needs Node 22 or newer; if `node -v` shows something older, install it from nodejs.org first)
3. Start Claude Code in this folder: `claude`

The settings file `.env.local` is already filled in with the database, Grok and Vercel keys. It never goes to GitHub.

## Your first message to Claude Code

Copy and paste this:

> Read CLAUDE.md and START_HERE.md. Then: confirm the Grok model in .env.local works by listing models from https://api.x.ai/v1/models with MODEL_API_KEY and pick the best current one with tool calling if it's different; run the tests and the build; start the app with `npm run dev` and walk me through signing up, setting up my company with the sample invitations, and chatting with the team; fix anything that breaks. After that, continue with the Next steps in CLAUDE.md, asking me before anything that costs money or can't be undone.

## Good to know

- Your code is on GitHub at github.com/jbyrd777/BidBot. Claude Code can commit and push for you; the first push may ask you to sign in to GitHub.
- Deploys use the Vercel token in `.env.local` (as `VERCEL_TOKEN`). The preview stays private until you decide to go public.
- When we go public: Vercel Pro, a BidBot domain, your own email sender (Resend), Stripe live mode, and terms and privacy pages.
