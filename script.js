function initializePage() {
    fetch('analysis_results.json')
        .then(response => response.json())
        .then(data => {
            console.log('Data loaded:', data);
            updateDashboard(data);
            createTimeAnalysisCharts(data);
            createPollsterAnalysisCharts(data);
            createRankings(data);
            createMoodChart(data.day_mood_analysis);
            createLogScatterChart(data.pollsters_stats);
            displayIdentikit(data); // Aggiungi questa linea
            setupImageZoom();
        })
        .catch(error => console.error('Errore nel caricamento dei dati:', error));

    // Carica i dati dal file galiweekly.json
    fetch('galiweekly.json')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('galiweekly-container');
            data.forEach(page => {
                const pageElement = document.createElement('div');
                pageElement.className = 'newspaper-page';
                pageElement.innerHTML = `
                    <h3>${page.date}</h3>
                    <div>${marked.parse(page.content)}</div>
                `;
                container.appendChild(pageElement);
            });
        })
        .catch(error => console.error('Error loading GaliWeekly data:', error));
}

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

function createTimeAnalysisCharts(data) {
    if (data.weekly_stats) createChart('weekly-chart', 'Analisi Settimanale', data.weekly_stats);
    if (data.daily_stats) createChart('daily-chart', 'Analisi Giornaliera', data.daily_stats);
    if (data.hourly_stats) createChart('hourly-chart', 'Analisi Oraria', data.hourly_stats);
}

function createChart(canvasId, title, statsData) {
    console.log(`Creating chart: ${canvasId}, Title: ${title}`);
    
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas element with id ${canvasId} not found.`);
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error(`Unable to get context for canvas with id ${canvasId}.`);
        return;
    }

    console.log(`Context obtained for canvas: ${canvasId}`);

    let labels, pollsData, votesData, avgVotesData;

    if (canvasId === 'weekly-chart') {
        labels = Object.keys(statsData).sort();
        pollsData = labels.map(week => statsData[week]?.polls || 0);
        votesData = labels.map(week => statsData[week]?.votes || 0);
        avgVotesData = labels.map(week => statsData[week]?.avg_votes_per_poll || 0);
        
        labels = labels.map(weekString => {
            const date = getDateFromWeek(weekString);
            return date.toLocaleString('it-IT', { year: 'numeric', month: 'long' });
        });
    } else if (canvasId === 'daily-chart') {
        const daysOrder = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
        labels = daysOrder.map(day => {
            return day.charAt(0).toUpperCase() + day.slice(1);
        });
        pollsData = daysOrder.map(day => statsData[day]?.polls || 0);
        votesData = daysOrder.map(day => statsData[day]?.votes || 0);
        avgVotesData = daysOrder.map(day => statsData[day]?.avg_votes_per_poll || 0);
    } else { // hourly-chart
        labels = Object.keys(statsData).sort((a, b) => parseInt(a) - parseInt(b));
        pollsData = labels.map(hour => statsData[hour]?.polls || 0);
        votesData = labels.map(hour => statsData[hour]?.votes || 0);
        avgVotesData = labels.map(hour => statsData[hour]?.avg_votes_per_poll || 0);
    }

    console.log(`Data prepared for canvas: ${canvasId}`);

    // Calcola i valori min e max per entrambi gli assi y
    const maxPolls = Math.max(...pollsData);
    const minAvgVotes = Math.min(...avgVotesData);
    const maxAvgVotes = Math.max(...avgVotesData);

    // Aggiungi un po' di padding
    const pollsPadding = maxPolls * 0.1;
    const avgVotesPadding = (maxAvgVotes - minAvgVotes) * 0.1;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Numero di sondaggi',
                data: pollsData,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                yAxisID: 'y-axis-1'
            }, {
                label: 'Media voti per sondaggio',
                data: avgVotesData,
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
                    title: { 
                        display: true, 
                        text: canvasId === 'weekly-chart' ? 'Periodo' : 
                              canvasId === 'daily-chart' ? 'Giorno della settimana' : 'Ora del giorno'
                    },
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
                    beginAtZero: true,
                    max: maxPolls + pollsPadding,
                    ticks: {
                        stepSize: Math.ceil((maxPolls + pollsPadding) / 5)
                    }
                },
                'y-axis-2': {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'Media voti per sondaggio' },
                    min: minAvgVotes - avgVotesPadding,
                    max: maxAvgVotes + avgVotesPadding,
                    grid: { drawOnChartArea: false }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            }
        }
    });

    console.log(`Chart created for canvas: ${canvasId}`);
}
function createLogScatterChart(pollstersStats) {
    const canvas = document.getElementById('log-scatter-chart');
    if (!canvas) {
        console.error('Canvas element with id log-scatter-chart not found.');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Unable to get context for canvas with id log-scatter-chart.');
        return;
    }

    console.log('Creating log scatter chart');

    // Estrai l'ultima settimana di dati
    const lastWeek = Object.keys(pollstersStats).sort().pop();
    const lastWeekData = pollstersStats[lastWeek];

    // Prepara i dati per il grafico
    const data = Object.entries(lastWeekData).map(([author, stats]) => ({
        x: stats.cumulative_polls,
        y: stats.cumulative_messages,
        author: author
    })).filter(d => d.x >= 10 && d.y >= 100);

    // Calcola la retta di regressione (su scala logaritmica)
    const logData = data.map(d => ({ x: Math.log(d.x), y: Math.log(d.y) }));
    const { slope, intercept } = calculateLinearRegression(logData);

    // Crea i punti della retta di regressione
    const regressionLine = data.map(d => ({
        x: d.x,
        y: Math.exp(slope * Math.log(d.x) + intercept)
    })).sort((a, b) => a.x - b.x);

    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Autori',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                pointRadius: 5,
            }, {
                label: 'Retta di regressione',
                data: regressionLine,
                type: 'line',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
                tension: 0.1,
                showLine: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'logarithmic',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Sondaggi totali'
                    },
                    min: 10
                },
                y: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Messaggi totali'
                    },
                    min: 100
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.raw.author}: (Sondaggi: ${context.raw.x}, Messaggi: ${context.raw.y})`;
                        }
                    }
                },
                legend: {
                    display: true
                },
                title: {
                    display: true,
                    text: 'Messaggi vs Sondaggi per Autore (scala logaritmica)'
                }
            },
            animation: false // Disabilita le animazioni
        }
    });

    console.log('Log scatter chart created');
}

function calculateLinearRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += data[i].x;
        sumY += data[i].y;
        sumXY += data[i].x * data[i].y;
        sumXX += data[i].x * data[i].x;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}



function createPollsterAnalysisCharts(data) {
    createPollsterChart(data.pollsters_stats, 'pollster-num-polls-chart', 'cumulative_polls', 'Numero di sondaggi per sondaggista');
    createPollsterChart(data.pollsters_stats, 'pollster-total-votes-chart', 'cumulative_votes', 'Numero totale di voti per sondaggista');
}

function getDateFromWeek(weekString) {
    const [year, week] = weekString.split('-').map(Number);
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const ISOweekStart = simple;
    if (dayOfWeek <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

function formatDate(date) {
    return date.toLocaleString('it-IT', { year: 'numeric', month: 'long' });
}

function createPollsterChart(data, canvasId, metricKey, title) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas element with id ${canvasId} not found.`);
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error(`Unable to get context for canvas with id ${canvasId}.`);
        return;
    }

    const weeks = Object.keys(data).sort();
    const pollsters = new Set();
    weeks.forEach(week => Object.keys(data[week]).forEach(pollster => pollsters.add(pollster)));

    const datasets = Array.from(pollsters).map(pollster => {
        const pollsterData = weeks.map(week => ({
            x: getDateFromWeek(week),
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

    new Chart(ctx, {
        type: 'line',
        data: {
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
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            return formatDate(new Date(tooltipItems[0].parsed.x));
                        },
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
                            tooltipItems.sort((a, b) => b.parsed.y - a.parsed.y);
                        }
                    },
                    itemSort: function(a, b) {
                        return b.raw.y - a.raw.y;
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM yyyy'
                        }
                    },
                    title: { display: true, text: 'Periodo' },
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

function getRandomColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

function createRankings(data) {
    const container = document.getElementById('rankings-container');
    container.innerHTML = '';
    
    const lastWeek = Object.keys(data.pollsters_stats).sort().pop();
    const lastWeekData = data.pollsters_stats[lastWeek];
    
    const rankings = [
        { title: 'Top Autori per Sondaggi', metric: 'cumulative_polls' },
        { title: 'Top Autori per Voti', metric: 'cumulative_votes' },
        { title: 'Top Autori per Media Voti', metric: 'avg_votes_per_poll' }
    ];
    
    rankings.forEach(ranking => {
        const sortedData = Object.entries(lastWeekData)
            .sort((a, b) => b[1][ranking.metric] - a[1][ranking.metric]);
        const rankingElement = createRankingList(ranking.title, sortedData, ranking.metric);
        container.appendChild(rankingElement);
    });
}

function createRankingList(title, data, metric) {
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
    data.forEach(([name, stats], index) => {
        const row = table.insertRow();
        row.insertCell().textContent = index + 1;
        row.insertCell().textContent = name;
        row.insertCell().textContent = metric === 'avg_votes_per_poll' 
            ? stats[metric].toFixed(2) 
            : Math.round(stats[metric]);
    });
    list.appendChild(table);
    return list;
}

function createMoodChart(moodData) {
    const canvas = document.getElementById('mood-chart');
    if (!canvas) {
        console.error('Canvas element with id mood-chart not found.');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Unable to get context for canvas with id mood-chart.');
        return;
    }

    const startDate = new Date('2024-01-01T00:00:01Z');
    const endDate = new Date();
    
    function parseDate(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    }

    const dates = Object.keys(moodData.daily_moods)
        .map(parseDate)
        .filter(date => date >= startDate && date <= endDate)
        .sort((a, b) => a - b);

    // Emoji e colori aggiornati
    const emojis = ["😣", "☹️", "🙁", "😕", "😐", "🙂🙃", "🙂", "😊", "😁", "😄"];
    const colors = ["#D92727", "#D92727", "#FF8C3A", "#FFD03B", "#FFF06B", "#F2E388", "#D6FF7F", "#9EFF2C", "#0C9B0A", "#0C9B0A"];

    const averageData = dates.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        return moodData.daily_average[dateStr] || 0;
    });
    const smoothedAverage = movingAverage(averageData, 15);

    const minAvg = Math.min(...smoothedAverage);
    const maxAvg = Math.max(...smoothedAverage);
    const padding = 0.04; // padding fisso di 0.04 sopra e sotto

    const datasets = [
        {
            label: 'Media del benessere',
            data: smoothedAverage.map((value, index) => ({x: dates[index].getTime(), y: value})),
            type: 'line',
            borderColor: 'black',
            borderWidth: 2,
            fill: false,
            yAxisID: 'y-axis-2',
            order: 0,
            pointRadius: 0,
            tension: 0.4
        },
        ...emojis.map((emoji, index) => ({
            label: emoji,
            data: dates.map(date => {
                const dateStr = date.toISOString().split('T')[0];
                const moodCounts = moodData.daily_moods[dateStr] || {};
                const total = Object.values(moodCounts).reduce((sum, count) => sum + count, 0);
                let count = 0;
                if (emoji === "🙂🙃") {
                    count = (moodCounts["🙂🙃"] || 0) + (moodCounts["🙃🙂"] || 0);
                } else {
                    count = moodCounts[emoji] || 0;
                }
                return {
                    x: date.getTime(),
                    y: total > 0 ? count / total * 100 : 0
                };
            }),
            backgroundColor: colors[index],
            stack: 'Stack 0',
            order: 1
        }))
    ];

    new Chart(ctx, {
        type: 'bar',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                    },
                    title: {
                        display: false,
                    },
                    ticks: {
                        source: 'data',
                        autoSkip: false,
                        maxRotation: 0,
                        align: 'start',
                        callback: function(value, index, values) {
                            const date = new Date(value);
                            if (date.getUTCDate() === 1 || index === 0) {
                                return date.toLocaleDateString('it-IT', { month: 'short' });
                            }
                            return '';
                        }
                    },
                    grid: {
                        display: false,
                    }
                },
                y: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Percentuale di risposte'
                    },
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                'y-axis-2': {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Media del benessere'
                    },
                    min: Math.max(-3, minAvg - padding),
                    max: Math.min(3, maxAvg + padding),
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Andamento Giornaliero dell\'Umore',
                    font: { size: 18 }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            const date = new Date(tooltipItems[0].parsed.x);
                            return date.toLocaleDateString('it-IT', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                            });
                        },
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return `Media del benessere: ${context.parsed.y.toFixed(2)}`;
                            }
                            return null; // Ritorniamo null qui per gestire le faccine in afterBody
                        },
                        afterBody: function(tooltipItems) {
                            const dateStr = new Date(tooltipItems[0].parsed.x).toISOString().split('T')[0];
                            const dailyMoods = moodData.daily_moods[dateStr] || {};
                            const total = Object.values(dailyMoods).reduce((sum, count) => sum + count, 0);
                            
                            const moodDataForDay = emojis.map(emoji => {
                                let count = 0;
                                if (emoji === "🙂🙃") {
                                    count = (dailyMoods["🙂🙃"] || 0) + (dailyMoods["🙃🙂"] || 0);
                                } else {
                                    count = dailyMoods[emoji] || 0;
                                }
                                return {
                                    emoji: emoji,
                                    percentage: total > 0 ? (count / total * 100) : 0
                                };
                            }).filter(item => item.percentage > 0)
                              .sort((a, b) => b.percentage - a.percentage);

                            return moodDataForDay.map(item => 
                                `${item.emoji}: ${item.percentage.toFixed(2)}%`
                            );
                        }
                    }
                },
                legend: {
                    display: false // Rimuove la legenda
                }
            }
        }
    });
}

function movingAverage(data, windowSize) {
    if (windowSize % 2 === 0) {
        windowSize++; // Assicura che la finestra sia dispari per centrare correttamente
    }
    const result = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < data.length; i++) {
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, i - halfWindow); j <= Math.min(data.length - 1, i + halfWindow); j++) {
            sum += data[j];
            count++;
        }
        result.push(sum / count);
    }

    return result;
}

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

function displayIdentikit(data) {
  const container = document.getElementById('identikit-container');
  container.innerHTML = '';

  // Ottieni l'ultimo periodo dai dati dei sondaggisti
  const lastPeriod = Object.keys(data.pollsters_stats).sort().pop();
  const lastPeriodStats = data.pollsters_stats[lastPeriod];

  // Crea un array di oggetti con nome, descrizione e numero di sondaggi
  const sortedIdentikit = Object.entries(data.identikits).map(([name, description]) => ({
    name,
    description,
    pollCount: lastPeriodStats[name]?.cumulative_polls || 0
  }));

  // Ordina l'array in base al numero di sondaggi (decrescente)
  sortedIdentikit.sort((a, b) => b.pollCount - a.pollCount);

  // Crea due colonne per gli identikit
  const leftColumn = document.createElement('div');
  leftColumn.className = 'identikit-column';
  const rightColumn = document.createElement('div');
  rightColumn.className = 'identikit-column';

  sortedIdentikit.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'identikit-card';
    card.innerHTML = `
      <h4>${item.name}</h4>
      <p>${item.description}</p>
      <p class="poll-count">Sondaggi: ${item.pollCount}</p>
    `;
    
    // Alterna tra colonna sinistra e destra
    if (index % 2 === 0) {
      leftColumn.appendChild(card);
    } else {
      rightColumn.appendChild(card);
    }
  });

  container.appendChild(leftColumn);
  container.appendChild(rightColumn);
}

// Inizializza la pagina quando il DOM è completamente caricato
document.addEventListener('DOMContentLoaded', initializePage);
