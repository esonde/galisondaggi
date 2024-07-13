// Funzione per caricare i dati e inizializzare la pagina
function initializePage() {
    fetch('analysis_results.json')
        .then(response => response.json())
        .then(data => {
            console.log('Data loaded:', data);
            updateDashboard(data);
            createTimeAnalysisCharts(data);
            createPollsterAnalysisCharts(data);
            createRankings(data);
            setupImageZoom();
        })
        .catch(error => console.error('Errore nel caricamento dei dati:', error));
}

// Aggiorna la dashboard con le statistiche di base
function updateDashboard(data) {
    document.querySelector('.stats-container').innerHTML = `
        <div class="stat-box">
            <h3>Totale Sondaggi</h3>
            <p>${data.basic_stats.total_polls.toLocaleString()}</p>
        </div>
        <div class="stat-box">
            <h3>Totale Voti</h3>
            <p>${data.basic_stats.total_votes.toLocaleString()}</p>
        </div>
        <div class="stat-box">
            <h3>Media Voti per Sondaggio</h3>
            <p>${data.basic_stats.avg_votes_per_poll.toFixed(2)}</p>
        </div>
    `;

    updatePollBox('most-voted-poll', data.basic_stats.most_voted_poll);
    updatePollBox('least-voted-poll', data.basic_stats.least_voted_poll);
}

// Aggiorna le box dei sondaggi più e meno votati
function updatePollBox(elementId, pollData) {
    const pollBox = document.getElementById(elementId);
    const date = new Date(pollData.DateTime);
    const options = Object.entries(pollData.Options);
    const totalVotes = pollData.TotalVotes;

    let optionsHtml = options.length > 0
        ? '<ul class="poll-options">' + options.map(([option, votes]) => 
            `<li><span>${option}</span><span>${votes}</span></li>`).join('') + '</ul>'
        : '<p>Nessuna opzione disponibile</p>';

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

// Crea i grafici per l'analisi temporale
function createTimeAnalysisCharts(data) {
    createChart('weekly-chart', 'Analisi Settimanale', data.polls_by_week, data.votes_by_week, data.avg_votes_by_week, 'week');
    createChart('daily-chart', 'Analisi Giornaliera', data.polls_by_day, data.votes_by_day, data.avg_votes_by_day, 'day');
    createChart('hourly-chart', 'Analisi Oraria', data.polls_by_hour, data.votes_by_hour, data.avg_votes_by_hour, 'hour');
}

// Crea un singolo grafico
function createChart(canvasId, title, pollsData, votesData, avgVotesData, timeUnit) {
    const canvas = document.getElementById(canvasId);
    console.log('Canvas for chart:', canvas);
    const ctx = canvas.getContext('2d');
    
    let labels, numPolls, numVotes, avgVotes;

    if (timeUnit === 'week') {
        labels = Object.keys(pollsData).sort();
        console.log('Weekly Labels:', labels);
        numPolls = labels.map(week => pollsData[week]);
        numVotes = labels.map(week => votesData[week]);
        avgVotes = labels.map(week => avgVotesData[week]);
    } else if (timeUnit === 'day') {
        const daysOrder = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
        labels = daysOrder;
        numPolls = daysOrder.map(day => pollsData[day]);
        numVotes = daysOrder.map(day => votesData[day]);
        avgVotes = daysOrder.map(day => avgVotesData[day]);
    } else { // hour
        labels = Object.keys(pollsData).sort((a, b) => parseInt(a) - parseInt(b));
        numPolls = labels.map(hour => pollsData[hour]);
        numVotes = labels.map(hour => votesData[hour]);
        avgVotes = labels.map(hour => avgVotesData[hour]);
    }

    console.log('Creating chart with data:', { labels, numPolls, numVotes, avgVotes });

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Numero di sondaggi',
                data: numPolls,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                yAxisID: 'y-axis-1'
            }, {
                label: 'Media voti per sondaggio',
                data: avgVotes,
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
                    type: 'category',
                    title: { display: true, text: 'Settimana' },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 12
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
                    grid: { drawOnChartArea: false }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            }
        }
    });
}

// Crea i grafici per l'analisi dei sondaggisti
function createPollsterAnalysisCharts(data) {
    createPollsterChart(data.weekly_pollster_stats, 'pollster-num-polls-chart', 'cumulative_polls', 'Numero di sondaggi per sondaggista');
    createPollsterChart(data.weekly_pollster_stats, 'pollster-total-votes-chart', 'cumulative_votes', 'Numero totale di voti per sondaggista');
}

// Crea un singolo grafico per l'analisi dei sondaggisti
function createPollsterChart(data, canvasId, metricKey, title) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    const weeks = Object.keys(data).sort();
    const pollsters = new Set();
    weeks.forEach(week => Object.keys(data[week]).forEach(pollster => pollsters.add(pollster)));

    const datasets = Array.from(pollsters).map(pollster => {
        const pollsterData = weeks.map(week => ({
            x: week,
            y: data[week][pollster] ? data[week][pollster][metricKey] : null
        }));

        return {
            label: pollster,
            data: pollsterData,
            fill: false,
            borderColor: getRandomColor(),
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 5,
            spanGaps: true
        };
    });

    console.log('Creating pollster chart with data:', datasets);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeks,
            datasets: datasets
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
                legend: {
                    display: false // Nascondi la legenda
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        },
                        afterBody: function(tooltipItems) {
                            // Ordina i tooltip items dal più alto al più basso
                            tooltipItems.sort((a, b) => b.parsed.y - a.parsed.y);
                        }
                    },
                    itemSort: function(a, b) {
                        // Ordina i tooltip items dal più alto al più basso
                        return b.raw.y - a.raw.y;
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: 'Settimana' },
                    ticks: {
                        autoSkip: true,
                        maxTicksLimit: 12
                    }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: title }
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

// Genera un colore casuale per i grafici
function getRandomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

// Crea le classifiche
function createRankings(data) {
    const container = document.getElementById('rankings-container');
    container.innerHTML = '';
    
    const rankings = [
        { title: 'Top Autori per Sondaggi', data: data.pollster_rankings.by_polls },
        { title: 'Top Autori per Voti', data: data.pollster_rankings.by_votes },
        { title: 'Top Autori per Media Voti', data: data.pollster_rankings.by_avg_votes }
    ];
    
    rankings.forEach(ranking => {
        const rankingElement = createRankingList(ranking.title, ranking.data);
        container.appendChild(rankingElement);
    });
}

// Crea una singola lista di classifiche
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
    data.forEach(([name, stats], index) => { // Rimuove il slice(0, 10) per mostrare tutti i dati
        const row = table.insertRow();
        row.insertCell().textContent = index + 1;
        row.insertCell().textContent = name;
        row.insertCell().textContent = Math.round(title.includes('Media') ? stats.avg_votes : stats[title.includes('Sondaggi') ? 'polls' : 'votes']);
    });
    list.appendChild(table);
    return list;
}

// Configura lo zoom delle immagini
function setupImageZoom() {
    document.querySelectorAll('img').forEach(img => {
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

// Inizializza la pagina quando il DOM è completamente caricato
document.addEventListener('DOMContentLoaded', initializePage);
