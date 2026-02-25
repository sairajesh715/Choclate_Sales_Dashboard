// ===== Chart.js Global Defaults =====
Chart.defaults.color = '#9494b8';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10,10,30,0.9)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(100,100,255,0.2)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 10;
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.titleFont = { weight: '600', size: 13 };

// ===== Color Palette (2 colors: Cyan + Purple) =====
const COLORS = {
    cyan: '#00e5ff',   cyanAlpha: 'rgba(0,229,255,0.15)',
    purple: '#b388ff', purpleAlpha: 'rgba(179,136,255,0.15)',
    // Alternating: strong cyan, strong purple, dimmer cyan, dimmer purple …
    palette: [
        '#00e5ff', '#b388ff', '#00e5ff', '#b388ff',
        '#00e5ff', '#b388ff', '#00e5ff', '#b388ff',
        '#00e5ff', '#b388ff'
    ],
    paletteAlpha: [
        'rgba(0,229,255,0.75)', 'rgba(179,136,255,0.75)',
        'rgba(0,229,255,0.55)', 'rgba(179,136,255,0.55)',
        'rgba(0,229,255,0.75)', 'rgba(179,136,255,0.75)',
        'rgba(0,229,255,0.55)', 'rgba(179,136,255,0.55)',
        'rgba(0,229,255,0.75)', 'rgba(179,136,255,0.75)'
    ]
};

// ===== Global Dashboard Data (for local drill-downs) =====
const dashData = {};

// ===== Animated Counter =====
function animateValue(el, end, prefix = '', suffix = '') {
    const duration = 1500;
    const startTime = performance.now();
    function update(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = prefix + Math.floor(end * eased).toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ===== Fetch all data & render =====
async function initDashboard() {
    try {
        const [kpis, regions, categories, monthly, topSales, topProducts, teams, geo, profitability] = await Promise.all([
            fetch('/api/kpis').then(r => r.json()),
            fetch('/api/sales-by-region').then(r => r.json()),
            fetch('/api/sales-by-category').then(r => r.json()),
            fetch('/api/monthly-trend').then(r => r.json()),
            fetch('/api/top-salespersons').then(r => r.json()),
            fetch('/api/top-products').then(r => r.json()),
            fetch('/api/team-performance').then(r => r.json()),
            fetch('/api/geo-breakdown').then(r => r.json()),
            fetch('/api/product-profitability').then(r => r.json())
        ]);

        // Store for local drill-downs
        Object.assign(dashData, { regions, categories, monthly, topSales, topProducts, teams, geo, profitability });

        // KPIs
        animateValue(document.getElementById('totalSales'), kpis.totalSales, '$');
        animateValue(document.getElementById('totalBoxes'), kpis.totalBoxes);
        animateValue(document.getElementById('avgSale'), kpis.avgSale, '$');
        animateValue(document.getElementById('productCount'), kpis.productCount);
        animateValue(document.getElementById('shipmentCount'), kpis.shipmentCount);
        animateValue(document.getElementById('personCount'), kpis.personCount);
        document.getElementById('dateRange').textContent =
            `${kpis.startDate} → ${kpis.endDate} • ${kpis.shipmentCount.toLocaleString()} shipments`;

        // Charts
        renderMonthlyTrend(monthly);
        renderRegionChart(regions);
        renderCategoryChart(categories);
        renderCountryChart(geo);
        renderTopSalesChart(topSales);
        renderTopProductsChart(topProducts);
        renderProfitabilityChart(profitability);
        renderTeamChart(teams);

        // Add drill-down hint to every chart header
        document.querySelectorAll('.chart-card').forEach(card => {
            const header = card.querySelector('.chart-header');
            if (header) {
                const hint = document.createElement('span');
                hint.className = 'drill-hint';
                hint.textContent = '🔍 click to explore';
                header.appendChild(hint);
            }
        });

    } catch (err) {
        console.error('Dashboard init error:', err);
    }
}

// ===== Pointer helper =====
function cursorOnHover(e, els) {
    e.native.target.style.cursor = els.length ? 'pointer' : 'default';
}

// ===== Chart Renderers =====

function renderMonthlyTrend(data) {
    const ctx = document.getElementById('monthlyTrendChart').getContext('2d');
    const g1 = ctx.createLinearGradient(0, 0, 0, 300);
    g1.addColorStop(0, 'rgba(0,229,255,0.3)'); g1.addColorStop(1, 'rgba(0,229,255,0)');
    const g2 = ctx.createLinearGradient(0, 0, 0, 300);
    g2.addColorStop(0, 'rgba(179,136,255,0.2)'); g2.addColorStop(1, 'rgba(179,136,255,0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => {
                const [y, m] = d.month.split('-');
                return new Date(y, m - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' });
            }),
            datasets: [
                {
                    label: 'Revenue ($)', data: data.map(d => d.totalSales),
                    borderColor: COLORS.cyan, backgroundColor: g1, fill: true, tension: 0.4,
                    pointRadius: 4, pointHoverRadius: 7, pointBackgroundColor: COLORS.cyan,
                    borderWidth: 2.5, yAxisID: 'y'
                },
                {
                    label: 'Boxes', data: data.map(d => d.totalBoxes),
                    borderColor: COLORS.purple, backgroundColor: g2, fill: true, tension: 0.4,
                    pointRadius: 3, pointHoverRadius: 6, pointBackgroundColor: COLORS.purple,
                    borderWidth: 2, yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            onHover: cursorOnHover,
            onClick: (e, elements) => {
                if (!elements.length) return;
                drillMonth(data[elements[0].index].month);
            },
            scales: {
                x: { grid: { color: 'rgba(100,100,255,0.06)' } },
                y: { type: 'linear', position: 'left', grid: { color: 'rgba(100,100,255,0.06)' }, ticks: { callback: v => '$' + (v / 1e6).toFixed(1) + 'M' } },
                y1: { type: 'linear', position: 'right', grid: { display: false }, ticks: { callback: v => (v / 1e3).toFixed(0) + 'K' } }
            },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function renderRegionChart(data) {
    const ctx = document.getElementById('regionChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.region),
            datasets: [{
                data: data.map(d => d.totalSales),
                backgroundColor: [COLORS.cyan, COLORS.purple, 'rgba(0,229,255,0.45)'],
                borderColor: 'rgba(10,10,30,0.8)', borderWidth: 3, hoverOffset: 12
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            onHover: cursorOnHover,
            onClick: (e, elements) => {
                if (!elements.length) return;
                drillRegion(data[elements[0].index].region);
            },
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: ctx => `${ctx.label}: $${ctx.parsed.toLocaleString()}` } }
            }
        }
    });
}

function renderCategoryChart(data) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: data.map(d => d.category),
            datasets: [{
                data: data.map(d => d.totalSales),
                backgroundColor: ['rgba(0,229,255,0.7)', 'rgba(179,136,255,0.7)', 'rgba(0,229,255,0.4)'],
                borderColor: [COLORS.cyan, COLORS.purple, COLORS.cyan],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { r: { display: false } },
            onHover: cursorOnHover,
            onClick: (e, elements) => {
                if (!elements.length) return;
                drillCategory(data[elements[0].index].category);
            },
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: ctx => `${ctx.label}: $${ctx.parsed.toLocaleString()}` } }
            }
        }
    });
}

function renderTopSalesChart(data) {
    const ctx = document.getElementById('topSalesChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.name.split(' ').slice(0, 2).join(' ')),
            datasets: [{
                label: 'Revenue ($)', data: data.map(d => d.totalSales),
                backgroundColor: COLORS.paletteAlpha.slice(0, data.length),
                borderColor: COLORS.palette.slice(0, data.length),
                borderWidth: 1.5, borderRadius: 6, borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, indexAxis: 'y',
            onHover: cursorOnHover,
            onClick: (e, elements) => {
                if (!elements.length) return;
                drillSalesPerson(data[elements[0].index].name);
            },
            scales: {
                x: { grid: { color: 'rgba(100,100,255,0.06)' }, ticks: { callback: v => '$' + (v / 1e6).toFixed(1) + 'M' } },
                y: { grid: { display: false }, ticks: { font: { size: 11 } } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => '$' + ctx.parsed.x.toLocaleString() } }
            }
        }
    });
}

function renderTopProductsChart(data) {
    const ctx = document.getElementById('topProductsChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.product),
            datasets: [{
                label: 'Revenue ($)', data: data.map(d => d.totalSales),
                backgroundColor: data.map((_, i) => COLORS.paletteAlpha[i % COLORS.paletteAlpha.length]),
                borderColor: data.map((_, i) => COLORS.palette[i % COLORS.palette.length]),
                borderWidth: 1.5, borderRadius: 6, borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            onHover: cursorOnHover,
            onClick: (e, elements) => {
                if (!elements.length) return;
                drillProduct(data[elements[0].index].product);
            },
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 30 } },
                y: { grid: { color: 'rgba(100,100,255,0.06)' }, ticks: { callback: v => '$' + (v / 1e6).toFixed(1) + 'M' } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => '$' + ctx.parsed.y.toLocaleString() } }
            }
        }
    });
}

function renderTeamChart(data) {
    const ctx = document.getElementById('teamChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.team),
            datasets: [
                {
                    label: 'Revenue ($)', data: data.map(d => d.totalSales),
                    backgroundColor: ['rgba(0,229,255,0.75)', 'rgba(0,229,255,0.55)', 'rgba(0,229,255,0.35)'],
                    borderColor: [COLORS.cyan, COLORS.cyan, COLORS.cyan],
                    borderWidth: 2, borderRadius: 8, borderSkipped: false, yAxisID: 'y'
                },
                {
                    label: 'Boxes', data: data.map(d => d.totalBoxes),
                    backgroundColor: ['rgba(179,136,255,0.75)', 'rgba(179,136,255,0.55)', 'rgba(179,136,255,0.35)'],
                    borderColor: [COLORS.purple, COLORS.purple, COLORS.purple],
                    borderWidth: 2, borderRadius: 8, borderSkipped: false, yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            onHover: cursorOnHover,
            onClick: (e, elements) => {
                if (!elements.length) return;
                drillTeam(data[elements[0].index].team);
            },
            scales: {
                x: { grid: { display: false } },
                y: { type: 'linear', position: 'left', grid: { color: 'rgba(100,100,255,0.06)' }, ticks: { callback: v => '$' + (v / 1e6).toFixed(1) + 'M' } },
                y1: { type: 'linear', position: 'right', grid: { display: false }, ticks: { callback: v => (v / 1e3).toFixed(0) + 'K' } }
            },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function renderCountryChart(data) {
    const ctx = document.getElementById('countryChart').getContext('2d');
    const flags = { 'New Zealand': '🇳🇿', 'Canada': '🇨🇦', 'India': '🇮🇳', 'Australia': '🇦🇺', 'UK': '🇬🇧', 'USA': '🇺🇸' };
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => `${flags[d.country] || ''} ${d.country}`),
            datasets: [
                {
                    label: 'Revenue ($)', data: data.map(d => d.totalSales),
                    backgroundColor: data.map(() => 'rgba(0,229,255,0.7)'),
                    borderColor: data.map(() => COLORS.cyan),
                    borderWidth: 1.5, borderRadius: 8, borderSkipped: false, yAxisID: 'y'
                },
                {
                    label: 'Boxes Shipped', data: data.map(d => d.totalBoxes),
                    backgroundColor: data.map(() => 'rgba(179,136,255,0.7)'),
                    borderColor: data.map(() => COLORS.purple),
                    borderWidth: 1.5, borderRadius: 8, borderSkipped: false, yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            onHover: cursorOnHover,
            onClick: (e, elements) => {
                if (!elements.length) return;
                drillCountry(data[elements[0].index].country);
            },
            scales: {
                x: { grid: { display: false } },
                y: { type: 'linear', position: 'left', grid: { color: 'rgba(100,100,255,0.06)' }, ticks: { callback: v => '$' + (v / 1e6).toFixed(1) + 'M' } },
                y1: { type: 'linear', position: 'right', grid: { display: false }, ticks: { callback: v => (v / 1e3).toFixed(0) + 'K' } }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.yAxisID === 'y'
                            ? ' $' + ctx.parsed.y.toLocaleString()
                            : ' ' + ctx.parsed.y.toLocaleString() + ' boxes'
                    }
                }
            }
        }
    });
}

function renderProfitabilityChart(data) {
    const ctx = document.getElementById('profitabilityChart').getContext('2d');
    const catColors = {
        'Bars':  { bg: 'rgba(0,229,255,0.55)',   border: '#00e5ff' },
        'Bites': { bg: 'rgba(179,136,255,0.55)', border: '#b388ff' },
        'Other': { bg: 'rgba(0,229,255,0.30)',   border: '#00e5ff' }
    };
    const categories = [...new Set(data.map(d => d.category))];
    const datasets = categories.map(cat => ({
        label: cat,
        data: data.filter(d => d.category === cat).map(d => ({
            x: parseFloat(d.costPerBox), y: parseFloat(d.revenuePerBox),
            r: Math.sqrt(d.totalBoxes / 1000) * 1.5,
            product: d.product, totalBoxes: d.totalBoxes, totalRevenue: d.totalRevenue, category: cat
        })),
        backgroundColor: catColors[cat]?.bg || 'rgba(0,229,255,0.4)',
        borderColor: catColors[cat]?.border || COLORS.cyan,
        borderWidth: 2
    }));

    new Chart(ctx, {
        type: 'bubble',
        data: { datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            onHover: cursorOnHover,
            onClick: (e, elements) => {
                if (!elements.length) return;
                const { datasetIndex, index } = elements[0];
                drillProfitability(datasets[datasetIndex].data[index]);
            },
            scales: {
                x: { title: { display: true, text: 'Cost per Box ($)', color: '#9494b8', font: { size: 12 } }, grid: { color: 'rgba(100,100,255,0.06)' }, ticks: { callback: v => '$' + v.toFixed(2) } },
                y: { title: { display: true, text: 'Revenue per Box ($)', color: '#9494b8', font: { size: 12 } }, grid: { color: 'rgba(100,100,255,0.06)' }, ticks: { callback: v => '$' + v.toFixed(2) } }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const d = ctx.raw;
                            return [
                                `  ${d.product}`,
                                `  Cost/Box: $${d.x.toFixed(2)}`,
                                `  Revenue/Box: $${d.y.toFixed(2)}`,
                                `  Total Boxes: ${Number(d.totalBoxes).toLocaleString()}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

// ===== DRILL-DOWN ENGINE =====

function _fmtCell(val, col) {
    if (val === null || val === undefined || val === '') return '-';
    const c = col.toLowerCase();
    const num = Number(val);
    if (!isNaN(num) && String(val).trim() !== '') {
        if (c.includes('/box') || c.includes('per box')) return '$' + num.toFixed(2);
        if (c.includes('$') || c.includes('revenue') || c.includes('sales')) return '$' + Math.round(num).toLocaleString();
        return num.toLocaleString();
    }
    return String(val);
}

function openDrill(icon, title, subtitle, columns, rows) {
    document.getElementById('drillIcon').textContent = icon;
    document.getElementById('drillTitle').textContent = title;
    document.getElementById('drillSubtitle').textContent = subtitle;
    document.getElementById('drillCount').textContent = rows.length + ' record' + (rows.length !== 1 ? 's' : '');

    document.getElementById('drillHead').innerHTML =
        '<tr>' + columns.map(c => `<th>${c}</th>`).join('') + '</tr>';

    document.getElementById('drillBody').innerHTML = rows.map((row, ri) => {
        const cells = Object.values(row).map((val, ci) =>
            `<td>${_fmtCell(val, columns[ci] || '')}</td>`
        ).join('');
        return `<tr class="${ri === 0 ? 'drill-top' : ''}">${cells}</tr>`;
    }).join('');

    document.getElementById('drillOverlay').classList.add('open');
}

function showDrillLoading(icon, title, subtitle) {
    document.getElementById('drillIcon').textContent = icon;
    document.getElementById('drillTitle').textContent = title;
    document.getElementById('drillSubtitle').textContent = subtitle;
    document.getElementById('drillCount').textContent = '';
    document.getElementById('drillHead').innerHTML = '';
    document.getElementById('drillBody').innerHTML =
        '<tr><td colspan="10" class="drill-loading">⏳ Loading data...</td></tr>';
    document.getElementById('drillOverlay').classList.add('open');
}

function closeDrill() {
    document.getElementById('drillOverlay').classList.remove('open');
}

// ===== Drill Handlers =====

async function drillMonth(month) {
    const [y, m] = month.split('-');
    const monthName = new Date(y, m - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
    showDrillLoading('📈', 'Monthly Breakdown', `Product performance for ${monthName}`);
    const rows = await fetch(`/api/drill/month?month=${encodeURIComponent(month)}`).then(r => r.json());
    openDrill('📈', 'Monthly Breakdown', `Product performance for ${monthName}`,
        ['Product', 'Revenue ($)', 'Boxes', 'Shipments'], rows);
}

function drillRegion(region) {
    const rows = dashData.geo
        .filter(d => d.region === region)
        .map(d => ({ country: d.country, totalSales: d.totalSales, totalBoxes: d.totalBoxes }));
    openDrill('🌍', 'Region Breakdown', `Countries in ${region}`,
        ['Country', 'Revenue ($)', 'Boxes'], rows);
}

function drillCategory(category) {
    const rows = dashData.profitability
        .filter(d => d.category === category)
        .map(d => ({
            product: d.product,
            costPerBox: parseFloat(d.costPerBox),
            revenuePerBox: parseFloat(d.revenuePerBox),
            totalBoxes: d.totalBoxes,
            totalRevenue: d.totalRevenue
        }));
    openDrill('🏷️', 'Category Detail', `All products in ${category} category`,
        ['Product', 'Cost/Box ($)', 'Revenue/Box ($)', 'Total Boxes', 'Revenue ($)'], rows);
}

async function drillCountry(country) {
    showDrillLoading('🌐', 'Country Detail', `Sales team in ${country}`);
    const rows = await fetch(`/api/drill/country?country=${encodeURIComponent(country)}`).then(r => r.json());
    openDrill('🌐', 'Country Detail', `Sales team performance in ${country}`,
        ['Sales Person', 'Revenue ($)', 'Boxes', 'Shipments'], rows);
}

async function drillSalesPerson(name) {
    showDrillLoading('🏆', 'Sales Person Detail', `Monthly breakdown for ${name}`);
    const rows = await fetch(`/api/drill/salesperson?name=${encodeURIComponent(name)}`).then(r => r.json());
    openDrill('🏆', 'Sales Person Detail', `Monthly performance of ${name}`,
        ['Month', 'Revenue ($)', 'Boxes', 'Shipments'], rows);
}

async function drillProduct(product) {
    showDrillLoading('🍫', 'Product Detail', `Who sells ${product}?`);
    const rows = await fetch(`/api/drill/product?product=${encodeURIComponent(product)}`).then(r => r.json());
    openDrill('🍫', 'Product Detail', `Sales team breakdown — ${product}`,
        ['Sales Person', 'Revenue ($)', 'Boxes', 'Shipments'], rows);
}

function drillProfitability(point) {
    const rows = [{
        product: point.product, category: point.category,
        costPerBox: point.x, revenuePerBox: point.y,
        totalBoxes: point.totalBoxes, totalRevenue: point.totalRevenue
    }];
    openDrill('💎', 'Product Profitability', `Detailed metrics — ${point.product}`,
        ['Product', 'Category', 'Cost/Box ($)', 'Revenue/Box ($)', 'Total Boxes', 'Revenue ($)'], rows);
}

async function drillTeam(team) {
    showDrillLoading('👥', 'Team Detail', `Members of ${team} team`);
    const rows = await fetch(`/api/drill/team?team=${encodeURIComponent(team)}`).then(r => r.json());
    openDrill('👥', 'Team Detail', `Performance breakdown — ${team} team`,
        ['Sales Person', 'Location', 'Revenue ($)', 'Boxes', 'Shipments'], rows);
}

// ===== CHATBOT =====
let chatOpen = false;
let chatInitialized = false;

function toggleChat() {
    chatOpen = !chatOpen;
    const panel = document.getElementById('chatPanel');
    const fab = document.getElementById('chatFabIcon');
    panel.classList.toggle('open', chatOpen);
    fab.textContent = chatOpen ? '✕' : '💬';

    if (!chatInitialized && chatOpen) {
        chatInitialized = true;
        addBotMessage(
            "👋 Hi! I'm **ChocBot**, your chocolate sales assistant.\n\nAsk me anything about the data — try one of these:",
            ["What are the top 5 products?", "Show sales by region", "Who sold the most?",
             "Total revenue", "Monthly trend", "Compare teams", "Sales in India", "Most expensive product"]
        );
    }
}

function addBotMessage(text, suggestions = []) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'msg msg-bot';
    let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    div.innerHTML = `<div class="msg-text">${html}</div>`;

    if (suggestions && suggestions.length > 0) {
        const chipsDiv = document.createElement('div');
        chipsDiv.className = 'suggestions';
        suggestions.forEach(s => {
            const chip = document.createElement('span');
            chip.className = 'suggestion-chip';
            chip.textContent = s;
            chip.onclick = () => { document.getElementById('chatInput').value = s; sendMessage(); };
            chipsDiv.appendChild(chip);
        });
        div.appendChild(chipsDiv);
    }
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function addTableMessage(description, columns, data) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'msg msg-bot';

    let html = `<div class="msg-desc">${description}</div>`;
    html += `<div class="chat-table-meta">${data.length} result${data.length !== 1 ? 's' : ''}</div>`;
    html += `<table class="chat-result-table"><thead><tr>`;
    columns.forEach(col => { html += `<th>${col}</th>`; });
    html += `</tr></thead><tbody>`;

    data.forEach((row, rowIdx) => {
        html += `<tr class="${rowIdx < 3 ? 'top-row' : ''}">`;
        Object.values(row).forEach((val, i) => {
            const col = columns[i] || '';
            const isPct = col.includes('(%)') || col.toLowerCase() === 'share (%)' || col.toLowerCase().includes('margin');
            const isAmt = col.includes('$');

            if (isPct && val !== null && val !== undefined && !isNaN(parseFloat(val))) {
                const pct = parseFloat(val);
                html += `<td>
                    <div class="pct-cell">
                        <div class="pct-bar"><div class="pct-fill" style="width:${Math.min(Math.abs(pct), 100)}%;background:${pct < 0 ? 'var(--pink)' : 'var(--cyan)'}"></div></div>
                        <span class="${pct < 0 ? 'pct-neg' : ''}">${pct}%</span>
                    </div>
                </td>`;
            } else {
                const formatted = (typeof val === 'number' || (val !== null && val !== undefined && !isNaN(Number(val)) && String(val).trim() !== ''))
                    ? (isAmt ? '$' + Number(val).toLocaleString() : Number(val).toLocaleString())
                    : (val || '-');
                html += `<td>${formatted}</td>`;
            }
        });
        html += '</tr>';
    });

    html += `</tbody></table>`;
    div.innerHTML = html;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function addUserMessage(text) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'msg msg-user';
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showTyping() {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'msg msg-bot typing-indicator';
    div.id = 'typingIndicator';
    div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function hideTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const question = input.value.trim();
    if (!question) return;

    addUserMessage(question);
    input.value = '';
    showTyping();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question })
        });
        const data = await res.json();
        hideTyping();

        if (data.type === 'table' && data.data) {
            addTableMessage(data.answer || data.description, data.columns, data.data);
            if (data.suggestions && data.suggestions.length > 0) {
                addBotMessage('Want to know more?', data.suggestions);
            }
        } else {
            addBotMessage(data.answer, data.suggestions);
        }
    } catch (err) {
        hideTyping();
        addBotMessage("❌ Sorry, something went wrong. Please try again.");
    }
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('chatInput').addEventListener('keydown', e => {
        if (e.key === 'Enter') sendMessage();
    });
    // ESC closes the drill overlay
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeDrill();
    });
    // Click backdrop to close
    document.getElementById('drillOverlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeDrill();
    });
});

// Init
initDashboard();
