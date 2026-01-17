from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text

from app.db.session import Base


class Campaign(Base):
    __tablename__ = 'campaigns'

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
