// Property lookup against Greenville County's public GIS services.
// Everything runs in the visitor's browser; nothing is sent anywhere else.
(function () {
  const BASE = 'https://www.gcgis.org/arcgis3/rest/services';
  const URLS = {
    geocoder: BASE + '/Address_Locators/GVL_COMPOSITE_LOCv3_3/GeocodeServer',
    parcelLocator: BASE + '/Address_Locators/GreenvilleNJ_Parcel_Locator/GeocodeServer',
    parcels: BASE + '/GreenvilleNJ/QueryLayers/MapServer/0',
    millage: BASE + '/GreenvilleNJ/Millage/MapServer/0',
    sanitation: BASE + '/GreenvilleNJ/TaxationDistrict/MapServer/0',
    sewer: BASE + '/GreenvilleNJ/TaxationDistrict/MapServer/1',
    fire: BASE + '/GreenvilleNJ/TaxationDistrict/MapServer/4',
    city: BASE + '/GreenvilleNJ/Boundary/MapServer/10',
  };
  // Owner names are deliberately not requested.
  const PARCEL_FIELDS = [
    'PIN', 'STRNUM', 'STRPRE', 'LOCATE', 'STRTYP', 'STRSUF', 'DIST', 'LANDUSE',
    'TAXMKTVAL', 'FAIRMKTVAL', 'TOTTAX', 'GIS_ACRES', 'PROPTYPE', 'IMPROVED', 'SQFEET',
  ].join(',');

  async function get(url, params) {
    const qs = new URLSearchParams({ ...params, f: 'json' });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url + '?' + qs, { signal: ctrl.signal });
      if (!res.ok) throw new Error('County GIS returned HTTP ' + res.status);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message || 'County GIS error');
      return json;
    } finally {
      clearTimeout(timer);
    }
  }

  const attrs = (json) => (json.features || []).map((f) => f.attributes);

  function pointQuery(url, pt, outFields) {
    return get(url + '/query', {
      geometry: pt.x + ',' + pt.y,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: outFields,
      returnGeometry: 'false',
    }).then(attrs);
  }

  // A PIN is 13 characters, digits with an optional leading letter. People
  // often type it with dots, dashes and spaces as printed on the tax bill.
  function asPin(text) {
    const s = String(text).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return /^[A-Z]{0,2}\d+$/.test(s) && s.length >= 10 && s.length <= 13 ? s : null;
  }

  function formatAddress(p) {
    const num = String(p.STRNUM || '').replace(/^0+/, '');
    return [num, p.STRPRE, p.LOCATE, p.STRTYP, p.STRSUF]
      .map((s) => String(s || '').trim()).filter(Boolean).join(' ');
  }

  function normalizeParcel(p) {
    return {
      pin: p.PIN,
      address: formatAddress(p),
      taxDistrict: parseInt(p.DIST, 10) || null,
      taxDistrictRaw: p.DIST,
      taxableValue: Number(p.TAXMKTVAL) || 0,
      fairMarketValue: Number(p.FAIRMKTVAL) || 0,
      lastTaxBill: Number(p.TOTTAX) || 0,
      acres: Number(p.GIS_ACRES) || 0,
      propType: (p.PROPTYPE || '').trim(),
      improved: (p.IMPROVED || '').trim() === 'YES',
      sqft: Number(p.SQFEET) || 0,
    };
  }

  async function suggest(text) {
    const json = await get(URLS.geocoder + '/suggest', { text: text, maxSuggestions: '6' });
    return (json.suggestions || []).map((s) => ({ text: s.text, magicKey: s.magicKey }));
  }

  async function geocode(text, magicKey) {
    const params = { SingleLine: text, outSR: '4326', maxLocations: '5', outFields: 'Addr_type' };
    if (magicKey) params.magicKey = magicKey;
    const json = await get(URLS.geocoder + '/findAddressCandidates', params);
    return (json.candidates || [])
      .filter((c) => c.score >= 80)
      .map((c) => ({ address: c.address, score: c.score, x: c.location.x, y: c.location.y }));
  }

  // The county geocoder is strict: a trailing city, state or zip, or a
  // spelled-out street type, often returns nothing. So: trim the text to the
  // street part, ask the suggest service for well-formed matches, and only
  // then fall back to direct geocoding with progressively shorter text.
  function streetPart(text) {
    return String(text).split(',')[0]
      .replace(/\b(sc|s\.c\.|south carolina)\b.*$/i, '')
      .replace(/\b\d{5}(-\d{4})?\s*$/, '')
      .replace(/\s+/g, ' ').trim();
  }

  async function findAddress(text) {
    const street = streetPart(text);
    if (!street) return [];
    const suggestions = await suggest(street).catch(() => []);
    const numbered = suggestions.filter((s) => /^\d/.test(s.text) === /^\d/.test(street));
    if (numbered.length) {
      const found = await Promise.all(numbered.map((s) =>
        geocode(s.text, s.magicKey).then((c) => (c[0] ? { ...c[0], address: s.text } : null)).catch(() => null)));
      const hits = found.filter(Boolean);
      if (hits.length) return hits.map((h) => ({ ...h, score: 100 }));
    }
    const words = street.split(' ');
    for (let n = words.length; n >= 2; n--) {
      const hits = await geocode(words.slice(0, n).join(' '));
      if (hits.length) return hits;
    }
    return [];
  }

  async function parcelByPin(pin) {
    const where = pin.length === 13 ? "PIN='" + pin + "'" : "PIN LIKE '" + pin + "%'";
    const json = await get(URLS.parcels + '/query', {
      where: where, outFields: PARCEL_FIELDS, returnGeometry: 'false', resultRecordCount: '8',
    });
    return attrs(json).map(normalizeParcel);
  }

  async function pinLocation(pin) {
    const json = await get(URLS.parcelLocator + '/findAddressCandidates', {
      SingleLine: pin, outSR: '4326', maxLocations: '1',
    });
    const c = (json.candidates || [])[0];
    return c ? { x: c.location.x, y: c.location.y } : null;
  }

  async function parcelAtPoint(pt) {
    const rows = await pointQuery(URLS.parcels, pt, PARCEL_FIELDS);
    return rows.length ? normalizeParcel(rows[0]) : null;
  }

  // Which service districts and city limits the point falls in.
  async function districtsAtPoint(pt) {
    const [fire, sewer, sanitation, city] = await Promise.all([
      pointQuery(URLS.fire, pt, 'FIREDIST').catch(() => null),
      pointQuery(URLS.sewer, pt, 'SEWERDIST').catch(() => null),
      pointQuery(URLS.sanitation, pt, 'SANITATIONDIST').catch(() => null),
      pointQuery(URLS.city, pt, 'NAME').catch(() => null),
    ]);
    const first = (rows, key) => (rows && rows[0] ? String(rows[0][key] || '').trim() : rows ? '' : null);
    return {
      fire: first(fire, 'FIREDIST'),
      sewer: first(sewer, 'SEWERDIST'),
      sanitation: first(sanitation, 'SANITATIONDIST'),
      city: first(city, 'NAME'), // '' = unincorporated, null = lookup failed
    };
  }

  function normalizeMillage(r) {
    const n = (k) => Number(r[k]) || 0;
    const t = (k) => String(r[k] || '').trim();
    const round1 = (x) => Math.round(x * 10) / 10;
    return {
      dist: r.TAXDIST, schoolDist: t('SCHOOLDIST'), school: n('SCHOOLDIST_MILLAGE'),
      // Same grouping as the Auditor's sheet: county + Tech + library + art museum.
      county: round1(n('COUNTY_MILLAGE') + n('GVLTECH_MILLAGE') + n('LIBRARY_MILLAGE') + n('ARTMUSEUM_MILLAGE')),
      arena: n('ARENA_MILLAGE'),
      spdName: t('SPD'), spd: n('SPD_MILLAGE'), sanitation: n('SANITATIONDIST_MILLAGE'),
      fireName: t('FIREDIST'), fire: n('FIREDIST_MILLAGE'),
      city: t('CITY'), cityMills: n('CITY_MILLAGE'), total: n('TOTAL_MILLAGE'),
    };
  }

  // Millage for every tax district. The site ships the Auditor's latest
  // sheet; the county GIS table is used instead only once it has a newer
  // year than that (it has historically lagged the Auditor's sheet).
  let millagePromise = null;
  function loadMillage() {
    if (!millagePromise) {
      millagePromise = (async () => {
        const snap = window.MILLAGE_SNAPSHOT;
        try {
          const stat = await get(URLS.millage + '/query', {
            where: '1=1',
            outStatistics: JSON.stringify([{ statisticType: 'max', onStatisticField: 'YEAR', outStatisticFieldName: 'Y' }]),
          });
          const year = Number(Object.values(attrs(stat)[0])[0]);
          if (!(year > snap.year)) return { ...snap, live: false };
          const json = await get(URLS.millage + '/query', {
            where: 'YEAR=' + year, outFields: '*', orderByFields: 'TAXDIST',
          });
          const rows = attrs(json).map(normalizeMillage);
          if (rows.length < 50 || !rows.some((r) => r.dist === 500)) throw new Error('Incomplete millage table');
          // The GIS table has no operating/debt split for schools, so carry
          // the last known share forward; the page flags this as an estimate.
          const gvl = rows.find((r) => r.dist === 500).school;
          const share = snap.schoolOperating / (snap.schoolOperating + snap.schoolDebt);
          return {
            year: year, rows: rows, live: true, schoolSplitEstimated: true,
            schoolOperating: Math.round(gvl * share * 10) / 10,
            schoolDebt: Math.round(gvl * (1 - share) * 10) / 10,
          };
        } catch (e) {
          return { ...snap, live: false };
        }
      })();
    }
    return millagePromise;
  }

  window.Lookup = {
    asPin, suggest, geocode, findAddress, parcelByPin, pinLocation, parcelAtPoint, districtsAtPoint, loadMillage,
  };
})();
