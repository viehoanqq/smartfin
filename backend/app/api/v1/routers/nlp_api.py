"""Authenticated NLP draft and feedback endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.ai.nlp_parser.parser import parse_transactions
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.domain import Category, NLPFeedback, Transaction, Wallet
from app.schemas.nlp import FeedbackRequest, ParseRequest, ParseResponse
from app.ai.classifier.service import get_classifier
from app.ai.classifier.ner import extract_entities

router = APIRouter(prefix="/nlp", tags=["NLP"])


@router.post("/parse", response_model=ParseResponse)
def parse_text(body: ParseRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.text.strip():
        raise HTTPException(status_code=422, detail="Câu nhập không được rỗng")
    wallets = db.query(Wallet).filter(Wallet.user_id == user.id, Wallet.is_archived.is_(False)).all()
    owned_wallets = [{"id": w.id, "name": w.name} for w in wallets]
    result = parse_transactions(body.text, owned_wallets)
    classifier = get_classifier()
    for draft in result["drafts"]:
        note = draft["note"]
        if note and draft["type"] == "expense":
            suggestion = classifier.predict(note, db=db, user_id=user.id)
            if suggestion:
                draft["suggestions"] = suggestion["suggestions"]
                draft["confidence"] = suggestion["score"]
                draft["category_id"] = suggestion["category_id"]
                if draft["category_id"]:
                    draft["warnings"] = [w for w in draft["warnings"] if w != "Chọn danh mục"]
        entities = extract_entities(draft["raw_text"])
        draft.update(entities)
    return result


@router.get("/options")
def get_options(user=Depends(get_current_user), db: Session = Depends(get_db)):
    wallets = db.query(Wallet).filter(Wallet.user_id == user.id, Wallet.is_archived.is_(False)).all()
    categories = db.query(Category).filter(Category.is_hidden.is_(False)).order_by(Category.name).all()
    return {
        "wallets": [{"id": w.id, "name": w.name, "balance": w.balance} for w in wallets],
        "categories": [{"id": c.id, "name": c.name} for c in categories],
    }


@router.post("/feedback", status_code=201)
def save_feedback(body: FeedbackRequest, user=Depends(get_current_user), db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.id == body.transaction_id, Transaction.user_id == user.id,
                                       Transaction.delete_at.is_(None)).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch của bạn")
    if txn.category_id != body.corrected_category_id:
        raise HTTPException(status_code=422, detail="Danh mục sửa phải khớp giao dịch đã lưu")
    if txn.source != "nlp" or txn.raw_text != body.raw_text:
        raise HTTPException(status_code=422, detail="Phản hồi không khớp giao dịch NLP đã lưu")
    if not db.query(Category).filter(Category.id == body.corrected_category_id, Category.is_hidden.is_(False)).first():
        raise HTTPException(status_code=422, detail="Danh mục không hợp lệ")
    feedback = NLPFeedback(user_id=user.id, transaction_id=txn.id, raw_text=body.raw_text,
                           predicted_json={"category_id": body.predicted_category_id},
                           corrected_json={"category_id": body.corrected_category_id})
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    get_classifier().invalidate_user(user.id)
    return {"id": feedback.id, "saved": True}
