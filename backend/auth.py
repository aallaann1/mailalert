import os
import urllib.parse
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from . import models, schemas, database, gmail_service
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

SCOPES = "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly"

@router.get("/login")
def login():
    params = {
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "redirect_uri": f"{os.getenv('BACKEND_URL')}/auth/callback",
        "response_type": "code",
        "scope": SCOPES,
        "access_type": "offline",
        "prompt": "consent"
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return RedirectResponse(url)

@router.get("/callback")
async def callback(code: str, db: Session = Depends(database.get_db)):
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "redirect_uri": f"{os.getenv('BACKEND_URL')}/auth/callback",
        "grant_type": "authorization_code"
    }
    
    async with httpx.AsyncClient() as client:
        token_res = await client.post(token_url, data=token_data)
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Échec de l'échange de token: {token_res.text}")
        
        tokens = token_res.json()
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")

        userinfo_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if userinfo_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Impossible de récupérer les informations de l'utilisateur.")
        
        user_info = userinfo_res.json()
        email = user_info.get("email")
        google_id = user_info.get("id")

    if not email:
        raise HTTPException(status_code=400, detail="Adresse e-mail introuvable.")

    db_user = db.query(models.User).filter(models.User.email == email).first()
    
    if not db_user:
        db_user = models.User(
            email=email, 
            google_id=google_id, 
            refresh_token=refresh_token
        )
        db.add(db_user)
    else:
        db_user.google_id = google_id
        if refresh_token:
            db_user.refresh_token = refresh_token
    
    db.commit()
    db.refresh(db_user)

    # Lancer le watch Gmail (Pub/Sub)
    creds = Credentials(
        token=access_token,
        refresh_token=db_user.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    )
    try:
        gmail_service.setup_watch(db_user, creds, db)
    except Exception as e:
        print(f"Erreur watch Gmail: {str(e)}")

    # Redirection vers le frontend avec l'ID de l'utilisateur
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(f"{frontend_url}/?user_id={db_user.id}")
