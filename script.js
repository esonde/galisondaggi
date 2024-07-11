// Carica i dati
fetch('analysis_results.json')
    .then(response => response.json())
    .then(data => {
        updateDashboard(data);
        createTimeAnalysisCharts(data);
        createPollsterAnalysisCharts(data);
        createRankings(data);
        setupImageZoom();
    })
    .catch(error => console.error('Errore nel caricamento dei dati:', error));

function updateDashboard(data) {
    document.getElementById('total-polls').textContent = data.basic_stats.total_polls.toLocaleString();
    document.getElementById('total-votes').textContent = data.basic_stats.total_votes.toLocaleString();
    document.getElementById('avg-votes-per-poll').textContent = data.basic_stats.avg_votes_per_poll.toFixed(2);

    updatePollBox('most-voted-poll', data.basic_stats.most_voted_poll);
    updatePollBox('least-voted-poll', data.basic_stats.least_voted_poll);
}

function updatePollBox(elementId, pollData) {
    const pollBox = document.getElementById(elementId);
    const date = new Date(pollData.DateTime);
    const options = Object.entries(pollData.Options);
    const totalVotes = options.reduce((sum, [_, votes]) => sum + votes, 0);

    let optionsHtml = '';
    if (options.length > 0) {
        optionsHtml = '<ul class="poll-options">' +
            options.map(([option, votes]) => 
                `<li><span>${option}</span><span>${votes}</span></li>`
            ).join('') +
            '</ul>';
    } else {
        optionsHtml = '<p>Nessuna opzione disponibile</p>';
    }

    pollBox.innerHTML = `
        <div class="poll-info">
            <p>Data: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</p>
            <p>Autore: ${pollData.Author}</p>
        </div>
        <p class="poll-question">${pollData.Question}</p>
        ${optionsHtml}
        <p>Voti totali: ${totalVotes}</p>
    `;
}
function createTimeAnalysisCharts(data) {
    createChart('weekly-chart', 'Analisi Settimanale', data.weekly_stats, true);
    createChart('daily-chart', 'Analisi Giornaliera', data.daily_stats, false);
}

function createChart(canvasId, title, data, isWeekly) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas con id ${canvasId} non trovato`);
        return;
    }
    const ctx = canvas.getContext('2d');
    const chartData = prepareChartData(data, isWeekly);
    
    // Calcola il minimo e il massimo per l'asse Y della media voti
    const minAvgVotes = Math.min(...chartData.avgVotes.filter(v => v !== null));
    const maxAvgVotes = Math.max(...chartData.avgVotes.filter(v => v !== null));
    const avgVotesRange = maxAvgVotes - minAvgVotes;
    const avgVotesMin = Math.max(0, minAvgVotes - avgVotesRange * 0.1);
    const avgVotesMax = maxAvgVotes + avgVotesRange * 0.1;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Numero di sondaggi',
                data: chartData.numPolls,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                yAxisID: 'y-axis-1'
            }, {
                label: 'Media voti per sondaggio',
                data: chartData.avgVotes,
                type: 'line',
                fill: false,
                borderColor: 'rgba(255, 99, 132, 1)',
                tension: 0.1,
                yAxisID: 'y-axis-2'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: { size: 18 }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top',
                }
            },
            scales: {
                x: {
                    type: isWeekly ? 'time' : 'category',
                    time: isWeekly ? {
                        unit: 'week',
                        displayFormats: { week: 'MMM yyyy' }
                    } : undefined,
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 12,
                        callback: function(value, index, values) {
                            if (isWeekly) {
                                const date = new Date(value);
                                return date.getDate() <= 7 ? date.toLocaleString('default', { month: 'short', year: 'numeric' }) : '';
                            }
                            return value;
                        }
                    }
                },
                'y-axis-1': {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Numero di sondaggi' },
                    beginAtZero: true
                },
                'y-axis-2': {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Media voti per sondaggio' },
                    grid: { drawOnChartArea: false },
                    min: isWeekly ? 0 : avgVotesMin,
                    max: isWeekly ? undefined : avgVotesMax
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            }
        }
    });
}

function prepareChartData(data, isWeekly) {
    if (isWeekly) {
        const labels = Object.keys(data.num_polls).map(date => new Date(date));
        const numPolls = Object.values(data.num_polls);
        const avgVotes = Object.values(data.avg_votes_per_poll);
        return { labels, numPolls, avgVotes };
    } else {
        const labels = Object.keys(data.num_polls);
        const numPolls = Object.values(data.num_polls);
        const avgVotes = Object.values(data.avg_votes_per_poll);
        return { labels, numPolls, avgVotes };
    }
}

function createPollsterAnalysisCharts(data) {
    const metrics = [
        { id: 'pollster-num-polls-chart', key: 'cumulative_polls', title: 'Numero di sondaggi per sondaggista' },
        { id: 'pollster-total-votes-chart', key: 'cumulative_votes', title: 'Numero totale di voti per sondaggista' }
    ];

    metrics.forEach(metric => createPollsterChart(data.pollster_weekly_stats, metric));
}

function createPollsterChart(data, metric) {
    const canvas = document.getElementById(metric.id);
    if (!canvas) {
        console.error(`Canvas con id ${metric.id} non trovato`);
        return;
    }
    const ctx = canvas.getContext('2d');

    // Raggruppa i dati per settimana
    const weeklyData = data.reduce((acc, item) => {
        const week = item.Week;
        if (!acc[week]) {
            acc[week] = [];
        }
        acc[week].push(item);
        return acc;
    }, {});

    // Ordina i sondaggisti per ogni settimana
    const sortedWeeklyData = Object.entries(weeklyData).map(([week, pollsters]) => {
        const sortedPollsters = pollsters.sort((a, b) => b[metric.key] - a[metric.key]);
        return [week, sortedPollsters];
    }).sort(([a], [b]) => new Date(a) - new Date(b));

    // Trova i primi cinque sondaggisti dell'ultima settimana
    const lastWeekData = sortedWeeklyData[sortedWeeklyData.length - 1][1];
    const topFivePollsters = lastWeekData.slice(0, 5).map(p => p.Author);

    // Trova tutti i sondaggisti che sono stati primi almeno una volta
    const everFirstPollsters = new Set();
    sortedWeeklyData.forEach(([_, pollsters]) => {
        if (pollsters.length > 0) {
            everFirstPollsters.add(pollsters[0].Author);
        }
    });

    // Unisci i primi cinque attuali e chi è mai stato primo, rimuovendo i duplicati
    const pollstersToShow = [...new Set([...topFivePollsters, ...everFirstPollsters])];

    // Prepara i dataset per i sondaggisti selezionati
    const datasets = pollstersToShow.map((pollster, index) => {
        const pollsterData = sortedWeeklyData.map(([week, pollsters]) => {
            const pollsterInfo = pollsters.find(p => p.Author === pollster) || { [metric.key]: null };
            return { x: new Date(week), y: pollsterInfo[metric.key] };
        });

        // Rimuovi i punti null e ordina i dati per data
        const filteredData = pollsterData
            .filter(point => point.y !== null)
            .sort((a, b) => a.x - b.x);

        return {
            label: pollster,
            data: filteredData,
            fill: false,
            borderColor: getRandomColor(),
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5,
            spanGaps: true
        };
    });

    new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: metric.title,
                    font: { size: 18 }
                },
                legend: {
                    display: false, // Rimuove la legenda
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            return new Date(tooltipItems[0].parsed.x).toLocaleDateString();
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'week',
                        displayFormats: { week: 'MMM yyyy' }
                    },
                    title: { display: true, text: 'Data' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: metric.title }
                }
            },
            interaction: {
                mode: 'nearest',
                intersect: false,
                axis: 'x'
            }
        }
    });
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function createRankings(data) {
    const container = document.getElementById('rankings-container');
    if (!container) {
        console.error('Elemento rankings-container non trovato');
        return;
    }
    
    // Svuota il contenitore prima di aggiungere nuove classifiche
    container.innerHTML = '';
    
    const rankings = [
        { title: 'Top Autori per Sondaggi', data: data.rankings.by_polls },
        { title: 'Top Autori per Voti', data: data.rankings.by_votes },
        { title: 'Top Autori per Media Voti', data: data.rankings.by_avg_votes }
    ];
    
    rankings.forEach(ranking => {
        const rankingElement = createRankingList(ranking.title, ranking.data);
        container.appendChild(rankingElement);
    });
}

function createRankingList(title, data) {
    const list = document.createElement('div');
    list.className = 'ranking-list';
    list.innerHTML = `<h3>${title}</h3>`;
    const table = document.createElement('table');
    table.innerHTML = `
        <tr>
            <th>Posizione</th>
            <th>Nome</th>
            <th>Valore</th>
        </tr>
    `;
    data.forEach(([name, value], index) => {
        const row = table.insertRow();
        row.insertCell().textContent = index + 1;
        row.insertCell().textContent = name;
        row.insertCell().textContent = Math.round(value);
    });
    list.appendChild(table);
    return list;
}

function setupImageZoom() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('click', () => {
            const modal = document.createElement('div');
            modal.classList.add('image-zoom-modal');
            const modalImg = document.createElement('img');
            modalImg.src = img.src;
            modal.appendChild(modalImg);
            document.body.appendChild(modal);

            modal.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });
    });
}

// Gestione della navigazione
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = e.target.getAttribute('href').slice(1);
        document.querySelectorAll('section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(targetId).classList.add('active');
        document.querySelectorAll('nav a').forEach(navLink => {
            navLink.classList.remove('active');
        });
        e.target.classList.add('active');
    });
});