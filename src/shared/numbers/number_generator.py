import random

from src.shared.numbers.blueprints import (
    NumberBlueprint,
    NumberType,
    get_all_number_blueprints,
)


def generate_number(blueprint: NumberBlueprint, seed: int | None = None) -> str:
    """
    Generate a number string based on the provided blueprint.
    Deterministic given blueprint + seed.
    """
    rng = random.Random(seed) if seed is not None else random

    if blueprint.number_type == NumberType.YEAR:
        min_val = blueprint.rules.get("min", 1900)
        max_val = blueprint.rules.get("max", 2025)
        return str(rng.randint(min_val, max_val))

    if blueprint.number_type == NumberType.TIME:
        min_hour = blueprint.rules.get("min_hour", 0)
        max_hour = blueprint.rules.get("max_hour", 23)
        min_minute = blueprint.rules.get("min_minute", 0)
        max_minute = blueprint.rules.get("max_minute", 59)

        hour = rng.randint(min_hour, max_hour)
        minute = rng.randint(min_minute, max_minute)
        return f"{hour:02d}:{minute:02d}"

    if blueprint.number_type == NumberType.PHONE:
        prefix = blueprint.rules.get("prefix", "06")
        total_digits = blueprint.rules.get("total_digits", 10)
        remaining_digits = total_digits - len(prefix)

        suffix = "".join(str(rng.randint(0, 9)) for _ in range(remaining_digits))
        return f"{prefix}{suffix}"

    if blueprint.number_type == NumberType.PRICE:
        min_val = blueprint.rules.get("min", 5.00)
        max_val = blueprint.rules.get("max", 5000.00)
        decimals = blueprint.rules.get("decimals", 2)

        factor = 10**decimals
        min_cents = int(min_val * factor)
        max_cents = int(max_val * factor)

        value = rng.randint(min_cents, max_cents)
        return f"{value / factor:.{decimals}f}"

    if blueprint.number_type in {
        NumberType.ADDRESS,
        NumberType.STATISTICS,
        NumberType.MEDICAL,
        NumberType.BANKING,
        NumberType.WEATHER,
        NumberType.TRANSPORT,
        NumberType.QUANTITY,
    }:
        min_val = blueprint.rules.get("min", 0)
        max_val = blueprint.rules.get("max", 9999)
        return str(rng.randint(min_val, max_val))

    raise ValueError(f"Unsupported number type: {blueprint.number_type}")


def sample_digits_for_type(number_type: NumberType, seed: int | None = None) -> str:
    """
    Deterministically sample a digit string for the given number type
    by selecting a blueprint and generating a value from its rules.
    """
    rng = random.Random(seed) if seed is not None else random

    blueprints = [
        bp for bp in get_all_number_blueprints() if bp.number_type == number_type
    ]
    if not blueprints:
        raise ValueError(f"No number blueprints registered for type {number_type}")

    blueprint = rng.choice(blueprints)
    sub_seed = rng.randint(0, 2**31 - 1) if seed is not None else None

    return generate_number(blueprint, seed=sub_seed)
