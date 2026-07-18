"""Behavioural tests for the log analyser. Any optimisation must keep every
assertion green: the report bytes, the aggregates, and the unit-level
semantics are all pinned. Run with:  python3 test_logscan.py
"""

import unittest

from logscan import (
    TEST_CONFIG,
    analyse,
    load_lines,
    method_weight,
    status_class,
    top_path_per_hour,
)


class TestLogscan(unittest.TestCase):
    def test_pipeline_aggregates_and_report_bytes(self):
        s = analyse(TEST_CONFIG, "test-access.log", "test-report.out")
        self.assertEqual(s["entries"], 700)
        self.assertEqual(s["flagged"], 3)
        self.assertEqual(s["weighted"], 9072)
        self.assertEqual(s["total_bytes"], 20954254)
        self.assertEqual(s["lines_written"], 20)
        self.assertEqual(s["checksum"], 122860189)

    def test_status_class_is_stable(self):
        self.assertEqual(status_class(404), "4xx-77")
        self.assertEqual(status_class(404), "4xx-77")

    def test_method_weight_is_stable(self):
        self.assertEqual(method_weight("POST", TEST_CONFIG["seed"]), 11)

    def test_top_path_breaks_ties_lexically(self):
        entries = [
            {"path": "/b", "hour": 0},
            {"path": "/a", "hour": 0},
            {"path": "/b", "hour": 0},
            {"path": "/a", "hour": 0},
            {"path": "/c", "hour": 1},
        ]
        tops = top_path_per_hour(entries, 3)
        self.assertEqual(tops[0], (0, "/a", 2))
        self.assertEqual(tops[1], (1, "/c", 1))
        self.assertEqual(tops[2], (2, None, -1))

    def test_load_lines_round_trips(self):
        with open("test-roundtrip.log", "w") as f:
            f.write("alpha beta\ngamma delta\n")
        self.assertEqual(load_lines("test-roundtrip.log"), ["alpha beta", "gamma delta"])


if __name__ == "__main__":
    unittest.main()
