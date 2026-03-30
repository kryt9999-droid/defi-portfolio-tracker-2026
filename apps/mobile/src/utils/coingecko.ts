const coinGeckoMap: Record<string, string> = {
  ETH: "ethereum",
  WETH: "weth",
  BTC: "bitcoin",
  WBTC: "wrapped-bitcoin",
  SOL: "solana",
  AVAX: "avalanche-2",
  BNB: "binancecoin",
  MATIC: "matic-network",
  POL: "matic-network",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  OP: "optimism",
  ARB: "arbitrum",
  AERO: "aerodrome-finance",
  JUP: "jupiter-exchange-solana"
};

function parseAssets(assets: string) {
  return assets
    .split(",")
    .map((entry) => entry.trim())
    .map((entry) => {
      const match = entry.match(/([\d.]+)\s+([A-Za-z0-9_-]+)/);
      if (!match) {
        return null;
      }

      return {
        quantity: Number(match[1]),
        symbol: match[2].toUpperCase()
      };
    })
    .filter((entry): entry is { quantity: number; symbol: string } => Boolean(entry));
}

export async function fetchCurrentValueFromAssets(assets: string) {
  const holdings = parseAssets(assets);
  if (holdings.length === 0) {
    throw new Error("Use asset notes like `1.2 ETH, 500 USDC` for price refresh.");
  }

  const ids = holdings
    .map((holding) => coinGeckoMap[holding.symbol])
    .filter(Boolean)
    .join(",");

  if (!ids) {
    throw new Error("No CoinGecko mapping available for the provided assets.");
  }

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
  );
  if (!response.ok) {
    throw new Error("CoinGecko refresh failed.");
  }

  const payload = (await response.json()) as Record<string, { usd: number }>;
  return holdings.reduce((sum, holding) => {
    const id = coinGeckoMap[holding.symbol];
    const price = id ? payload[id]?.usd ?? 0 : 0;
    return sum + price * holding.quantity;
  }, 0);
}
