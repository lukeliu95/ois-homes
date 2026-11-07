"""Publication guard tests. All synthetic records remain inside temporary folders."""
from copy import deepcopy
from datetime import date
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from listing_catalog import export_catalog, fact_snapshot, qualification_errors, within_age

TODAY = date(2026, 11, 7)
URL = 'https://example.com/test-listing'


def candidate(pid='TEST01'):
    return {
        'id': pid, 'name': 'Synthetic unit test fixture', 'dedupe_key': pid,
        'qualification_status': 'verified_match', 'listing_status': 'advertised',
        'building_type': 'detached_house', 'rent_yen': 300000,
        'management_fee_yen': 8000, 'built_year_month': '2017-09',
        'size_m2': 100, 'layout': '4LDK', 'public_address': 'Test address',
        'source_url': URL, 'media_collected_at': '2026-11-07',
        'verification': {key: {'verified': True, 'source_url': URL,
            'observed_at': '2026-11-07T10:00:00+09:00', 'note': 'Unit test only'}
            for key in ('detached_house', 'whole_house_rental', 'construction_date',
                        'current_price', 'current_listing', 'commute')},
        'route': {'mode': 'bicycling', 'minutes': 20, 'origin_precision': 'exact_address',
            'address_match_verified': True, 'address_to_school': True,
            'destination_verified': True, 'google_maps_url': URL,
            'observed_at': '2026-11-07', 'screenshot': 'route.png'},
        'media': [{'file': kind + '.png', 'kind': kind, 'source_url': URL}
                  for kind in ('exterior', 'floorplan', 'interior')],
    }


def curation(record):
    return {'name': 'Synthetic unit test fixture', 'neighborhood': 'Test', 'layout': '4LDK',
            'bedrooms': 4, 'moveIn': 'Test only', 'lease': 'Test only', 'parking': 'Unknown',
            'summary': 'Test only', 'attention': [], 'fees': [],
            'reviewedFacts': fact_snapshot(record)}


class PublicationGuards(unittest.TestCase):
    def test_rent_boundary_does_not_add_management_fee(self):
        self.assertEqual(qualification_errors(candidate(), TODAY), [])
        for rent in (149999, 300001):
            record = candidate()
            record['rent_yen'] = rent
            self.assertTrue(qualification_errors(record, TODAY))

    def test_unknown_fees_are_not_zero(self):
        record = candidate()
        record['management_fee_yen'] = None
        self.assertIn('management fee unknown', qualification_errors(record, TODAY))

    def test_missing_or_overlong_routes_cannot_qualify(self):
        for change in ({'minutes': 21}, {'screenshot': None},
                       {'address_match_verified': False}, {'destination_verified': False}):
            record = candidate()
            record['route'].update(change)
            self.assertTrue(qualification_errors(record, TODAY))

    def test_transit_requires_whole_journey(self):
        record = candidate()
        record['route']['mode'] = 'transit'
        self.assertTrue(qualification_errors(record, TODAY))
        record['route']['includes_waiting_and_transfer'] = True
        self.assertEqual(qualification_errors(record, TODAY), [])

    def test_actual_photos_and_floorplan_required(self):
        for kind in ('exterior', 'floorplan', 'interior'):
            record = candidate()
            record['media'] = [item for item in record['media'] if item['kind'] != kind]
            self.assertTrue(qualification_errors(record, TODAY))

    def test_rolling_age_and_unknown_boundary_day(self):
        self.assertFalse(within_age({'built_year_month': '2006-11'}, TODAY))
        self.assertTrue(within_age({'built_year_month': '2006-12'}, TODAY))
        self.assertTrue(within_age({'built_date': '2006-11-07'}, TODAY))
        self.assertFalse(within_age({'built_date': '2006-11-06'}, TODAY))

    def test_missing_or_future_evidence_fails(self):
        record = candidate()
        record['verification']['current_listing']['observed_at'] = '2026-11-08'
        self.assertTrue(qualification_errors(record, TODAY))
        record = candidate()
        record['route']['observed_at'] = '2026-11-08'
        self.assertTrue(qualification_errors(record, TODAY))

    def test_archive_and_preflight_failure_do_not_publish_bad_records(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'site'
            source = Path(directory) / 'research'
            source.mkdir()
            record = candidate()
            write_source = lambda records: (source / 'active-house-candidates.json').write_text(
                json.dumps({'candidates': records}))
            write_source([record])
            with self.assertRaisesRegex(ValueError, 'curation'):
                export_catalog(root, source, {}, TODAY)
            reviewed = curation(record)
            changed = deepcopy(record)
            changed['rent_yen'] = 290000
            write_source([changed])
            with self.assertRaisesRegex(ValueError, 'source facts changed'):
                export_catalog(root, source, {record['id']: reviewed}, TODAY)
            write_source([record])
            with self.assertRaisesRegex(ValueError, 'missing actual image'):
                export_catalog(root, source, {record['id']: reviewed}, TODAY)
            self.assertFalse((root / 'src/data/listings.json').exists())
            record['qualification_status'] = 'ended'
            write_source([record])
            result = export_catalog(root, source, {record['id']: reviewed}, TODAY)
            data = json.loads((root / 'src/data/listings.json').read_text())
            self.assertEqual(result['homes'], 0)
            self.assertEqual(data['homes'], [])
            self.assertEqual(data['archive'][0]['id'], record['id'])

    def test_duplicate_physical_unit_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory)
            first, second = candidate(), candidate('TEST02')
            second['dedupe_key'] = first['dedupe_key']
            # Existing files let preflight reach the second record; never published.
            for name in ('exterior', 'floorplan', 'interior', 'route'):
                (source / (name + '.png')).write_bytes(b'unit-test-file')
            (source / 'active-house-candidates.json').write_text(json.dumps({'candidates': [first, second]}))
            with self.assertRaisesRegex(ValueError, 'duplicate physical'):
                export_catalog(source / 'output', source,
                    {r['id']: curation(r) for r in (first, second)}, TODAY)


if __name__ == '__main__':
    unittest.main()
