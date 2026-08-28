import os
import datetime
from . import models
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest
from dotenv import load_dotenv

load_dotenv()

def get_user_credentials(user: models.User):
    # Crée des credentials Google avec le refresh token
    creds = Credentials(
        token=None,
        refresh_token=user.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    )
    # Force le rafraîchissement
    creds.refresh(GoogleRequest())
    return creds

def setup_watch(user: models.User, credentials, db):
    # Setup du watch Gmail API vers Pub/Sub
    service = build('gmail', 'v1', credentials=credentials)
    topic_name = os.getenv('PUBSUB_TOPIC_NAME')
    
    if not topic_name:
        print("Erreur: PUBSUB_TOPIC_NAME non configuré dans .env")
        return

    request_body = {
        'topicName': topic_name,
        'labelIds': ['INBOX']
    }
    
    response = service.users().watch(userId='me', body=request_body).execute()
    
    expiration_ms = int(response.get('expiration', 0))
    # Conversion timestamp ms en DateTime
    expiration_dt = datetime.datetime.utcfromtimestamp(expiration_ms / 1000.0)
    
    user.watch_expiration = expiration_dt
    
    try:
        profile = service.users().getProfile(userId='me').execute()
        current_history_id = str(profile.get('historyId'))
        user.history_id = current_history_id
    except Exception as e:
        print(f"Erreur récupération historyId initial: {e}")

    db.commit()
    print(f"Watch configuré avec succès pour {user.email}. Expiration: {expiration_dt}, HistoryId initial: {user.history_id}")

def fetch_and_analyze_emails(user: models.User, history_id: str, db):
    try:
        creds = get_user_credentials(user)
    except Exception as e:
        print(f"Impossible de rafraîchir les tokens pour {user.email}: {e}")
        return []

    service = build('gmail', 'v1', credentials=creds)
    matched_emails = []

    # Récupérer la liste des modifications depuis le dernier historyId connu
    start_history_id = user.history_id
    
    try:
        message_ids = []
        if start_history_id:
            history_list = service.users().history().list(
                userId='me',
                startHistoryId=start_history_id,
                historyTypes=['messageAdded']
            ).execute()
            
            histories = history_list.get('history', [])
            print(f"DEBUG: Fetched history from {start_history_id}. Found {len(histories)} history records.")
            for h in histories:
                messages_added = h.get('messagesAdded', [])
                for msg_item in messages_added:
                    msg = msg_item.get('message', {})
                    label_ids = msg.get('labelIds', [])
                    print(f"DEBUG: Message added {msg.get('id')} with labels {label_ids}")
                    if 'INBOX' in label_ids:
                        message_ids.append(msg.get('id'))
        else:
            # Premier webhook reçu (pas de history_id précédent)
            messages_res = service.users().messages().list(userId='me', maxResults=1, q="label:INBOX").execute()
            message_ids = [m.get('id') for m in messages_res.get('messages', [])]

        # Mettre à jour le dernier historyId connu pour les prochaines fois
        user.history_id = history_id
        db.commit()

        # Récupérer les détails de chaque message et appliquer les groupes de règles
        webhooks = user.webhooks
        print(f"DEBUG: Found {len(message_ids)} messages to process: {message_ids}")
        for msg_id in set(message_ids):
            msg_detail = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
            
            headers = msg_detail.get('payload', {}).get('headers', [])
            snippet = msg_detail.get('snippet', '')
            
            sender = ""
            subject = ""
            for h in headers:
                if h.get('name') == 'From':
                    sender = h.get('value')
                elif h.get('name') == 'Subject':
                    subject = h.get('value')
            
            print(f"DEBUG: Message {msg_id} - From: {sender}, Subject: {subject}")
            
            # Extraction récursive du corps et des pièces jointes
            attachments = []
            body_texts = []

            def walk_parts(part):
                filename = part.get('filename', '')
                mime_type = part.get('mimeType', '')
                
                if filename:
                    attachments.append({
                        'filename': filename,
                        'mimeType': mime_type
                    })
                
                if mime_type == 'text/plain':
                    body_data = part.get('body', {}).get('data', '')
                    if body_data:
                        try:
                            import base64
                            decoded = base64.urlsafe_b64decode(body_data).decode('utf-8', errors='ignore')
                            body_texts.append(decoded)
                        except Exception:
                            pass
                
            walk_parts(msg_detail.get('payload', {}))
            body_content = "\n".join(body_texts)

            thread_id = msg_detail.get('threadId', msg_id)
            gmail_url = f"https://mail.google.com/mail/u/0/#inbox/{thread_id}"

            mail_payload = {
                'id': msg_id,
                'sender': sender,
                'subject': subject,
                'snippet': snippet,
                'gmail_url': gmail_url,
                'attachments': [a['filename'] for a in attachments]
            }

            print(f"DEBUG: Processing mail {msg_id} from {sender}")

            # Évaluation pour chaque webhook de l'utilisateur
            for wh in webhooks:
                webhook_triggered = False
                
                # Un webhook se déclenche si AU MOINS UN de ses groupes de règles est satisfait (OU)
                for group in wh.rule_groups:
                    if not group.rules:
                        continue
                    
                    # Un groupe est satisfait si TOUTES ses règles sont vraies (ET)
                    group_matched = True
                    for rule in group.rules:
                        rule_val = rule.value.lower().strip()
                        rule_matched = False
                        
                        if rule.rule_type == 'sender' and rule_val in sender.lower():
                            rule_matched = True
                        elif rule.rule_type == 'subject' and rule_val in subject.lower():
                            rule_matched = True
                        elif rule.rule_type == 'body' and (rule_val in snippet.lower() or rule_val in body_content.lower()):
                            rule_matched = True
                        elif rule.rule_type == 'attachment':
                            if not attachments:
                                rule_matched = False
                            elif rule_val in ['any', '*', 'all', 'tout', 'toutes']:
                                rule_matched = len(attachments) > 0
                            else:
                                clean_ext = rule_val.lstrip('.')
                                for att in attachments:
                                    fname = att['filename'].lower()
                                    mtype = att['mimeType'].lower()
                                    if fname.endswith(f".{clean_ext}") or clean_ext in mtype or (clean_ext in ['jpg', 'jpeg'] and (fname.endswith('.jpg') or fname.endswith('.jpeg') or 'jpeg' in mtype or 'jpg' in mtype)):
                                        rule_matched = True
                                        break

                        if not rule_matched:
                            group_matched = False
                            break
                    
                    if group_matched:
                        webhook_triggered = True
                        should_ping = bool(group.notify_ping)
                        matched_emails.append((wh.url, mail_payload, should_ping))
                        break # Pas besoin de tester les autres groupes pour ce webhook

    except Exception as e:
        print(f"Erreur lors de la récupération des e-mails pour {user.email}: {e}")
        
    return matched_emails
