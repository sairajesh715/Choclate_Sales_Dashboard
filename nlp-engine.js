/**
 * Enhanced NLP-to-SQL Engine for Chocolate Sales Database
 * Supports 60+ question patterns across 18 categories
 */

class NLPEngine {
  constructor() {
    this.regions    = ['apac', 'americas', 'europe'];
    this.countries  = ['india', 'usa', 'canada', 'new zealand', 'australia', 'uk'];
    this.teams      = ['yummies', 'delish', 'jucies'];
    this.categories = ['bars', 'bites', 'other'];
    this.sizes      = ['large', 'small'];
    this.locations  = ['hyderabad', 'wellington', 'seattle', 'paris'];

    this.products = [
      'milk bars', '50% dark bites', 'almond choco', 'raspberry choco',
      'mint chip choco', 'eclairs', 'drinking coco', '99% dark & pure',
      'orange choco', 'spicy special slims', 'after nines', 'fruit & nut bars',
      '85% dark bars', 'white choc', "baker's choco chips", 'organic choco syrup',
      'caramel stuffed bars', 'manuka honey choco', '70% dark bites',
      'smooth sliky salty', 'choco coated almonds', 'peanut butter cubes'
    ];

    // Ordered from most specific to most general
    this.patterns = [

      // ── GROUP 0: SPECIFIC "BY BOXES" — must come before generic top patterns ──
      {
        regex: /(?:top|most|highest|best)\s*(\d+)?\s*products?\s+by\s+(?:boxes?|volume|units?|quantity)/i,
        handler: m => this.topProductsByBoxes(parseInt(m[1]) || 10)
      },
      {
        regex: /(?:top|most|highest|best)\s*(\d+)?\s*(?:sales?\s*(?:persons?|people|reps?))\s+by\s+(?:boxes?|volume|units?|quantity)/i,
        handler: m => this.topSalesPersonsByBoxes(parseInt(m[1]) || 10)
      },

      // ── GROUP 1: TOP / BEST ──────────────────────────────────────────────
      {
        regex: /(?:top|best|highest|most|leading|greatest)\s*(\d+)?\s*(?:selling\s+)?(?:sales?\s*(?:persons?|people|reps?|guys?|members?))/i,
        handler: m => this.topSalesPersons(parseInt(m[1]) || 10)
      },
      {
        regex: /(?:top|best|highest|most|leading|greatest)\s*(\d+)?\s*(?:selling\s+)?products?/i,
        handler: m => this.topProducts(parseInt(m[1]) || 10)
      },
      {
        regex: /(?:top|best|highest|most|leading|greatest)\s*(\d+)?\s*(?:selling\s+)?(?:countries?|geos?|regions?)/i,
        handler: m => this.topCountries(parseInt(m[1]) || 10)
      },
      {
        regex: /(?:top|best|highest|most|leading|greatest)\s*(\d+)?\s*(?:selling\s+)?teams?/i,
        handler: m => this.topTeams(parseInt(m[1]) || 10)
      },

      // ── GROUP 2: BOTTOM / WORST ──────────────────────────────────────────
      {
        regex: /(?:lowest|worst|least|bottom|minimum)\s*(\d+)?\s*(?:selling\s+)?(?:sales?\s*(?:persons?|people|reps?))/i,
        handler: m => this.bottomSalesPersons(parseInt(m[1]) || 10)
      },
      {
        regex: /(?:lowest|worst|least|bottom|minimum)\s*(\d+)?\s*(?:selling\s+)?products?/i,
        handler: m => this.bottomProducts(parseInt(m[1]) || 10)
      },

      // ── GROUP 3: WHO SOLD MOST / LEAST ───────────────────────────────────
      {
        regex: /who\s*(?:sold|has|had|earned|made|generated)\s*(?:the\s+)?(?:most|highest|maximum|max)/i,
        handler: () => this.topSalesPersons(1)
      },
      {
        regex: /who\s*(?:sold|has|had|earned|made|generated)\s*(?:the\s+)?(?:least|lowest|minimum|min|fewest)/i,
        handler: () => this.bottomSalesPersons(1)
      },

      // ── GROUP 4: BEST / WORST PERIOD ────────────────────────────────────
      {
        regex: /(?:best|highest|top|peak|most\s+successful)\s*(?:performing\s+)?month/i,
        handler: () => this.bestMonth()
      },
      {
        regex: /(?:worst|lowest|slowest|weakest|minimum|least\s+performing)\s*(?:performing\s+)?month/i,
        handler: () => this.worstMonth()
      },
      {
        regex: /(?:best|top)\s*(?:performing\s+)?(?:quarter|q[1-4])/i,
        handler: () => this.bestQuarter()
      },
      {
        regex: /(?:worst|lowest)\s*(?:performing\s+)?(?:quarter|q[1-4])/i,
        handler: () => this.worstQuarter()
      },

      // ── GROUP 5: QUARTERLY ───────────────────────────────────────────────
      {
        regex: /(?:q1|first\s+quarter)\s*(2022|2023)?/i,
        handler: m => this.salesForQuarter(1, m[1])
      },
      {
        regex: /(?:q2|second\s+quarter)\s*(2022|2023)?/i,
        handler: m => this.salesForQuarter(2, m[1])
      },
      {
        regex: /(?:q3|third\s+quarter)\s*(2022|2023)?/i,
        handler: m => this.salesForQuarter(3, m[1])
      },
      {
        regex: /(?:q4|fourth\s+quarter)\s*(2022|2023)?/i,
        handler: m => this.salesForQuarter(4, m[1])
      },
      {
        regex: /(?:quarterly|by\s+quarter|quarter\s*(?:by\s*quarter|breakdown|wise))/i,
        handler: () => this.salesByQuarter()
      },

      // ── GROUP 6: PERCENTAGE / SHARE ──────────────────────────────────────
      {
        regex: /(?:percentage|percent|%|share|portion|proportion|split)\s*(?:of\s+)?(?:sales?|revenue)?\s*(?:by|per|across)?\s*region/i,
        handler: () => this.shareByRegion()
      },
      {
        regex: /region\s*(?:wise|by|breakdown)?\s*(?:percentage|percent|%|share|split)/i,
        handler: () => this.shareByRegion()
      },
      {
        regex: /(?:percentage|percent|%|share|portion|proportion|split)\s*(?:of\s+)?(?:sales?|revenue)?\s*(?:by|per|across)?\s*categor/i,
        handler: () => this.shareByCategory()
      },
      {
        regex: /categor\w+\s*(?:wise|by|breakdown)?\s*(?:percentage|percent|%|share|split)/i,
        handler: () => this.shareByCategory()
      },
      {
        regex: /(?:percentage|percent|%|share|portion|proportion|split)\s*(?:of\s+)?(?:sales?|revenue)?\s*(?:by|per|across)?\s*country/i,
        handler: () => this.shareByCountry()
      },
      {
        regex: /country\s*(?:\w+\s+)?(?:percentage|percent|%|share|split|breakdown)/i,
        handler: () => this.shareByCountry()
      },
      {
        regex: /(?:percentage|percent|%|share|proportion)\s*(?:of\s+)?(?:sales?|revenue)?\s*(?:by|per|across)?\s*team/i,
        handler: () => this.shareByTeam()
      },
      {
        regex: /team\s*(?:\w+\s+)?(?:percentage|percent|%|share|split|breakdown)/i,
        handler: () => this.shareByTeam()
      },

      // ── GROUP 7: TEAM MEMBERS / ROSTER ──────────────────────────────────
      {
        regex: /(?:who\s+(?:is|are|works?)\s+(?:in|on)|members?\s+(?:of|in)|roster\s+(?:of|for)|staff\s+(?:of|in))\s+(?:team\s+)?(yummies|delish|jucies)/i,
        handler: m => this.teamMembers(m[1])
      },
      {
        regex: /(yummies|delish|jucies)\s+(?:team\s+)?(?:members?|people|staff|persons?|reps?|roster)/i,
        handler: m => this.teamMembers(m[1])
      },
      {
        regex: /list\s+(?:all\s+)?(?:members?\s+of\s+)?(?:the\s+)?(yummies|delish|jucies)\s+team/i,
        handler: m => this.teamMembers(m[1])
      },
      {
        regex: /(?:who|list|show|members?|people|staff)\b.{0,25}\b(yummies|delish|jucies)\b/i,
        handler: m => {
          const t = (m[0].match(/(yummies|delish|jucies)/i) || [])[0];
          return t ? this.teamMembers(t) : null;
        }
      },

      // ── GROUP 8: PEOPLE BY LOCATION ─────────────────────────────────────
      {
        regex: /(?:who\s+(?:works?|is\s+based?|lives?|is)|people|staff|persons?|sales\s*(?:rep|person))\s+(?:in|from|at|based\s+in)\s+(hyderabad|wellington|seattle|paris)/i,
        handler: m => this.peopleAtLocation(m[1])
      },
      {
        regex: /(hyderabad|wellington|seattle|paris)\s+(?:based|team|staff|people|employees?|persons?)/i,
        handler: m => this.peopleAtLocation(m[1])
      },

      // ── GROUP 9: PRODUCTS BY CATEGORY ────────────────────────────────────
      {
        regex: /(?:products?|items?|chocolates?)\s+(?:in|from|under|of|that\s+are|belonging\s+to)\s+(?:category\s+)?(bars?|bites?|other)\b/i,
        handler: m => this.productsByCategory(m[1])
      },
      {
        regex: /(?:list|show|what|which)\s+(?:all\s+)?(bars?|bites?|other)\s+(?:products?|chocolates?|items?)/i,
        handler: m => this.productsByCategory(m[1])
      },
      {
        regex: /(?:show|list|get)\s+(?:products?\s+)?(?:in\s+)?category\s+(bars?|bites?|other)/i,
        handler: m => this.productsByCategory(m[1])
      },

      // ── GROUP 10: BY BOXES / VOLUME ──────────────────────────────────────
      {
        regex: /(?:top|most|highest|best)\s*(\d+)?\s*(?:products?|items?)\s+(?:by|for|based\s+on)\s+(?:boxes?|volume|units?|quantity)/i,
        handler: m => this.topProductsByBoxes(parseInt(m[1]) || 10)
      },
      {
        regex: /(?:top|most|highest|best)\s*(\d+)?\s*(?:sales?\s*persons?|people|reps?)\s+(?:by|for)\s+(?:boxes?|volume|units?)/i,
        handler: m => this.topSalesPersonsByBoxes(parseInt(m[1]) || 10)
      },
      {
        regex: /(?:most|highest)\s+(?:boxes?|volume|units?|quantity)\s+(?:shipped|sold|delivered)/i,
        handler: () => this.topProductsByBoxes(10)
      },

      // ── GROUP 11: PROFIT / MARGIN / ROI ─────────────────────────────────
      {
        regex: /(?:profit|margin|roi|return\s+on|net\s+revenue|profit\s+(?:analysis|per\s+product|margin)|cost\s+vs\s+revenue)/i,
        handler: () => this.profitByProduct()
      },
      {
        regex: /(?:most\s+)?(?:profitable|high\s+margin|best\s+margin)\s*(?:products?)?/i,
        handler: () => this.profitByProduct()
      },

      // ── GROUP 12: BIGGEST SINGLE SHIPMENT ───────────────────────────────
      {
        regex: /(?:biggest|largest|highest|most\s+expensive)\s+(?:single\s+)?(?:deal|transaction|sale|shipment|order)/i,
        handler: () => this.biggestShipment()
      },
      {
        regex: /(?:highest|max|maximum)\s+(?:single|individual|one-time)\s+(?:sale|amount|revenue)/i,
        handler: () => this.biggestShipment()
      },

      // ── GROUP 13: YEAR COMPARISON / ANNUAL ──────────────────────────────
      {
        regex: /(?:compare|comparison|vs\.?|versus|difference)\s*(?:between\s+)?(?:2022\s*(?:and|vs\.?|versus)\s*2023|years?|year\s+over\s+year|yoy)/i,
        handler: () => this.yearComparison()
      },
      {
        regex: /year\s+over\s+year|yoy\s+(?:comparison|growth|trend)/i,
        handler: () => this.yearComparison()
      },
      {
        regex: /(?:annual|yearly|full\s+year)\s*(?:comparison|breakdown|summary|report)?\s*(2022|2023)?/i,
        handler: m => m[1] ? this.monthlyTrendForYear(m[1]) : this.annualComparison()
      },

      // ── GROUP 14: SHIPMENT ANALYSIS ──────────────────────────────────────
      {
        regex: /(?:shipments?|orders?|transactions?)\s*(?:by|per|for\s+each|breakdown\s+by)\s*country/i,
        handler: () => this.shipmentsByCountry()
      },
      {
        regex: /(?:shipments?|orders?|transactions?)\s*(?:by|per|for\s+each|breakdown\s+by)\s*region/i,
        handler: () => this.shipmentsByRegion()
      },
      {
        regex: /(?:shipments?|orders?|transactions?)\s*(?:by|per|for\s+each|breakdown\s+by)\s*product/i,
        handler: () => this.shipmentsByProduct()
      },
      {
        regex: /(?:shipments?|orders?|transactions?)\s*(?:by|per|for\s+each|breakdown\s+by)\s*team/i,
        handler: () => this.shipmentsByTeam()
      },
      {
        regex: /(?:shipments?|orders?|transactions?)\s*(?:by|per|for\s+each|breakdown\s+by)\s*(?:sales?\s*)?person/i,
        handler: () => this.shipmentsByPerson()
      },
      {
        regex: /(?:how\s+many)\s+shipments?\s+(?:in|during|for)\s+(2022|2023)/i,
        handler: m => this.shipmentCountForYear(m[1])
      },

      // ── GROUP 15: TOTAL / SUM ────────────────────────────────────────────
      {
        regex: /(?:total|overall|sum|aggregate)\s*(?:sales?|revenue|amount)/i,
        handler: () => this.totalSales()
      },
      {
        regex: /(?:total|overall|sum|aggregate)\s*(?:boxes?|shipments?|units?)/i,
        handler: () => this.totalBoxes()
      },
      {
        regex: /(?:how\s+many|total|count)\s*(?:sales?\s*(?:persons?|people|reps?))/i,
        handler: () => this.countSalesPersons()
      },
      {
        regex: /(?:how\s+many|total|count)\s*products?/i,
        handler: () => this.countProducts()
      },
      {
        regex: /(?:how\s+many|total|count)\s*(?:shipments?|orders?|transactions?)/i,
        handler: () => this.countShipments()
      },
      {
        regex: /(?:how\s+many|total|count)\s*(?:countries?|geo|regions?)/i,
        handler: () => this.countCountries()
      },

      // ── GROUP 16: AVERAGE ────────────────────────────────────────────────
      {
        regex: /(?:average|avg|mean)\s*(?:sales?|revenue|amount)\s*(?:per\s+(?:shipment|order|transaction))?/i,
        handler: () => this.avgSales()
      },
      {
        regex: /(?:average|avg|mean)\s*(?:boxes?|units?)\s*(?:per\s+(?:shipment|order|transaction))?/i,
        handler: () => this.avgBoxes()
      },
      {
        regex: /(?:average|avg|mean)\s*(?:sales?|revenue)\s*(?:per|by)\s*(?:person|sales\s*person|rep)/i,
        handler: () => this.avgSalesPerPerson()
      },

      // ── GROUP 17: SALES BY DIMENSION ─────────────────────────────────────
      {
        regex: /sales?\s*(?:by|per|for\s+each|breakdown\s+by|across)\s*region/i,
        handler: () => this.salesByRegion()
      },
      {
        regex: /sales?\s*(?:by|per|for\s+each|breakdown\s+by|across)\s*(?:country|countries|geo)/i,
        handler: () => this.salesByCountry()
      },
      {
        regex: /sales?\s*(?:by|per|for\s+each|breakdown\s+by|across)\s*categor/i,
        handler: () => this.salesByCategory()
      },
      {
        regex: /sales?\s*(?:by|per|for\s+each|breakdown\s+by|across)\s*products?/i,
        handler: () => this.salesByProduct()
      },
      {
        regex: /sales?\s*(?:by|per|for\s+each|breakdown\s+by|across)\s*teams?/i,
        handler: () => this.salesByTeam()
      },
      {
        regex: /sales?\s*(?:by|per|for\s+each|breakdown\s+by|across)\s*(?:person|sales\s*person|people)/i,
        handler: () => this.salesByPerson()
      },
      {
        regex: /sales?\s*(?:by|per|for\s+each|breakdown\s+by|across)\s*(?:month|monthly)/i,
        handler: () => this.salesByMonth()
      },
      {
        regex: /sales?\s*(?:by|per|for\s+each|breakdown\s+by|across)\s*(?:size)/i,
        handler: () => this.salesBySize()
      },
      {
        regex: /sales?\s*(?:by|per|for\s+each|breakdown\s+by|across)\s*(?:location|city)/i,
        handler: () => this.salesByLocation()
      },

      // ── GROUP 18: REVENUE PER BOX ────────────────────────────────────────
      {
        regex: /revenue\s*per\s*box/i,
        handler: () => this.revenueByProduct()
      },
      {
        regex: /(?:most\s+)?efficient\s+(?:product|item)/i,
        handler: () => this.revenueByProduct()
      },

      // ── GROUP 19: MONTHLY TREND ──────────────────────────────────────────
      {
        regex: /(?:monthly|month\s*wise|month\s*by\s*month)\s*(?:sales?|trend|revenue|performance)/i,
        handler: () => this.monthlyTrend()
      },
      {
        regex: /(?:sales?|revenue)?\s*trend/i,
        handler: () => this.monthlyTrend()
      },

      // ── GROUP 20: MOST / LEAST POPULAR PRODUCT ───────────────────────────
      {
        regex: /(?:most|highest|best)\s*(?:popular|sold|selling|demanded)\s*product/i,
        handler: () => this.topProducts(1)
      },
      {
        regex: /(?:least|lowest|worst)\s*(?:popular|sold|selling|demanded)\s*product/i,
        handler: () => this.bottomProducts(1)
      },

      // ── GROUP 21: LIST ALL ────────────────────────────────────────────────
      {
        regex: /(?:list|show|all|display|get)\s*(?:all\s*)?(?:sales?\s*(?:persons?|people|reps?))/i,
        handler: () => this.listSalesPersons()
      },
      {
        regex: /(?:list|show|all|display|get)\s*(?:all\s*)?products?/i,
        handler: () => this.listProducts()
      },
      {
        regex: /(?:list|show|all|display|get)\s*(?:all\s*)?(?:countries?|geo|geographies)/i,
        handler: () => this.listCountries()
      },
      {
        regex: /(?:list|show|all|display|get)\s*(?:all\s*)?teams?/i,
        handler: () => this.listTeams()
      },
      {
        regex: /(?:list|show|all|display|get)\s*(?:all\s*)?categor(?:y|ies)/i,
        handler: () => this.listCategories()
      },

      // ── GROUP 22: COST QUERIES ────────────────────────────────────────────
      {
        regex: /(?:most|highest)\s*(?:expensive|costly)\s*product/i,
        handler: () => this.mostExpensiveProduct()
      },
      {
        regex: /(?:least|lowest|cheapest)\s*(?:expensive|costly|cheap)\s*product/i,
        handler: () => this.cheapestProduct()
      },
      {
        regex: /(?:cost|price)\s*(?:of|for)\s*(?:each|all|every)?\s*products?/i,
        handler: () => this.productCosts()
      },

      // ── GROUP 23: DATE RANGE ──────────────────────────────────────────────
      {
        regex: /sales?\s*(?:in|for|during)\s*(2022|2023)/i,
        handler: m => this.salesForYear(m[1])
      },
      {
        regex: /(?:2022|2023)\s*(?:sales?|revenue|data)/i,
        handler: m => this.salesForYear(m[0].match(/202[23]/)[0])
      },
      {
        regex: /sales?\s*(?:in|for|during)\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s*(2022|2023)?/i,
        handler: m => this.salesForMonth(m[1], m[2])
      },

      // ── GROUP 24: COMPARE ─────────────────────────────────────────────────
      {
        regex: /compar\w*\s*(?:between|of)?\s*(?:teams?|all\s*teams?)/i,
        handler: () => this.salesByTeam()
      },
      {
        regex: /compar\w*\s*(?:between|of)?\s*(?:regions?|all\s*regions?)/i,
        handler: () => this.salesByRegion()
      },
      {
        regex: /compar\w*\s*(?:between|of)?\s*(?:categor\w+|all\s*categor\w+)/i,
        handler: () => this.salesByCategory()
      },

      // ── GROUP 25: PRODUCT DETAILS ─────────────────────────────────────────
      {
        regex: /(?:tell\s+me\s+about|info(?:rmation)?\s+(?:on|about)|details?\s+(?:of|for|about)|profile\s+of)\s+(.+)/i,
        handler: m => this.productInfo(m[1])
      },

      // ── GROUP 26: SUMMARY ─────────────────────────────────────────────────
      {
        regex: /(?:summary|overview|dashboard|report|kpi|key\s*metrics)/i,
        handler: () => this.summary()
      },
      {
        regex: /(?:give\s+me|show\s+me|tell\s+me)\s+(?:a\s+)?(?:full|complete|all|overall|everything|entire)/i,
        handler: () => this.summary()
      },
      {
        regex: /(?:what\s+are\s+(?:the\s+)?(?:key\s+)?(?:insights?|findings?|highlights?|takeaways?))/i,
        handler: () => this.summary()
      },

      // ── GROUP 27: SPECIFIC ENTITY ─────────────────────────────────────────
      {
        regex: /(?:sales?|revenue|amount|performance|how\s+much).*?(?:in|for|from|of)\s+(india|usa|canada|new\s*zealand|australia|uk)\b/i,
        handler: m => this.salesForCountry(m[1])
      },
      {
        regex: /(?:sales?|revenue|amount|performance|how\s+much).*?(?:in|for|from|of)\s+(apac|americas|europe)\b/i,
        handler: m => this.salesForRegion(m[1])
      },
      {
        regex: /(?:sales?|revenue|amount|performance|how\s+much).*?(?:in|for|from|of|by)\s+(?:team\s+)?(yummies|delish|jucies)\b/i,
        handler: m => this.salesForTeam(m[1])
      },

      // ── GROUP 28: SPECIFIC PRODUCT ────────────────────────────────────────
      {
        regex: /(?:how\s+(?:much|many)|what\s+(?:is|are))\s*(?:boxes?|amount|sales?).*?(?:for|of)\s+(.+)/i,
        handler: m => this.salesForProduct(m[1].trim())
      },

      // ── GROUP 29: PERSON BY NAME (CATCH-ALL — must be last) ───────────────
      {
        regex: /(?:sales?|revenue|performance|how\s+(?:much|many)|what\s+(?:did|is|are))\s+(?:(?:did|for|of|by)\s+)?([A-Za-z]{4,}(?:\s+[A-Za-z]{4,})?)\s*(?:sell|generate|make|earn|achieve|sold|do|managed|performed)?/i,
        handler: m => {
          const skip = ['region','country','category','product','team','location','city','month','year','quarter',
                        'person','people','items','sales','revenue','boxes','shipments','total','most','best',
                        'highest','lowest','top','all','each','every','much','many','what','this','that',
                        'share','percent','profit','margin','cost','price','analysis','comparison','trend',
                        'breakdown','performance','overview','summary','report','insight','data'];
          const name = m[1].trim().toLowerCase();
          if (skip.some(w => name.includes(w))) return null;
          return this.salesForPersonByName(m[1].trim());
        }
      },
    ];
  }

  // ─── processQuestion ──────────────────────────────────────────────────────
  processQuestion(question) {
    const q = question.trim();

    for (const pattern of this.patterns) {
      const match = q.match(pattern.regex);
      if (match) {
        const result = pattern.handler(match);
        if (result) return result;
      }
    }

    // Fallback entity detection
    const lq = q.toLowerCase();

    for (const product of this.products) {
      if (lq.includes(product.toLowerCase())) return this.salesForProduct(product);
    }
    for (const country of this.countries) {
      if (lq.includes(country)) return this.salesForCountry(country);
    }
    for (const team of this.teams) {
      if (lq.includes(team)) {
        const peopleWords = ['who', 'member', 'staff', 'people', 'roster', 'list', 'show', 'person', 'names'];
        if (peopleWords.some(w => lq.includes(w))) return this.teamMembers(team);
        return this.salesForTeam(team);
      }
    }
    for (const region of this.regions) {
      if (lq.includes(region)) return this.salesForRegion(region);
    }
    for (const loc of this.locations) {
      if (lq.includes(loc)) return this.peopleAtLocation(loc);
    }
    for (const cat of this.categories) {
      if (lq.includes(cat + ' category') || lq.includes('category ' + cat)) {
        return this.productsByCategory(cat);
      }
    }

    return null;
  }

  // ─── EXISTING QUERY BUILDERS ─────────────────────────────────────────────

  topSalesPersons(n) {
    return {
      sql: `SELECT p.\`Sales Person\` AS name, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes, p.Team AS team
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            GROUP BY p.\`Sales Person\`, p.Team ORDER BY total_sales DESC LIMIT ?`,
      params: [n], format: 'table',
      description: `Top ${n} Sales Person${n > 1 ? 's' : ''} by Revenue`,
      columns: ['Name', 'Total Sales ($)', 'Total Boxes', 'Team']
    };
  }

  bottomSalesPersons(n) {
    return {
      sql: `SELECT p.\`Sales Person\` AS name, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes, p.Team AS team
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            GROUP BY p.\`Sales Person\`, p.Team ORDER BY total_sales ASC LIMIT ?`,
      params: [n], format: 'table',
      description: `Bottom ${n} Sales Person${n > 1 ? 's' : ''} by Revenue`,
      columns: ['Name', 'Total Sales ($)', 'Total Boxes', 'Team']
    };
  }

  topProducts(n) {
    return {
      sql: `SELECT pr.Product AS product, pr.Category AS category, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes
            FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
            GROUP BY pr.Product, pr.Category ORDER BY total_sales DESC LIMIT ?`,
      params: [n], format: 'table',
      description: `Top ${n} Product${n > 1 ? 's' : ''} by Revenue`,
      columns: ['Product', 'Category', 'Total Sales ($)', 'Total Boxes']
    };
  }

  bottomProducts(n) {
    return {
      sql: `SELECT pr.Product AS product, pr.Category AS category, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes
            FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
            GROUP BY pr.Product, pr.Category ORDER BY total_sales ASC LIMIT ?`,
      params: [n], format: 'table',
      description: `Bottom ${n} Product${n > 1 ? 's' : ''} by Revenue`,
      columns: ['Product', 'Category', 'Total Sales ($)', 'Total Boxes']
    };
  }

  topCountries(n) {
    return {
      sql: `SELECT g.Geo AS country, g.Region AS region, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes
            FROM shipments s JOIN geo g ON s.Geo = g.GeoID
            GROUP BY g.Geo, g.Region ORDER BY total_sales DESC LIMIT ?`,
      params: [n], format: 'table',
      description: `Top ${n} ${n > 1 ? 'Countries' : 'Country'} by Revenue`,
      columns: ['Country', 'Region', 'Total Sales ($)', 'Total Boxes']
    };
  }

  topTeams(n) {
    return {
      sql: `SELECT p.Team AS team, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes, COUNT(DISTINCT p.\`SP ID\`) AS members
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            WHERE p.Team IS NOT NULL AND p.Team != ''
            GROUP BY p.Team ORDER BY total_sales DESC LIMIT ?`,
      params: [n], format: 'table',
      description: `Top ${n} Team${n > 1 ? 's' : ''} by Revenue`,
      columns: ['Team', 'Total Sales ($)', 'Total Boxes', 'Members']
    };
  }

  totalSales() {
    return {
      sql: 'SELECT SUM(Amount) AS total_sales FROM shipments',
      params: [], format: 'single',
      description: 'Total Sales Revenue', valueKey: 'total_sales', prefix: '$', suffix: ''
    };
  }

  totalBoxes() {
    return {
      sql: 'SELECT SUM(Boxes) AS total_boxes FROM shipments',
      params: [], format: 'single',
      description: 'Total Boxes Shipped', valueKey: 'total_boxes', prefix: '', suffix: ' boxes'
    };
  }

  countSalesPersons() {
    return {
      sql: 'SELECT COUNT(*) AS count FROM people',
      params: [], format: 'single',
      description: 'Total Sales Persons', valueKey: 'count', prefix: '', suffix: ' sales persons'
    };
  }

  countProducts() {
    return {
      sql: 'SELECT COUNT(*) AS count FROM products',
      params: [], format: 'single',
      description: 'Total Products', valueKey: 'count', prefix: '', suffix: ' products'
    };
  }

  countShipments() {
    return {
      sql: 'SELECT COUNT(*) AS count FROM shipments',
      params: [], format: 'single',
      description: 'Total Shipments', valueKey: 'count', prefix: '', suffix: ' shipments'
    };
  }

  countCountries() {
    return {
      sql: 'SELECT COUNT(*) AS count FROM geo',
      params: [], format: 'single',
      description: 'Total Countries', valueKey: 'count', prefix: '', suffix: ' countries'
    };
  }

  avgSales() {
    return {
      sql: 'SELECT ROUND(AVG(Amount), 2) AS avg_sales FROM shipments',
      params: [], format: 'single',
      description: 'Average Sales per Shipment', valueKey: 'avg_sales', prefix: '$', suffix: ''
    };
  }

  avgBoxes() {
    return {
      sql: 'SELECT ROUND(AVG(Boxes), 2) AS avg_boxes FROM shipments',
      params: [], format: 'single',
      description: 'Average Boxes per Shipment', valueKey: 'avg_boxes', prefix: '', suffix: ' boxes'
    };
  }

  avgSalesPerPerson() {
    return {
      sql: `SELECT p.\`Sales Person\` AS name, ROUND(AVG(s.Amount), 2) AS avg_sales, COUNT(*) AS shipments
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            GROUP BY p.\`Sales Person\` ORDER BY avg_sales DESC`,
      params: [], format: 'table',
      description: 'Average Sales per Person',
      columns: ['Name', 'Avg Sales ($)', 'Shipments']
    };
  }

  salesByRegion() {
    return {
      sql: `SELECT g.Region AS region, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes
            FROM shipments s JOIN geo g ON s.Geo = g.GeoID
            GROUP BY g.Region ORDER BY total_sales DESC`,
      params: [], format: 'table',
      description: 'Sales by Region',
      columns: ['Region', 'Total Sales ($)', 'Total Boxes']
    };
  }

  salesByCountry() {
    return {
      sql: `SELECT g.Geo AS country, g.Region AS region, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes
            FROM shipments s JOIN geo g ON s.Geo = g.GeoID
            GROUP BY g.Geo, g.Region ORDER BY total_sales DESC`,
      params: [], format: 'table',
      description: 'Sales by Country',
      columns: ['Country', 'Region', 'Total Sales ($)', 'Total Boxes']
    };
  }

  salesByCategory() {
    return {
      sql: `SELECT pr.Category AS category, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes, COUNT(DISTINCT pr.\`Product ID\`) AS products
            FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
            GROUP BY pr.Category ORDER BY total_sales DESC`,
      params: [], format: 'table',
      description: 'Sales by Product Category',
      columns: ['Category', 'Total Sales ($)', 'Total Boxes', 'Products']
    };
  }

  salesByProduct() {
    return {
      sql: `SELECT pr.Product AS product, pr.Category AS category, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes
            FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
            GROUP BY pr.Product, pr.Category ORDER BY total_sales DESC`,
      params: [], format: 'table',
      description: 'Sales by Product',
      columns: ['Product', 'Category', 'Total Sales ($)', 'Total Boxes']
    };
  }

  salesByTeam() {
    return {
      sql: `SELECT p.Team AS team, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes, COUNT(DISTINCT p.\`SP ID\`) AS members
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            WHERE p.Team IS NOT NULL AND p.Team != ''
            GROUP BY p.Team ORDER BY total_sales DESC`,
      params: [], format: 'table',
      description: 'Sales by Team',
      columns: ['Team', 'Total Sales ($)', 'Total Boxes', 'Members']
    };
  }

  salesByPerson() {
    return {
      sql: `SELECT p.\`Sales Person\` AS name, p.Team AS team, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            GROUP BY p.\`Sales Person\`, p.Team ORDER BY total_sales DESC`,
      params: [], format: 'table',
      description: 'Sales by Person',
      columns: ['Name', 'Team', 'Total Sales ($)', 'Total Boxes']
    };
  }

  salesByMonth() {
    return {
      sql: `SELECT DATE_FORMAT(Date, '%Y-%m') AS month, SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes
            FROM shipments GROUP BY DATE_FORMAT(Date, '%Y-%m') ORDER BY month`,
      params: [], format: 'table',
      description: 'Monthly Sales Breakdown',
      columns: ['Month', 'Total Sales ($)', 'Total Boxes']
    };
  }

  salesBySize() {
    return {
      sql: `SELECT pr.Size AS size, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes, COUNT(DISTINCT pr.\`Product ID\`) AS products
            FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
            GROUP BY pr.Size ORDER BY total_sales DESC`,
      params: [], format: 'table',
      description: 'Sales by Product Size',
      columns: ['Size', 'Total Sales ($)', 'Total Boxes', 'Products']
    };
  }

  salesByLocation() {
    return {
      sql: `SELECT p.Location AS location, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes, COUNT(DISTINCT p.\`SP ID\`) AS persons
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            GROUP BY p.Location ORDER BY total_sales DESC`,
      params: [], format: 'table',
      description: 'Sales by Location',
      columns: ['Location', 'Total Sales ($)', 'Total Boxes', 'Persons']
    };
  }

  monthlyTrend() {
    return {
      sql: `SELECT DATE_FORMAT(Date, '%Y-%m') AS month, SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes
            FROM shipments GROUP BY DATE_FORMAT(Date, '%Y-%m') ORDER BY month`,
      params: [], format: 'table',
      description: 'Monthly Sales Trend',
      columns: ['Month', 'Total Sales ($)', 'Total Boxes']
    };
  }

  salesForCountry(country) {
    return {
      sql: `SELECT g.Geo AS country, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes, COUNT(*) AS shipments
            FROM shipments s JOIN geo g ON s.Geo = g.GeoID
            WHERE LOWER(g.Geo) = LOWER(?) GROUP BY g.Geo`,
      params: [country.trim()], format: 'table',
      description: `Sales for ${country}`,
      columns: ['Country', 'Total Sales ($)', 'Total Boxes', 'Shipments']
    };
  }

  salesForRegion(region) {
    return {
      sql: `SELECT g.Region AS region, g.Geo AS country, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes
            FROM shipments s JOIN geo g ON s.Geo = g.GeoID
            WHERE LOWER(g.Region) = LOWER(?) GROUP BY g.Region, g.Geo ORDER BY total_sales DESC`,
      params: [region.trim()], format: 'table',
      description: `Sales in ${region} Region`,
      columns: ['Region', 'Country', 'Total Sales ($)', 'Total Boxes']
    };
  }

  salesForTeam(team) {
    return {
      sql: `SELECT p.Team AS team, p.\`Sales Person\` AS name, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            WHERE LOWER(p.Team) = LOWER(?) GROUP BY p.Team, p.\`Sales Person\` ORDER BY total_sales DESC`,
      params: [team.trim()], format: 'table',
      description: `Sales for Team ${team}`,
      columns: ['Team', 'Name', 'Total Sales ($)', 'Total Boxes']
    };
  }

  salesForYear(year) {
    return {
      sql: `SELECT DATE_FORMAT(Date, '%Y-%m') AS month, SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes
            FROM shipments WHERE YEAR(Date) = ? GROUP BY DATE_FORMAT(Date, '%Y-%m') ORDER BY month`,
      params: [parseInt(year)], format: 'table',
      description: `Monthly Sales in ${year}`,
      columns: ['Month', 'Total Sales ($)', 'Total Boxes']
    };
  }

  salesForMonth(monthName, year) {
    const months = { january:1, february:2, march:3, april:4, may:5, june:6,
                     july:7, august:8, september:9, october:10, november:11, december:12 };
    const monthNum = months[monthName.toLowerCase()];
    let sql, params;
    if (year) {
      sql = `SELECT SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes, COUNT(*) AS shipments
             FROM shipments WHERE MONTH(Date) = ? AND YEAR(Date) = ?`;
      params = [monthNum, parseInt(year)];
    } else {
      sql = `SELECT YEAR(Date) AS year, SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes, COUNT(*) AS shipments
             FROM shipments WHERE MONTH(Date) = ? GROUP BY YEAR(Date) ORDER BY YEAR(Date)`;
      params = [monthNum];
    }
    return {
      sql, params,
      format: year ? 'single_row' : 'table',
      description: `Sales in ${monthName}${year ? ' ' + year : ''}`,
      columns: year ? ['Total Sales ($)', 'Total Boxes', 'Shipments'] : ['Year', 'Total Sales ($)', 'Total Boxes', 'Shipments']
    };
  }

  salesForProduct(productName) {
    return {
      sql: `SELECT pr.Product AS product, pr.Category AS category, SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes, COUNT(*) AS shipments
            FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
            WHERE LOWER(pr.Product) LIKE LOWER(CONCAT('%', ?, '%'))
            GROUP BY pr.Product, pr.Category`,
      params: [productName.trim()], format: 'table',
      description: `Sales for "${productName}"`,
      columns: ['Product', 'Category', 'Total Sales ($)', 'Total Boxes', 'Shipments']
    };
  }

  mostExpensiveProduct() {
    return {
      sql: 'SELECT Product, Category, Size, `Cost per Box` FROM products ORDER BY `Cost per Box` DESC LIMIT 5',
      params: [], format: 'table',
      description: 'Most Expensive Products',
      columns: ['Product', 'Category', 'Size', 'Cost per Box ($)']
    };
  }

  cheapestProduct() {
    return {
      sql: 'SELECT Product, Category, Size, `Cost per Box` FROM products ORDER BY `Cost per Box` ASC LIMIT 5',
      params: [], format: 'table',
      description: 'Cheapest Products',
      columns: ['Product', 'Category', 'Size', 'Cost per Box ($)']
    };
  }

  productCosts() {
    return {
      sql: 'SELECT Product, Category, Size, `Cost per Box` FROM products ORDER BY `Cost per Box` DESC',
      params: [], format: 'table',
      description: 'Product Cost List',
      columns: ['Product', 'Category', 'Size', 'Cost per Box ($)']
    };
  }

  revenueByProduct() {
    return {
      sql: `SELECT pr.Product AS product, pr.\`Cost per Box\` AS cost_per_box, SUM(s.Boxes) AS total_boxes,
            SUM(s.Amount) AS total_revenue, ROUND(SUM(s.Amount) / SUM(s.Boxes), 2) AS revenue_per_box
            FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
            GROUP BY pr.Product, pr.\`Cost per Box\` ORDER BY revenue_per_box DESC`,
      params: [], format: 'table',
      description: 'Revenue per Box by Product',
      columns: ['Product', 'Cost/Box ($)', 'Total Boxes', 'Total Revenue ($)', 'Revenue/Box ($)']
    };
  }

  listSalesPersons() {
    return {
      sql: 'SELECT `Sales Person` AS name, `SP ID` AS id, Team AS team, Location AS location FROM people ORDER BY `Sales Person`',
      params: [], format: 'table',
      description: 'All Sales Persons',
      columns: ['Name', 'ID', 'Team', 'Location']
    };
  }

  listProducts() {
    return {
      sql: 'SELECT Product, Category, Size, `Cost per Box` FROM products ORDER BY Product',
      params: [], format: 'table',
      description: 'All Products',
      columns: ['Product', 'Category', 'Size', 'Cost per Box ($)']
    };
  }

  listCountries() {
    return {
      sql: 'SELECT Geo AS country, Region FROM geo ORDER BY Region, Geo',
      params: [], format: 'table',
      description: 'All Countries',
      columns: ['Country', 'Region']
    };
  }

  listTeams() {
    return {
      sql: "SELECT Team, COUNT(*) AS members FROM people WHERE Team IS NOT NULL AND Team != '' GROUP BY Team ORDER BY Team",
      params: [], format: 'table',
      description: 'All Teams',
      columns: ['Team', 'Members']
    };
  }

  listCategories() {
    return {
      sql: 'SELECT Category, COUNT(*) AS products FROM products GROUP BY Category ORDER BY Category',
      params: [], format: 'table',
      description: 'All Categories',
      columns: ['Category', 'Products']
    };
  }

  summary() {
    return {
      sql: `SELECT
              (SELECT SUM(Amount) FROM shipments) AS total_sales,
              (SELECT SUM(Boxes) FROM shipments) AS total_boxes,
              (SELECT COUNT(*) FROM shipments) AS total_shipments,
              (SELECT COUNT(*) FROM products) AS total_products,
              (SELECT COUNT(*) FROM people) AS total_people,
              (SELECT COUNT(*) FROM geo) AS total_countries,
              (SELECT MIN(Date) FROM shipments) AS start_date,
              (SELECT MAX(Date) FROM shipments) AS end_date`,
      params: [], format: 'summary',
      description: 'Dashboard Summary'
    };
  }

  // ─── NEW QUERY BUILDERS ───────────────────────────────────────────────────

  bestMonth() {
    return {
      sql: `SELECT DATE_FORMAT(Date, '%Y-%m') AS month, DATE_FORMAT(Date, '%M %Y') AS month_name,
            SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes, COUNT(*) AS shipments
            FROM shipments GROUP BY DATE_FORMAT(Date, '%Y-%m'), DATE_FORMAT(Date, '%M %Y')
            ORDER BY total_sales DESC LIMIT 1`,
      params: [], format: 'table',
      description: 'Best Performing Month',
      columns: ['Month', 'Month Name', 'Total Sales ($)', 'Total Boxes', 'Shipments']
    };
  }

  worstMonth() {
    return {
      sql: `SELECT DATE_FORMAT(Date, '%Y-%m') AS month, DATE_FORMAT(Date, '%M %Y') AS month_name,
            SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes, COUNT(*) AS shipments
            FROM shipments GROUP BY DATE_FORMAT(Date, '%Y-%m'), DATE_FORMAT(Date, '%M %Y')
            ORDER BY total_sales ASC LIMIT 1`,
      params: [], format: 'table',
      description: 'Lowest Performing Month',
      columns: ['Month', 'Month Name', 'Total Sales ($)', 'Total Boxes', 'Shipments']
    };
  }

  bestQuarter() {
    return {
      sql: `SELECT YEAR(Date) AS year, CONCAT('Q', QUARTER(Date)) AS quarter,
            SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes
            FROM shipments GROUP BY YEAR(Date), QUARTER(Date), CONCAT('Q', QUARTER(Date))
            ORDER BY total_sales DESC LIMIT 1`,
      params: [], format: 'table',
      description: 'Best Performing Quarter',
      columns: ['Year', 'Quarter', 'Total Sales ($)', 'Total Boxes']
    };
  }

  worstQuarter() {
    return {
      sql: `SELECT YEAR(Date) AS year, CONCAT('Q', QUARTER(Date)) AS quarter,
            SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes
            FROM shipments GROUP BY YEAR(Date), QUARTER(Date), CONCAT('Q', QUARTER(Date))
            ORDER BY total_sales ASC LIMIT 1`,
      params: [], format: 'table',
      description: 'Worst Performing Quarter',
      columns: ['Year', 'Quarter', 'Total Sales ($)', 'Total Boxes']
    };
  }

  salesForQuarter(q, year) {
    const quarterMonths = { 1: [1, 3], 2: [4, 6], 3: [7, 9], 4: [10, 12] };
    const [startM, endM] = quarterMonths[q];
    const qName = ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'][q - 1];
    let sql, params;
    if (year) {
      sql = `SELECT SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes, COUNT(*) AS shipments
             FROM shipments WHERE YEAR(Date) = ? AND MONTH(Date) BETWEEN ? AND ?`;
      params = [parseInt(year), startM, endM];
    } else {
      sql = `SELECT YEAR(Date) AS year, SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes, COUNT(*) AS shipments
             FROM shipments WHERE MONTH(Date) BETWEEN ? AND ?
             GROUP BY YEAR(Date) ORDER BY YEAR(Date)`;
      params = [startM, endM];
    }
    return {
      sql, params,
      format: year ? 'single_row' : 'table',
      description: `${qName}${year ? ' ' + year : ''} Sales`,
      columns: year ? ['Total Sales ($)', 'Total Boxes', 'Shipments'] : ['Year', 'Total Sales ($)', 'Total Boxes', 'Shipments']
    };
  }

  salesByQuarter() {
    return {
      sql: `SELECT YEAR(Date) AS year, CONCAT('Q', QUARTER(Date)) AS quarter,
            SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes, COUNT(*) AS shipments
            FROM shipments GROUP BY YEAR(Date), QUARTER(Date), CONCAT('Q', QUARTER(Date))
            ORDER BY YEAR(Date), QUARTER(Date)`,
      params: [], format: 'table',
      description: 'Sales by Quarter',
      columns: ['Year', 'Quarter', 'Total Sales ($)', 'Total Boxes', 'Shipments']
    };
  }

  shareByRegion() {
    return {
      sql: `SELECT g.Region AS region, SUM(s.Amount) AS total_sales,
            ROUND(SUM(s.Amount) * 100.0 / (SELECT SUM(Amount) FROM shipments), 1) AS share_pct
            FROM shipments s JOIN geo g ON s.Geo = g.GeoID
            GROUP BY g.Region ORDER BY total_sales DESC`,
      params: [], format: 'table',
      description: 'Revenue Share by Region',
      columns: ['Region', 'Total Sales ($)', 'Share (%)']
    };
  }

  shareByCategory() {
    return {
      sql: `SELECT pr.Category AS category, SUM(s.Amount) AS total_sales,
            ROUND(SUM(s.Amount) * 100.0 / (SELECT SUM(Amount) FROM shipments), 1) AS share_pct
            FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
            GROUP BY pr.Category ORDER BY total_sales DESC`,
      params: [], format: 'table',
      description: 'Revenue Share by Category',
      columns: ['Category', 'Total Sales ($)', 'Share (%)']
    };
  }

  shareByCountry() {
    return {
      sql: `SELECT g.Geo AS country, SUM(s.Amount) AS total_sales,
            ROUND(SUM(s.Amount) * 100.0 / (SELECT SUM(Amount) FROM shipments), 1) AS share_pct
            FROM shipments s JOIN geo g ON s.Geo = g.GeoID
            GROUP BY g.Geo ORDER BY total_sales DESC`,
      params: [], format: 'table',
      description: 'Revenue Share by Country',
      columns: ['Country', 'Total Sales ($)', 'Share (%)']
    };
  }

  shareByTeam() {
    return {
      sql: `SELECT p.Team AS team, SUM(s.Amount) AS total_sales,
            ROUND(SUM(s.Amount) * 100.0 / (SELECT SUM(Amount) FROM shipments), 1) AS share_pct,
            COUNT(DISTINCT p.\`SP ID\`) AS members
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            WHERE p.Team IS NOT NULL AND p.Team != ''
            GROUP BY p.Team ORDER BY total_sales DESC`,
      params: [], format: 'table',
      description: 'Revenue Share by Team',
      columns: ['Team', 'Total Sales ($)', 'Share (%)', 'Members']
    };
  }

  teamMembers(team) {
    const t = team.charAt(0).toUpperCase() + team.slice(1).toLowerCase();
    return {
      sql: `SELECT \`Sales Person\` AS name, Location AS location, \`SP ID\` AS id
            FROM people WHERE LOWER(Team) = LOWER(?) ORDER BY \`Sales Person\``,
      params: [team.trim()], format: 'table',
      description: `Members of Team ${t}`,
      columns: ['Name', 'Location', 'ID']
    };
  }

  peopleAtLocation(location) {
    const loc = location.charAt(0).toUpperCase() + location.slice(1).toLowerCase();
    return {
      sql: `SELECT \`Sales Person\` AS name, Team AS team, Location AS location, \`SP ID\` AS id
            FROM people WHERE LOWER(Location) LIKE LOWER(CONCAT('%', ?, '%'))
            ORDER BY \`Sales Person\``,
      params: [location.trim()], format: 'table',
      description: `Sales Team in ${loc}`,
      columns: ['Name', 'Team', 'Location', 'ID']
    };
  }

  productsByCategory(category) {
    const raw = category.replace(/s$/i, '');
    return {
      sql: `SELECT pr.Product AS product, pr.Size AS size, pr.\`Cost per Box\` AS cost_per_box,
            SUM(s.Amount) AS total_revenue, SUM(s.Boxes) AS total_boxes
            FROM products pr LEFT JOIN shipments s ON s.Product = pr.\`Product ID\`
            WHERE LOWER(pr.Category) LIKE LOWER(CONCAT('%', ?, '%'))
            GROUP BY pr.Product, pr.Size, pr.\`Cost per Box\` ORDER BY total_revenue DESC`,
      params: [raw.trim()], format: 'table',
      description: `Products in ${raw.charAt(0).toUpperCase() + raw.slice(1)} Category`,
      columns: ['Product', 'Size', 'Cost/Box ($)', 'Total Revenue ($)', 'Total Boxes']
    };
  }

  topProductsByBoxes(n) {
    return {
      sql: `SELECT pr.Product AS product, pr.Category AS category, SUM(s.Boxes) AS total_boxes, SUM(s.Amount) AS total_sales
            FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
            GROUP BY pr.Product, pr.Category ORDER BY total_boxes DESC LIMIT ?`,
      params: [n], format: 'table',
      description: `Top ${n} Products by Volume (Boxes)`,
      columns: ['Product', 'Category', 'Total Boxes', 'Total Sales ($)']
    };
  }

  topSalesPersonsByBoxes(n) {
    return {
      sql: `SELECT p.\`Sales Person\` AS name, p.Team AS team, SUM(s.Boxes) AS total_boxes, SUM(s.Amount) AS total_sales
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            GROUP BY p.\`Sales Person\`, p.Team ORDER BY total_boxes DESC LIMIT ?`,
      params: [n], format: 'table',
      description: `Top ${n} Sales Persons by Volume (Boxes)`,
      columns: ['Name', 'Team', 'Total Boxes', 'Total Sales ($)']
    };
  }

  profitByProduct() {
    return {
      sql: `SELECT pr.Product AS product, pr.Category AS category,
            pr.\`Cost per Box\` AS cost_per_box,
            ROUND(SUM(s.Amount) / SUM(s.Boxes), 2) AS revenue_per_box,
            ROUND(SUM(s.Amount) / SUM(s.Boxes) - pr.\`Cost per Box\`, 2) AS profit_per_box,
            ROUND((SUM(s.Amount) / SUM(s.Boxes) - pr.\`Cost per Box\`) / pr.\`Cost per Box\` * 100, 1) AS margin_pct,
            SUM(s.Amount) AS total_revenue
            FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
            GROUP BY pr.Product, pr.Category, pr.\`Cost per Box\`
            ORDER BY profit_per_box DESC`,
      params: [], format: 'table',
      description: 'Product Profitability Analysis',
      columns: ['Product', 'Category', 'Cost/Box ($)', 'Revenue/Box ($)', 'Profit/Box ($)', 'Margin (%)', 'Total Revenue ($)']
    };
  }

  biggestShipment() {
    return {
      sql: `SELECT s.Date AS date, p.\`Sales Person\` AS person, pr.Product AS product,
            g.Geo AS country, s.Amount AS amount, s.Boxes AS boxes
            FROM shipments s
            JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            JOIN products pr ON s.Product = pr.\`Product ID\`
            JOIN geo g ON s.Geo = g.GeoID
            ORDER BY s.Amount DESC LIMIT 10`,
      params: [], format: 'table',
      description: 'Top 10 Largest Shipments by Value',
      columns: ['Date', 'Sales Person', 'Product', 'Country', 'Amount ($)', 'Boxes']
    };
  }

  annualComparison() {
    return {
      sql: `SELECT YEAR(Date) AS year, SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes, COUNT(*) AS shipments
            FROM shipments GROUP BY YEAR(Date) ORDER BY year`,
      params: [], format: 'table',
      description: 'Annual Sales Comparison',
      columns: ['Year', 'Total Sales ($)', 'Total Boxes', 'Shipments']
    };
  }

  yearComparison() {
    return {
      sql: `SELECT YEAR(Date) AS year, CONCAT('Q', QUARTER(Date)) AS quarter,
            SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes, COUNT(*) AS shipments
            FROM shipments GROUP BY YEAR(Date), QUARTER(Date), CONCAT('Q', QUARTER(Date))
            ORDER BY YEAR(Date), QUARTER(Date)`,
      params: [], format: 'table',
      description: '2022 vs 2023 — Quarterly Comparison',
      columns: ['Year', 'Quarter', 'Total Sales ($)', 'Total Boxes', 'Shipments']
    };
  }

  shipmentsByCountry() {
    return {
      sql: `SELECT g.Geo AS country, g.Region AS region, COUNT(*) AS shipments, SUM(s.Amount) AS total_sales
            FROM shipments s JOIN geo g ON s.Geo = g.GeoID
            GROUP BY g.Geo, g.Region ORDER BY shipments DESC`,
      params: [], format: 'table',
      description: 'Shipment Count by Country',
      columns: ['Country', 'Region', 'Shipments', 'Total Sales ($)']
    };
  }

  shipmentsByRegion() {
    return {
      sql: `SELECT g.Region AS region, COUNT(*) AS shipments, SUM(s.Amount) AS total_sales
            FROM shipments s JOIN geo g ON s.Geo = g.GeoID
            GROUP BY g.Region ORDER BY shipments DESC`,
      params: [], format: 'table',
      description: 'Shipment Count by Region',
      columns: ['Region', 'Shipments', 'Total Sales ($)']
    };
  }

  shipmentsByProduct() {
    return {
      sql: `SELECT pr.Product AS product, pr.Category AS category, COUNT(*) AS shipments, SUM(s.Boxes) AS total_boxes
            FROM shipments s JOIN products pr ON s.Product = pr.\`Product ID\`
            GROUP BY pr.Product, pr.Category ORDER BY shipments DESC`,
      params: [], format: 'table',
      description: 'Shipment Count by Product',
      columns: ['Product', 'Category', 'Shipments', 'Total Boxes']
    };
  }

  shipmentsByTeam() {
    return {
      sql: `SELECT p.Team AS team, COUNT(*) AS shipments, SUM(s.Amount) AS total_sales, COUNT(DISTINCT p.\`SP ID\`) AS members
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            WHERE p.Team IS NOT NULL AND p.Team != ''
            GROUP BY p.Team ORDER BY shipments DESC`,
      params: [], format: 'table',
      description: 'Shipment Count by Team',
      columns: ['Team', 'Shipments', 'Total Sales ($)', 'Members']
    };
  }

  shipmentsByPerson() {
    return {
      sql: `SELECT p.\`Sales Person\` AS name, p.Team AS team, COUNT(*) AS shipments,
            SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            GROUP BY p.\`Sales Person\`, p.Team ORDER BY shipments DESC`,
      params: [], format: 'table',
      description: 'Shipment Count by Sales Person',
      columns: ['Name', 'Team', 'Shipments', 'Total Sales ($)', 'Total Boxes']
    };
  }

  shipmentCountForYear(year) {
    return {
      sql: `SELECT COUNT(*) AS shipments, SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes
            FROM shipments WHERE YEAR(Date) = ?`,
      params: [parseInt(year)], format: 'single_row',
      description: `Shipment Summary for ${year}`,
      columns: ['Shipments', 'Total Sales ($)', 'Total Boxes']
    };
  }

  monthlyTrendForYear(year) {
    return {
      sql: `SELECT DATE_FORMAT(Date, '%Y-%m') AS month, DATE_FORMAT(Date, '%b') AS month_name,
            SUM(Amount) AS total_sales, SUM(Boxes) AS total_boxes, COUNT(*) AS shipments
            FROM shipments WHERE YEAR(Date) = ?
            GROUP BY DATE_FORMAT(Date, '%Y-%m'), DATE_FORMAT(Date, '%b') ORDER BY month`,
      params: [parseInt(year)], format: 'table',
      description: `Monthly Breakdown for ${year}`,
      columns: ['Month', 'Month Name', 'Total Sales ($)', 'Total Boxes', 'Shipments']
    };
  }

  salesForPersonByName(name) {
    return {
      sql: `SELECT p.\`Sales Person\` AS name, p.Team AS team, p.Location AS location,
            SUM(s.Amount) AS total_sales, SUM(s.Boxes) AS total_boxes, COUNT(*) AS shipments
            FROM shipments s JOIN people p ON s.\`Sales Person\` = p.\`SP ID\`
            WHERE LOWER(p.\`Sales Person\`) LIKE LOWER(CONCAT('%', ?, '%'))
            GROUP BY p.\`Sales Person\`, p.Team, p.Location ORDER BY total_sales DESC`,
      params: [name.trim()], format: 'table',
      description: `Sales Performance — "${name}"`,
      columns: ['Name', 'Team', 'Location', 'Total Sales ($)', 'Total Boxes', 'Shipments']
    };
  }

  productInfo(name) {
    return {
      sql: `SELECT pr.Product AS product, pr.Category AS category, pr.Size AS size,
            pr.\`Cost per Box\` AS cost_per_box,
            SUM(s.Amount) AS total_revenue, SUM(s.Boxes) AS total_boxes, COUNT(*) AS shipments,
            ROUND(SUM(s.Amount) / SUM(s.Boxes), 2) AS revenue_per_box
            FROM products pr LEFT JOIN shipments s ON s.Product = pr.\`Product ID\`
            WHERE LOWER(pr.Product) LIKE LOWER(CONCAT('%', ?, '%'))
            GROUP BY pr.Product, pr.Category, pr.Size, pr.\`Cost per Box\``,
      params: [name.trim()], format: 'table',
      description: `Product Details — "${name}"`,
      columns: ['Product', 'Category', 'Size', 'Cost/Box ($)', 'Total Revenue ($)', 'Total Boxes', 'Shipments', 'Revenue/Box ($)']
    };
  }

  // ─── SUGGESTIONS ─────────────────────────────────────────────────────────
  getSuggestedQuestions() {
    return [
      "What are the top 5 products?",
      "Show me sales by region",
      "Who sold the most?",
      "What is the total revenue?",
      "Monthly sales trend",
      "Compare teams performance",
      "Sales in India",
      "What was the best month?",
      "Product profitability analysis",
      "Show Q1 2023 performance",
      "Revenue share by category",
      "Who is on the Delish team?",
      "Who works in Hyderabad?",
      "Bars category products",
      "Compare 2022 and 2023",
      "Shipments by country",
      "Top 5 products by boxes",
      "Show quarterly breakdown",
      "Biggest single deal",
      "Country revenue share"
    ];
  }
}

module.exports = NLPEngine;
