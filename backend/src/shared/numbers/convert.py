from src.shared.numbers.blueprints import NumberType


def int_to_french(n: int) -> str:
    """
    Converts an integer (0–9999) to its French text representation.
    This function is GENERIC and should NOT be used directly
    for special pedagogical cases like YEARS.
    """
    if n == 0:
        return "zéro"

    parts = []

    # Thousands
    if n >= 1000:
        thousands = n // 1000
        remainder = n % 1000

        if thousands == 1:
            parts.append("mille")
        else:
            parts.append(f"{int_to_french(thousands)} mille")

        n = remainder

    # Hundreds
    if n >= 100:
        hundreds = n // 100
        remainder = n % 100

        if hundreds == 1:
            if remainder == 0:
                parts.append("cent")
            else:
                parts.append("cent")
        else:
            if remainder == 0:
                parts.append(f"{int_to_french(hundreds)} cents")
            else:
                parts.append(f"{int_to_french(hundreds)} cent")

        n = remainder

    if n == 0:
        return " ".join(parts)

    # 0–99
    parts.append(_convert_0_99(n))
    return " ".join(parts)


def _convert_0_99(n: int) -> str:
    """
    Converts an integer (0–99) to French.
    Handles all French irregularities (70s, 80s, 90s).
    """
    units = [
        "", "un", "deux", "trois", "quatre",
        "cinq", "six", "sept", "huit", "neuf"
    ]

    teens = [
        "dix", "onze", "douze", "treize", "quatorze",
        "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"
    ]

    tens = [
        "", "dix", "vingt", "trente", "quarante",
        "cinquante", "soixante"
    ]

    if n < 10:
        return units[n]

    if 10 <= n < 20:
        return teens[n - 10]

    ten = n // 10
    unit = n % 10

    # 70–79 → soixante + teens
    if ten == 7:
        base = "soixante"
        remainder = n - 60
        if remainder == 11:
            return f"{base}-et-onze"
        return f"{base}-{_convert_0_99(remainder)}"

    # 90–99 → quatre-vingt + teens
    if ten == 9:
        base = "quatre-vingt"
        remainder = n - 80
        return f"{base}-{_convert_0_99(remainder)}"

    # 80–89
    if ten == 8:
        if unit == 0:
            return "quatre-vingts"
        return f"quatre-vingt-{units[unit]}"

    # Regular tens (20–69)
    base = tens[ten]

    if unit == 0:
        return base

    if unit == 1:
        return f"{base}-et-un"

    return f"{base}-{units[unit]}"


def number_to_spoken_chunks(digits: str, number_type: NumberType) -> list[str]:
    """
    Converts a digit string into SPOKEN FRENCH CHUNKS.
    This is pedagogical, deterministic, and reversible.
    """
    chunks: list[str] = []

    # =========================
    # YEAR (e.g. 1998)
    # =========================
    if number_type == NumberType.YEAR:
        # Expecting 4-digit years (as per blueprints, currently 1900–1999).
        if len(digits) == 4:
            year = int(digits)
            first_two = int(digits[:2])   # 19
            last_two = int(digits[2:])    # 98

            # For 1900–1999, spoken French uses:
            #   1998 → "mille neuf cent" + "quatre-vingt-dix-huit"
            # not "mille dix-neuf cent".
            if 1900 <= year <= 1999 and first_two == 19:
                chunks.append("mille neuf cent")
                if last_two > 0:
                    chunks.append(int_to_french(last_two))
            else:
                # Generic fallback: treat the entire year as one number.
                chunks.append(int_to_french(year))
        else:
            # Fallback (should not happen with current blueprints)
            chunks.append(int_to_french(int(digits)))

    # =========================
    # TIME (e.g. 14:35)
    # =========================
    elif number_type == NumberType.TIME:
        if ":" in digits:
            hour_str, minute_str = digits.split(":", 1)
        elif len(digits) == 4:
            hour_str, minute_str = digits[:2], digits[2:]
        else:
            # Fallback: treat as a plain integer time-like number.
            try:
                chunks.append(int_to_french(int(digits)))
            except ValueError:
                chunks.append(digits)
            return chunks

        try:
            hour = int(hour_str)
            minute = int(minute_str or "0")
        except ValueError:
            # Fallback to generic behaviour if parsing fails
            try:
                chunks.append(int_to_french(int(digits)))
            except ValueError:
                chunks.append(digits)
            return chunks

        # "quatorze heures" / "sept heures"
        chunks.append(f"{int_to_french(hour)} heures")

        # Minutes only if non-zero, e.g. "trente-cinq"
        if minute > 0:
            chunks.append(int_to_french(minute))

    # =========================
    # PHONE (e.g. 0632487091)
    # =========================
    elif number_type == NumberType.PHONE:
        # Split into pairs
        for i in range(0, len(digits), 2):
            pair = digits[i:i + 2]

            if len(pair) != 2:
                continue

            value = int(pair)

            # Leading zero pairs → "zéro six", "zéro zéro"
            if pair.startswith("0"):
                chunks.append(f"zéro {int_to_french(value)}")
            else:
                chunks.append(int_to_french(value))

    # =========================
    # PRICE (e.g. 1235.50)
    # =========================
    elif number_type == NumberType.PRICE:
        if "." in digits:
            integer_part, decimal_part = digits.split(".")
        else:
            integer_part, decimal_part = digits, "00"

        euros = int(integer_part)
        cents = int(decimal_part)

        chunks.append(f"{int_to_french(euros)} euros")

        if cents > 0:
            chunks.append(int_to_french(cents))

    # =========================
    # ADDRESS / STATISTICS / MEDICAL / BANKING / WEATHER /
    # TRANSPORT / QUANTITY
    # =========================
    elif number_type in (
        NumberType.ADDRESS,
        NumberType.STATISTICS,
        NumberType.MEDICAL,
        NumberType.BANKING,
        NumberType.WEATHER,
        NumberType.TRANSPORT,
        NumberType.QUANTITY,
    ):
        try:
            value = int(digits)
            chunks.append(int_to_french(value))
        except ValueError:
            chunks.append(digits)

    # =========================
    # FALLBACK
    # =========================
    else:
        chunks.append(digits)

    return chunks
