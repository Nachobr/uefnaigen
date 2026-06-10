# Vendored UEFN MCP listener

Upstream: `KirChuvakov/uefn-mcp-server`

Pinned upstream commit: `3f65857e2459b95ad4e92db18694ee741a5e3108` (default branch `master` on fetch)

## Fetched files

| File | Raw URL | Upstream sha256 |
| --- | --- | --- |
| `uefn_listener.py` | `https://raw.githubusercontent.com/KirChuvakov/uefn-mcp-server/3f65857e2459b95ad4e92db18694ee741a5e3108/uefn_listener.py` | `ca6f712dccb88c047831f33fd5a988929e6650fa9666e2fabaac94bf5faf8fa7` |
| `mcp_server.py` | `https://raw.githubusercontent.com/KirChuvakov/uefn-mcp-server/3f65857e2459b95ad4e92db18694ee741a5e3108/mcp_server.py` | `0930a8258ead3a2bc0912a50e92f38d9acf3c7201c1b0a0b5746603c39e41d42` |
| `init_unreal.py` | `https://raw.githubusercontent.com/KirChuvakov/uefn-mcp-server/3f65857e2459b95ad4e92db18694ee741a5e3108/init_unreal.py` | `bdfdedca8c04212fa2b1a3aff2b7706226802ec73eaa57fcc534afb1e5aa3c56` |

## ForgeAI fork modifications

- `uefn_listener.py` serializes actor `tags` in `_serialize_actor`.
- `uefn_listener.py` exposes a safe `write_project_file` command for writing UTF-8 files beneath `unreal.Paths.project_dir()`.
- `uefn_listener.py` declares `FORGEAI_FORK = "0.1.0"` and includes `forgeai_fork` in `ping` and `GET /` health responses.

`mcp_server.py` and `init_unreal.py` are unmodified from upstream.

## Install

Copy `uefn_listener.py` and `init_unreal.py` into:

```text
<UEFN project>/Content/Python/
```

Open the project in UEFN, then run `uefn-ai doctor --live` to confirm the listener is reachable.
