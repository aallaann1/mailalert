from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    google_id = Column(String, unique=True, index=True)
    refresh_token = Column(String, nullable=True)
    discord_user_id = Column(String, nullable=True)
    watch_expiration = Column(DateTime, nullable=True)
    history_id = Column(String, nullable=True)
    
    webhooks = relationship("Webhook", back_populates="owner", cascade="all, delete-orphan")

class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="Webhook Discord")
    url = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="webhooks")
    rule_groups = relationship("RuleGroup", back_populates="webhook", cascade="all, delete-orphan")

class RuleGroup(Base):
    __tablename__ = "rule_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="Groupe de règles")
    notify_ping = Column(Boolean, default=False)
    webhook_id = Column(Integer, ForeignKey("webhooks.id"))

    webhook = relationship("Webhook", back_populates="rule_groups")
    rules = relationship("Rule", back_populates="group", cascade="all, delete-orphan")

class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    rule_type = Column(String, index=True) # sender, subject, body
    value = Column(String, nullable=False)
    rule_group_id = Column(Integer, ForeignKey("rule_groups.id"))

    group = relationship("RuleGroup", back_populates="rules")
