"""Behavioral tests for the formal candidate feed (standard library only)."""
import io
import unittest

from src.research import candidate_feed as feed


class CandidateFeedTests(unittest.TestCase):
    def test_inventory_and_workbook_boundaries(self):
        self.assertEqual(len(feed.ALPHABET), 32)
        self.assertEqual(feed.ALPHABET[:2], ('Txy+', 'Txy-'))
        self.assertEqual(feed.ALPHABET[-2:], ('Pzw+', 'Pzw-'))
        self.assertEqual(feed.word_at(0), ())
        self.assertEqual(feed.word_at(1), ('Txy+',))
        self.assertEqual(feed.word_at(32), ('Pzw-',))
        self.assertEqual(feed.word_at(33), ('Txy+', 'Txy+'))
        self.assertEqual(feed.word_at(1057), ('Txy+', 'Txy+', 'Txy+'))
        self.assertEqual(feed.word_at(33824), ('Pzw-', 'Pzw-', 'Pzw-'))
        self.assertEqual(feed.word_count(3), 33825)
        self.assertEqual(feed.word_id(('Txy+',)), 'P00001')

    def test_round_trip_all_bounded_words(self):
        for rank in range(feed.word_count(3)):
            self.assertEqual(feed.rank_word(feed.word_at(rank)), rank)

    def test_repetitions_order_and_long_words(self):
        a = ('Txy+', 'Pyz-', 'Lw+', 'Pyz-', 'Txy+')
        b = ('Txy+', 'Lw+', 'Pyz-', 'Pyz-', 'Txy+')
        self.assertNotEqual(feed.word_id(a), feed.word_id(b))
        self.assertEqual(feed.word_at(feed.rank_word(a)), a)
        self.assertEqual(feed.parse_word('Txy+ · Pyz− · Lw+'), a[:3])
        self.assertEqual(feed.parse_word('Txy+ → Pyz- → Lw+'), a[:3])
        self.assertEqual(feed.parse_word('∅'), ())
        self.assertEqual(feed.parse_word('empty word'), ())

    def test_invalid_or_ambiguous_operation_fails(self):
        for text in ('Txy+;Lx+', 'Txy', 'Txy+ · ', 'Lxy+', 'Pwx+', 'tyz+'):
            with self.subTest(text=text), self.assertRaises(ValueError):
                feed.parse_word(text)
        with self.assertRaises(ValueError):
            feed.word_at(-1)

    def test_unbounded_pairing_and_bounded_cartesian_order(self):
        for a in range(20):
            for b in range(20):
                self.assertEqual(feed.unpair(feed.pair(a, b)), (a, b))
        for rank in range(3000):
            words = feed.unbounded_triple_at(rank)
            a, b, c = map(feed.rank_word, words)
            self.assertEqual(feed.pair(a, feed.pair(b, c)), rank)
        self.assertEqual(feed.bounded_triple_at(1, 1), ((), (), ('Txy+',)))
        n = feed.word_count(1)
        self.assertEqual(feed.bounded_triple_at(n, 1), ((), ('Txy+',), ()))
        with self.assertRaises(ValueError):
            feed.bounded_triple_at(n ** 3, 1)

    def test_explorer_csv_words_and_triples(self):
        word_csv = io.StringIO('Row,Ordered operation sequence,Length,Geometry / boundary status\r\n'
                               '1,∅,0,Not defined / not tested\r\n'
                               '42,Txy+ · Pxy−,2,Not defined / not tested\r\n')
        rows = list(feed.read_explorer_csv(word_csv))
        self.assertEqual(rows[0][1].candidate_id, 'P00000')
        self.assertEqual(rows[1][1].operations, ('Txy+', 'Pxy-'))
        triple_csv = io.StringIO('Row,Piece A sequence,Piece B sequence,Piece C sequence,Gluing / closure / smoothness\n'
                                 '1,∅,Txy+,Pzw−,Not specified / not tested\n')
        result = list(feed.read_explorer_csv(triple_csv))[0][1]
        self.assertEqual(result.candidate_id, 'TR-P00000-P00001-P00032')
        self.assertEqual(result.pieces[2].operations, ('Pzw-',))

    def test_rejects_bad_csv_and_mismatched_length(self):
        for data in ('x,y\n1,2\n',
                     'Row,Ordered operation sequence,Length\n1,Txy+,2\n',
                     'Row,Ordered operation sequence,Length\n0,Txy+,1\n'):
            with self.subTest(data=data), self.assertRaises(ValueError):
                list(feed.read_explorer_csv(io.StringIO(data)))


if __name__ == '__main__':
    unittest.main()

