from types import SimpleNamespace

from fastapi.testclient import TestClient

from main import app
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.domain import Wallet, Category, Transaction


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def filter(self, *args):
        return self

    def order_by(self, *args):
        return self

    def all(self):
        return self.rows

    def first(self):
        return self.rows[0] if self.rows else None


class FakeDb:
    def __init__(self):
        self.wallets = [SimpleNamespace(id=11, user_id=1, name="Ví chính", is_archived=False, balance=500000)]
        self.categories = [SimpleNamespace(id=3, name="Ăn uống", is_hidden=False)]
        self.transactions = []
        self.saved = []

    def query(self, model):
        if model is Wallet:
            return FakeQuery(self.wallets)
        if model is Category:
            return FakeQuery(self.categories)
        if model is Transaction:
            return FakeQuery(self.transactions)
        raise AssertionError(model)

    def add(self, row):
        self.saved.append(row)
        row.id = len(self.saved)

    def commit(self):
        pass

    def refresh(self, row):
        pass


def test_parse_needs_token():
    app.dependency_overrides.clear()
    response = TestClient(app).post('/api/v1/nlp/parse', json={'text': 'ăn phở 45k'})
    assert response.status_code == 401


def test_parse_is_draft_only_and_owned_wallet():
    db = FakeDb()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
    try:
        client = TestClient(app)
        assert client.post('/api/v1/nlp/parse', json={'text': '   '}).status_code == 422
        before = len(db.transactions)
        response = client.post('/api/v1/nlp/parse', json={'text': 'Hôm qua ăn phở 45k, cafe 25k'})
        assert response.status_code == 200, response.text
        drafts = response.json()['drafts']
        assert len(drafts) == 2
        assert [d['amount'] for d in drafts] == [45000, 25000]
        assert all(d['wallet_id'] == 11 for d in drafts)
        assert len(db.transactions) == before
        assert client.get('/api/v1/nlp/options').json()['wallets'][0]['id'] == 11
    finally:
        app.dependency_overrides.clear()


def test_feedback_cannot_use_another_users_transaction():
    db = FakeDb()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
    try:
        response = TestClient(app).post('/api/v1/nlp/feedback', json={
            'transaction_id': 999, 'raw_text': 'ăn phở 45k',
            'predicted_category_id': 4, 'corrected_category_id': 3,
        })
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_feedback_saved_for_authenticated_user_only():
    db = FakeDb()
    db.transactions = [SimpleNamespace(id=7, user_id=1, category_id=3, source='nlp',
                                       raw_text='ăn phở 45k', delete_at=None)]
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=1)
    try:
        response = TestClient(app).post('/api/v1/nlp/feedback', json={
            'transaction_id': 7, 'raw_text': 'ăn phở 45k',
            'predicted_category_id': 4, 'corrected_category_id': 3,
        })
        assert response.status_code == 201, response.text
        assert db.saved[0].user_id == 1
        assert db.saved[0].corrected_json == {'category_id': 3}
    finally:
        app.dependency_overrides.clear()
