// Pure cost model: no DOM, no network. Runs in the browser and in Node tests.
(function (root) {
  const num = (x) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : 0);

  // City business license tax on annual gross income.
  function businessLicenseTax(gross, cls, declining) {
    gross = num(gross);
    if (!cls || gross <= 0) return 0;
    let tax = cls.base;
    let floor = 2000;
    for (const tier of declining) {
      if (gross <= floor) break;
      const slice = Math.min(gross, tier.upTo) - floor;
      if (slice > 0) tax += Math.ceil(slice / 1000) * cls.rate * tier.share;
      floor = Math.max(floor, tier.upTo);
    }
    return tax;
  }

  function monthlyWater(D, meterId, kgal, where, units) {
    const meter = D.water.meters.find((m) => m.id === meterId) || D.water.meters[0];
    return meter[where] * (units || 1) + kgal * D.water.perKgal[where];
  }

  // Turn a monthly water charge (water only) back into usage, at outside rates.
  function kgalFromWaterCharge(D, meterId, charge, units) {
    const meter = D.water.meters.find((m) => m.id === meterId) || D.water.meters[0];
    return Math.max(0, (num(charge) - meter.outside * (units || 1)) / D.water.perKgal.outside);
  }

  function stormwaterFee(rates, isBusiness, large, imperviousSqFt) {
    if (!isBusiness) return large ? rates.large : rates.small;
    const erus = num(imperviousSqFt) / rates.eruSqFt;
    return Math.max(1, rates.roundUp ? Math.ceil(erus) : erus) * rates.perEru;
  }

  // input: see app.js readInputs(). M: millage table { rows, schoolOperating }.
  function compute(input, D, M) {
    const P = D.propertyTax;
    const lines = [];
    const add = (group, label, now, after, opts) =>
      lines.push(Object.assign({ group, label, now, after }, opts || {}));

    const row = M.rows.find((r) => r.dist === input.dist);
    const city = M.rows.find((r) => r.dist === P.cityDistrict);
    if (!row || !city) return { lines, error: 'Pick the tax district from your tax bill to see an estimate.' };
    if (row.cityMills) return { lines, error: 'That tax district is already inside a city.' };

    const isOwner = input.use === 'owner';
    const isBusiness = input.use === 'business';
    const units = isBusiness ? 1 : Math.min(3, Math.max(1, Math.round(num(input.units)) || 1));

    // ---- Real property tax -------------------------------------------------
    const exempt = isOwner && input.homestead ? P.homesteadExemption : 0;
    const assessed = Math.max(0, num(input.value) - exempt) * P.ratio[input.use];
    const taxOn = (mills) => (assessed * mills) / 1000;
    // Owner-occupied homes do not pay school operating millage.
    const schoolExempt = isOwner && row.schoolDist.toUpperCase() === 'GREENVILLE' ? M.schoolOperating : 0;
    const schoolMills = Math.max(0, row.school - schoolExempt);
    const G = 'Property tax on the real estate';

    add(G, 'County, library, Greenville Tech, art museum', taxOn(row.county), taxOn(city.county));
    add(G, 'Schools', taxOn(schoolMills), taxOn(schoolMills),
      schoolExempt ? { note: 'Debt service only. Owner-occupied homes are exempt from school operations.' } : null);
    if (row.arena || city.arena) add(G, 'Arena district', taxOn(row.arena), taxOn(city.arena));
    if (row.fire) {
      add(G, 'Fire: ' + row.fireName + ' (' + row.fire + ' mills)', taxOn(row.fire), input.keepFire ? taxOn(row.fire) : 0,
        input.keepFire ? { note: 'You chose to assume the fire district levy continues after annexation.' } : null);
    }
    if (row.sanitation) add(G, 'Greater Greenville Sanitation (' + row.sanitation + ' mills)', taxOn(row.sanitation), 0);
    if (row.spd) {
      add(G, 'Special district: ' + row.spdName + ' (' + row.spd + ' mills)', taxOn(row.spd), 0,
        { tag: 'assumed', note: 'Assumed to end on annexation; not confirmed for every small district.' });
    }
    const cityTax = taxOn(city.cityMills);
    add(G, 'City of Greenville (' + city.cityMills + ' mills)', 0, cityTax);
    // Credit funded by the city sales tax: owner-occupied homes only, figured
    // on value before the homestead exemption, and never more than the city tax.
    const credit = isOwner && !input.skipCredit ? Math.min(cityTax, (num(input.value) / 100000) * D.salesTax.ownerCreditPer100k) : 0;
    if (credit > 0) {
      add(G, 'City sales-tax credit for owner-occupied homes', 0, -credit,
        { tag: 'estimate, from 2027', note: 'Funded by the city\u2019s new 1% sales tax; the amount will vary year to year.' });
    }

    const millsNow = row.total - schoolExempt;
    const millsAfter = city.total - schoolExempt + (input.keepFire ? row.fire : 0);

    // ---- Other property taxes ---------------------------------------------
    const fullNow = row.total;
    const fullAfter = city.total + (input.keepFire ? row.fire : 0);
    const G2 = 'Other property taxes';
    if (num(input.vehiclesValue)) {
      const a = num(input.vehiclesValue) * P.vehicleRatio;
      add(G2, 'Vehicles', (a * fullNow) / 1000, (a * fullAfter) / 1000,
        { note: 'Vehicles are taxed at the full millage where they are kept. The $25 county road fee per vehicle is the same either way and is not shown.' });
    }
    if (isBusiness && num(input.bppValue)) {
      const a = num(input.bppValue) * P.businessPersonalRatio;
      add(G2, 'Business personal property (equipment, furniture, fixtures)', (a * fullNow) / 1000, (a * fullAfter) / 1000);
    }

    // ---- Fees on the tax bill ---------------------------------------------
    const G3 = 'Fees on your tax bill';
    add(G3, 'Stormwater fee',
      stormwaterFee(D.stormwater.county, isBusiness, input.stormCountyLarge, input.imperviousSqFt),
      stormwaterFee(D.stormwater.city, isBusiness, input.stormCityLarge, input.imperviousSqFt));
    const inGgs = row.sanitation > 0;
    if (inGgs) {
      add(G3, 'Greater Greenville Sanitation annual fee',
        isBusiness ? D.trash.ggsFee.business : D.trash.ggsFee.residential, 0,
        { tag: 'assumed', note: 'Assumed to end when the property moves to a city tax district.' });
    }

    // ---- Utility bills -----------------------------------------------------
    const G4 = 'Utility bills';
    const kgal = num(input.kgal);
    if (input.waterProvider === 'gw') {
      add(G4, 'Water (Greenville Water)',
        12 * monthlyWater(D, input.meter, kgal, 'outside', units),
        12 * monthlyWater(D, input.meter, kgal, 'inside', units),
        { note: 'Outside-city rates now, inside-city rates after.' });
    }
    if (input.sewer === 'metro') {
      const rewa = (D.sewer.rewaBase[input.meter] || D.sewer.rewaBase['5/8']) + kgal * D.sewer.rewaPerKgal;
      const metro = D.sewer.metroBase + kgal * D.sewer.metroPerKgal;
      add(G4, 'Sewer (MetroConnects collection + ReWa treatment)', 12 * (rewa + metro), 12 * (rewa + metro),
        { note: 'The city says MetroConnects and ReWa rates do not change on annexation.' });
    }
    if (!isBusiness) {
      const nowTrash = inGgs ? 0 : input.trashNow === 'private' ? 12 * num(input.trashMonthly) * units : 0;
      add(G4, 'Trash collection', nowTrash, 12 * D.trash.cityMonthly * units,
        { note: (inGgs ? 'Today you pay Greater Greenville Sanitation through the millage and annual fee above. ' : '') +
            'After: the city solid waste fee of $' + D.trash.cityMonthly + ' a month per dwelling unit, billed on the water bill.' });
    } else if (inGgs) {
      // The city does not collect commercial trash, so GGS service is replaced by a private hauler.
      add(G4, 'Trash collection (private hauler after)', 0, 12 * num(input.trashAfterMonthly), { tag: 'your estimate' });
    } else if (num(input.trashMonthly)) {
      add(G4, 'Trash collection (private hauler)', 12 * num(input.trashMonthly), 12 * num(input.trashMonthly));
    }
    if (D.franchise.electricPct && num(input.electricMonthly)) {
      const e = 12 * num(input.electricMonthly);
      add(G4, 'Electricity (Duke Energy, with ' + D.franchise.electricPct + '% city franchise fee after)', e, e * (1 + D.franchise.electricPct / 100), { tag: 'estimate' });
    }
    if (D.franchise.gasPct && num(input.gasMonthly)) {
      const g = 12 * num(input.gasMonthly);
      add(G4, 'Natural gas (city franchise fee)', g, g * (1 + D.franchise.gasPct / 100), { tag: 'estimate' });
    }

    // ---- Other -------------------------------------------------------------
    const G5 = 'Other costs';
    if (D.insurance.passThrough && num(input.insuranceAnnual)) {
      const p = num(input.insuranceAnnual);
      add(G5, 'Property and auto insurance (municipal premium tax)', p, p * (1 + D.insurance.propertyCasualtyPct / 100), { tag: 'estimate' });
    }
    if (num(input.deliveredSpend)) {
      add(G5, 'City 1% sales tax on purchases delivered to this address', 0, num(input.deliveredSpend) * D.salesTax.cityExtraPct / 100,
        { tag: 'from ' + D.salesTax.starts, note: 'Sales tax follows where you receive the goods. Shopping in person inside the city is taxed the same wherever you live.' });
    }
    const BL = D.businessLicense;
    let missing = '';
    if (isBusiness) {
      const cls = BL.classes.find((c) => c.id === input.bizClass);
      if (num(input.gross)) {
        add(G5, 'City business license tax', 0, businessLicenseTax(input.gross, cls, BL.declining),
          { note: 'Unincorporated Greenville County has no business license tax.' });
      } else {
        missing = 'the city business license tax (enter the annual gross income of the business)';
        add(G5, 'City business license tax', 0, 0,
          { tag: 'not entered', note: 'Enter annual gross income above. The total leaves this out until you do.' });
      }
    }
    if (input.use === 'rental') {
      const cls = BL.classes.find((c) => c.id === BL.rentalClass);
      const limit = '$' + BL.rentalThreshold.toLocaleString('en-US');
      if (num(input.rent) >= BL.rentalThreshold) {
        add(G5, 'City business license for rental property', 0, businessLicenseTax(input.rent, cls, BL.declining),
          { note: 'Required once rent from all your city rentals reaches ' + limit + ' a year.' });
      } else if (!num(input.rent)) {
        missing = 'the city business license for rentals (enter the rent you collect per year)';
        add(G5, 'City business license for rental property', 0, 0,
          { tag: 'not entered', note: 'Enter yearly rent above. A license is required at ' + limit + ' or more a year.' });
      }
    }

    const sum = (k) => lines.reduce((s, l) => s + l[k], 0);
    const now = sum('now');
    const after = sum('after');
    return {
      lines, now, after, change: after - now, missing,
      assessed, millsNow, millsAfter, row, city,
      realNow: taxOn(millsNow), realAfter: taxOn(millsAfter) - credit, credit,
    };
  }

  const Calc = { compute, businessLicenseTax, monthlyWater, kgalFromWaterCharge, stormwaterFee };
  root.Calc = Calc;
  if (typeof module !== 'undefined') module.exports = Calc;
})(typeof window !== 'undefined' ? window : globalThis);
