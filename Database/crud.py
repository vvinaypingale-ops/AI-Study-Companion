from sqlalchemy.orm import Session
import models


# 🔹 Add message
def add_message(db: Session, chat_id, sender, text):
    msg = models.Message(chat_id=chat_id, sender=sender, text=text)
    db.add(msg)
    db.commit()


# 🔹 Get weak topics
def get_weak_topics(db: Session, user_id):
    weak = db.query(models.WeakArea)\
        .filter(models.WeakArea.user_id == user_id)\
        .order_by(models.WeakArea.mistake_count.desc())\
        .all()

    return [w.topic for w in weak]


# 🔹 Update weak areas
def update_weak_area(db: Session, user_id, topic):
    weak = db.query(models.WeakArea)\
        .filter_by(user_id=user_id, topic=topic).first()

    if weak:
        weak.mistake_count += 1
    else:
        weak = models.WeakArea(user_id=user_id, topic=topic)
        db.add(weak)

    db.commit()