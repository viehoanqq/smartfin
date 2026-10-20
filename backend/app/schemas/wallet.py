from pydantic import BaseModel, ConfigDict


class WalletResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str | None = None
    initial_balance: int | None = 0
    balance: int | None = 0
