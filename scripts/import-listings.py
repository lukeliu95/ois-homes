#!/usr/bin/env python3
"""Whitelist public housing facts and copy only their actual media into this site."""
import argparse
import json
import shutil
import subprocess
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True, help='Directory containing active-house-candidates.json')
parser.add_argument('--provenance-script', type=Path, help='Optional impeccable embed-prompt.mjs')
args = parser.parse_args()
source = args.source.resolve()
records = json.loads((source / 'active-house-candidates.json').read_text())['candidates']
labels = {'exterior': '房屋外观', 'floorplan': '原始户型图', 'interior': '室内实拍', 'kitchen': '厨房', 'bath': '浴室', 'washroom': '洗面台', 'toilet': '卫生间', 'other': '房屋细节'}
curation = {
    'N002': {
        'name': '箕面3丁目 A栋', 'neighborhood': '箕面 · 箕面3丁目', 'layout': '4LDK', 'bedrooms': 4,
        'moveIn': '广告指定12月20日，跨站日期有差异', 'lease': '普通借家 · 2年', 'parking': '1台，另1.5万日元/月',
        'summary': '四间卧室，更接近20万预算。月租加一个车位19.5万日元，其他费用另计。',
        'attention': ['入住日期跨站不一致，当前at home指定2026年12月20日，实际交付日待确认。', '到校导航15分钟；按12公里/小时加3分钟缓冲，慢骑情景约23分钟。', '除4LDK/4SLDK口径不同，Able与at home的户型房间分配和面积也有差异；先展示主广告at home版本，正式户型待核。'],
        'fees': [('月租', '18万日元'), ('管理费', '无'), ('停车', '1台，1.5万日元/月'), ('每月支持服务', '1,210日元'), ('每月保证费', '月总付额的2%'), ('押金 / 礼金', '无 / 36万日元'), ('初次保证费', '月总付额的50%'), ('清洁 / 换锁 / 消毒', '94,100 / 33,000 / 16,500日元'), ('保险', '2年20,000日元，最终报价待核'), ('中介费（Able来源）', '99,000日元'), ('续约费', '9万日元')],
    },
    'N003': {
        'name': '箕面3丁目 B栋', 'neighborhood': '箕面 · 箕面3丁目', 'layout': '4LDK', 'bedrooms': 4,
        'moveIn': '广告标即入住，实际空室待确认', 'lease': '2年 · 普通或定期借家待核', 'parking': '广告含停车，台数待核',
        'summary': '125.5㎡，三间洋室加一间和室。月租24万日元，另有50万不可退契约金。',
        'attention': ['月租较20万目标高4万；官方的50万契约一时金不可退还，另有押金5万。', 'A/B栋共用3-6-25门牌，官方广告明确对应B000，但实际玄关未现场核查。', '到校导航15分钟；按12公里/小时加3分钟缓冲，慢骑情景约23.5分钟。'],
        'fees': [('月租', '24万日元'), ('管理费', '无'), ('停车', '包含，台数待核'), ('每月支持服务', '1,320日元'), ('每月保证费', '月租等费用的2%'), ('押金', '5万日元'), ('不可退契约金', '50万日元'), ('初次保证费', '33,000日元'), ('清洁 / 换锁', '150,000 / 16,500日元'), ('中介费（at home来源）', '1.1个月租金'), ('保险', '必须，金额待核'), ('续约费', '新月租1个月')],
    },
    'N001': {
        'name': '粟生间谷西 · 车库住宅', 'neighborhood': '箕面 · 粟生间谷西5丁目', 'layout': '1SLDK', 'bedrooms': 1,
        'moveIn': '协商或即入住，跨站口径不同', 'lease': '2年 · 普通或定期借家待核', 'parking': '广告含2台，尺寸与停放方式待核',
        'summary': '2024年建，车库是这套房的重点。只有一间卧室，适合重视停车空间的人取舍。',
        'attention': ['1楼主要为车库；77.83㎡是广告面积，是否包含车库、净居住面积多少仍待核。', '两个当前广告的建材和入住日期有冲突，分别写木造/轻钢、协商/即入住。', '月租25万日元，较20万目标高5万；户型原图640×243，放大不会增加细节。'],
        'fees': [('月租', '25万日元'), ('管理费', '无'), ('停车', '广告含2台，实际尺寸待核'), ('押金 / 礼金', '无 / 50万日元'), ('其他初期费用', '尚未取得完整报价，不按0计算')],
    },
    'N004': {
        'name': '箕面6丁目独栋', 'neighborhood': '箕面 · 箕面6丁目', 'layout': '3LDK', 'bedrooms': 3,
        'moveIn': '广告标即入住，实际空室待确认', 'lease': '定期借家至2037年3月；法人普通借家可商谈', 'parking': '1台免费，第2台另1万日元/月',
        'summary': '16万日元的年轻独栋线索；缺完整门牌和到校路线，暂不列入20分钟已核结果。',
        'attention': ['当前只公开到箕面6丁目，没有取得对应这套房的完整门牌，不能给出准确到校时间。', 'SUUMO明确写定期借家至2037年3月，法人普通借家可商谈；不把另一站的2年字段当普通租约。'],
        'fees': [('月租', '16万日元'), ('管理费', '无'), ('停车', '1台免费，第2台另1万日元/月'), ('押金 / 礼金', '16万 / 32万日元'), ('其他费用', '完整报价待核')],
    },
}
homes = []
inventory = []
for record in records:
    pid = record['id']
    if pid not in curation:
        raise SystemExit(f'{pid}: add reviewed reader-facing facts before importing a new public record')
    if not 150000 <= record['rent_yen'] <= 300000:
        continue
    curated = curation[pid]
    reviewed_rents = {'N001': 250000, 'N002': 180000, 'N003': 240000, 'N004': 160000}
    if record['rent_yen'] != reviewed_rents[pid]:
        raise SystemExit(f'{pid}: rent changed; review the reader-facing summary and fee rows before publishing')
    folder = ROOT / 'public' / 'media' / pid
    folder.mkdir(parents=True, exist_ok=True)

    def copy_image(entry, is_route=False):
        original = source / entry['file']
        destination = folder / original.name
        shutil.copy2(original, destination)
        kind = 'route' if is_route else entry['kind']
        caption = '公开门牌到OIS的自行车导航' if is_route else labels.get(kind, '房屋实拍')
        if pid == 'N002' and kind == 'floorplan':
            caption = '户型图（at home主广告版本）' if 'athome.co.jp' in entry['source_url'] else '户型图（Able版本，房间分配不同，待核）'
        origin = entry['source_url']
        observed = entry.get('observed_at', '2026-11-07')
        public_path = '/' + str(destination.relative_to(ROOT / 'public'))
        inventory.append({'file': public_path, 'sourceUrl': origin, 'observedAt': observed, 'kind': kind, 'generated': False})
        if args.provenance_script:
            provenance = f'Sourced, not generated. Origin: {origin}. Observed: {observed}. Property: {pid}. Kind: {kind}. Original listing and media rights remain with their respective owners. No pixel alteration.'
            subprocess.run(['node', str(args.provenance_script), str(destination), '--prompt', provenance], check=True, capture_output=True)
        return {'src': public_path, 'kind': kind, 'caption': caption, 'sourceUrl': origin, **{k: entry[k] for k in ('width', 'height') if k in entry}}

    photos = [copy_image(image) for image in record.get('media', [])]
    # Keep the clear alternative exterior first when the source offers one.
    photos.sort(key=lambda image: 0 if image['kind'] == 'exterior' and image.get('width', 0) > 800 else 1 if pid == 'N002' and image['kind'] == 'floorplan' and 'athome.co.jp' in image['sourceUrl'] else 2)
    route = record.get('route') or {}
    commute = None
    if route.get('minutes'):
        image = copy_image({'file': route['screenshot'], 'source_url': route['google_maps_url'], 'observed_at': route['observed_at']}, True)
        commute = {'mode': route['mode'], 'minutes': route['minutes'], 'distanceKm': route['distance_km'], 'ascentM': route['elevation_up_m'], 'slowMinutes': route['slow_scenario_minutes'], 'note': route['address_point_note'], 'url': route['google_maps_url'], 'observedAt': route['observed_at'], 'image': image}
    seen = set()
    sources = []
    proof_sources = [p for p in record['verification'].values() if p.get('source_url')]
    for proof in proof_sources + [{'source_url': route.get('address_source_url'), 'observed_at': '2026-11-07'}]:
        url = proof.get('source_url')
        if not url or url in seen or 'google.com' in url:
            continue
        seen.add(url)
        host = urlparse(url).hostname or ''
        label = next((label for domain, label in [('athome.co.jp', 'at home'), ('homes.co.jp', "LIFULL HOME’S"), ('shamaison.com', '积水住宅官方'), ('able.co.jp', 'Able'), ('eheya.net', 'いい部屋')] if domain in host), host)
        sources.append({'label': label, 'url': url, 'observedAt': proof['observed_at']})
    if pid == 'N004':
        sources.append({'label': 'SUUMO', 'url': 'https://suumo.jp/chintai/bc_100532872761/', 'observedAt': '2026-11-07T12:19:41+09:00'})
    homes.append({
        'id': pid, 'name': curated['name'], 'formalName': record['name'], 'neighborhood': curated['neighborhood'],
        'address': record['public_address'], 'rentYen': record['rent_yen'], 'managementFeeYen': record['management_fee_yen'],
        'sizeM2': record['size_m2'], 'layout': curated['layout'], 'bedrooms': curated['bedrooms'], 'built': record['built_year_month'],
        'status': 'verified' if record['qualification_status'] == 'verified_match' else 'pending',
        'statusNote': '已核公开广告和地址级导航，实际空室仍需中介确认' if record['qualification_status'] == 'verified_match' else '完整门牌和到校路线待核',
        'checkedAt': record['verification']['current_listing']['observed_at'], 'moveIn': curated['moveIn'], 'lease': curated['lease'],
        'parking': curated['parking'], 'parkingYen': record.get('parking', {}).get('fee_yen'), 'summary': curated['summary'],
        'attention': curated['attention'], 'fees': [{'label': label, 'value': value} for label, value in curated['fees']],
        'photos': photos, 'commute': commute, 'sources': sources, 'sourceUrl': record['source_url'],
    })
payload = {'school': {'name': 'Osaka International School', 'address': '大阪府箕面市小野原西4-4-16', 'url': 'https://sois.kwansei.ac.jp/osaka-international-school/about/contacts-location'}, 'dataAsOf': max(h['checkedAt'] for h in homes), 'homes': homes}
(ROOT / 'src' / 'data').mkdir(parents=True, exist_ok=True)
(ROOT / 'src' / 'data' / 'listings.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'public' / 'media' / 'attribution.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + '\n')
assert not any('/Users/' in json.dumps(home, ensure_ascii=False) for home in homes)
print(json.dumps({'homes': len(homes), 'verified': sum(h['status'] == 'verified' for h in homes), 'media': len(inventory)}, ensure_ascii=False))
