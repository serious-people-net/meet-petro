/* ============================================================
   HEATING DATA — global surface temperature anomaly vs the
   pre-industrial (1850–1900) average.

   CURVE: real observations. HadCRUT5 annual global-mean series
   (Met Office / UEA, HadCRUT.5.0.2.0), rebaselined from its native
   1961–1990 baseline to the 1850–1900 average (offset +0.357 °C).
   This reproduces the Copernicus C3S "increase above pre-industrial"
   chart; HadCRUT5 is one of the sources in that blend and covers the
   full 1850–present span. 2025 is a partial (year-to-date) value.
   To refresh: re-download the HadCRUT5 annual summary series and
   subtract the 1850–1900 mean from every year.

   EVENTS: the story points plotted against the curve. Edit these —
   add/remove/retitle — and the chart, cards and markers update.
   Each event needs: anchor (year on the curve), win (camera zoom
   window [startYear, endYear]), slot (card corner: tl/tr/bl/br),
   optional span ([startYear, endYear] shaded band), and copy.
   ============================================================ */
window.HEATING = (function () {
  const data = [
    [1850, -0.061], [1851, 0.123], [1852, 0.127], [1853, 0.086], [1854, 0.065], [1855, 0.060], [1856, 0.036], [1857, -0.111],
    [1858, -0.032], [1859, 0.075], [1860, -0.034], [1861, -0.073], [1862, -0.180], [1863, 0.012], [1864, -0.109], [1865, 0.024],
    [1866, 0.015], [1867, -0.000], [1868, 0.005], [1869, 0.040], [1870, 0.029], [1871, -0.012], [1872, 0.028], [1873, 0.015],
    [1874, -0.017], [1875, -0.019], [1876, -0.068], [1877, 0.255], [1878, 0.345], [1879, 0.053], [1880, 0.041], [1881, 0.124],
    [1882, 0.061], [1883, 0.010], [1884, -0.136], [1885, -0.115], [1886, -0.064], [1887, -0.142], [1888, -0.023], [1889, 0.107],
    [1890, -0.150], [1891, -0.045], [1892, -0.151], [1893, -0.138], [1894, -0.127], [1895, -0.092], [1896, 0.072], [1897, 0.097],
    [1898, -0.129], [1899, 0.001], [1900, 0.122], [1901, 0.063], [1902, -0.082], [1903, -0.177], [1904, -0.241], [1905, -0.051],
    [1906, 0.037], [1907, -0.148], [1908, -0.157], [1909, -0.179], [1910, -0.174], [1911, -0.183], [1912, -0.119], [1913, -0.111],
    [1914, 0.094], [1915, 0.165], [1916, -0.064], [1917, -0.186], [1918, -0.068], [1919, 0.031], [1920, 0.058], [1921, 0.116],
    [1922, 0.017], [1923, 0.039], [1924, 0.045], [1925, 0.074], [1926, 0.234], [1927, 0.127], [1928, 0.150], [1929, -0.036],
    [1930, 0.180], [1931, 0.253], [1932, 0.211], [1933, 0.034], [1934, 0.182], [1935, 0.150], [1936, 0.187], [1937, 0.337],
    [1938, 0.344], [1939, 0.316], [1940, 0.432], [1941, 0.395], [1942, 0.358], [1943, 0.363], [1944, 0.501], [1945, 0.400],
    [1946, 0.238], [1947, 0.265], [1948, 0.232], [1949, 0.213], [1950, 0.130], [1951, 0.295], [1952, 0.372], [1953, 0.434],
    [1954, 0.240], [1955, 0.159], [1956, 0.093], [1957, 0.321], [1958, 0.339], [1959, 0.308], [1960, 0.241], [1961, 0.336],
    [1962, 0.292], [1963, 0.320], [1964, 0.051], [1965, 0.152], [1966, 0.208], [1967, 0.239], [1968, 0.188], [1969, 0.325],
    [1970, 0.271], [1971, 0.151], [1972, 0.263], [1973, 0.406], [1974, 0.184], [1975, 0.246], [1976, 0.141], [1977, 0.460],
    [1978, 0.362], [1979, 0.447], [1980, 0.553], [1981, 0.607], [1982, 0.391], [1983, 0.580], [1984, 0.404], [1985, 0.406],
    [1986, 0.452], [1987, 0.600], [1988, 0.639], [1989, 0.536], [1990, 0.717], [1991, 0.695], [1992, 0.481], [1993, 0.522],
    [1994, 0.590], [1995, 0.733], [1996, 0.633], [1997, 0.779], [1998, 0.934], [1999, 0.681], [2000, 0.688], [2001, 0.846],
    [2002, 0.900], [2003, 0.901], [2004, 0.824], [2005, 0.963], [2006, 0.929], [2007, 0.948], [2008, 0.822], [2009, 0.953],
    [2010, 1.037], [2011, 0.894], [2012, 0.934], [2013, 0.980], [2014, 1.029], [2015, 1.182], [2016, 1.289], [2017, 1.202],
    [2018, 1.119], [2019, 1.248], [2020, 1.279], [2021, 1.118], [2022, 1.158], [2023, 1.457], [2024, 1.537], [2025, 1.547],
  ];

  function tempAt(yr) {
    const y = Math.max(1850, Math.min(2025, yr));
    const i = Math.min(data.length - 2, Math.max(0, Math.floor(y - 1850)));
    const u = y - data[i][0];
    return data[i][1] + (data[i + 1][1] - data[i][1]) * u;
  }

  /* ---- story events (agencies / lobbying vs the heating curve) ----
     Kept in ascending `anchor` order so the camera pans forward in time.
     The footnote superscripts (SUP in warming-chart.js) must have at
     least as many entries as there are events here. ---- */
  const events = [
    {
      id: 'house-committee', anchor: 1965, span: null, slot: 'tl',
      kicker: '1960s', short: '1960s',
      win: [1850, 1994],
      title: 'Known and buried',
      body: 'Internal documents show fossil fuel companies understood by this decade that burning fossil fuels causes climate change - and spent decades working to bury it from public understanding.',
      source: 'House Oversight / Senate Budget Committee staff report, 2024'
    },
    {
      id: 'exxon-memo', anchor: 1982, span: null, slot: 'tl',
      kicker: '1982', short: '1982',
      win: [1953, 2011],
      title: 'Exxon warns itself',
      body: 'An internal Exxon memo identifies the need for “major reductions in fossil fuel combustion” to avoid “potentially catastrophic events.”',
      source: 'Exxon internal memo, 1982'
    },
    {
      id: 'gcc', anchor: 1989, span: null, slot: 'tr',
      kicker: '1989', short: '1989',
      win: [1961, 2016],
      title: 'A coalition against action',
      body: 'The Global Climate Coalition forms to oppose policies to reduce greenhouse gases. Early members include the American Petroleum Institute, Chevron, Chrysler, Exxon, Ford, General Motors and Shell.',
      source: 'Global Climate Coalition, founded 1989'
    },
    {
      id: 'energy-citizens', anchor: 2009, span: null, slot: 'tl',
      kicker: '2009', short: '2009',
      win: [1988, 2026],
      title: 'Rent-a-crowd',
      body: 'The American Petroleum Institute leads a coalition called “Energy Citizens” - a grassroots-styled campaign, staged with employees bussed to rallies, to block the American Clean Energy and Security Act of 2009.',
      source: 'American Petroleum Institute, 2009'
    },
    {
      id: 'wpp', anchor: 2020, span: [2016, 2025], slot: 'tl',
      kicker: '2016–2025', short: '2016–25',
      win: [2004, 2026.5],
      title: 'A billion-dollar image',
      body: 'In the decade after the 2015 Paris agreement, WPP helped ExxonMobil, Chevron, Shell and BP spend an estimated $1bn (£740m) on adverts in the US.',
      source: 'The Guardian, 2025'
    },
    {
      id: 'eu', anchor: 2022, span: [2019.9, 2024.4], slot: 'tr',
      kicker: 'Dec 2019 – May 2024', short: '2019–24',
      win: [2012, 2026.5],
      title: '1,000 meetings in Brussels',
      body: 'Shell, TotalEnergies, Eni, Equinor, ExxonMobil, BP and Chevron - with a network of over 50 organisations and a lobbying budget close to €64m - attend more than 1,000 meetings with the European Commission.',
      source: 'Fossil Free Politics / Corporate Europe Observatory, 2024'
    },
    {
      id: 'cop28', anchor: 2023.92, span: null, slot: 'tr',
      kicker: '2023', short: '2023',
      win: [2015, 2026.5],
      title: 'A seat at the table',
      body: 'A record 2,456 fossil fuel lobbyists are granted access to the Cop28 climate talks in Dubai - nearly four times the number let in the previous year.',
      source: 'The Guardian, 2023'
    },
    {
      id: 'total-rebrand', anchor: 2024, span: null, slot: 'tl',
      kicker: '2024', short: '2024',
      win: [2016, 2026.6],
      title: 'A rebrand, ruled deceptive',
      body: 'Publicis, WPP and Havas agencies all contribute to a TotalEnergies rebrand. In 2025 a French court rules that TotalEnergies misled consumers with inflated climate claims.',
      source: 'Paris court ruling, 2025'
    },
    {
      id: 'iea', anchor: 2024.35, span: null, slot: 'br',
      kicker: '2024', short: '2024',
      win: [2016.5, 2026.8],
      title: '4% of capital',
      body: 'The head of the International Energy Agency notes that oil and gas companies were allocating only about 4% of capital expenditure to clean energy.',
      source: 'International Energy Agency, 2024'
    },
    {
      id: 'un-ad-ban', anchor: 2024.42, span: null, slot: 'tl',
      kicker: '2024', short: '2024',
      win: [2016.5, 2026.8],
      title: 'Godfathers of climate chaos',
      body: 'UN Secretary-General António Guterres calls for a ban on fossil fuel advertising, comparing coal, oil and gas companies to a tobacco industry once allowed to advertise despite the harm it caused.',
      source: 'BBC News, 2024'
    },
    {
      id: 'nature', anchor: 2025, span: null, slot: 'tl',
      kicker: '2025', short: '2025',
      win: [2019, 2026.8],
      title: 'The transition that isn’t',
      body: 'An analysis in Nature of the energy assets of 250 of the largest oil and gas companies finds renewables are a tiny proportion of their total energy production - a marginal contribution to global renewable deployment.',
      source: 'Nature, 2025'
    }
  ];

  return { data, tempAt, events };
})();
