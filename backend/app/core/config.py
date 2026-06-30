"""App configuration, loaded from environment variables / .env file."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Soroban / contract
    SOROBAN_RPC_URL: str = "https://soroban-testnet.stellar.org"
    SOROBAN_NETWORK_PASSPHRASE: str = "Test SDF Network ; September 2015"
    CONTRACT_ID: str = ""

    # Oracle sources (see app/services/oracle.py)
    REFLECTOR_CONTRACT_ID: str = ""
    DIA_ORACLE_CONTRACT_ID: str = ""

    # Real spot price reference, for the reconciliation dashboard.
    # v0 uses a placeholder / manually-set value; a real integration
    # would call a forex/commodities price API here. Tracked as an
    # open issue rather than wired to a paid API by default.
    SPOT_PRICE_PROVIDER: str = "manual"

    # Supabase (price history)
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # Upstash Redis (live price cache)
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""

    # Deviation alert threshold, in basis points, between aggregated
    # on-chain price and real spot XAUUSD.
    DEVIATION_ALERT_THRESHOLD_BPS: int = 50  # 0.5%

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]


settings = Settings()
