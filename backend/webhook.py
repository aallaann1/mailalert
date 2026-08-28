import os
import httpx
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from . import models, database, gmail_service
import base64
import json

router = APIRouter()

async def send_discord_ping(webhook_url: str, mail_info: dict, ping: bool = False, discord_user_id: str = None):
    gmail_url = mail_info.get('gmail_url', 'https://mail.google.com/mail/u/0/#inbox')
    
    fields = [
        {'name': 'De', 'value': mail_info.get('sender', 'Inconnu'), 'inline': True},
        {'name': 'Objet', 'value': mail_info.get('subject', 'Sans objet'), 'inline': True},
        {'name': 'Aperçu', 'value': mail_info.get('snippet', '...'), 'inline': False}
    ]
    
    attachments = mail_info.get('attachments', [])
    if attachments:
        att_links = []
        for att in attachments[:5]:
            att_links.append(f"• 📎 **{att}** — [📥 Télécharger via Gmail]({gmail_url})")
        if len(attachments) > 5:
            att_links.append(f"*+ {len(attachments) - 5} autre(s) pièce(s) jointe(s)*")
        
        fields.append({
            'name': '📎 Pièces jointes',
            'value': '\n'.join(att_links),
            'inline': False
        })

    fields.append({
        'name': '🔗 Accès direct',
        'value': f"[✉️ Ouvrir le mail dans Gmail]({gmail_url})",
        'inline': False
    })

    embed = {
        'title': '📩 Nouveau mail critique reçu !',
        'url': gmail_url,
        'color': 5814783,
        'fields': fields,
        'footer': {'text': 'Alerte instantanée Gmail ⚡'}
    }

    # Action Row with Link Buttons
    buttons = [
        {
            'type': 2, # BUTTON
            'style': 5, # LINK
            'label': 'Ouvrir sur Gmail ✉️',
            'url': gmail_url
        }
    ]

    if attachments:
        buttons.append({
            'type': 2,
            'style': 5,
            'label': f'Télécharger ({len(attachments)} pj) 📥',
            'url': gmail_url
        })

    payload = {
        'embeds': [embed],
        'components': [
            {
                'type': 1, # ACTION_ROW
                'components': buttons
            }
        ]
    }

    if ping:
        if discord_user_id:
            payload['content'] = f'<@{discord_user_id}> 🔔 Alerte email critique !'
        else:
            payload['content'] = '🔔 Alerte email critique !'

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(webhook_url, json=payload)
            # If components format is not supported for any reason, fallback without components
            if res.status_code >= 400:
                print(f"Erreur envoi avec components ({res.status_code}), fallback simple embed...")
                fallback_payload = {'embeds': [embed]}
                if ping:
                    fallback_payload['content'] = payload.get('content', '')
                res = await client.post(webhook_url, json=fallback_payload)
            print(f"Discord ping envoyé: {res.status_code}")
        except Exception as e:
            print(f"Erreur d'envoi Discord Webhook: {e}")

@router.post('/api/webhooks/gmail')
@router.post('/webhook/gmail')
async def gmail_webhook(request: Request, db: Session = Depends(database.get_db)):
    body = await request.json()
    message = body.get('message', {})
    data_b64 = message.get('data')
    if data_b64:
        try:
            data = json.loads(base64.b64decode(data_b64).decode('utf-8'))
            email = data.get('emailAddress')
            history_id = data.get('historyId')
            
            print(f"Notification reçue pour {email} avec historyId {history_id}")

            user = db.query(models.User).filter(models.User.email == email).first()
            if user:
                matched_alerts = gmail_service.fetch_and_analyze_emails(user, history_id, db)
                for alert in matched_alerts:
                    if len(alert) == 3:
                        webhook_url, mail_info, ping = alert
                        await send_discord_ping(webhook_url, mail_info, ping=ping, discord_user_id=user.discord_user_id)
                    else:
                        webhook_url, mail_info = alert
                        await send_discord_ping(webhook_url, mail_info, discord_user_id=user.discord_user_id)
        except Exception as e:
            print(f"Erreur décodage webhook Pub/Sub: {e}")
            
    return {'status': 'ok'}
