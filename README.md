# Spectra for AI agents

Live [Spectra](https://www.spectra.finance) fixed rates, yield opportunities, markets, MetaVaults and wallet positions for AI agents, plus safe, unsigned transaction building.

This repository holds the **Spectra plugin** (skills and MCP connection) for Claude Code and Codex. The **remote MCP server** it connects to works with any MCP client.

Spectra is a permissionless fixed-rate and yield-trading protocol. It splits interest-bearing tokens into Principal Tokens (PT), which lock a fixed rate when held to maturity, and Yield Tokens (YT). It also offers liquidity pools and curated MetaVaults across 14 networks.

## Connect

| Endpoint | URL | Tools |
| --- | --- | --- |
| Read-only | `https://mcp.spectra.finance/mcp` | Markets, yields, MetaVaults, portfolios, history, docs |
| With transaction builders | `https://mcp.spectra.finance/mcp/trade` | The above, plus unsigned PT trade and redeem transactions |

Both use Streamable HTTP and need no account or API key.

### Claude Code

```text
/plugin marketplace add perspectivefi/spectra-ai
/plugin install spectra@spectra-ai
```

The plugin adds the `spectra-yields` and `spectra-transactions` skills and connects the MCP server. To add only the server:

```bash
claude mcp add --transport http spectra https://mcp.spectra.finance/mcp
```

### Claude, ChatGPT, Cursor and other MCP clients

Add a custom connector (remote MCP server) with `https://mcp.spectra.finance/mcp`. Clients that read JSON config:

```json
{ "mcpServers": { "spectra": { "type": "http", "url": "https://mcp.spectra.finance/mcp" } } }
```

### Codex

Add this repository as a plugin marketplace. The manifest is [`.agents/plugins/marketplace.json`](.agents/plugins/marketplace.json).

## Tools

| Tool | What it does |
| --- | --- |
| `spectra_find_yields` | Ranks fixed-rate (PT), LP and MetaVault yields across networks, filtered by asset, chain, product, TVL and maturity. |
| `spectra_get_market` | One market in full: fixed, implied, variable and LP APY, maturity, liquidity, YT leverage, addresses, volume and app links. |
| `spectra_get_market_history` | Implied-APY or volume history for a market, with a summary. |
| `spectra_get_metavault` | A MetaVault's curator, strategy, live and 30-day APY, fees and allocations, or the list of MetaVaults. |
| `spectra_get_portfolio` | A wallet's PT, YT, LP and MetaVault positions with USD values and suggested next actions. |
| `spectra_protocol_info` | Spectra concepts, risks, networks and developer resources, with links to the docs. |
| `spectra_prepare_pt_trade` | `/mcp/trade` only. Quotes a PT buy or sell; with a receiver, also returns unsigned approval and router transactions. |
| `spectra_prepare_redeem` | `/mcp/trade` only. Unsigned transactions to redeem a matured PT. |

Try: *"What are the best fixed yields on stablecoins on Spectra right now?"* or *"Review the Spectra positions of 0x…"*.

## Safety

- **Nothing is signed or broadcast.** Transaction tools return unsigned steps that the user reviews and signs in their own wallet.
- **Pinned routers.** Calldata is accepted only for the Spectra router pinned for each chain; anything else is refused.
- **Quote checks.** Quotes are cross-checked against the market price, and approvals are for the exact amount.
- **Data-quality flags.** Results carry flags such as `low_liquidity`, `apy_outlier` and `near_maturity`, and rankings hide unreliable markets by default.
- **Jurisdictions.** Tokenized-equity markets are not offered to persons in the US, UK, Canada, Australia or Singapore, so the server never lists them.

## How to read the rates

APYs are percentages. A fixed rate is locked only if the Principal Token is held to maturity; selling before maturity realizes the market price instead. Variable, LP and MetaVault APYs change over time. No rate is guaranteed, and nothing here is financial advice. Every result carries an `as_of` timestamp.

## More

- [Spectra docs](https://docs.spectra.finance) · [llms.txt](https://docs.spectra.finance/llms.txt)
- [Live market index](https://app.spectra.finance/llms.txt)
- [Data API](https://api.spectra.finance/api-docs)
- [MCP server card](https://mcp.spectra.finance/mcp/server-card)

## License

[MIT](LICENSE)
