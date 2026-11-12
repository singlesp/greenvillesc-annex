// Every rate the calculator uses lives in this file, with its source.
// To update the site for a new year, edit the numbers here (and replace
// js/millage-snapshot.js with the Auditor's new millage sheet).
(function (root) {
  const SRC = {
    millage: { label: 'Greenville County Auditor, 2026 Millage Sheet', url: 'https://greenvillecountysc.gov/Auditor/Forms/millage_2026.pdf' },
    assessorFaq: { label: 'Greenville County Real Property Services FAQ (assessment ratios, homestead exemption)', url: 'https://www.greenvillecounty.org/realproperty/PDF/FAQs.pdf' },
    vehicles: { label: 'Greenville County Auditor, vehicle taxes', url: 'https://www.greenvillecounty.org/Auditor/vehicles.aspx' },
    water: { label: 'Greenville Water rates (effective Jan 1, 2026)', url: 'https://www.greenvillewater.com/customer-service/rates' },
    rewa: { label: 'ReWa rates, fees and charges', url: 'https://rewaonline.org/rates-fees-and-charges' },
    metro: { label: 'MetroConnects 2026 rates', url: 'https://metroconnects.org/2026-rate-changes/' },
    cityFees: { label: 'City of Greenville stormwater fees (FY2026-27)', url: 'https://www.greenvillesc.gov/fees' },
    citySewer: { label: 'City of Greenville sewer fees (FY2026-27)', url: 'https://www.greenvillesc.gov/fees-0' },
    countyStorm: { label: 'Greenville County Code § 8-168, stormwater service fee', url: 'https://codelibrary.amlegal.com/codes/greenvillecounty/latest/greenvilleco_sc/0-0-0-4316' },
    cityTrash: { label: 'City of Greenville residential curbside service', url: 'https://www.greenvillesc.gov/residential-curbside-service' },
    ggs: { label: 'Greater Greenville Sanitation, fees and annexation', url: 'https://ggsc.gov/fees-annexation/' },
    annex: { label: 'City of Greenville annexation page and FAQ', url: 'https://www.greenvillesc.gov/annexation' },
    cityBudget: { label: 'City of Greenville FY2027 budget', url: 'https://city-greenville-sc-cleardoc.cleargov.com/25430' },
    bizLicense: { label: 'City of Greenville business license calculators and 2026 class list', url: 'https://www.greenvillesc.gov/business-license-calculators-0' },
    bizOrdinance: { label: 'City of Greenville Ordinance 2025-88 (business license rates for the 2026-27 license year)', url: 'https://content.civicplus.com/api/assets/c9d9ebfa-cf93-4848-9189-9791816a9519' },
    countyStormPolicy: { label: 'Greenville County stormwater fee billing policy', url: 'https://www.greenvillecounty.org/LandDevelopment/pdf/sw_billing_policies_procedures.pdf' },
    countyTrash: { label: 'Greenville County solid waste (drop-off centers, private haulers)', url: 'https://www.greenvillecounty.org/AnswerBook/SolidWaste.aspx' },
    dukeTariff: { label: 'Duke Energy Carolinas SC tariff (municipal fees added to in-city bills)', url: 'https://dms.psc.sc.gov/Attachments/Matter/bdaf241b-bd71-34c1-e8715b674aad4c1d' },
    countyBiz: { label: 'Greenville County business quick facts (no county business license)', url: 'https://greenvillecountysc.gov/PDF/GreenvilleCounty_BusinessQuickFacts.pdf' },
    salesTax: { label: 'Greenville Journal: city sales tax approved, county referendum fails (Nov 2026)', url: 'https://greenvillejournal.com/government/penny-tax-for-greenville-county-roads-four-cities-approve-measure-but-countys-referendum-fails/' },
    scAnnexLaw: { label: 'SC Code Title 5, Chapter 3 (annexation)', url: 'https://www.scstatehouse.gov/code/t05c003.php' },
    gis: { label: 'Greenville County GIS (parcel and district lookup)', url: 'https://www.gcgis.org/' },
    reassess: { label: 'Greenville County Real Property Services (reassessment years, assessment ratios)', url: 'https://www.greenvillecounty.org/realproperty/' },
    scValueLaw: { label: 'SC Code Title 12, Chapter 37 (homestead exemption, revaluation, 15% cap)', url: 'https://www.scstatehouse.gov/code/t12c037.php' },
    vehicleFaq: { label: 'Greenville County Auditor, vehicle tax FAQ', url: 'https://www.greenvillecounty.org/Auditor/VehicleFAQ.aspx' },
    gcsFind: { label: 'Greenville County Schools, Find Your School (assigned schools by address)', url: 'https://fys.greenville.k12.sc.us/' },
    annexApp: { label: 'City of Greenville annexation application (proposed city zoning, hearing process)', url: 'https://content.civicplus.com/api/assets/d9f9a8a7-a322-4726-a619-f70d1f71dd5a' },
    parkerPlan: { label: 'Post and Courier: Greenville and Parker District resolve years-long tax dispute (Nov 2026)', url: 'https://www.yahoo.com/news/us/articles/greenville-parker-district-resolve-years-100000685.html' },
    cityStr: { label: 'City of Greenville short-term rentals (allowed zoning districts, permit, license, accommodations tax)', url: 'https://www.greenvillesc.gov/short-term-rentals' },
    devCode: { label: 'City of Greenville Development Code (nonconforming uses, Div. 19-6.3)', url: 'https://content.civicplus.com/api/assets/80eb840c-22e9-4c83-bf31-646396fda800' },
    citySewerCode: { label: 'City of Greenville Code § 6-126, sewage disposal (sewer connection, septic tanks)', url: 'https://library.municode.com/sc/greenville/codes/code_of_ordinances?nodeId=COOR_CH6BUBURE_ARTIVPLCO_S6-126SEDI' },
    fire: { label: 'City of Greenville Fire Department', url: 'https://www.greenvillesc.gov/fire-department-0' },
  };

  const DATA = {
    asOf: 'November 2026',
    sources: SRC,

    propertyTax: {
      cityDistrict: 500,
      cityDistricts: [500, 501, 502, 511, 512, 515, 516, 517],
      ratio: { owner: 0.04, rental: 0.06, business: 0.06 },
      vehicleRatio: 0.06,
      businessPersonalRatio: 0.105,
      homesteadExemption: 50000, // off market value, age 65+ / disabled / blind
    },

    water: {
      // Monthly base charge by meter size, and price per 1,000 gallons.
      meters: [
        { id: '5/8', label: '5/8" (most homes)', inside: 5.97, outside: 8.23 },
        { id: '5/8x1', label: '5/8" meter on 1" connection', inside: 8.95, outside: 12.34 },
        { id: '1', label: '1"', inside: 14.90, outside: 20.55 },
        { id: '1.5', label: '1-1/2"', inside: 29.78, outside: 41.07 },
        { id: '2', label: '2"', inside: 47.64, outside: 65.69 },
        { id: '3', label: '3"', inside: 95.27, outside: 131.37 },
        { id: '4', label: '4"', inside: 148.86, outside: 205.28 },
        { id: '6', label: '6"', inside: 297.70, outside: 410.53 },
      ],
      perKgal: { inside: 1.93, outside: 2.68 },
    },

    sewer: {
      // ReWa treatment: same inside and outside the city.
      rewaBase: { '5/8': 12.75, '5/8x1': 12.75, '1': 21.25, '1.5': 42.50, '2': 68.00, '3': 127.50, '4': 212.50, '6': 425.00 },
      rewaPerKgal: 7.09,
      // MetroConnects collection: stays the provider after annexation.
      metroBase: 11.72,
      metroPerKgal: 2.32,
    },

    stormwater: {
      // County: tier by first-floor heated area; businesses pay per ERU, rounded up.
      county: { small: 22.80, large: 25.65, perEru: 27.00, eruSqFt: 2477, roundUp: true },
      // City: tier by impervious area on the lot; businesses pay per ERU of impervious area.
      city: { small: 47.69, large: 83.75, perEru: 83.75, eruSqFt: 2389, roundUp: false },
      countyLargeAboveSqFt: 1000,
      cityLargeAboveSqFt: 1640,
    },

    trash: {
      cityMonthly: 25.00, // per dwelling unit; houses, duplexes and triplexes only
      ggsFee: { residential: 210, business: 325 }, // per structure / per business, on the tax bill
      defaultPrivateMonthly: 28, // placeholder; haulers do not publish rates
      defaultCommercialMonthly: 50, // placeholder for a business replacing GGS service
    },

    franchise: {
      // Share of the bill added inside the city. 0 = not modeled as a bill change.
      // Duke's SC tariff adds municipal fees to in-city bills. The 5% is
      // inferred from city budget revenue (4% general fund + 1% undergrounding),
      // not read from the franchise ordinance, so the page labels it an estimate.
      electricPct: 5,
      defaultElectricMonthly: 150,
      gasPct: 0, // no SC source found for a gas pass-through; not modeled
    },

    insurance: {
      // City business license tax on insurers, as a share of premiums.
      propertyCasualtyPct: 2.75,
      passThrough: false,
    },

    salesTax: {
      cityExtraPct: 1,
      starts: 'May 1, 2027',
      ends: 'April 30, 2035',
      // 20% of the revenue is returned as a credit on CITY property tax for
      // owner-occupied homes. City examples: $300 on a $250,000 home, $600 on
      // $500,000, i.e. about $120 per $100,000. Cannot exceed the city tax.
      ownerCreditPer100k: 120,
      defaultDeliveredSpend: 3000, // placeholder so the tax and the credit are both counted by default
    },

    businessLicense: {
      // Base covers the first $2,000 of gross income; rate is per additional $1,000.
      classes: [
        { id: '1', label: 'Retail, wholesale, lodging, agriculture (class 1)', base: 42, rate: 1.62 },
        { id: '2', label: 'Restaurants without full bar service, food service, transportation, warehousing (class 2)', base: 47, rate: 1.67 },
        { id: '3', label: 'Health care, education, arts, admin and personal services (class 3)', base: 52, rate: 1.72 },
        { id: '4', label: 'Professional, scientific, technical, information (class 4)', base: 57, rate: 1.77 },
        { id: '5', label: 'Class 5 (check the city\u2019s NAICS list)', base: 62, rate: 1.82 },
        { id: '6', label: 'Real estate, rental and leasing (class 6)', base: 67, rate: 1.87 },
        { id: '7', label: 'Finance, insurance, management of companies (class 7)', base: 72, rate: 1.92 },
        { id: '8.1', label: 'Contractors (class 8.1)', base: 62, rate: 1.40 },
        { id: '9.30', label: 'Auto dealers (class 9.30)', base: 206, rate: 0.95 },
        { id: '9.71', label: 'Bars and drinking places (class 9.71)', base: 103, rate: 2.50 },
        { id: '9.72', label: 'Full-service restaurant with alcohol, closes by midnight (class 9.72)', base: 77, rate: 1.80 },
        { id: '9.73', label: 'Full-service restaurant with alcohol, open past midnight (class 9.73)', base: 88, rate: 2.35 },
        { id: '9.80', label: 'Manufacturers (class 9.80)', base: 154, rate: 0.75 },
      ],
      // Residential landlords need a license once rent reaches this much a year.
      rentalClass: '6',
      rentalThreshold: 5000,
      // Share of the per-$1,000 rate that applies to each slice of gross income.
      // Nothing more is charged above $200 million.
      declining: [
        { upTo: 10e6, share: 1 },
        { upTo: 25e6, share: 0.75 },
        { upTo: 100e6, share: 0.5 },
        { upTo: 200e6, share: 0.25 },
      ],
    },

    services: [
      { topic: 'Police', now: 'Greenville County Sheriff’s Office', after: 'Greenville Police Department' },
      { topic: 'Fire', now: 'Your fire district (paid through its own millage)', after: 'Greenville City Fire Department, ISO Class 1 (paid from city millage)' },
      { topic: 'Trash', now: 'Greater Greenville Sanitation if you are in its district (garbage, bulk and yard waste; no curbside recycling); otherwise a private hauler or the county\u2019s free drop-off centers. Curbside recycling is only available by paying a private service', after: 'City weekly garbage, curbside recycling, yard waste and bulk pickup for houses, duplexes and triplexes. The city does not collect from businesses or larger apartment buildings' },
      { topic: 'Water', now: 'Greenville Water at outside-city rates', after: 'Greenville Water at inside-city rates' },
      { topic: 'Sewer', now: 'MetroConnects collection, ReWa treatment', after: 'No change: the city says MetroConnects and ReWa rates stay the same' },
      { topic: 'Zoning and permits', now: 'Greenville County zoning (or unzoned) and county permitting', after: 'City zoning, development code and permitting' },
      { topic: 'Local elections', now: 'County Council', after: 'County Council plus City Council and Mayor' },
      { topic: 'Schools', now: 'Greenville County Schools', after: 'No change' },
      { topic: 'Roads', now: 'County or state maintained', after: 'Existing county and state roads generally keep their owner; the city may add streetlights and sidewalks' },
    ],
  };

  DATA.fireNote = 'Normally the fire district levy ends and the city pays the district directly. The Parker District and the city signed a plan that works this way in September 2026. For other districts, state law lets a district keep taxing an annexed area until a transition plan is in place, so confirm with the County Auditor.';

  DATA.servicesNotes = [
    'The City of Greenville Fire Department holds the top insurance rating (ISO Class 1). Some neighboring districts are also highly rated, so ask your insurer whether your premium would change.',
    'The city can annex by petition of 100% of owners, by petition of 75% of owners holding 75% of assessed value (owners inside the area who did not sign are still annexed), or by a petition of 25% of voters followed by an election.',
  ];

  // Short answers to common assumptions. "links" are keys in SRC.
  DATA.faq = [
    { q: 'Does annexation trigger a reassessment of my property?',
      a: 'No. The county Assessor sets your value, not the city. State law revalues property when it is sold or transferred, when you add improvements, or at the countywide reassessment every five years (last done in 2025, next due in 2030, with increases capped at 15% for most properties). Annexation is not one of those events, and moving from county to city residential zoning does not change a home’s tax class.',
      links: ['reassess', 'scValueLaw'] },
    { q: 'Is the city tax added on top of everything I pay now?',
      a: 'No. City millage is added, but your fire district levy and any Greater Greenville Sanitation or special district levies normally come off. County and school taxes stay the same. The estimate above shows the net effect for your tax district.',
      links: ['millage', 'scAnnexLaw'] },
    { q: 'What happens with my fire district, such as Parker?',
      a: 'The city fire department takes over and your fire district levy normally comes off your tax bill. Parker and the city signed a 30-year plan in September 2026: for each annexed property the city, not the owner, pays Parker one year of the taxes it loses and then smaller payments for seven years, and Parker may still respond to some calls.',
      links: ['parkerPlan', 'scAnnexLaw', 'fire'] },
    { q: 'Do I keep the 4% owner-occupied rate and the homestead exemption?',
      a: 'Yes. Both are set by state law and handled by the county, and state law applies the homestead exemption to city taxes as well as county and school taxes. Owner-occupied homes also stay exempt from school operating taxes.',
      links: ['assessorFaq', 'scValueLaw'] },
    { q: 'Can my property be annexed if I do not agree?',
      a: 'The city cannot annex on its own. But if 75% of the owners in an area, holding 75% of its assessed value, sign a petition, the whole area can be annexed, including owners who did not sign. An area can also be annexed if 25% of the voters living there sign a petition and a majority then vote yes in an election.',
      links: ['scAnnexLaw', 'annex'] },
    { q: 'Can an annexation be undone?',
      a: 'Only in narrow ways. A court challenge needs a notice filed within 60 days and a lawsuit within 90 days after the annexation is declared. After that, removing an area takes a petition signed by a majority of the landowners living in the whole city, followed by a citywide election.',
      links: ['scAnnexLaw'] },
    { q: 'Will my schools change?',
      a: 'No. Schools are run by Greenville County Schools, not the city, and school district lines do not move with city limits. Your assigned schools come from the district’s attendance zones for your address.',
      links: ['gcsFind'] },
    { q: 'Will my zoning change?',
      a: 'Yes. County zoning stops applying. The annexation application names a proposed city zoning district, which goes through a Planning Commission public hearing and a City Council vote along with the annexation; after that, building and land-use permits go through the city.',
      links: ['annexApp', 'annex'] },
    { q: 'What happens to uses that are allowed now but not under city rules?',
      a: 'City code lets a use or building that met the zoning rules in place when it was established continue as a nonconforming use, as long as it is not expanded and does not stop for 12 months or more. Other city ordinances apply as soon as the annexation takes effect, so check anything specific, such as animals or a home business, with the city.',
      links: ['devCode'] },
    { q: 'Can I keep running a short-term rental?',
      a: 'Not as a new use in a residential district. The city allows rentals of under 30 days only in mixed-use and business districts, with a city permit, business license and 3% accommodations tax; homes in residential districts can only be leased for 30 days or more. City code does not say how its nonconforming-use rule applies to a rental that began under county rules, so get the city’s answer in writing before the annexation is final.',
      links: ['cityStr', 'devCode'] },
    { q: 'Will I have to connect to sewer if I am on septic?',
      a: 'Possibly. City code lets the city require a house to connect when a public sewer main can be reached by extending a line no more than 300 feet, with the owner paying for the connection and any extension. Ask the city how this would apply to your lot.',
      links: ['citySewerCode'] },
    { q: 'Do my car taxes change?',
      a: 'Yes. Vehicle tax is based on the vehicle’s value and the tax district where you live, using your address on file with SCDMV, so the vehicle bill moves with the millage. Enter your vehicles above to see it.',
      links: ['vehicles', 'vehicleFaq'] },
  ];

  // Shown under the results. "use" limits a note to certain property types.
  DATA.caveats = [
    { html: 'Rates are the ones published as of ' + DATA.asOf + '. Water, sewer and city fees usually change every January or July; ReWa has announced 4% increases for January 2027.' },
    { html: 'The electric line assumes a 5% city franchise fee on Duke Energy bills. Duke\u2019s tariff adds municipal fees to in-city bills, but the 5% is inferred from city budget figures. Compare with a neighbor\u2019s in-city bill if you can.' },
    { html: 'Not included: any natural gas franchise fee, the city\u2019s 1% tax on phone service, and the city\u2019s 2.75% tax on property and auto insurers. No source shows these appearing as separate charges on South Carolina bills, but they may be reflected in prices.' },
    { html: 'The city\u2019s 1% sales tax starts ' + DATA.salesTax.starts + ' and runs to ' + DATA.salesTax.ends + '. It applies where a purchase is made or delivered, so it only changes for things delivered to your address. Cars, groceries, prescriptions and gasoline are not taxed by it.' },
    { use: ['owner'], html: 'The owner-occupied credit funded by that sales tax is an estimate (about $120 per $100,000 of value, from the city\u2019s own examples). The actual credit will vary each year with sales tax collections and has not yet appeared on a tax bill.' },
    { use: ['rental'], html: 'Tenants usually pay the water, trash and electric bills, so some of these changes may land on your tenant rather than you. Short-term rentals also need a city permit and pay accommodations tax.' },
    { use: ['business'], html: 'An annexed business must get a city business license within 30 days. The city offers business license rebates for businesses that annex voluntarily; ask the city what you would qualify for. If you already pay the doubled non-resident rate on work done inside the city, your current cost is not zero.' },
    { use: ['business'], html: 'From ' + DATA.salesTax.starts + ' your customers would pay 7% sales tax at this location instead of 6% (9% instead of 8% on prepared meals). That is not counted as a cost to you here.' },
    { use: ['business'], html: 'The city does not collect commercial trash, so a business that uses Greater Greenville Sanitation today would need a private hauler. Enter that cost above.' },
    { html: 'The fire district, sanitation district and special district levies are assumed to end at annexation, which is how city tax districts appear on the Auditor\u2019s sheet. Timing for a specific annexation can differ.' },
  ];

  root.ANNEX_DATA = DATA;
  if (typeof module !== 'undefined') module.exports = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
