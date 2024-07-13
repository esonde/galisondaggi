import json
import re
from datetime import datetime
from collections import defaultdict
import random
import os

# Funzioni per la generazione di nomi di fantasia e l'anonimizzazione
def generate_fantasy_name():
    aggettivi = [
        "Fantastico", "Splendido", "Radiante", "Incantevole", "Maestoso", "Misterioso", "Avventuroso", "Eccelso",
        "Esuberante", "Folgorante", "Luminoso", "Magico", "Miracoloso", "Affascinante", "Grandioso", "Epico",
        "Leggendario", "Misterico", "Onirico", "Prodigioso", "Sorprendente", "Favoloso", "Divino", "Glorioso",
        "Incredibile", "Sfavillante", "Esuberante", "Raggiante", "Incantevole", "Straordinario"
    ]
    nomi = [
        "Fenice", "Drago", "Unicorno", "Sirena", "Grifone", "Pegaso", "Mago", "Elfo", "Cavaliere", "Strega",
        "Gigante", "Troll", "Ninfa", "Driade", "Fata", "Licantropo", "Vampiro", "Golem", "Chimera", "Minotauro",
        "Medusa", "Cerbero", "Ciclope", "Hobbit", "Ent", "Balrog", "Orco", "Goblin", "Spiritello", "Folletto"
    ]
    return random.choice(aggettivi) + " " + random.choice(nomi)

# Funzioni per l'estrazione di messaggi e sondaggi
def get_messages(lines):
    data = []
    for line in lines:
        match = re.match(r'(\d{2}/\d{2}/\d{2}), (\d{2}:\d{2}) - (.*?): (.*)', line)
        if match:
            date, time, author, message = match.groups()
            date_time = datetime.strptime(f'{date} {time}', '%d/%m/%y %H:%M')
            data.append({'DateTime': str(date_time), 'Author': author, 'Message': message})
    return data

def get_polls(lines):
    polls = []
    current_poll = None
    
    for i, line in enumerate(lines):
        poll_start_match = re.match(r'(\d{2}/\d{2}/\d{2}), (\d{2}:\d{2}) - (.*?): SONDAGGIO:', line)
        option_match = re.match(r'OPZIONE: (.*) \((.*?)(\d+) vot', line)
        
        if poll_start_match:
            if current_poll:
                polls.append(current_poll)
            
            date, time, author = poll_start_match.groups()
            date_time = datetime.strptime(f'{date} {time}', '%d/%m/%y %H:%M')
            current_poll = {
                'DateTime': str(date_time),
                'Author': author,
                'Question': "",
                'Options': {}
            }
            
            # Get the question from the next line
            if i + 1 < len(lines):
                current_poll['Question'] = lines[i + 1].strip()
        
        elif current_poll and option_match:
            option, _, votes = option_match.groups()
            current_poll['Options'][option] = int(votes)
    
    if current_poll:
        polls.append(current_poll)
    
    return polls

# Funzioni per caricare e salvare dati JSON
def load_existing_json(file_path):
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    return []

def save_to_json(data, file_path):
    def json_serial(obj):
        """JSON serializer for objects not serializable by default json code"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")

    with open(file_path, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4, default=json_serial)

# Funzione per aggiornare i sondaggi
def update_polls(existing_polls, new_polls):
    updated_polls = {(poll['DateTime'], poll['Author'], poll['Question']): poll for poll in existing_polls}
    added_polls = 0
    updated_polls_count = 0
    
    for new_poll in new_polls:
        key = (new_poll['DateTime'], new_poll['Author'], new_poll['Question'])
        if key in updated_polls:
            # Update the existing poll's options
            updated_polls[key]['Options'].update(new_poll['Options'])
            updated_polls_count += 1
        else:
            # Add the new poll
            updated_polls[key] = new_poll
            added_polls += 1
    
    return list(updated_polls.values()), added_polls, updated_polls_count

# Funzione per caricare e preparare i sondaggi
def load_polls(filename):
    global anon_mapping
    with open(filename, 'r', encoding='utf-8') as f:
        polls = json.load(f)
    
    # Se la lista anon è vuota, anonimizza tutti gli autori
    if not anon:
        authors = {poll['Author'] for poll in polls}
        anon_mapping = {author: generate_fantasy_name() for author in authors}
    else:
        anon_mapping = {name: generate_fantasy_name() for name in anon}

    for poll in polls:
        poll['DateTime'] = datetime.strptime(poll['DateTime'], '%Y-%m-%d %H:%M:%S')
        # Anonimizza l'autore se è nella lista
        if poll['Author'] in anon_mapping:
            poll['Author'] = anon_mapping[poll['Author']]
        # Assicurati che i valori delle opzioni siano numerici
        valid_options = {}
        for option, value in poll['Options'].items():
            if isinstance(value, int):
                valid_options[option] = value
            else:
                print(f"Valore non numerico trovato: {option} = {value} nel sondaggio {poll['Question']} dell'autore {poll['Author']}")
        poll['Options'] = valid_options
        poll['TotalVotes'] = sum(valid_options.values())
    return sorted(polls, key=lambda x: x['DateTime'])  # Ordina i sondaggi per data

# Funzione per analizzare i sondaggi
def analyze_polls(polls):
    total_polls = len(polls)
    total_votes = sum(poll['TotalVotes'] for poll in polls)
    avg_votes_per_poll = total_votes / total_polls if total_polls > 0 else 0
    
    most_voted_poll = max(polls, key=lambda x: x['TotalVotes'])
    least_voted_poll = min(polls, key=lambda x: x['TotalVotes'])
    
    days_of_week = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
    polls_by_day = {day: 0 for day in days_of_week}
    votes_by_day = {day: 0 for day in days_of_week}
    
    polls_by_week = defaultdict(int)
    votes_by_week = defaultdict(int)
    
    polls_by_hour = defaultdict(int)
    votes_by_hour = defaultdict(int)
    
    pollster_stats = defaultdict(lambda: {'polls': 0, 'votes': 0})
    weekly_pollster_stats = defaultdict(lambda: defaultdict(lambda: {'cumulative_polls': 0, 'cumulative_votes': 0}))
    
    # Dizionario temporaneo per mantenere le statistiche cumulative di ciascun autore
    cumulative_stats = defaultdict(lambda: {'cumulative_polls': 0, 'cumulative_votes': 0})
    
    for poll in polls:
        day = days_of_week[poll['DateTime'].weekday()]
        week = poll['DateTime'].strftime('%Y-%W')
        hour = poll['DateTime'].hour
        
        polls_by_day[day] += 1
        votes_by_day[day] += poll['TotalVotes']
        
        polls_by_week[week] += 1
        votes_by_week[week] += poll['TotalVotes']
        
        polls_by_hour[hour] += 1
        votes_by_hour[hour] += poll['TotalVotes']
        
        pollster_stats[poll['Author']]['polls'] += 1
        pollster_stats[poll['Author']]['votes'] += poll['TotalVotes']
        
        # Aggiorna le statistiche cumulative settimanali per ogni sondaggista
        cumulative_stats[poll['Author']]['cumulative_polls'] += 1
        cumulative_stats[poll['Author']]['cumulative_votes'] += poll['TotalVotes']
        
        weekly_pollster_stats[week][poll['Author']]['cumulative_polls'] = cumulative_stats[poll['Author']]['cumulative_polls']
        weekly_pollster_stats[week][poll['Author']]['cumulative_votes'] = cumulative_stats[poll['Author']]['cumulative_votes']
    
    # Calcola la media dei voti per ogni giorno, settimana e ora
    avg_votes_by_day = {day: votes_by_day[day] / polls_by_day[day] if polls_by_day[day] > 0 else 0 for day in days_of_week}
    avg_votes_by_week = {week: votes_by_week[week] / polls_by_week[week] if polls_by_week[week] > 0 else 0 for week in polls_by_week}
    avg_votes_by_hour = {hour: votes_by_hour[hour] / polls_by_hour[hour] if polls_by_hour[hour] > 0 else 0 for hour in range(24)}
    
    for stats in pollster_stats.values():
        stats['avg_votes'] = stats['votes'] / stats['polls'] if stats['polls'] > 0 else 0
    
    # Calcola la media cumulativa dei voti per ogni sondaggista per settimana
    for week in weekly_pollster_stats:
        for author in weekly_pollster_stats[week]:
            stats = weekly_pollster_stats[week][author]
            stats['avg_votes_per_poll'] = stats['cumulative_votes'] / stats['cumulative_polls'] if stats['cumulative_polls'] > 0 else 0
    
    pollster_rankings = {
        'by_polls': sorted(pollster_stats.items(), key=lambda x: x[1]['polls'], reverse=True),
        'by_votes': sorted(pollster_stats.items(), key=lambda x: x[1]['votes'], reverse=True),
        'by_avg_votes': sorted(pollster_stats.items(), key=lambda x: x[1]['avg_votes'], reverse=True)
    }
    
    return {
        'basic_stats': {
            'total_polls': total_polls,
            'total_votes': total_votes,
            'avg_votes_per_poll': avg_votes_per_poll,
            'most_voted_poll': most_voted_poll,
            'least_voted_poll': least_voted_poll
        },
        'polls_by_day': polls_by_day,
        'votes_by_day': votes_by_day,
        'avg_votes_by_day': avg_votes_by_day,
        'polls_by_week': dict(polls_by_week),
        'votes_by_week': dict(votes_by_week),
        'avg_votes_by_week': avg_votes_by_week,
        'polls_by_hour': dict(polls_by_hour),
        'votes_by_hour': dict(votes_by_hour),
        'avg_votes_by_hour': avg_votes_by_hour,
        'weekly_pollster_stats': {week: dict(stats) for week, stats in weekly_pollster_stats.items()},
        'pollster_rankings': pollster_rankings
    }

# Funzione per trovare sondaggi unanimi
def find_unanimous_polls(polls):
    unanimous_polls = []
    for poll in polls:
        options = poll["Options"]
        total_votes = sum(options.values())
        unanimous_option = None
        for option, count in options.items():
            if count == total_votes:
                unanimous_option = option
                break
        if unanimous_option:
            unanimous_polls.append({
                "Question": poll["Question"],
                "Options": options,
                "Unanimous Answer": unanimous_option
            })
    return unanimous_polls

# Main execution
if __name__ == "__main__":
    # Lista di nomi che devono rimanere anonimi (se vuota, tutti gli autori verranno anonimizzati)
    anon = []

    # Dizionario per mappare i nomi reali a quelli di fantasia
    anon_mapping = {}

    # Estrai messaggi e sondaggi dal file di chat
    with open("chat.txt", 'r', encoding="UTF-8") as file:
        chat = file.readlines()

    messages = get_messages(chat)
    new_polls = get_polls(chat)

    # Aggiorna o crea messages.json
    existing_messages = load_existing_json('messages.json')
    updated_messages = existing_messages + messages
    save_to_json(updated_messages, 'messages.json')

    # Aggiorna o crea polls.json
    existing_polls = load_existing_json('polls.json')
    updated_polls, added_polls_count, updated_polls_count = update_polls(existing_polls, new_polls)
    save_to_json(updated_polls, 'polls.json')

    print(f"Sondaggi già presenti: {len(existing_polls)}")
    print(f"Nuovi sondaggi aggiunti: {added_polls_count}")
    print(f"Sondaggi aggiornati: {updated_polls_count}")
    print(f"Totale sondaggi dopo l'aggiornamento: {len(updated_polls)}")

    # Carica i sondaggi aggiornati ed esegui l'analisi
    polls = load_polls('polls.json')
    results = analyze_polls(polls)

    # Salva i risultati dell'analisi
    save_to_json(results, 'analysis_results.json')
    print("Analisi completa. Risultati salvati in 'analysis_results.json'")

    # Trova e salva i sondaggi unanimi
    unanimous_polls = find_unanimous_polls(polls)
    save_to_json(unanimous_polls, 'unanimous_polls.json')
    print(f"Trovati {len(unanimous_polls)} sondaggi unanimi. Salvati in 'unanimous_polls.json'")