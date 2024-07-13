// quiz.js
let unanimousPollsData = [];
let currentQuestions = [];
let correctAnswers = 0;

// Carica i dati dei sondaggi unanimi
fetch('unanimous_polls.json')
    .then(response => response.json())
    .then(data => {
        unanimousPollsData = data;
        initQuiz();
    })
    .catch(error => console.error('Errore nel caricamento dei dati:', error));

function getRandomQuestions(n) {
    const shuffled = [...unanimousPollsData].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
}

function displayQuestion(question, index) {
    const quizContainer = document.getElementById('quiz');
    const questionElement = document.createElement('div');
    questionElement.className = 'question';
    questionElement.innerHTML = `
        <p>${index + 1}. ${question.Question}</p>
        ${Object.entries(question.Options).map(([option, votes]) => `
            <label>
                <input type="radio" name="q${index}" value="${option}">
                ${option}
            </label>
        `).join('')}
    `;
    quizContainer.appendChild(questionElement);
}

function initQuiz() {
    document.getElementById('quiz').innerHTML = '';
    currentQuestions = getRandomQuestions(4);
    currentQuestions.forEach((question, index) => displayQuestion(question, index));
}

function checkAnswers() {
    correctAnswers = 0;
    currentQuestions.forEach((question, index) => {
        const selectedOption = document.querySelector(`input[name="q${index}"]:checked`);
        if (selectedOption && selectedOption.value === question["Unanimous Answer"]) {
            correctAnswers++;
        }
    });

    if (correctAnswers === 4) {
        localStorage.setItem('quizPassed', 'true');
        window.location.href = 'dashboard.html';
    } else {
        alert(`Hai risposto correttamente a ${correctAnswers} domande su 4. Riprova!`);
        initQuiz();
    }
}

document.getElementById('submit-btn').addEventListener('click', checkAnswers);

// initQuiz() viene chiamato dopo il caricamento dei dati