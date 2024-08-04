#!/bin/python3

import json
import re
from datetime import datetime, date
from collections import defaultdict
import random
import os
import csv

def generate_fantasy_name():
    aggettivi_maschili = [
        "Brillante", "Saggio", "Energico", "Creativo", "Vivace", "Intrepido", "Curioso", "Resiliente",
        "Arguto", "Spiritoso", "Ingegnoso", "Audace", "Perspicace", "Diligente", "Versatile", "Dinamico",
        "Eclettico", "Innovativo", "Tenace", "Proattivo", "Carismatico", "Empatico", "Intuitivo", "Pragmatico",
        "Analitico", "Visionario", "Determinato", "Affidabile", "Sincero", "Ottimista"
    ]
    aggettivi_femminili = [
        "Brillante", "Saggia", "Energica", "Creativa", "Vivace", "Intrepida", "Curiosa", "Resiliente",
        "Arguta", "Spiritosa", "Ingegnosa", "Audace", "Perspicace", "Diligente", "Versatile", "Dinamica",
        "Eclettica", "Innovativa", "Tenace", "Proattiva", "Carismatica", "Empatica", "Intuitiva", "Pragmatica",
        "Analitica", "Visionaria", "Determinata", "Affidabile", "Sincera", "Ottimista"
    ]
    nomi_maschili = ["Drago", "Unicorno", "Grifone", "Pegaso", "Mago", "Cavaliere", "Gigante", "Troll", "Golem", 
                     "Minotauro", "Cerbero", "Ciclope", "Hobbit", "Ent", "Balrog", "Orco", "Goblin", "Spiritello", "Folletto", 
                     "Fauno", "Centauro", "Satiro", "Mummia", "Vampiro", "Lupo Mannaro", "Yeti", "Basilisco", "Kraken", "Lich", 
                     "Naga", "Roc"]
    nomi_femminili = ["Fenice", "Sirena", "Strega", "Ninfa", "Driade", "Fata", "Chimera", "Medusa", 
                      "Banshee", "Arpia", "Lamia", "Harpia", "Selkie", "Bansidhe", "Succube", "Jinniya"]

    genere = random.choice(["maschile", "femminile"])
    
    if genere == "maschile":
        aggettivo = random.choice(aggettivi_maschili)
        nome = random.choice(nomi_maschili)
    elif genere == "femminile":
        aggettivo = random.choice(aggettivi_femminili)
        nome = random.choice(nomi_femminili)

    return f"{nome} {aggettivo}"

def determine_date_format(lines):
    dm_count = 0
    md_count = 0
    date_pattern = re.compile(r'(\d{1,2}/\d{1,2}/\d{2,4})')
    
    for line in lines:
        match = date_pattern.search(line)
        if match:
            date_str = match.group(1)
            day, month, year = map(int, date_str.split('/'))
            if day > 12 and month <= 12:
                dm_count += 1
            elif month > 12 and day <= 12:
                md_count += 1
    
    return '%d/%m/%y' if dm_count >= md_count else '%m/%d/%y'

def parse_date(date_str, time_str, date_format):
    try:
        return datetime.strptime(f"{date_str} {time_str}", f"{date_format} %H:%M")
    except ValueError:
        if date_format.endswith('%y'):
            date_format = date_format[:-2] + '%Y'
            return datetime.strptime(f"{date_str} {time_str}", f"{date_format} %H:%M")
        raise
        
def json_serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def load_existing_json(file_path):
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        # Converti le date in oggetti datetime
        for item in data:
            if 'DateTime' in item and isinstance(item['DateTime'], str):
                item['DateTime'] = datetime.fromisoformat(item['DateTime'])
        
        return data
    return []

def save_to_json(data, file_path):
    with open(file_path, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4, default=json_serial)
    return data

def update_polls(existing_polls, new_polls):
    updated_polls = {(poll['DateTime'], poll['Author'], poll['Question']): poll for poll in existing_polls}
    added_polls = 0
    updated_polls_count = 0
    
    for new_poll in new_polls:
        key = (new_poll['DateTime'], new_poll['Author'], new_poll['Question'])
        if key in updated_polls:
            updated_polls[key]['Options'].update(new_poll['Options'])
            updated_polls_count += 1
        else:
            updated_polls[key] = new_poll
            added_polls += 1
    
    return list(updated_polls.values()), added_polls, updated_polls_count

def load_polls(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        polls = json.load(f)
    
    for poll in polls:
        poll['DateTime'] = datetime.fromisoformat(poll['DateTime'])
        valid_options = {}
        for option, value in poll['Options'].items():
            if isinstance(value, int):
                valid_options[option] = value
            else:
                print(f"Valore non numerico trovato: {option} = {value} nel sondaggio {poll['Question']} dell'autore {poll['Author']}")
        poll['Options'] = valid_options
        poll['TotalVotes'] = sum(valid_options.values())
    return sorted(polls, key=lambda x: x['DateTime'])

def create_anon_mapping(polls, messages):
    authors = set(poll['Author'] for poll in polls).union(set(message['Author'] for message in messages))
    return {author: generate_fantasy_name() for author in authors}

def analyze_polls(polls, messages):
    total_polls = len(polls)
    total_votes = sum(poll['TotalVotes'] for poll in polls)
    avg_votes_per_poll = total_votes / total_polls if total_polls > 0 else 0
    
    most_voted_poll = max(polls, key=lambda x: x['TotalVotes'])
    least_voted_poll = min(polls, key=lambda x: x['TotalVotes'])
    
    pollsters_stats = defaultdict(lambda: defaultdict(lambda: {
        'cumulative_polls': 0,
        'cumulative_votes': 0,
        'cumulative_messages': 0,
        'avg_votes_per_poll': 0
    }))
    
    weekly_stats = defaultdict(lambda: {
        'polls': 0,
        'votes': 0,
        'messages': 0,
        'avg_votes_per_poll': 0
    })
    
    hourly_stats = defaultdict(lambda: {
        'polls': 0,
        'votes': 0,
        'messages': 0,
        'avg_votes_per_poll': 0
    })
    
    daily_stats = defaultdict(lambda: {
        'polls': 0,
        'votes': 0,
        'messages': 0,
        'avg_votes_per_poll': 0
    })
    
    day_translation = {
        'Monday': 'Lunedì',
        'Tuesday': 'Martedì',
        'Wednesday': 'Mercoledì',
        'Thursday': 'Giovedì',
        'Friday': 'Venerdì',
        'Saturday': 'Sabato',
        'Sunday': 'Domenica'
    }
    
    for poll in polls:
        week = poll['DateTime'].strftime('%Y-%W')
        author = poll['Author']
        hour = poll['DateTime'].hour
        day = day_translation[poll['DateTime'].strftime('%A')]
        
        pollsters_stats[week][author]['cumulative_polls'] += 1
        pollsters_stats[week][author]['cumulative_votes'] += poll['TotalVotes']
        pollsters_stats[week][author]['avg_votes_per_poll'] = (
            pollsters_stats[week][author]['cumulative_votes'] / 
            pollsters_stats[week][author]['cumulative_polls']
        )
        
        weekly_stats[week]['polls'] += 1
        weekly_stats[week]['votes'] += poll['TotalVotes']
        
        hourly_stats[hour]['polls'] += 1
        hourly_stats[hour]['votes'] += poll['TotalVotes']
        
        daily_stats[day]['polls'] += 1
        daily_stats[day]['votes'] += poll['TotalVotes']
    
    for message in messages:
        week = message['DateTime'].strftime('%Y-%W')
        author = message['Author']
        hour = message['DateTime'].hour
        day = day_translation[message['DateTime'].strftime('%A')]
        
        pollsters_stats[week][author]['cumulative_messages'] += 1
        weekly_stats[week]['messages'] += 1
        hourly_stats[hour]['messages'] += 1
        daily_stats[day]['messages'] += 1
    
    for week, stats in weekly_stats.items():
        stats['avg_votes_per_poll'] = stats['votes'] / stats['polls'] if stats['polls'] > 0 else 0
    
    for hour, stats in hourly_stats.items():
        stats['avg_votes_per_poll'] = stats['votes'] / stats['polls'] if stats['polls'] > 0 else 0
    
    for day, stats in daily_stats.items():
        stats['avg_votes_per_poll'] = stats['votes'] / stats['polls'] if stats['polls'] > 0 else 0
    
    sorted_weeks = sorted(pollsters_stats.keys())
    all_authors = set()
    for week in sorted_weeks:
        all_authors.update(pollsters_stats[week].keys())

    for i, week in enumerate(sorted_weeks):
        if i > 0:
            prev_week = sorted_weeks[i-1]
            for author in all_authors:
                if author not in pollsters_stats[week]:
                    pollsters_stats[week][author] = {
                        'cumulative_polls': 0,
                        'cumulative_votes': 0,
                        'cumulative_messages': 0,
                        'avg_votes_per_poll': 0
                    }
                
                for stat in ['cumulative_polls', 'cumulative_votes', 'cumulative_messages']:
                    pollsters_stats[week][author][stat] = (
                        pollsters_stats[prev_week][author].get(stat, 0) +
                        pollsters_stats[week][author].get(stat, 0)
                    )
                
                if pollsters_stats[week][author]['cumulative_polls'] > 0:
                    pollsters_stats[week][author]['avg_votes_per_poll'] = (
                        pollsters_stats[week][author]['cumulative_votes'] / 
                        pollsters_stats[week][author]['cumulative_polls']
                    )
                else:
                    pollsters_stats[week][author]['avg_votes_per_poll'] = 0

    return {
        'basic_stats': {
            'total_polls': total_polls,
            'total_votes': total_votes,
            'avg_votes_per_poll': avg_votes_per_poll,
            'most_voted_poll': most_voted_poll,
            'least_voted_poll': least_voted_poll
        },
        'pollsters_stats': dict(pollsters_stats),
        'weekly_stats': dict(weekly_stats),
        'hourly_stats': dict(hourly_stats),
        'daily_stats': dict(daily_stats)
    }

def analyze_day_mood_polls(polls):
    mood_question_pattern = re.compile(r'.*?(andata|stata|è|è stata|was|been).*?(giornata|giorno|oggi|day|today)', re.IGNORECASE)
    
    wellbeing_levels = {
        "😄": {"level": 3, "color": "#00ff00"},
        "😁": {"level": 3, "color": "#00ff00"},
        "😊": {"level": 2, "color": "#7fff00"},
        "🙂": {"level": 1, "color": "#ffff00"},
        "😐": {"level": 0, "color": "#ffa500"},
        "🙂🙃": {"level": 0, "color": "#ffa500"},  # Aggiunto "così così"
        "😕": {"level": -1, "color": "#ff8c00"},
        "🙁": {"level": -2, "color": "#ff4500"},
        "☹️": {"level": -3, "color": "#ff0000"},
        "😣": {"level": -3, "color": "#ff0000"}
    }

    def is_mostly_emoji(text):
        emoji_pattern = re.compile("["
            u"\U0001F600-\U0001F64F"
            u"\U0001F300-\U0001F5FF"
            u"\U0001F680-\U0001F6FF"
            u"\U0001F1E0-\U0001F1FF"
            u"\U00002702-\U000027B0"
            u"\U000024C2-\U0001F251"
            "]+", flags=re.UNICODE)
        
        emoji_count = len(emoji_pattern.findall(text))
        return emoji_count > 0

    def get_emoji_from_option(option):
        for emoji in wellbeing_levels:
            if emoji in option:
                return emoji
        return None

    day_mood_polls = [
        poll for poll in polls
        if mood_question_pattern.search(poll['Question']) and
        sum(1 for option in poll['Options'] if is_mostly_emoji(option)) > len(poll['Options']) / 2
    ]

    daily_moods = {}
    daily_average = {}

    for poll in day_mood_polls:
        poll_date = poll['DateTime'].date()
        date_str = poll_date.isoformat()
        
        if date_str not in daily_moods:
            daily_moods[date_str] = {emoji: 0 for emoji in wellbeing_levels}
            daily_average[date_str] = {"total": 0, "count": 0}
        
        for option, votes in poll['Options'].items():
            emoji = get_emoji_from_option(option)
            if emoji:
                daily_moods[date_str][emoji] += votes
                level = wellbeing_levels[emoji]["level"]
                daily_average[date_str]["total"] += level * votes
                daily_average[date_str]["count"] += votes
            elif "🙂🙃" in option or "🙃🙂" in option:
                daily_moods[date_str]["🙂🙃"] += votes
                daily_average[date_str]["total"] += 0  # Valore 0 per "così così"
                daily_average[date_str]["count"] += votes

    for date_str in daily_average:
        if daily_average[date_str]["count"] > 0:
            daily_average[date_str] = daily_average[date_str]["total"] / daily_average[date_str]["count"]
        else:
            daily_average[date_str] = 0

    return day_mood_polls, daily_moods, daily_average

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

def create_name_to_phone_mapping(contacts):
    name_to_phone = {}
    for contact in contacts:
        display_name = contact.get('Display Name', '')
        phone = (contact.get('Mobile Phone') or contact.get('Home Phone') or
                 contact.get('Business Phone') or '').strip()
        if display_name and phone:
            # Rimuovi tutti gli spazi dal numero di telefono
            phone = ''.join(phone.split())
            name_to_phone[display_name] = phone
    return name_to_phone

def get_messages(lines, date_format, name_to_phone):
    data = []
    for line in lines:
        match = re.match(r'(\d{1,2}/\d{1,2}/\d{2,4}), (\d{2}:\d{2}) - (.*?): (.*)', line)
        if match:
            date, time, author, message = match.groups()
            try:
                date_time = parse_date(date, time, date_format)
                # Rimuovi gli spazi dall'autore se è un numero di telefono
                author = ''.join(author.split()) if author.replace('+', '').replace(' ', '').isdigit() else author
                author = name_to_phone.get(author, author)
                data.append({'DateTime': date_time, 'Author': author, 'Message': message})
            except ValueError as e:
                print(f"Errore nel parsing della data: {e} per la linea: {line}")
    return data

def get_polls(lines, date_format, name_to_phone):
    polls = []
    current_poll = None
    
    for i, line in enumerate(lines):
        poll_start_match = re.match(r'(\d{1,2}/\d{1,2}/\d{2,4}), (\d{2}:\d{2}) - (.*?): (SONDAGGIO|POLL):', line, re.IGNORECASE)
        option_match = re.match(r'(OPZIONE|OPTION): (.*) \((.*?)(\d+) vot', line, re.IGNORECASE)
        
        if poll_start_match:
            if current_poll:
                polls.append(current_poll)
            
            date, time, author, _ = poll_start_match.groups()
            try:
                date_time = parse_date(date, time, date_format)
                # Rimuovi gli spazi dall'autore se è un numero di telefono
                author = ''.join(author.split()) if author.replace('+', '').replace(' ', '').isdigit() else author
                author = name_to_phone.get(author, author)
                current_poll = {
                    'DateTime': date_time,
                    'Author': author,
                    'Question': "",
                    'Options': {}
                }
                
                if i + 1 < len(lines):
                    current_poll['Question'] = lines[i + 1].strip()
            except ValueError as e:
                print(f"Errore nel parsing della data del sondaggio: {e} per la linea: {line}")
                current_poll = None
        
        elif current_poll and option_match:
            _, option, _, votes = option_match.groups()
            current_poll['Options'][option] = int(votes)
    
    if current_poll:
        polls.append(current_poll)
    
    return polls

def load_identikits(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        return json.load(file)

if __name__ == "__main__":
    # Load contacts from CSV file
    with open("contacts.csv", 'r', encoding="UTF-8") as file:
        csv_reader = csv.DictReader(file)
        contacts = list(csv_reader)

    # Load identikits from JSON file
    identikits = load_identikits("identikits.json")

    # Create name-to-phone and identikits mappings
    name_to_phone = create_name_to_phone_mapping(contacts)

    with open("chat.txt", 'r', encoding="UTF-8") as file:
        chat = file.readlines()

    date_format = determine_date_format(chat)
    print(f"Determined date format: {date_format}")

    messages = get_messages(chat, date_format, name_to_phone)
    new_polls = get_polls(chat, date_format, name_to_phone)

    existing_messages = load_existing_json('messages.json')
    updated_messages = existing_messages + messages
    save_to_json(updated_messages, 'messages.json')

    existing_polls = load_existing_json('polls.json')
    updated_polls, added_polls_count, updated_polls_count = update_polls(existing_polls, new_polls)
    save_to_json(updated_polls, 'polls.json')

    print(f"Existing polls: {len(existing_polls)}")
    print(f"New polls added: {added_polls_count}")
    print(f"Polls updated: {updated_polls_count}")
    print(f"Total polls after update: {len(updated_polls)}")

    polls = load_polls('polls.json')
    
    anon_mapping = create_anon_mapping(polls, updated_messages)
    
    for poll in polls:
        poll['Author'] = anon_mapping[poll['Author']]
    
    for message in updated_messages:
        message['Author'] = anon_mapping[message['Author']]
    
    anon_identikits = {}
    for author, identikit in identikits.items():
        anon_identikits[anon_mapping[author]] = identikit
    
    results = analyze_polls(polls, updated_messages)

    day_mood_polls, daily_moods, daily_average = analyze_day_mood_polls(polls)

    results['day_mood_analysis'] = {
        'day_mood_polls_count': len(day_mood_polls),
        'daily_moods': daily_moods,
        'daily_average': daily_average
    }

    # Add identikits section to results
    results['identikits'] = anon_identikits

    save_to_json(results, 'analysis_results.json')
    print("Analysis complete. Results saved in 'analysis_results.json'")

    unanimous_polls = find_unanimous_polls(polls)
    save_to_json(unanimous_polls, 'unanimous_polls.json')
    print(f"Found {len(unanimous_polls)} unanimous polls. Saved in 'unanimous_polls.json'")

    print(f"Found {len(day_mood_polls)} daily mood polls with predominantly emoji responses.")
