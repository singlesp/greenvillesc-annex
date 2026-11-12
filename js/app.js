(function () {
  const D = window.ANNEX_DATA;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const usd = (n, digits) => (n < -0.005 ? '\u2212' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 });
  const signed = (n) => (Math.abs(n) < 0.5 ? 'no change' : (n > 0 ? '+' : '') + usd(n));
  const pad3 = (n) => String(n).padStart(3, '0');
  const titleCase = (s) => String(s || '').toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

  let M = window.MILLAGE_SNAPSHOT; // replaced if the county publishes a newer year
  const isCityDist = (d) => D.propertyTax.cityDistricts.includes(d);

  // ---------- Form setup ----------------------------------------------------
  function districtLabel(r) {
    const parts = [r.fireName ? titleCase(r.fireName).replace(/ Fire (District|Service Area)$/i, '') + ' fire' : 'no fire district'];
    if (r.sanitation) parts.push('GGS sanitation');
    if (r.spdName) parts.push(titleCase(r.spdName));
    return pad3(r.dist) + ' – ' + parts.join(', ') + ' (' + r.total.toFixed(1) + ' mills)';
  }

  function fillDistricts() {
    const sel = $('dist');
    const keep = Number(sel.value) || 276;
    sel.innerHTML = '';
    M.rows
      .filter((r) => !r.city && r.schoolDist.toUpperCase() === 'GREENVILLE')
      .forEach((r) => sel.add(new Option(districtLabel(r), r.dist)));
    sel.value = String(keep);
    if (!sel.value) sel.selectedIndex = 0;
  }

  function fillStatic() {
    D.water.meters.forEach((m) => $('meter').add(new Option(m.label, m.id)));
    D.businessLicense.classes.forEach((c) => $('biz-class').add(new Option(c.label, c.id)));
    $('biz-class').value = '5';
    $('trash-monthly').value = D.trash.defaultPrivateMonthly;
    $('electric').value = D.franchise.defaultElectricMonthly || 0;
    $('trash-after').value = D.trash.defaultCommercialMonthly;
    $('delivered').value = D.salesTax.defaultDeliveredSpend;
    $('as-of').textContent = D.asOf;

    $('services').innerHTML = D.services.map((s) =>
      '<tr><td>' + esc(s.topic) + '</td><td>' + esc(s.now) + '</td><td>' + esc(s.after) + '</td></tr>').join('');
    $('services-notes').innerHTML = (D.servicesNotes || []).map((n) => '<p class="hint" style="color:var(--muted);font-size:.88rem">' + n + '</p>').join('');
    $('sources').innerHTML = Object.values(D.sources).map((s) =>
      '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '</a></li>').join('');
  }

  const use = () => document.querySelector('input[name="use"]:checked').value;
  const currentRow = () => M.rows.find((r) => r.dist === Number($('dist').value));

  function syncVisibility() {
    const u = use();
    const row = currentRow();
    const inGgs = !!(row && row.sanitation > 0);
    const show = (el, on) => { el.hidden = !on; };
    document.querySelectorAll('[data-show]').forEach((el) => show(el, el.dataset.show.split(' ').includes(u)));
    document.querySelectorAll('[data-hide]').forEach((el) => show(el, el.dataset.hide !== u));
    // Usage and meter size also drive the sewer line, so they stay visible
    // for public-sewer customers who get water from someone else.
    const gw = $('water-provider').value === 'gw';
    const usage = gw || $('sewer').value === 'metro';
    const mode = gw ? $('water-mode').value : 'gal';
    document.querySelectorAll('[data-water]').forEach((el) =>
      show(el, (el.dataset.water === 'gw' ? gw : usage) && (!el.dataset.mode || el.dataset.mode === mode)));
    show($('trash-now-field'), !inGgs && u !== 'business');
    show($('trash-monthly-field'), !inGgs && (u === 'business' || $('trash-now').value === 'private'));
    show($('trash-ggs-note'), inGgs);
    show($('trash-after-field'), inGgs && u === 'business');
    const need = { electric: D.franchise.electricPct > 0, gas: D.franchise.gasPct > 0, insurance: D.insurance.passThrough };
    document.querySelectorAll('[data-need]').forEach((el) => show(el, need[el.dataset.need]));
    $('keep-fire-hint').textContent = D.fireNote || '';
  }

  function readInputs() {
    const n = (id) => Number($(id).value) || 0;
    const meter = $('meter').value;
    const units = use() === 'business' ? 1 : Math.min(3, Math.max(1, Math.round(n('units')) || 1));
    const kgal = $('water-provider').value === 'gw' && $('water-mode').value === 'bill'
      ? Calc.kgalFromWaterCharge(D, meter, n('water-bill'), units)
      : n('gallons') / 1000;
    return {
      use: use(), value: n('value'), dist: Number($('dist').value), homestead: $('homestead').checked,
      keepFire: $('keep-fire').checked, skipCredit: $('skip-credit').checked, units: units, rent: n('rent'),
      vehiclesValue: n('vehicles'), bppValue: n('bpp'),
      waterProvider: $('water-provider').value, meter: meter, kgal: kgal, sewer: $('sewer').value,
      trashNow: $('trash-now').value, trashMonthly: n('trash-monthly'), trashAfterMonthly: n('trash-after'),
      recyclingMonthly: n('recycling-monthly'),
      stormCountyLarge: $('storm-county-large').checked, stormCityLarge: $('storm-city-large').checked,
      imperviousSqFt: n('impervious'),
      electricMonthly: n('electric'), gasMonthly: n('gas'), insuranceAnnual: n('insurance'),
      deliveredSpend: n('delivered'), gross: n('gross'), bizClass: $('biz-class').value,
    };
  }

  // ---------- Results -------------------------------------------------------
  let touched = false;   // false until the visitor looks up a parcel or edits a field
  let blockMsg = '';     // set when the looked-up parcel cannot be compared
  let announceTimer = null;

  function announce(text) {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      if ($('results-announce').textContent !== text) $('results-announce').textContent = text;
    }, 900);
  }

  function render() {
    syncVisibility();
    const input = readInputs();
    const r = Calc.compute(input, D, M);
    const blocked = blockMsg || r.error;
    $('results-block').innerHTML = blockMsg || esc(r.error || '');
    $('results-block').hidden = !blocked;
    $('results-body').hidden = !!blocked;
    if (blocked) {
      $('results-lede').textContent = 'No estimate for this property.';
      $('headline').innerHTML = '';
      announce($('results-block').textContent);
      return;
    }

    const flat = Math.abs(r.change) < 0.5;
    const dir = flat || !touched ? '' : r.change > 0 ? 'up' : 'down';
    const word = r.change > 0 ? 'more' : 'less';
    let lede = flat
      ? 'With these inputs, annexation would leave your total costs about the same.'
      : 'With these inputs, annexation would cost you about ' + usd(Math.abs(r.change)) + ' ' + word + ' per year.';
    if (r.missing) lede += ' This leaves out ' + r.missing + '.';
    if (!touched) {
      lede = 'Example only: a ' + usd(input.value) + ' owner-occupied home in tax district ' + pad3(input.dist) +
        ' with typical bills. Look up your property or edit the fields above to see your own estimate.';
    }
    $('results-lede').textContent = lede;
    announce(lede);

    const taxDelta = r.realAfter - r.realNow;
    $('headline').innerHTML =
      '<div class="stat ' + (touched ? dir : 'example') + '"><div class="k">' + (touched ? 'Net change per year' : 'Example net change per year') + '</div><div class="v">' + signed(r.change) + '</div>' +
        '<div class="s">' + (flat ? '&nbsp;' : signed(r.change / 12) + ' per month') + '</div></div>' +
      '<div class="stat"><div class="k">Property tax on the real estate</div><div class="v">' + signed(taxDelta) + '</div>' +
        '<div class="s">' + usd(r.realNow) + ' now, ' + usd(r.realAfter) + ' after' + (r.credit ? ' the estimated credit' : '') + '</div></div>' +
      '<div class="stat"><div class="k">Your millage rate</div><div class="v">' + r.millsNow.toFixed(1) + ' → ' + r.millsAfter.toFixed(1) + '</div>' +
        '<div class="s">mills, tax year ' + M.year + (input.use === 'owner' ? ', after the school operations exemption' : '') + '</div></div>';

    const same = '<span aria-label="no change" title="no change">\u2013</span>';
    let html = '';
    let group = null;
    r.lines.forEach((l) => {
      if (l.group !== group) {
        group = l.group;
        html += '<tr class="group"><td colspan="4">' + esc(group) + '</td></tr>';
      }
      const d = l.after - l.now;
      const cls = Math.abs(d) < 0.5 ? '' : d > 0 ? 'up' : 'down';
      html += '<tr><td>' + esc(l.label) + (l.tag ? ' <span class="tag">' + esc(l.tag) + '</span>' : '') +
        (l.note ? '<span class="note">' + esc(l.note) + '</span>' : '') + '</td>' +
        '<td>' + usd(l.now) + '</td><td>' + usd(l.after) + '</td><td class="' + cls + '">' + (cls ? signed(d) : same) + '</td></tr>';
    });
    html += '<tr class="total"><td>Total</td><td>' + usd(r.now) + '</td><td>' + usd(r.after) + '</td><td class="' + (flat ? '' : r.change > 0 ? 'up' : 'down') + '">' + signed(r.change) + '</td></tr>';
    $('breakdown').innerHTML = html;

    const notes = (D.caveats || []).filter((c) => !c.use || c.use.includes(input.use)).map((c) => '<li>' + c.html + '</li>');
    if (M.schoolSplitEstimated) notes.unshift('<li>The split between school operations and school debt millage for ' + M.year + ' is estimated from the prior year.</li>');
    $('caveats').innerHTML = notes.length ? '<h3>Assumptions and limits</h3><ul class="sources">' + notes.join('') + '</ul>' : '';

    $('method').innerHTML =
      '<p>Property tax = taxable market value × assessment ratio × millage ÷ 1,000. Your district&rsquo;s ' + M.year +
      ' millage is compared with the City of Greenville district (' + r.city.total.toFixed(1) + ' mills). On annexation the fire district and sanitation district levies are replaced by the city&rsquo;s ' +
      r.city.cityMills + ' mills; county and school millage do not change. Owner-occupied homes are exempt from school operations (' + M.schoolOperating +
      ' mills) in both cases.</p>' +
      '<p>Water is priced from Greenville Water&rsquo;s published inside-city and outside-city rates. Fees are the published annual or monthly amounts. Lines that do not change are still shown so you can see the whole bill.</p>';
  }

  // ---------- Lookup --------------------------------------------------------
  const status = (msg) => { $('search-status').textContent = msg || ''; };

  function showChoices(items, onPick) {
    const ul = $('search-results');
    ul.innerHTML = '';
    items.forEach((it) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.title;
      if (it.sub) { const s = document.createElement('small'); s.textContent = it.sub; b.appendChild(s); }
      b.addEventListener('click', () => { ul.hidden = true; onPick(it); });
      li.appendChild(b);
      ul.appendChild(li);
    });
    ul.hidden = items.length === 0;
  }

  // One lookup at a time: anything still in flight from an older search or
  // an older choice is ignored when it finally returns.
  let seq = 0;
  let useTouched = false;

  function clearParcel() {
    $('parcel-summary').hidden = true;
    $('parcel-summary').innerHTML = '';
    $('parcel-notice').hidden = true;
    $('parcel-notice').innerHTML = '';
    blockMsg = '';
  }

  async function selectParcel(parcel, pt, my) {
    status('Loading details for ' + (parcel.address || parcel.pin) + '…');
    let districts = null;
    try {
      if (!pt) pt = await Lookup.pinLocation(parcel.pin);
      if (pt) districts = await Lookup.districtsAtPoint(pt);
    } catch (e) { /* summary still shows what we have */ }
    if (my !== seq) return;

    const notes = [];
    const cityName = districts && districts.city ? titleCase(districts.city) : '';
    const covered = [...$('dist').options].some((o) => Number(o.value) === parcel.taxDistrict);
    blockMsg = '';
    if (isCityDist(parcel.taxDistrict) || cityName === 'Greenville') {
      blockMsg = '<strong>This property is already inside the City of Greenville,</strong> so there is nothing to compare. Search for a different property, or change the tax district in step 2 to explore an unincorporated one.';
    } else if (cityName) {
      blockMsg = '<strong>This property is inside the City of ' + esc(cityName) + '.</strong> It cannot be annexed by Greenville. Search for a different property, or change the tax district in step 2 to explore an unincorporated one.';
    } else if (!covered) {
      notes.push('Tax district ' + esc(parcel.taxDistrictRaw) + ' is not one this calculator covers. Pick the district from your tax bill in step 2.');
    }
    if (!districts || districts.city === null) notes.push('Could not check city limits or service districts for this location. Confirm the property is outside the city.');

    if (parcel.taxableValue) $('value').value = Math.round(parcel.taxableValue);
    else notes.push('The county record shows no taxable value for this parcel. Enter it from your tax bill.');
    if (covered) $('dist').value = String(parcel.taxDistrict);
    // Suggest "business" for commercial parcels, but never override a choice
    // the visitor made themselves.
    const commercial = /COMMERCIAL|INDUSTRIAL/.test(parcel.propType);
    if (!useTouched) document.querySelector('input[name="use"][value="' + (commercial ? 'business' : 'owner') + '"]').checked = true;
    if (!useTouched && commercial) {
      notes.push('The county lists this parcel as ' + esc(parcel.propType.toLowerCase()) + ', so it is set to Business. Change that in step 2 if it is wrong.');
    }
    // Only the county tier can be guessed from the record (heated area);
    // the city tier depends on hard surface on the lot, which it does not hold.
    $('storm-county-large').checked = parcel.sqft ? parcel.sqft > D.stormwater.countyLargeAboveSqFt : true;
    if (districts && districts.sewer != null) {
      $('sewer').value = /METROCONNECTS/i.test(districts.sewer) ? 'metro' : 'other';
    }

    const rows = [
      ['Address', parcel.address || '(none on record)'],
      ['Parcel number', parcel.pin],
      ['Tax district', parcel.taxDistrictRaw],
      ['Taxable market value', usd(parcel.taxableValue)],
    ];
    if (parcel.lastTaxBill) rows.push(['Tax bill on record', usd(parcel.lastTaxBill, 2)]);
    if (districts) {
      if (districts.fire != null) rows.push(['Fire district', titleCase(districts.fire) || 'None']);
      if (districts.sewer != null) rows.push(['Sewer district', titleCase(districts.sewer) || 'None']);
      if (districts.sanitation != null) rows.push(['Sanitation district', titleCase(districts.sanitation) || 'None (private hauler)']);
      if (districts.city != null) rows.push(['City limits', districts.city ? 'Inside ' + titleCase(districts.city) : 'Unincorporated']);
    }
    $('parcel-summary').innerHTML = '<dl>' + rows.map((r) => '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>').join('') + '</dl>';
    $('parcel-summary').hidden = false;
    const notice = [blockMsg].concat(notes).filter(Boolean).join('<br>');
    $('parcel-notice').innerHTML = notice;
    $('parcel-notice').hidden = !notice;
    status(blockMsg ? 'Found the property, but it cannot be compared. See the note below.'
      : 'Found it. Details filled in below — check them against your tax bill.');
    touched = true;
    render();
  }

  async function runSearch(text) {
    text = text.trim();
    if (!text) return;
    const my = ++seq;
    const live = () => my === seq;
    $('search-results').hidden = true;
    clearParcel();
    render();
    $('search-btn').disabled = true;
    status('Searching Greenville County records…');
    const choose = (items, onPick) => showChoices(items, (it) => {
      const mine = ++seq;
      onPick(it, mine).catch(() => { if (mine === seq) fail(); });
    });
    try {
      const pin = Lookup.asPin(text);
      if (pin) {
        const parcels = await Lookup.parcelByPin(pin);
        if (!live()) return;
        if (!parcels.length) status('No parcel found with that number. Check it against your tax bill, or enter the details below.');
        else if (parcels.length === 1) await selectParcel(parcels[0], null, my);
        else {
          status('Several parcels match. Pick yours:');
          choose(parcels.map((p) => ({ title: p.address || '(no address)', sub: 'Parcel ' + p.pin, parcel: p })),
            (it, mine) => selectParcel(it.parcel, null, mine));
        }
        return;
      }
      const hits = await Lookup.findAddress(text);
      if (!live()) return;
      const pick = async (c, token) => {
        status('Loading ' + c.address + '…');
        const parcel = await Lookup.parcelAtPoint(c);
        if (token !== seq) return;
        if (parcel) await selectParcel(parcel, c, token);
        else status('Found the address but no parcel at that spot. Try the parcel number, or enter the details below.');
      };
      if (!hits.length) status('No matching address in Greenville County. Try the parcel number, or enter the details below.');
      else if (hits.length === 1 || hits[0].score - hits[1].score >= 3) await pick(hits[0], my);
      else {
        status('Several addresses match. Pick yours:');
        choose(hits.map((c) => ({ title: c.address, c: c })), (it, mine) => pick(it.c, mine));
      }
    } catch (e) {
      if (live()) fail();
    } finally {
      if (live()) $('search-btn').disabled = false;
    }
  }

  function fail() {
    status('The county lookup is not responding right now. You can still enter the details from your tax bill below.');
  }

  let suggestTimer = null;
  let suggestSeq = 0;
  function onSearchInput() {
    clearTimeout(suggestTimer);
    const mine = ++suggestSeq;
    const text = $('search').value.trim();
    if (text.length < 4 || Lookup.asPin(text)) { $('suggestions').innerHTML = ''; return; }
    suggestTimer = setTimeout(async () => {
      try {
        const list = await Lookup.suggest(text);
        if (mine !== suggestSeq) return;
        $('suggestions').innerHTML = list.map((s) => '<option value="' + esc(s.text) + '">').join('');
      } catch (e) { /* suggestions are optional */ }
    }, 250);
  }

  // ---------- Start ---------------------------------------------------------
  fillStatic();
  fillDistricts();
  render();
  const onEdit = (e) => {
    touched = true;
    if (e.target.name === 'use') useTouched = true;
    // Choosing a district by hand overrides an "already in a city" lookup.
    if (e.target.id === 'dist') blockMsg = '';
    render();
  };
  $('inputs').addEventListener('input', onEdit);
  $('inputs').addEventListener('change', onEdit);
  $('inputs').addEventListener('submit', (e) => e.preventDefault());
  $('search-form').addEventListener('submit', (e) => { e.preventDefault(); runSearch($('search').value); });
  $('search').addEventListener('input', onSearchInput);
  Lookup.loadMillage().then((m) => {
    if (m.year !== M.year) { M = m; fillDistricts(); render(); }
  });
})();
