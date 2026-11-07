"""Validate reviewed public housing records and project them into website data."""
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo
import hashlib
import json
import os
import shutil
import subprocess
import tempfile

FACT_KEYS = ('rent_yen', 'management_fee_yen', 'built_year_month', 'built_date',
             'size_m2', 'layout', 'public_address', 'deposit_yen', 'key_money_yen',
             'nonrefundable_contract_one_time_yen', 'parking', 'lease', 'move_in',
             'extra_costs', 'qualification_status', 'listing_status', 'building_type',
             'unresolved_type_conflicts')
ROUTE_KEYS = ('mode', 'minutes', 'distance_km', 'elevation_up_m', 'slow_scenario_minutes',
              'address_match_verified', 'origin_precision', 'address_to_school',
              'destination_verified', 'includes_waiting_and_transfer')
PROOFS = ('detached_house', 'whole_house_rental', 'construction_date',
          'current_price', 'current_listing', 'commute')
INACTIVE = {'ended', 'excluded', 'withdrawn'}
LABELS = {'exterior': '房屋外观', 'floorplan': '原始户型图', 'interior': '室内实拍',
          'kitchen': '厨房', 'bath': '浴室', 'washroom': '洗面台', 'toilet': '卫生间'}


def fact_snapshot(record):
    facts = {key: record.get(key) for key in FACT_KEYS}
    route = record.get('route') or {}
    facts['route'] = {key: route.get(key) for key in ROUTE_KEYS}
    return facts


def valid_url(value):
    parsed = urlparse(str(value or ''))
    return parsed.scheme == 'https' and bool(parsed.hostname)


def valid_time(value):
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00')).date()
    except (ValueError, TypeError):
        return None


def numeric(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def within_age(record, today):
    try:
        if record.get('built_date'):
            built = date.fromisoformat(record['built_date'])
            try:
                boundary = today.replace(year=today.year - 20)
            except ValueError:
                boundary = date(today.year - 20, 2, 28)
            return boundary <= built <= today
        month = record['built_year_month']
        built = date.fromisoformat(month + '-01')
        boundary_month = f'{today.year - 20:04d}-{today.month:02d}'
        return built <= today and (month > boundary_month or (month == boundary_month and today.day == 1))
    except (KeyError, ValueError, TypeError):
        return False


def qualification_errors(record, today):
    errors = []
    if record.get('qualification_status') != 'verified_match':
        errors.append('not verified_match')
    if record.get('listing_status') != 'advertised':
        errors.append('not an active complete advertisement')
    if record.get('building_type') != 'detached_house' or record.get('unresolved_type_conflicts'):
        errors.append('detached whole-house type unresolved')
    if not record.get('dedupe_key'):
        errors.append('missing physical-unit identity')
    rent, fee = record.get('rent_yen'), record.get('management_fee_yen')
    if not numeric(rent) or not 150000 <= rent <= 300000:
        errors.append('monthly rent outside 150000–300000 JPY')
    if not numeric(fee) or fee < 0:
        errors.append('management fee unknown')
    if not within_age(record, today):
        errors.append('construction outside rolling 20-year limit or boundary day unknown')
    if not valid_url(record.get('source_url')):
        errors.append('missing direct listing source')
    proofs = record.get('verification') or {}
    for key in PROOFS:
        proof = proofs.get(key) or {}
        observed = valid_time(proof.get('observed_at'))
        if proof.get('verified') is not True or not valid_url(proof.get('source_url')) or not observed or observed > today or not (proof.get('note') or proof.get('evidence_file')):
            errors.append('missing auditable ' + key)
    route = record.get('route') or {}
    if route.get('mode') not in {'bicycling', 'transit'}:
        errors.append('unsupported commute mode')
    if not numeric(route.get('minutes')) or not 0 < route['minutes'] <= 20:
        errors.append('commute outside 20 minutes')
    if route.get('origin_precision') not in {'exact_address', 'exact_entrance'} or route.get('address_match_verified') is not True or route.get('address_to_school') is not True or route.get('destination_verified') is not True:
        errors.append('rental-unit address to correct school not matched')
    if route.get('mode') == 'transit' and route.get('includes_waiting_and_transfer') is not True:
        errors.append('transit omits walking, waiting or transfers')
    route_date = valid_time(route.get('observed_at'))
    if not valid_url(route.get('google_maps_url') or route.get('source_url')) or not route_date or route_date > today or not route.get('screenshot'):
        errors.append('missing actual commute source, time or screenshot')
    kinds = {image.get('kind') for image in record.get('media', [])}
    if not {'exterior', 'floorplan'}.issubset(kinds) or not kinds.intersection({'interior', 'kitchen', 'bath', 'washroom', 'toilet', 'other'}):
        errors.append('exterior, floorplan or interior photographs incomplete')
    return errors


def atomic_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, prefix='.' + path.name + '.', suffix='.tmp', delete=False) as file:
        json.dump(value, file, ensure_ascii=False, indent=2)
        file.write('\n')
        file.flush()
        os.fsync(file.fileno())
        temporary = file.name
    os.replace(temporary, path)


def source_label(url):
    host = urlparse(url).hostname or ''
    return next((label for domain, label in [('athome.co.jp', 'at home'), ('homes.co.jp', 'LIFULL HOME’S'), ('shamaison.com', '积水住宅官方'), ('able.co.jp', 'Able'), ('eheya.net', 'いい部屋'), ('suumo.jp', 'SUUMO')] if domain in host), host)


def export_catalog(root, source, curations, today, provenance_script=None):
    records = json.loads((source / 'active-house-candidates.json').read_text())['candidates']
    previous_path = root / 'src/data/listings.json'
    previous = json.loads(previous_path.read_text()) if previous_path.exists() else {}
    inventory_path = root / 'public/media/attribution.json'
    old_inventory = json.loads(inventory_path.read_text()) if inventory_path.exists() else []
    inventory = {entry['file']: entry for entry in old_inventory}
    active, archive, plans, seen = [], list(previous.get('archive', [])), [], set()
    units = set()
    for record in records:
        pid = record['id']
        if not pid.isascii() or not pid.replace('_', '').replace('-', '').isalnum():
            raise ValueError('invalid stable ID')
        if pid in seen:
            raise ValueError('duplicate stable ID ' + pid)
        seen.add(pid)
        status = record.get('qualification_status')
        if status in INACTIVE:
            archive = [row for row in archive if row['id'] != pid]
            archive.append({key: record.get(key) for key in ('id', 'name', 'source_url', 'rent_yen', 'built_year_month', 'qualification_status', 'status_note')})
            continue
        curated = curations.get(pid)
        if curated is None:
            if status == 'verified_match':
                raise ValueError(pid + ': add reviewed public curation before publication')
            continue
        if status != 'verified_match' and not curated.get('publishPending'):
            continue
        unit = record.get('dedupe_key')
        if unit and unit in units:
            raise ValueError(pid + ': duplicate physical rental unit')
        if unit:
            units.add(unit)
        if curated.get('reviewedFacts') != fact_snapshot(record):
            raise ValueError(pid + ': source facts changed; review public copy/fees and reviewedFacts')
        if status == 'verified_match':
            errors = qualification_errors(record, today)
            if errors:
                raise ValueError(pid + ': ' + '; '.join(errors))
        else:
            proof = record.get('verification', {}).get('current_listing', {})
            observed = valid_time(proof.get('observed_at'))
            if record.get('listing_status') != 'advertised' or proof.get('verified') is not True or not valid_url(proof.get('source_url')) or not observed or observed > today:
                raise ValueError(pid + ': pending public record lacks a real active advertisement')
        required = ('name', 'neighborhood', 'layout', 'bedrooms', 'moveIn', 'lease', 'parking', 'summary', 'attention', 'fees')
        if any(key not in curated for key in required):
            raise ValueError(pid + ': incomplete public reader copy')
        if not 150000 <= record['rent_yen'] <= 300000 or not within_age(record, today):
            raise ValueError(pid + ': review expired/out-of-range record before publication')
        route = record.get('route') or {}
        media = list(record.get('media', []))
        if route.get('screenshot'):
            media.append({'file': route['screenshot'], 'source_url': route.get('google_maps_url') or route.get('source_url'), 'kind': 'route', 'observed_at': route['observed_at']})
        for image in media:
            path = (source / image['file']).resolve()
            if not path.is_file() or not path.is_relative_to(source.resolve()) or not valid_url(image.get('source_url')) or not valid_time(image.get('observed_at') or record.get('media_collected_at')):
                raise ValueError(pid + ': missing actual image, source or collection date')
        archive = [row for row in archive if row['id'] != pid]
        plans.append((record, curated, media))

    for record, curated, media in plans:
        pid = record['id']
        folder = root / 'public/media' / pid
        folder.mkdir(parents=True, exist_ok=True)
        projected = []
        for image in media:
            original = source / image['file']
            digest = hashlib.sha256(original.read_bytes()).hexdigest()
            destination = folder / original.name
            public_path = '/' + str(destination.relative_to(root / 'public'))
            old = inventory.get(public_path)
            if old and old.get('sourceSha256') and old['sourceSha256'] != digest:
                destination = folder / (original.stem + '-' + digest[:10] + original.suffix)
                public_path = '/' + str(destination.relative_to(root / 'public'))
                old = inventory.get(public_path)
            observed = image.get('observed_at') or record['media_collected_at']
            if not old or old.get('sourceSha256') != digest or not destination.exists():
                shutil.copy2(original, destination)
                provenance = f"Sourced, not generated. Origin: {image['source_url']}. Observed: {observed}. Property: {pid}. Kind: {image['kind']}. Original listing and media rights remain with their respective owners. No pixel alteration."
                if provenance_script:
                    subprocess.run(['node', str(provenance_script), str(destination), '--prompt', provenance], check=True, capture_output=True)
                atomic_json(Path(str(destination) + '.json'), {'prompt': provenance, 'sourceSha256': digest})
            inventory[public_path] = {'file': public_path, 'sourceUrl': image['source_url'], 'observedAt': old.get('observedAt', observed) if old else observed, 'kind': image['kind'], 'generated': False, 'sourceSha256': digest}
            caption = curated.get('captionOverrides', {}).get(original.name) or ('公共交通全程依据' if image['kind'] == 'route' and record.get('route', {}).get('mode') == 'transit' else '公开门牌到OIS的自行车导航' if image['kind'] == 'route' else LABELS.get(image['kind'], '房屋细节'))
            projected.append({'src': public_path, 'kind': image['kind'], 'caption': caption, 'sourceUrl': image['source_url'], **{key: image[key] for key in ('width', 'height') if key in image}})
        photos = [image for image in projected if image['kind'] != 'route']
        order = curated.get('mediaOrder', [])
        photos.sort(key=lambda image: order.index(Path(image['src']).name) if Path(image['src']).name in order else len(order))
        route = record.get('route') or {}
        commute = None
        if route.get('minutes') and route.get('screenshot') and route.get('address_match_verified') is True:
            commute = {'mode': route['mode'], 'minutes': route['minutes'], 'distanceKm': route.get('distance_km'), 'ascentM': route.get('elevation_up_m'), 'slowMinutes': route.get('slow_scenario_minutes'), 'note': route.get('address_point_note') or route.get('route_summary') or '', 'url': route.get('google_maps_url') or route.get('source_url'), 'observedAt': route['observed_at'], 'image': next(image for image in projected if image['kind'] == 'route')}
        sources, urls = [], set()
        for proof in record['verification'].values():
            url = proof.get('source_url')
            if not valid_url(url) or 'google.com' in url or not valid_time(proof.get('observed_at')):
                continue
            if url in urls:
                existing = next(item for item in sources if item['url'] == url)
                if proof['observed_at'] > existing['observedAt']:
                    existing['observedAt'] = proof['observed_at']
                continue
            urls.add(url)
            sources.append({'label': source_label(url), 'url': url, 'observedAt': proof['observed_at']})
        address_url = route.get('address_source_url')
        if address_url and address_url not in urls:
            observed = route.get('address_source_observed_at') or curated.get('addressSourceObservedAt')
            if not valid_url(address_url) or not valid_time(observed):
                raise ValueError(pid + ': address-source observation date missing')
            sources.append({'label': source_label(address_url), 'url': address_url, 'observedAt': observed})
            urls.add(address_url)
        for extra in curated.get('extraSources', []):
            if valid_url(extra['url']) and valid_time(extra['observedAt']) and extra['url'] not in urls:
                sources.append(extra)
                urls.add(extra['url'])
        verified = record['qualification_status'] == 'verified_match'
        parking = record.get('parking')
        active.append({'id': pid, **{key: curated[key] for key in ('name', 'neighborhood', 'layout', 'bedrooms', 'moveIn', 'lease', 'parking', 'summary', 'attention', 'fees')}, 'formalName': record['name'], 'address': record['public_address'], 'rentYen': record['rent_yen'], 'managementFeeYen': record['management_fee_yen'], 'sizeM2': record['size_m2'], 'built': record['built_year_month'], 'status': 'verified' if verified else 'pending', 'statusNote': '已核公开广告和地址级通学证据，实际空室仍需中介确认' if verified else curated.get('statusNote', '完整门牌和到校路线待核'), 'checkedAt': record['verification']['current_listing']['observed_at'], 'parkingYen': parking.get('fee_yen') if isinstance(parking, dict) else None, 'photos': photos, 'commute': commute, 'sources': sources, 'sourceUrl': record['source_url']})
    observations = [proof['observed_at'] for record in records for proof in (record.get('verification') or {}).values() if valid_time(proof.get('observed_at'))]
    data_as_of = max(observations, default=previous.get('dataAsOf', today.isoformat()))
    payload = {'school': previous.get('school') or {'name': 'Osaka International School', 'address': '大阪府箕面市小野原西4-4-16', 'url': 'https://sois.kwansei.ac.jp/osaka-international-school/about/contacts-location'}, 'dataAsOf': data_as_of, 'homes': active, 'archive': archive}
    if '/Users/' in json.dumps(payload, ensure_ascii=False):
        raise ValueError('private machine path in public data')
    atomic_json(previous_path, payload)
    atomic_json(inventory_path, list(inventory.values()))
    return {'homes': len(active), 'verified': sum(home['status'] == 'verified' for home in active), 'archived': len(archive), 'media': len(inventory)}
