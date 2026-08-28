from pydantic import BaseModel
from typing import List, Optional
import datetime

class RuleBase(BaseModel):
    rule_type: str
    value: str

class RuleCreate(RuleBase):
    pass

class Rule(RuleBase):
    id: int
    rule_group_id: int

    class Config:
        from_attributes = True

class RuleGroupBase(BaseModel):
    name: Optional[str] = "Groupe de règles"
    notify_ping: Optional[bool] = False

class RuleGroupCreate(RuleGroupBase):
    pass

class RuleGroupUpdate(BaseModel):
    notify_ping: Optional[bool] = None
    name: Optional[str] = None

class RuleGroup(RuleGroupBase):
    id: int
    webhook_id: int
    notify_ping: bool = False
    rules: List[Rule] = []

    class Config:
        from_attributes = True

class WebhookBase(BaseModel):
    name: str
    url: str

class WebhookCreate(WebhookBase):
    pass

class Webhook(WebhookBase):
    id: int
    user_id: int
    rule_groups: List[RuleGroup] = []

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: str
    discord_user_id: Optional[str] = None

class UserCreate(UserBase):
    google_id: str
    refresh_token: Optional[str] = None

class UserUpdate(BaseModel):
    discord_user_id: Optional[str] = None

class User(UserBase):
    id: int
    watch_expiration: Optional[datetime.datetime] = None
    webhooks: List[Webhook] = []

    class Config:
        from_attributes = True
