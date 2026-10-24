from pydantic import BaseModel, ConfigDict, Field, field_validator


def _clean_keywords(values: list[str] | None) -> list[str]:
    seen, out = set(), []
    for v in values or []:
        k = v.strip()
        if k and k.lower() not in seen:
            seen.add(k.lower())
            out.append(k)
    return out


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    keywords: list[str] = Field(default_factory=list, max_length=50)

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Tên danh mục không được để trống")
        return v

    @field_validator("keywords")
    @classmethod
    def clean_keywords(cls, v: list[str]) -> list[str]:
        return _clean_keywords(v)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    keywords: list[str] | None = Field(default=None, max_length=50)
    is_hidden: bool | None = None

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Tên danh mục không được để trống")
        return v

    @field_validator("keywords")
    @classmethod
    def clean_keywords(cls, v: list[str] | None) -> list[str] | None:
        return None if v is None else _clean_keywords(v)


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    keywords: list[str] = Field(default_factory=list)
    is_hidden: bool


class CategoryMerge(BaseModel):
    target_id: int


class CategoryMergeResult(BaseModel):
    source_id: int
    target_id: int
    transactions_moved: int
    budgets_moved: int
    budgets_combined: int
    examples_moved: int
