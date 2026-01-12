from enum import StrEnum
from pydantic import BaseModel
from src.shared.numbers.blueprints import NumberType


class SentenceBlueprintID(StrEnum):
    # PHONE
    CASUAL_PHONE_CALL = "casual_phone_call"
    PROFESSIONAL_CONTACT = "professional_contact"
    MISSED_CALL_MESSAGE = "missed_call_message"
    WRONG_NUMBER = "wrong_number"
    CUSTOMER_SUPPORT = "customer_support"
    APPOINTMENT_CONFIRMATION = "appointment_confirmation"
    DELIVERY_DRIVER_UPDATE = "delivery_driver_update"
    EMERGENCY_CONTACT_EXCHANGE = "emergency_contact_exchange"
    FAMILY_CHECK_IN_CALL = "family_check_in_call"

    # YEAR
    BIOGRAPHY_YEAR = "biography_year"
    HISTORICAL_REFERENCE = "historical_reference"
    MOVIE_RELEASE_YEAR = "movie_release_year"
    COMPANY_FOUNDING_YEAR = "company_founding_year"
    SCHOOL_GRADUATION_YEAR = "school_graduation_year"
    SPORTS_EVENT_YEAR = "sports_event_year"
    WEDDING_ANNIVERSARY_YEAR = "wedding_anniversary_year"
    ELECTION_YEAR = "election_year"

    # PRICE
    SHOP_PRICE = "shop_price"
    SERVICE_FEE = "service_fee"
    DISCOUNT_PRICE = "discount_price"
    SUBSCRIPTION_PRICE = "subscription_price"
    RESTAURANT_BILL = "restaurant_bill"
    ONLINE_ORDER_TOTAL = "online_order_total"
    SUPERMARKET_TOTAL = "supermarket_total"
    RENT_PAYMENT = "rent_payment"
    TRAVEL_TICKET_PRICE = "travel_ticket_price"
    HOTEL_NIGHT_RATE = "hotel_night_rate"

    # TIME (Dates & time)
    APPOINTMENT_TIME = "appointment_time"
    TRAIN_DEPARTURE_TIME = "train_departure_time"
    MEETING_TIME = "meeting_time"

    # ADDRESS & LOCATION
    HOME_ADDRESS = "home_address"
    DELIVERY_ADDRESS = "delivery_address"
    HOTEL_ADDRESS = "hotel_address"

    # STATISTICS & QUANTITIES
    POPULATION_STATISTICS = "population_statistics"
    SURVEY_PERCENTAGE = "survey_percentage"
    STUDY_SAMPLE_SIZE = "study_sample_size"

    # MEDICAL & PHARMACY
    MEDICINE_DOSAGE = "medicine_dosage"
    PHARMACY_PRESCRIPTION = "pharmacy_prescription"
    HOSPITAL_ROOM_NUMBER = "hospital_room_number"

    # BANKING & ADMINISTRATION
    BANK_ACCOUNT_REFERENCE = "bank_account_reference"
    TAX_REFERENCE_NUMBER = "tax_reference_number"
    INSURANCE_POLICY_NUMBER = "insurance_policy_number"

    # WEATHER & MEASUREMENTS
    TEMPERATURE_FORECAST = "temperature_forecast"
    RAINFALL_MEASUREMENT = "rainfall_measurement"
    WIND_SPEED_REPORT = "wind_speed_report"

    # TRANSPORT & TRAVEL
    TRAIN_PLATFORM = "train_platform"
    FLIGHT_NUMBER = "flight_number"
    BUS_LINE_NUMBER = "bus_line_number"

    # SHOPPING QUANTITIES
    GROCERY_QUANTITY = "grocery_quantity"
    MARKET_WEIGHT = "market_weight"
    PACK_COUNT = "pack_count"


class SentenceBlueprint(BaseModel):
    id: SentenceBlueprintID
    number_type: NumberType
    context: str
    description: str
    tone: str


def get_sentence_blueprints_by_type(number_type: NumberType) -> list[SentenceBlueprint]:
    """
    Returns all sentence blueprints for a given number type.
    """
    all_blueprints = [
        # =========================
        # PHONE
        # =========================
        SentenceBlueprint(
            id=SentenceBlueprintID.CASUAL_PHONE_CALL,
            number_type=NumberType.PHONE,
            context="casual_phone_call",
            description="Sharing a phone number with a friend.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.PROFESSIONAL_CONTACT,
            number_type=NumberType.PHONE,
            context="professional_contact",
            description="Giving a phone number in a business or work setting.",
            tone="professional",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.MISSED_CALL_MESSAGE,
            number_type=NumberType.PHONE,
            context="missed_call_message",
            description="Leaving a phone number on voicemail.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.WRONG_NUMBER,
            number_type=NumberType.PHONE,
            context="wrong_number",
            description="Realizing or explaining that the number dialed is incorrect.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.CUSTOMER_SUPPORT,
            number_type=NumberType.PHONE,
            context="customer_support",
            description="Calling customer service and stating a contact number.",
            tone="professional",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.APPOINTMENT_CONFIRMATION,
            number_type=NumberType.PHONE,
            context="appointment_confirmation",
            description="Confirming a phone number for an appointment or delivery.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.DELIVERY_DRIVER_UPDATE,
            number_type=NumberType.PHONE,
            context="delivery_driver_update",
            description="Giving a phone number to a delivery driver for updates.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.EMERGENCY_CONTACT_EXCHANGE,
            number_type=NumberType.PHONE,
            context="emergency_contact_exchange",
            description="Sharing a phone number to be used as an emergency contact.",
            tone="serious",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.FAMILY_CHECK_IN_CALL,
            number_type=NumberType.PHONE,
            context="family_check_in_call",
            description="Exchanging a phone number while checking in with family.",
            tone="warm",
        ),
        # =========================
        # YEAR
        # =========================
        SentenceBlueprint(
            id=SentenceBlueprintID.BIOGRAPHY_YEAR,
            number_type=NumberType.YEAR,
            context="biography_year",
            description="Mentioning a birth year or important life event.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.HISTORICAL_REFERENCE,
            number_type=NumberType.YEAR,
            context="historical_reference",
            description="Referring to a major historical event.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.MOVIE_RELEASE_YEAR,
            number_type=NumberType.YEAR,
            context="movie_release_year",
            description="Talking about the release year of a movie or album.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.COMPANY_FOUNDING_YEAR,
            number_type=NumberType.YEAR,
            context="company_founding_year",
            description="Mentioning the year a company or brand was founded.",
            tone="professional",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.SCHOOL_GRADUATION_YEAR,
            number_type=NumberType.YEAR,
            context="school_graduation_year",
            description="Stating a graduation or academic year.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.SPORTS_EVENT_YEAR,
            number_type=NumberType.YEAR,
            context="sports_event_year",
            description="Mentioning the year of a major sports event or tournament.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.WEDDING_ANNIVERSARY_YEAR,
            number_type=NumberType.YEAR,
            context="wedding_anniversary_year",
            description="Talking about the year of a wedding or relationship anniversary.",
            tone="warm",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.ELECTION_YEAR,
            number_type=NumberType.YEAR,
            context="election_year",
            description="Referring to the year of an important election.",
            tone="neutral",
        ),
        # =========================
        # PRICE
        # =========================
        SentenceBlueprint(
            id=SentenceBlueprintID.SHOP_PRICE,
            number_type=NumberType.PRICE,
            context="shop_price",
            description="Asking for or stating the price of an item in a shop.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.SERVICE_FEE,
            number_type=NumberType.PRICE,
            context="service_fee",
            description="Discussing the cost of a service or professional fee.",
            tone="professional",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.DISCOUNT_PRICE,
            number_type=NumberType.PRICE,
            context="discount_price",
            description="Mentioning a discounted or promotional price.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.SUBSCRIPTION_PRICE,
            number_type=NumberType.PRICE,
            context="subscription_price",
            description="Talking about a monthly or yearly subscription cost.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.RESTAURANT_BILL,
            number_type=NumberType.PRICE,
            context="restaurant_bill",
            description="Stating the total amount to pay at a restaurant.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.ONLINE_ORDER_TOTAL,
            number_type=NumberType.PRICE,
            context="online_order_total",
            description="Confirming the total price of an online order.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.SUPERMARKET_TOTAL,
            number_type=NumberType.PRICE,
            context="supermarket_total",
            description="Stating the total amount to pay at a supermarket checkout.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.RENT_PAYMENT,
            number_type=NumberType.PRICE,
            context="rent_payment",
            description="Talking about the monthly amount of rent to pay.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.TRAVEL_TICKET_PRICE,
            number_type=NumberType.PRICE,
            context="travel_ticket_price",
            description="Discussing the price of a train, bus, or plane ticket.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.HOTEL_NIGHT_RATE,
            number_type=NumberType.PRICE,
            context="hotel_night_rate",
            description="Mentioning the price per night for a hotel room.",
            tone="professional",
        ),
        # =========================
        # TIME (Dates & time)
        # =========================
        SentenceBlueprint(
            id=SentenceBlueprintID.APPOINTMENT_TIME,
            number_type=NumberType.TIME,
            context="appointment_time",
            description="Giving the time of a medical or personal appointment.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.TRAIN_DEPARTURE_TIME,
            number_type=NumberType.TIME,
            context="train_departure_time",
            description="Announcing or checking the departure time of a train.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.MEETING_TIME,
            number_type=NumberType.TIME,
            context="meeting_time",
            description="Confirming the time of a work or school meeting.",
            tone="professional",
        ),
        # =========================
        # ADDRESS & LOCATION
        # =========================
        SentenceBlueprint(
            id=SentenceBlueprintID.HOME_ADDRESS,
            number_type=NumberType.ADDRESS,
            context="home_address",
            description="Mentioning the street number of a home address.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.DELIVERY_ADDRESS,
            number_type=NumberType.ADDRESS,
            context="delivery_address",
            description="Giving the street number for a delivery address.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.HOTEL_ADDRESS,
            number_type=NumberType.ADDRESS,
            context="hotel_address",
            description="Checking or confirming the street number of a hotel.",
            tone="neutral",
        ),
        # =========================
        # STATISTICS & QUANTITIES
        # =========================
        SentenceBlueprint(
            id=SentenceBlueprintID.POPULATION_STATISTICS,
            number_type=NumberType.STATISTICS,
            context="population_statistics",
            description="Talking about the population of a city or country.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.SURVEY_PERCENTAGE,
            number_type=NumberType.STATISTICS,
            context="survey_percentage",
            description="Mentioning a percentage from a survey or poll.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.STUDY_SAMPLE_SIZE,
            number_type=NumberType.STATISTICS,
            context="study_sample_size",
            description="Referring to the number of people in a study or group.",
            tone="professional",
        ),
        # =========================
        # MEDICAL & PHARMACY
        # =========================
        SentenceBlueprint(
            id=SentenceBlueprintID.MEDICINE_DOSAGE,
            number_type=NumberType.MEDICAL,
            context="medicine_dosage",
            description="Giving the dosage of a medicine (mg, ml, etc.).",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.PHARMACY_PRESCRIPTION,
            number_type=NumberType.MEDICAL,
            context="pharmacy_prescription",
            description="Talking to a pharmacist about how many pills or boxes to take.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.HOSPITAL_ROOM_NUMBER,
            number_type=NumberType.MEDICAL,
            context="hospital_room_number",
            description="Mentioning a hospital room or ward number.",
            tone="neutral",
        ),
        # =========================
        # BANKING & ADMINISTRATION
        # =========================
        SentenceBlueprint(
            id=SentenceBlueprintID.BANK_ACCOUNT_REFERENCE,
            number_type=NumberType.BANKING,
            context="bank_account_reference",
            description="Giving a shortened bank account reference or number.",
            tone="professional",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.TAX_REFERENCE_NUMBER,
            number_type=NumberType.BANKING,
            context="tax_reference_number",
            description="Mentioning a tax or social security reference number.",
            tone="professional",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.INSURANCE_POLICY_NUMBER,
            number_type=NumberType.BANKING,
            context="insurance_policy_number",
            description="Stating an insurance contract or policy number.",
            tone="professional",
        ),
        # =========================
        # WEATHER & MEASUREMENTS
        # =========================
        SentenceBlueprint(
            id=SentenceBlueprintID.TEMPERATURE_FORECAST,
            number_type=NumberType.WEATHER,
            context="temperature_forecast",
            description="Talking about the forecast temperature in degrees.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.RAINFALL_MEASUREMENT,
            number_type=NumberType.WEATHER,
            context="rainfall_measurement",
            description="Mentioning the amount of rain expected or recorded.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.WIND_SPEED_REPORT,
            number_type=NumberType.WEATHER,
            context="wind_speed_report",
            description="Talking about wind speed in a weather report.",
            tone="neutral",
        ),
        # =========================
        # TRANSPORT & TRAVEL
        # =========================
        SentenceBlueprint(
            id=SentenceBlueprintID.TRAIN_PLATFORM,
            number_type=NumberType.TRANSPORT,
            context="train_platform",
            description="Announcing the platform number for a train.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.FLIGHT_NUMBER,
            number_type=NumberType.TRANSPORT,
            context="flight_number",
            description="Mentioning a flight number at the airport.",
            tone="neutral",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.BUS_LINE_NUMBER,
            number_type=NumberType.TRANSPORT,
            context="bus_line_number",
            description="Talking about a bus or tram line number.",
            tone="casual",
        ),
        # =========================
        # SHOPPING QUANTITIES
        # =========================
        SentenceBlueprint(
            id=SentenceBlueprintID.GROCERY_QUANTITY,
            number_type=NumberType.QUANTITY,
            context="grocery_quantity",
            description="Saying how many items or packets to buy in a supermarket.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.MARKET_WEIGHT,
            number_type=NumberType.QUANTITY,
            context="market_weight",
            description="Talking about kilos or grams of fruit and vegetables at a market.",
            tone="casual",
        ),
        SentenceBlueprint(
            id=SentenceBlueprintID.PACK_COUNT,
            number_type=NumberType.QUANTITY,
            context="pack_count",
            description="Mentioning how many packs or bottles are needed.",
            tone="neutral",
        ),
    ]

    return [bp for bp in all_blueprints if bp.number_type == number_type]
