from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from . import models, database, auth, webhook, schemas
from sqlalchemy.orm import Session
from fastapi import Depends

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title='MailAlert API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, you can restrict this to ["http://localhost:5173"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix='/auth', tags=['auth'])
app.include_router(webhook.router, tags=['webhook'])

@app.get('/users/{user_id}', response_model=schemas.User)
def get_user(user_id: int, db: Session = Depends(database.get_db)):
    return db.query(models.User).filter(models.User.id == user_id).first()

@app.patch('/users/{user_id}', response_model=schemas.User)
def update_user(user_id: int, user_in: schemas.UserUpdate, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user:
        if user_in.discord_user_id is not None:
            user.discord_user_id = user_in.discord_user_id.strip() if user_in.discord_user_id else None
        db.commit()
        db.refresh(user)
    return user

# --- Webhooks Management ---
@app.post('/users/{user_id}/webhooks', response_model=schemas.Webhook)
def create_webhook(user_id: int, webhook_in: schemas.WebhookCreate, db: Session = Depends(database.get_db)):
    db_webhook = models.Webhook(**webhook_in.model_dump(), user_id=user_id)
    db.add(db_webhook)
    db.commit()
    db.refresh(db_webhook)
    # Automatically create a default rule group for convenience
    default_group = models.RuleGroup(name="Groupe 1 (Conditions ET)", webhook_id=db_webhook.id)
    db.add(default_group)
    db.commit()
    db.refresh(db_webhook)
    return db_webhook

@app.delete('/webhooks/{webhook_id}')
def delete_webhook(webhook_id: int, db: Session = Depends(database.get_db)):
    wh = db.query(models.Webhook).filter(models.Webhook.id == webhook_id).first()
    if wh:
        db.delete(wh)
        db.commit()
    return {'status': 'deleted'}

# --- Rule Groups Management ---
@app.post('/webhooks/{webhook_id}/groups', response_model=schemas.RuleGroup)
def create_rule_group(webhook_id: int, group_in: schemas.RuleGroupCreate, db: Session = Depends(database.get_db)):
    db_group = models.RuleGroup(**group_in.model_dump(), webhook_id=webhook_id)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@app.patch('/groups/{group_id}', response_model=schemas.RuleGroup)
def update_rule_group(group_id: int, group_in: schemas.RuleGroupUpdate, db: Session = Depends(database.get_db)):
    group = db.query(models.RuleGroup).filter(models.RuleGroup.id == group_id).first()
    if not group:
        return None
    if group_in.notify_ping is not None:
        group.notify_ping = group_in.notify_ping
    if group_in.name is not None:
        group.name = group_in.name
    db.commit()
    db.refresh(group)
    return group

@app.delete('/groups/{group_id}')
def delete_rule_group(group_id: int, db: Session = Depends(database.get_db)):
    group = db.query(models.RuleGroup).filter(models.RuleGroup.id == group_id).first()
    if group:
        db.delete(group)
        db.commit()
    return {'status': 'deleted'}

# --- Rules Management ---
@app.post('/groups/{group_id}/rules', response_model=schemas.Rule)
def create_rule(group_id: int, rule_in: schemas.RuleCreate, db: Session = Depends(database.get_db)):
    db_rule = models.Rule(**rule_in.model_dump(), rule_group_id=group_id)
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@app.delete('/rules/{rule_id}')
def delete_rule(rule_id: int, db: Session = Depends(database.get_db)):
    rule = db.query(models.Rule).filter(models.Rule.id == rule_id).first()
    if rule:
        db.delete(rule)
        db.commit()
    return {'status': 'deleted'}

# --- Test Webhook ---
@app.post('/webhooks/{webhook_id}/test')
async def test_webhook(webhook_id: int, db: Session = Depends(database.get_db)):
    wh = db.query(models.Webhook).filter(models.Webhook.id == webhook_id).first()
    if not wh:
        return {'status': 'not_found'}
    await webhook.send_discord_ping(wh.url, {
        'sender': 'test@mailalert.app',
        'subject': f'Test du Webhook "{wh.name}" 🚀',
        'snippet': 'Félicitations ! Votre webhook Discord fonctionne parfaitement avec MailAlert.'
    })
    return {'status': 'sent'}

# --- Serve React Frontend Static Files (Production Docker) ---
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Exclure les routes API des fallbacks
        if full_path.startswith("api/") or full_path.startswith("auth/") or full_path.startswith("users/") or full_path.startswith("webhooks/") or full_path.startswith("groups/") or full_path.startswith("rules/"):
            return None
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
