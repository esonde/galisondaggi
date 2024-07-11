// Carica i dati
fetch('analysis_results.json')
    .then(response => response.json())
    .then(data => {
        console.log('Dati ricevuti:', data);
        updateDashboard(data);
        createTimeAnalysisCharts(data);
        createPollsterAnalysisCharts(data);
        createRankings(data);
        setupImageZoom();
    })
    .catch(error => {
        console.error('Errore nel caricamento dei dati:', error);
        document.body.innerHTML += `<p>Errore nel caricamento dei dati: ${error.message}</p>`;
    });

function updateDashboard(data) {
    if (data.basic_stats) {
        document.getElementById('total-polls').textContent = (data.basic_stats.total_polls || 0).toLocaleString();
        document.getElementById('total-votes').textContent = (data.basic_stats.total_votes || 0).toLocaleString();
        document.getElementById('avg-votes-per-poll').textContent = (data.basic_stats.avg_votes_per_poll || 0).toFixed(2);

        updatePollBox('most-voted-poll', data.basic_stats.most_voted_poll);
        updatePollBox('least-voted-poll', data.basic_stats.least_voted_poll);
    }
}

function updatePollBox(elementId, pollData) {
    if (!pollData) return;

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
    if (data.weekly_stats && data.daily_stats && data.hourly_stats) {
        createChart('weekly-chart', 'Analisi Settimanale', data.weekly_stats, 'week');
        createChart('daily-chart', 'Analisi Giornaliera', data.daily_stats, 'day');
        createChart('hourly-chart', 'Analisi Oraria', data.hourly_stats, 'hour');
    } else {
        console.error('Dati mancanti per l\'analisi temporale');
    }
}

function createChart(canvasId, title, data, timeUnit) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas con id ${canvasId} non trovato`);
        return;
    }
    const ctx = canvas.getContext('2d');
    const chartData = prepareChartData(data, timeUnit);
    
    if (!chartData) {
        console.error(`Dati non validi per il grafico ${title}`);
        return;
    }

    const minAvgVotes = Math.min(...chartData.avgVotes.filter(v => v !== null));
    const maxAvgVotes = Math.max(...chartData.avgVotes.filter(v => v !== null));
    const avgVotesRange = maxAvgVotes - minAvgVotes;
    const avgVotesMin = Math.max(0, minAvgVotes - avgVotesRange * 0.1);
    const avgVotesMax = maxAvgVotes + avgVotesRange * 0.1;

    try {
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
                        type: timeUnit !== 'hour' ? 'time' : 'category',
                        time: timeUnit !== 'hour' ? {
                            unit: timeUnit,
                            displayFormats: { 
                                week: 'MMM yyyy',
                                day: 'dd MMM'
                            }
                        } : undefined,
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 12,
                            callback: function(value, index, values) {
                                if (timeUnit === 'week') {
                                    const date = new Date(value);
                                    return date.getDate() <= 7 ? date.toLocaleString('default', { month: 'short', year: 'numeric' }) : '';
                                } else if (timeUnit === 'hour') {
                                    return value + ':00';
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
                        min: timeUnit !== 'hour' ? 0 : avgVotesMin,
                        max: timeUnit !== 'hour' ? undefined : avgVotesMax
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                }
            }
        });
    } catch (error) {
        console.error(`Errore nella creazione del grafico ${title}:`, error);
    }
}

function prepareChartData(data, timeUnit) {
    if (!Array.isArray(data)) {
        console.error('I dati forniti non sono un array');
        return null;
    }

    const labels = data.map(item => {
        if (timeUnit === 'hour') {
            return new Date(item.DateTime).getHours();
        } else if (timeUnit === 'day') {
            return new Date(item.DateTime).toISOString().split('T')[0];
        } else {
            return new Date(item.DateTime);
        }
    });
    const numPolls = data.map(item => item.num_polls);
    const avgVotes = data.map(item => item.avg_votes_per_poll);

    return { labels, numPolls, avgVotes };
}

function createPollsterAnalysisCharts(data) {
    if (!data.pollster_weekly_stats || !Array.isArray(data.pollster_weekly_stats)) {
        console.error('Dati non validi per l\'analisi dei sondaggisti');
        return;
    }

    const metrics = [
        { id: 'pollster-num-polls-chart', key: 'cumulative_polls', title: 'Numero cumulativo di sondaggi per sondaggista' },
        { id: 'pollster-total-votes-chart', key: 'cumulative_votes', title: 'Numero cumulativo di voti per sondaggista' },
        { id: 'pollster-avg-votes-chart', key: 'avg_votes_per_poll', title: 'Media voti per sondaggio per sondaggista' }
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

    const pollstersData = processPollsterData(data, metric.key);

    try {
        new Chart(ctx, {
            type: 'line',
            data: {
                datasets: pollstersData
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: metric.title,
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
    } catch (error) {
        console.error(`Errore nella creazione del grafico ${metric.title}:`, error);
    }
}

function processPollsterData(data, metricKey) {
    const pollsters = [...new Set(data.map(item => item.Author))];
    const datasets = pollsters.map((pollster, index) => {
        const pollsterData = data
            .filter(item => item.Author === pollster)
            .map(item => ({
                x: new Date(item.Week),
                y: item[metricKey]
            }))
            .sort((a, b) => a.x - b.x);

        return {
            label: pollster,
            data: pollsterData,
            fill: false,
            borderColor: getRandomColor(),
            tension: 0.1,
            pointRadius: 3,
            pointHoverRadius: 5,
            spanGaps: true
        };
    });

    return datasets;
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