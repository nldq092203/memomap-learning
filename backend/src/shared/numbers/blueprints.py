from enum import StrEnum
from typing import Any
from pydantic import BaseModel


class NumberType(StrEnum):
    YEAR = "YEAR"
    PHONE = "PHONE"
    PRICE = "PRICE"
    TIME = "TIME"
    ADDRESS = "ADDRESS"
    STATISTICS = "STATISTICS"
    MEDICAL = "MEDICAL"
    BANKING = "BANKING"
    WEATHER = "WEATHER"
    TRANSPORT = "TRANSPORT"
    QUANTITY = "QUANTITY"


class NumberBlueprint(BaseModel):
    id: str
    number_type: NumberType
    difficulty: str
    rules: dict[str, Any]


def get_all_number_blueprints() -> list[NumberBlueprint]:
    """
    Returns all defined number blueprints.
    """
    return [
        # Years (already used)
        NumberBlueprint(
            id="year_1900_1999",
            number_type=NumberType.YEAR,
            difficulty="medium",
            rules={
                "min": 1900,
                "max": 1999,
            },
        ),
        # Phone numbers (French mobile style)
        NumberBlueprint(
            id="phone_fr_mobile",
            number_type=NumberType.PHONE,
            difficulty="hard",
            rules={
                "country": "FR",
                "prefix": "06",
                "total_digits": 10,
            },
        ),
        # Prices (euros with decimals)
        NumberBlueprint(
            id="price_basic_euro",
            number_type=NumberType.PRICE,
            difficulty="easy",
            rules={
                "currency": "EUR",
                "min": 5.00,
                "max": 5000.00,
                "decimals": 2,
            },
        ),
        # Time of day (24h, HH:MM)
        NumberBlueprint(
            id="time_24h_basic",
            number_type=NumberType.TIME,
            difficulty="medium",
            rules={
                "min_hour": 6,
                "max_hour": 22,
                "min_minute": 0,
                "max_minute": 59,
            },
        ),
        # Street / room numbers for addresses & locations
        NumberBlueprint(
            id="address_street_number",
            number_type=NumberType.ADDRESS,
            difficulty="easy",
            rules={
                "min": 1,
                "max": 999,
            },
        ),
        # Statistics & quantities (generic counts)
        NumberBlueprint(
            id="statistics_basic_count",
            number_type=NumberType.STATISTICS,
            difficulty="medium",
            rules={
                "min": 1,
                "max": 1000,
            },
        ),
        # Medical & pharmacy (dosage, units in sentence)
        NumberBlueprint(
            id="medical_dosage_basic",
            number_type=NumberType.MEDICAL,
            difficulty="medium",
            rules={
                "min": 1,
                "max": 1000,
            },
        ),
        # Banking & administration (reference / amounts as plain numbers)
        NumberBlueprint(
            id="banking_reference_basic",
            number_type=NumberType.BANKING,
            difficulty="medium",
            rules={
                "min": 100,
                "max": 9999,
            },
        ),
        # Weather & measurements (temperature etc., units in sentence)
        NumberBlueprint(
            id="weather_measurement_basic",
            number_type=NumberType.WEATHER,
            difficulty="easy",
            rules={
                "min": 0,
                "max": 50,
            },
        ),
        # Transport & travel (line/platform/flight numbers as ints)
        NumberBlueprint(
            id="transport_line_basic",
            number_type=NumberType.TRANSPORT,
            difficulty="easy",
            rules={
                "min": 1,
                "max": 999,
            },
        ),
        # Shopping quantities (counts for items / weights)
        NumberBlueprint(
            id="shopping_quantity_basic",
            number_type=NumberType.QUANTITY,
            difficulty="easy",
            rules={
                "min": 1,
                "max": 100,
            },
        ),
    ]
