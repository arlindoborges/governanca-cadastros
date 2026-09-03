from uuid import uuid4

from app.imports.deletion import _chunks, delete_progress_total


def test_chunks_splits_values_without_empty_tail() -> None:
    values = [uuid4() for _ in range(12)]

    assert _chunks(values, 5) == [values[0:5], values[5:10], values[10:12]]
    assert _chunks([], 5) == []
    assert _chunks(values[:3], 500) == [values[:3]]


def test_delete_progress_total_reserves_both_record_phases() -> None:
    assert delete_progress_total(0) == 9
    assert delete_progress_total(3785) == 6 + (2 * 3785) + 1
