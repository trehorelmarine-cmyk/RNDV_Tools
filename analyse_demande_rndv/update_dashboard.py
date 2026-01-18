#!/usr/bin/env python3
"""
Script de mise à jour du tableau de bord RNDV
Télécharge les données depuis Google Sheets et régénère le HTML
"""

import csv
import json
import os
import subprocess
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
GOOGLE_SHEET_ID = "1E9y9HRCBd41nXdTRYZ9yCRaLg6JGGHye5WvaiTiC-C0"
SHEET_GID = "692995836"
BASE_DIR = Path(__file__).parent
CSV_FILE = BASE_DIR / "data_rndv.csv"
HTML_FILE = BASE_DIR / "rapport_evolution.html"

def download_csv():
    """Télécharge le CSV depuis Google Sheets"""
    url = f"https://docs.google.com/spreadsheets/d/{GOOGLE_SHEET_ID}/export?format=csv&gid={SHEET_GID}"
    print(f"Téléchargement des données...")
    result = subprocess.run(
        ["curl", "-L", "-o", str(CSV_FILE), url],
        capture_output=True
    )
    if result.returncode == 0:
        print(f"✓ Données téléchargées: {CSV_FILE}")
        return True
    else:
        print(f"✗ Erreur de téléchargement")
        return False

def parse_date(date_str):
    """Parse une date au format JJ/MM/AAAA ou J/M/AAAA"""
    if not date_str:
        return None
    parts = date_str.replace('/', '-').split('-')
    if len(parts) >= 3:
        try:
            day = int(parts[0])
            month = int(parts[1])
            year = int(parts[2])
            return datetime(year, month, day)
        except:
            return None
    return None

def get_month_key(date):
    """Retourne la clé du mois (MM/YYYY)"""
    if date:
        return f"{date.month:02d}/{date.year}"
    return None

def analyze_data():
    """Analyse les données du CSV"""
    print("Analyse des données...")

    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Filtrer les lignes avec données
    data = []
    for r in rows:
        if r.get('PROBLÈME') and r['PROBLÈME'].strip() and r.get('DATE'):
            r['_date'] = parse_date(r['DATE'])
            if r['_date']:
                data.append(r)

    print(f"  {len(data)} tickets analysés")

    # === Données par mois ===
    prob_by_month = defaultdict(lambda: defaultdict(int))
    prob_total = Counter()
    all_months = set()

    for r in data:
        month = get_month_key(r['_date'])
        problem = r['PROBLÈME'].strip()
        prob_by_month[problem][month] += 1
        prob_total[problem] += 1
        all_months.add(month)

    # Trier les mois
    sorted_months = sorted(all_months, key=lambda x: (int(x.split('/')[1]), int(x.split('/')[0])))

    # Garder les 5 derniers mois
    if len(sorted_months) > 5:
        sorted_months = sorted_months[-5:]

    # Derniers 3 mois pour le filtre
    last_3_months = sorted_months[-3:] if len(sorted_months) >= 3 else sorted_months

    # Filtrer les problèmes avec récurrence dans les 3 derniers mois
    filtered_problems = []
    for prob in prob_total.keys():
        count_last_3 = sum(prob_by_month[prob].get(m, 0) for m in last_3_months)
        if count_last_3 > 0:
            filtered_problems.append((prob, prob_total[prob]))

    filtered_problems.sort(key=lambda x: -x[1])

    # Construire les données mensuelles
    monthly_data = {}
    for prob, _ in filtered_problems:
        monthly_data[prob] = [prob_by_month[prob].get(m, 0) for m in sorted_months]

    # === Données du jour ===
    today = datetime.now().date()
    today_tickets = [r for r in data if r['_date'].date() == today]

    # Si pas de données aujourd'hui, prendre le dernier jour avec des données
    if not today_tickets:
        dates_with_data = sorted(set(r['_date'].date() for r in data), reverse=True)
        if dates_with_data:
            last_date = dates_with_data[0]
            today_tickets = [r for r in data if r['_date'].date() == last_date]
            today = last_date

    today_problems = []
    for r in today_tickets:
        today_problems.append({
            'urgence': r.get('URGENCE / IMPACT', 'N/A'),
            'categorie': r.get('CATÉGORIE', 'N/A'),
            'probleme': r['PROBLÈME'].strip(),
            'signalePar': r.get('SIGNALÉ PAR', 'N/A')
        })

    # === Historique des 15 derniers jours ===
    data_by_date = defaultdict(int)
    for r in data:
        data_by_date[r['_date'].date()] += 1

    # Générer les 15 derniers jours
    history_dates = []
    history_counts = []
    for i in range(14, -1, -1):
        d = today - timedelta(days=i)
        history_dates.append(f"{d.day}/{d.month}")
        history_counts.append(data_by_date.get(d, 0))

    # Formatter les mois pour l'affichage
    month_names = {
        '01': 'Jan', '02': 'Fév', '03': 'Mars', '04': 'Avr',
        '05': 'Mai', '06': 'Juin', '07': 'Juil', '08': 'Août',
        '09': 'Sept', '10': 'Oct', '11': 'Nov', '12': 'Déc'
    }
    display_months = []
    for m in sorted_months:
        month_num, year = m.split('/')
        display_months.append(f"{month_names[month_num]} {year}")

    return {
        'months': display_months,
        'monthly_data': monthly_data,
        'today': {
            'date': today.strftime('%d %B %Y').replace('January', 'Janvier').replace('February', 'Février').replace('March', 'Mars').replace('April', 'Avril').replace('May', 'Mai').replace('June', 'Juin').replace('July', 'Juillet').replace('August', 'Août').replace('September', 'Septembre').replace('October', 'Octobre').replace('November', 'Novembre').replace('December', 'Décembre'),
            'tickets': today_problems
        },
        'history': {
            'dates': history_dates,
            'counts': history_counts
        }
    }

def generate_html(analysis):
    """Génère le fichier HTML avec les données analysées"""
    print("Génération du HTML...")

    # Convertir les données en JSON pour JavaScript
    monthly_data_js = json.dumps(analysis['monthly_data'], ensure_ascii=False, indent=16)
    today_tickets_js = json.dumps(analysis['today']['tickets'], ensure_ascii=False, indent=16)
    history_dates_js = json.dumps(analysis['history']['dates'])
    history_counts_js = json.dumps(analysis['history']['counts'])
    months_js = json.dumps(analysis['months'])
    today_date = analysis['today']['date']

    html_content = f'''<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RNDV - Tableau de Bord</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            color: #333;
        }}
        .container {{ max-width: 1400px; margin: 0 auto; }}
        h1 {{ text-align: center; margin-bottom: 10px; color: #1a73e8; }}
        .subtitle {{ text-align: center; color: #666; margin-bottom: 10px; }}
        .last-update {{ text-align: center; color: #999; font-size: 12px; margin-bottom: 25px; }}

        .today-section {{
            background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 25px;
            color: white;
        }}
        .today-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 10px;
        }}
        .today-header h2 {{ font-size: 22px; }}
        .today-date {{
            background: rgba(255,255,255,0.2);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 14px;
        }}
        .today-stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }}
        .today-stat {{
            background: rgba(255,255,255,0.15);
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }}
        .today-stat .value {{ font-size: 32px; font-weight: bold; }}
        .today-stat .label {{ font-size: 12px; opacity: 0.9; margin-top: 4px; }}
        .today-stat.critical {{ background: rgba(234, 67, 53, 0.3); border: 1px solid rgba(234, 67, 53, 0.5); }}
        .today-stat.major {{ background: rgba(251, 188, 4, 0.3); border: 1px solid rgba(251, 188, 4, 0.5); }}
        .today-content {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
        @media (max-width: 768px) {{ .today-content {{ grid-template-columns: 1fr; }} }}
        .today-problems, .today-history {{
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 8px;
        }}
        .today-problems h3, .today-history h3 {{ font-size: 14px; margin-bottom: 12px; opacity: 0.9; }}
        .problem-item {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }}
        .problem-item:last-child {{ border-bottom: none; }}
        .problem-name {{ display: flex; align-items: center; gap: 8px; font-size: 13px; }}
        .problem-count {{
            background: rgba(255,255,255,0.2);
            padding: 2px 10px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
        }}
        .urgency-badge {{
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
        }}
        .urgency-critique {{ background: #ea4335; }}
        .urgency-majeur {{ background: #fbbc04; color: #333; }}
        .urgency-mineur {{ background: rgba(255,255,255,0.3); }}
        .urgency-n\\/a {{ background: rgba(255,255,255,0.2); }}
        .history-chart-container {{ height: 120px; }}

        .filter-info {{
            text-align: center;
            background: #e8f0fe;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
            font-size: 13px;
            color: #1a73e8;
        }}
        .controls {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }}
        .controls-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            flex-wrap: wrap;
            gap: 10px;
        }}
        .controls h3 {{ color: #444; }}
        .controls-actions {{ display: flex; gap: 10px; flex-wrap: wrap; }}
        .controls-actions button {{
            padding: 8px 16px;
            border: 1px solid #ddd;
            background: #f8f9fa;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }}
        .controls-actions button:hover {{ background: #e8f0fe; border-color: #1a73e8; }}
        .checkbox-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 8px;
            max-height: 300px;
            overflow-y: auto;
            padding-right: 10px;
        }}
        .checkbox-item {{
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: #f8f9fa;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
            border: 1px solid transparent;
        }}
        .checkbox-item:hover {{ background: #e8f0fe; }}
        .checkbox-item.checked {{ background: #e8f0fe; border: 1px solid #1a73e8; }}
        .checkbox-item input {{ width: 18px; height: 18px; cursor: pointer; flex-shrink: 0; }}
        .checkbox-item label {{ cursor: pointer; font-size: 13px; flex-grow: 1; }}
        .color-dot {{ width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }}
        .occurrence-badge {{
            background: #e0e0e0;
            color: #555;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
            flex-shrink: 0;
        }}
        .chart-container {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }}
        .chart-wrapper {{ position: relative; height: 400px; }}
        .table-container {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow-x: auto;
        }}
        .table-container h3 {{ margin-bottom: 15px; color: #444; }}
        table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
        th, td {{ padding: 12px 15px; text-align: center; border-bottom: 1px solid #e0e0e0; }}
        th {{ background: #f8f9fa; font-weight: 600; color: #444; position: sticky; top: 0; }}
        th:first-child, td:first-child {{ text-align: left; }}
        tr:hover {{ background: #f8f9fa; }}
        .trend-up {{ color: #d93025; font-weight: 600; }}
        .trend-down {{ color: #1e8e3e; font-weight: 600; }}
        .trend-stable {{ color: #f9ab00; font-weight: 600; }}
        .no-data {{ text-align: center; padding: 40px; color: #666; }}
        .section-title {{
            font-size: 18px;
            color: #444;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }}
        ::-webkit-scrollbar {{ width: 8px; }}
        ::-webkit-scrollbar-track {{ background: #f1f1f1; border-radius: 4px; }}
        ::-webkit-scrollbar-thumb {{ background: #c1c1c1; border-radius: 4px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>RNDV - Tableau de Bord</h1>
        <p class="subtitle">Comédie-Française | Suivi des incidents billetterie</p>
        <p class="last-update">Dernière mise à jour: {datetime.now().strftime('%d/%m/%Y à %H:%M')}</p>

        <div class="today-section">
            <div class="today-header">
                <h2>Tendances du Jour</h2>
                <span class="today-date" id="todayDate">{today_date}</span>
            </div>
            <div class="today-stats">
                <div class="today-stat">
                    <div class="value" id="todayTotal">-</div>
                    <div class="label">Tickets du jour</div>
                </div>
                <div class="today-stat critical">
                    <div class="value" id="todayCritical">-</div>
                    <div class="label">Critique</div>
                </div>
                <div class="today-stat major">
                    <div class="value" id="todayMajor">-</div>
                    <div class="label">Majeur</div>
                </div>
                <div class="today-stat">
                    <div class="value" id="todayMinor">-</div>
                    <div class="label">Mineur</div>
                </div>
            </div>
            <div class="today-content">
                <div class="today-problems">
                    <h3>Problèmes signalés</h3>
                    <div id="todayProblemsList"></div>
                </div>
                <div class="today-history">
                    <h3>Volume des 15 derniers jours</h3>
                    <div class="history-chart-container">
                        <canvas id="historyChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <h3 class="section-title">Analyse Mensuelle</h3>
        <div class="filter-info">Problèmes ayant au moins une occurrence dans les 3 derniers mois</div>

        <div class="controls">
            <div class="controls-header">
                <h3>Sélectionner les problèmes (classés par récurrence)</h3>
                <div class="controls-actions">
                    <button onclick="selectTop(5)">Top 5</button>
                    <button onclick="selectTop(10)">Top 10</button>
                    <button onclick="selectAll()">Tout</button>
                    <button onclick="selectNone()">Aucun</button>
                </div>
            </div>
            <div class="checkbox-grid" id="checkboxes"></div>
        </div>

        <div class="chart-container">
            <div class="chart-wrapper">
                <canvas id="evolutionChart"></canvas>
            </div>
        </div>

        <div class="table-container">
            <h3>Tableau récapitulatif</h3>
            <table id="dataTable">
                <thead><tr id="tableHeader"></tr></thead>
                <tbody id="tableBody"></tbody>
            </table>
        </div>
    </div>

    <script>
        const todayData = {{
            tickets: {today_tickets_js},
            history: {{
                dates: {history_dates_js},
                counts: {history_counts_js}
            }}
        }};

        const data = {{
            months: {months_js},
            problems: {monthly_data_js}
        }};

        const colors = [
            '#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ff6d01',
            '#46bdc6', '#7baaf7', '#f07b72', '#fcd04f', '#81c995',
            '#ff8a65', '#4dd0e1', '#ba68c8', '#aed581', '#ffb74d',
            '#90a4ae', '#f48fb1', '#80deea', '#ce93d8', '#c5e1a5',
            '#ffcc80', '#b0bec5', '#ef9a9a', '#80cbc4', '#e6ee9c',
            '#ffe082', '#bcaaa4', '#b39ddb', '#9fa8da', '#a5d6a7'
        ];

        let chart = null;
        let selectedProblems = Object.keys(data.problems).slice(0, 3);

        function initTodaySection() {{
            const tickets = todayData.tickets;
            document.getElementById('todayTotal').textContent = tickets.length;
            document.getElementById('todayCritical').textContent = tickets.filter(t => t.urgence === 'Critique').length;
            document.getElementById('todayMajor').textContent = tickets.filter(t => t.urgence === 'Majeur').length;
            document.getElementById('todayMinor').textContent = tickets.filter(t => t.urgence === 'Mineur').length;

            const problemCounts = {{}};
            tickets.forEach(t => {{
                const key = t.probleme;
                if (!problemCounts[key]) problemCounts[key] = {{ count: 0, urgence: t.urgence }};
                problemCounts[key].count++;
                if (t.urgence === 'Critique') problemCounts[key].urgence = 'Critique';
                else if (t.urgence === 'Majeur' && problemCounts[key].urgence !== 'Critique') problemCounts[key].urgence = 'Majeur';
            }});

            const problemsList = document.getElementById('todayProblemsList');
            if (Object.keys(problemCounts).length === 0) {{
                problemsList.innerHTML = '<div style="opacity:0.7;font-size:13px;">Aucun ticket aujourd\\'hui</div>';
            }} else {{
                problemsList.innerHTML = Object.entries(problemCounts)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([name, d]) => `
                        <div class="problem-item">
                            <span class="problem-name">
                                <span class="urgency-badge urgency-${{d.urgence.toLowerCase().replace('/', '-')}}">${{d.urgence}}</span>
                                ${{name}}
                            </span>
                            <span class="problem-count">${{d.count}}</span>
                        </div>
                    `).join('');
            }}

            const ctx = document.getElementById('historyChart').getContext('2d');
            new Chart(ctx, {{
                type: 'bar',
                data: {{
                    labels: todayData.history.dates,
                    datasets: [{{
                        data: todayData.history.counts,
                        backgroundColor: todayData.history.counts.map((v, i) =>
                            i === todayData.history.counts.length - 1 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)'
                        ),
                        borderRadius: 3
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{ legend: {{ display: false }} }},
                    scales: {{
                        y: {{ beginAtZero: true, grid: {{ color: 'rgba(255,255,255,0.1)' }}, ticks: {{ color: 'rgba(255,255,255,0.7)', font: {{ size: 10 }} }} }},
                        x: {{ grid: {{ display: false }}, ticks: {{ color: 'rgba(255,255,255,0.7)', font: {{ size: 10 }} }} }}
                    }}
                }}
            }});
        }}

        function getProblemsSortedByOccurrence() {{
            return Object.entries(data.problems)
                .map(([name, values]) => ({{ name, total: values.reduce((a, b) => a + b, 0) }}))
                .sort((a, b) => b.total - a.total);
        }}

        function createCheckboxes() {{
            const container = document.getElementById('checkboxes');
            const sortedProblems = getProblemsSortedByOccurrence();
            sortedProblems.forEach((problem, index) => {{
                const div = document.createElement('div');
                div.className = 'checkbox-item' + (selectedProblems.includes(problem.name) ? ' checked' : '');
                div.id = `item_${{index}}`;
                div.innerHTML = `
                    <span class="color-dot" style="background:${{colors[index % colors.length]}}"></span>
                    <input type="checkbox" id="prob_${{index}}" ${{selectedProblems.includes(problem.name) ? 'checked' : ''}}>
                    <label for="prob_${{index}}">${{problem.name}}</label>
                    <span class="occurrence-badge">${{problem.total}}</span>
                `;
                div.querySelector('input').addEventListener('change', () => toggleProblem(problem.name, index));
                container.appendChild(div);
            }});
        }}

        function toggleProblem(problem, index) {{
            const item = document.getElementById(`item_${{index}}`);
            if (selectedProblems.includes(problem)) {{
                selectedProblems = selectedProblems.filter(p => p !== problem);
                item.classList.remove('checked');
            }} else {{
                selectedProblems.push(problem);
                item.classList.add('checked');
            }}
            updateChart();
            updateTable();
        }}

        function selectTop(n) {{
            selectedProblems = getProblemsSortedByOccurrence().slice(0, n).map(p => p.name);
            refreshCheckboxes();
            updateChart();
            updateTable();
        }}

        function selectAll() {{
            selectedProblems = Object.keys(data.problems);
            refreshCheckboxes();
            updateChart();
            updateTable();
        }}

        function selectNone() {{
            selectedProblems = [];
            refreshCheckboxes();
            updateChart();
            updateTable();
        }}

        function refreshCheckboxes() {{
            const sortedProblems = getProblemsSortedByOccurrence();
            sortedProblems.forEach((problem, index) => {{
                const checkbox = document.getElementById(`prob_${{index}}`);
                const item = document.getElementById(`item_${{index}}`);
                const isSelected = selectedProblems.includes(problem.name);
                checkbox.checked = isSelected;
                item.classList.toggle('checked', isSelected);
            }});
        }}

        function updateChart() {{
            const ctx = document.getElementById('evolutionChart').getContext('2d');
            const sortedProblems = getProblemsSortedByOccurrence();
            const datasets = selectedProblems
                .sort((a, b) => sortedProblems.findIndex(p => p.name === a) - sortedProblems.findIndex(p => p.name === b))
                .map(problem => {{
                    const idx = sortedProblems.findIndex(p => p.name === problem);
                    return {{
                        label: problem,
                        data: data.problems[problem],
                        backgroundColor: colors[idx % colors.length],
                        borderRadius: 4
                    }};
                }});

            if (chart) chart.destroy();
            chart = new Chart(ctx, {{
                type: 'bar',
                data: {{ labels: data.months, datasets }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        legend: {{ position: 'top', labels: {{ usePointStyle: true, padding: 15, font: {{ size: 11 }} }} }},
                        title: {{ display: true, text: 'Évolution des problèmes par mois', font: {{ size: 16 }} }}
                    }},
                    scales: {{
                        y: {{ beginAtZero: true, title: {{ display: true, text: 'Nombre de tickets' }} }},
                        x: {{ title: {{ display: true, text: 'Période' }} }}
                    }}
                }}
            }});
        }}

        function updateTable() {{
            const header = document.getElementById('tableHeader');
            const body = document.getElementById('tableBody');
            const sortedProblems = getProblemsSortedByOccurrence();
            header.innerHTML = '<th>Problème</th>' + data.months.map(m => `<th>${{m}}</th>`).join('') + '<th>Total</th><th>Tendance</th>';
            const problemsToShow = selectedProblems.sort((a, b) => sortedProblems.findIndex(p => p.name === a) - sortedProblems.findIndex(p => p.name === b));
            if (problemsToShow.length === 0) {{
                body.innerHTML = '<tr><td colspan="8" class="no-data">Sélectionnez des problèmes</td></tr>';
                return;
            }}
            body.innerHTML = problemsToShow.map(problem => {{
                const values = data.problems[problem];
                const total = values.reduce((a, b) => a + b, 0);
                const trend = getTrend(values);
                const idx = sortedProblems.findIndex(p => p.name === problem);
                return `<tr>
                    <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${{colors[idx % colors.length]}};margin-right:8px;"></span>${{problem}}</td>
                    ${{values.map(v => `<td>${{v || '-'}}</td>`).join('')}}
                    <td><strong>${{total}}</strong></td>
                    <td class="${{trend.class}}">${{trend.icon}} ${{trend.text}}</td>
                </tr>`;
            }}).join('');
        }}

        function getTrend(values) {{
            const firstHalf = values.slice(0, Math.ceil(values.length / 2)).reduce((a, b) => a + b, 0);
            const secondHalf = values.slice(Math.ceil(values.length / 2)).reduce((a, b) => a + b, 0);
            if (firstHalf === 0 && secondHalf === 0) return {{ class: 'trend-stable', icon: '—', text: 'N/A' }};
            if (firstHalf === 0) return {{ class: 'trend-up', icon: '↑', text: 'Nouveau' }};
            const ratio = secondHalf / firstHalf;
            if (ratio < 0.6) return {{ class: 'trend-down', icon: '↓', text: 'En baisse' }};
            if (ratio > 1.4) return {{ class: 'trend-up', icon: '↑', text: 'En hausse' }};
            return {{ class: 'trend-stable', icon: '→', text: 'Stable' }};
        }}

        initTodaySection();
        createCheckboxes();
        updateChart();
        updateTable();
    </script>
</body>
</html>'''

    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"✓ HTML généré: {HTML_FILE}")

def main():
    print("=" * 50)
    print("MISE À JOUR DU TABLEAU DE BORD RNDV")
    print("=" * 50)
    print()

    if download_csv():
        analysis = analyze_data()
        generate_html(analysis)
        print()
        print("✓ Mise à jour terminée avec succès!")
        print(f"  Ouvrir: file://{HTML_FILE}")
    else:
        print("✗ Échec de la mise à jour")

if __name__ == "__main__":
    main()
