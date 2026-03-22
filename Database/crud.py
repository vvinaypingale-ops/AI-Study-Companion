from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import models
def add_message(db: Session, chat_id: int, role: str, text: str):
    try:
        msg = models.Message(
            chat_id=chat_id,
            role=role,
            text=text
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg
    except SQLAlchemyError:
        db.rollback()
        return None
def get_chat_messages(db: Session, chat_id: int):
    return db.query(models.Message)\
        .filter(models.Message.chat_id == chat_id)\
        .order_by(models.Message.timestamp.asc())\
        .all()
def get_weak_topics(db: Session, user_id: int):
    weak = db.query(models.WeakArea)\
        .filter(models.WeakArea.user_id == user_id)\
        .order_by(models.WeakArea.mistake_count.desc())\
        .all()

    return [w.topic for w in weak]
def update_weak_area(db: Session, user_id: int, topic: str):
    try:
        weak = db.query(models.WeakArea)\
            .filter_by(user_id=user_id, topic=topic)\
            .first()

        if weak:
            weak.mistake_count += 1

    
            if weak.mistake_count >= 5:
                weak.mastery_level = "weak"
            elif weak.mistake_count >= 3:
                weak.mastery_level = "medium"
            else:
                weak.mastery_level = "strong"

        else:
            weak = models.WeakArea(
                user_id=user_id,
                topic=topic,
                mistake_count=1,
                mastery_level="weak"
            )
            db.add(weak)

        db.commit()
        db.refresh(weak)
        return weak

    except SQLAlchemyError:
        db.rollback()
        return None
def add_quiz_result(db: Session, user_id: int, topic: str, score: int, total: int):
    try:
        result = models.QuizResult(
            user_id=user_id,
            topic=topic,
            score=score,
            total=total
        )
        db.add(result)
        db.commit()
        db.refresh(result)
        return result
    except SQLAlchemyError:
        db.rollback()
        return None
def get_quiz_history(db: Session, user_id: int):
    return db.query(models.QuizResult)\
        .filter(models.QuizResult.user_id == user_id)\
        .order_by(models.QuizResult.timestamp.desc())\
        .all()
def create_chat(db: Session, user_id: int, title: str = "New Chat"):
    try:
        chat = models.Chat(user_id=user_id, title=title)
        db.add(chat)
        db.commit()
        db.refresh(chat)
        return chat
    except SQLAlchemyError:
        db.rollback()
        return None
def get_user_chats(db: Session, user_id: int):
    return db.query(models.Chat)\
        .filter(models.Chat.user_id == user_id)\
        .order_by(models.Chat.created_at.desc())\
        .all()
