def format_with_pauses(
    sentence: str,
    spoken_chunks: list[str],
    pause: bool = True,
) -> str:
    """
    Inserts natural pauses (ellipses) between spoken number chunks in a sentence.
    """
    if len(spoken_chunks) < 2:
        return sentence

    formatted = sentence
    current_pos = 0
    positions = []

    # Locate all chunks in order
    for chunk in spoken_chunks:
        start = formatted.find(chunk, current_pos)
        if start == -1:
            # Defensive fallback if AI violated constraints
            return sentence
        end = start + len(chunk)
        positions.append((start, end))
        current_pos = end

    # Insert pauses BEFORE each chunk except the first
    # Work backwards to preserve indices
    for i in range(len(positions) - 1, 0, -1):
        start, _ = positions[i]
        formatted = formatted[:start] + ("… " if pause else "") + formatted[start:]

    return formatted
