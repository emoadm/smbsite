# Map asset attribution

## bg-oblasts.svg

- Source URL: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_1_states_provinces.geojson
- License: Public Domain (Natural Earth data is in the public domain — see https://www.naturalearthdata.com/about/terms-of-use/)
- Author: Natural Earth contributors (Nathaniel Vaughn Kelso, Tom Patterson, and others)
- SHA256: deee78f2e9e578a77d742e75320fc65411f4a29a6292a17d083a4da3ce9963c4
- Modifications: Filtered to Bulgarian oblasts only (iso_a2='BG'); geographic coordinates projected to SVG viewport (800x600, 10px padding); oblast `<path>` IDs normalized to ISO 3166-2:BG codes (BG-01..BG-28); inline `style`/`fill` attributes omitted to allow runtime CSS coloring via OblastMap component.
