# ClassSnag website deployment

Public site: https://apps.cleartextlabs.com/classsnag/
Privacy policy: https://apps.cleartextlabs.com/classsnag/privacy.html
Support: https://github.com/digitalhen/ClassSnag/issues

Both Dokploy servers run `classsnag` under **Websites → production**, using
`digitalhen/ClassSnag`, branch `main`, with the existing GitHub integration.

- Dokploy: http://192.168.200.51:3000 — application `gngKk7cZUtmhcMHgFhg1O`
- Dokploy2: http://192.168.200.52:3000 — application `cT9TRHH8b6XG9TMpa-Eup`
- Dockerfile: `Dockerfile`; context `.`; build path `/`.
- Domain: `apps.cleartextlabs.com`; path `/classsnag`; port `8080`.
- Strip Path: off. Keep the prefix when forwarding to Nginx.
- Origin: HTTP, matching Blocklight; public HTTPS terminates upstream.
- Health: `/healthz` on port 8080.

The image builds an allowlisted extension ZIP and static website, then copies
only public site files to Nginx. It does not serve the repository root.
Missing files return 404. HTML and assets revalidate on load.

## Local development

Use Docker Desktop explicitly. OrbStack is reserved for production.

```sh
npm run build:site
docker --context desktop-linux build -t classsnag:preview .
docker --context desktop-linux run --rm -p 127.0.0.1:4319:8080 classsnag:preview
```

Open http://localhost:4319/classsnag/.

## Rollback

Redeploy the previous successful commit on both Dokploy servers.
Keep Cloudflare's `/classsnag` route pointed at the existing origin routing.
