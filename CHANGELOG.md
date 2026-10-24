# Changelog

## 0.1.1

- `panel:<tag>-aio`, all in one: the panel with the runner inside
  (`Dockerfile.aio`), published beside every panel image, with
  `docker-compose-aio.yml` and `.env.aio.example` to start it.

## 0.1.0

The first version of the open source panel.

- One admin signs in with a password; the runner's root token stays on the
  server.
- Services: a list with each one's traffic, and for each its overview,
  traffic chart, versions (code, quick deploy, uploads, downloads, rollback),
  live log, data (SQL, files, jobs, realtime) and settings (egress, disk
  quota, vars, secrets, export and import, deletion).
- Tokens for agents, with a prompt that gives them the skill and the token.
- System: the runner's settings, its log, backups and restores, and the
  versions of the panel and the runner, with a notice when a newer release
  is out.
- The agents' skill at `/skill.md` and the runner's API at `/api`, so agents
  need only the panel's address and a token.
- Light and dark themes, view transitions, and a layout that fits phones.
- Copy buttons work on panels served over plain HTTP too.
- A Docker image for amd64 and arm64, and a compose file with the runner.
- The runner's `separator` setting in System: services at `name.domain`
  or `name--domain`.
