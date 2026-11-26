import numpy as np

from app.ai.classifier.knn import rank
from app.ai.classifier import service as classifier_service


def test_knn_ranks_by_cosine_without_treating_score_as_probability():
    matrix = np.array([[1.0, 0.0], [0.8, 0.6], [0.0, 1.0]])
    labels = [1, 1, 2]
    ranked = rank(np.array([1.0, 0.0]), matrix, labels, k=3)
    assert ranked[0][0] == 1
    assert ranked[0][1] == 1.0


def test_knn_empty_examples():
    assert rank(np.array([1.0, 0.0]), np.empty((0, 2)), []) == []


def test_feedback_override_is_private_to_user(monkeypatch):
    class Category:
        def __init__(self, id, name):
            self.id, self.name = id, name

    class Query:
        def filter(self, *args):
            return self
        def all(self):
            return [Category(1, 'Ăn uống'), Category(2, 'Di chuyển')]

    class Database:
        def query(self, model):
            return Query()

    classifier = classifier_service.CategoryClassifier()
    monkeypatch.setattr(classifier, 'available', lambda: True)
    monkeypatch.setattr(classifier, '_base_examples', lambda: ([{'category_name': 'Ăn uống'}], np.array([[1.0, 0.0]])))
    monkeypatch.setattr(classifier, '_feedback_examples', lambda db, user_id:
                        ([('ăn phở', 2)], np.array([[1.0, 0.0]])) if user_id == 1 else ([], np.empty((0, 2))))
    monkeypatch.setattr(classifier_service, 'encode', lambda texts: np.array([[1.0, 0.0]]))
    monkeypatch.setattr(classifier_service, 'prepare_note', lambda text: text)
    monkeypatch.setattr(classifier_service, 'EXAMPLES', type('Path', (), {'exists': lambda self: True})())
    assert classifier.predict('ăn phở', Database(), 1)['category_id'] == 2
    assert classifier.predict('ăn phở', Database(), 2)['category_id'] == 1


def test_predict_filters_categories_by_txn_type_and_infers_type(monkeypatch):
    class Category:
        def __init__(self, id, name):
            self.id, self.name = id, name

    class Query:
        def filter(self, *args):
            return self
        def all(self):
            return [Category(1, 'Ăn uống'), Category(2, 'Lương'), Category(3, 'Hoàn tiền'), Category(4, 'Tiết kiệm')]

    class Database:
        def query(self, model):
            return Query()

    classifier = classifier_service.CategoryClassifier()
    monkeypatch.setattr(classifier, 'available', lambda: True)
    monkeypatch.setattr(
        classifier,
        '_base_examples',
        lambda: (
            [
                {'category_name': 'Ăn uống'},
                {'category_name': 'Lương'},
                {'category_name': 'Thu nhập khác'},
                {'category_name': 'Tiết kiệm'},
            ],
            np.array([[1.0, 0.0], [0.99, 0.0], [0.95, 0.0], [0.99, 0.0]]),
        ),
    )
    monkeypatch.setattr(classifier, '_feedback_examples', lambda db, user_id: ([], np.empty((0, 2))))
    monkeypatch.setattr(classifier_service, 'encode', lambda texts: np.array([[1.0, 0.0]]))
    monkeypatch.setattr(classifier_service, 'prepare_note', lambda text: text)
    monkeypatch.setattr(classifier_service, 'EXAMPLES', type('Path', (), {'exists': lambda self: True})())

    expense_pred = classifier.predict('nhận tiền', Database(), 1, txn_type='expense')
    assert expense_pred['category_id'] == 1
    assert expense_pred['inferred_type'] == 'expense'

    income_pred = classifier.predict('nhận tiền', Database(), 1, txn_type='income')
    assert income_pred['category_id'] == 2
    assert income_pred['inferred_type'] == 'income'
    income_names = [s['category_name'] for s in income_pred['suggestions']]
    assert 'Hoàn tiền' in income_names
    assert 'Ăn uống' not in income_names
    assert 'Tiết kiệm' not in income_names

    # When txn_type is None (e.g., short verb-less note), both expense and income are allowed (excluding Tiết kiệm).
    any_pred = classifier.predict('nhận tiền', Database(), 1, txn_type=None)
    assert any_pred['inferred_type'] == 'expense'
    assert 'Tiết kiệm' not in [s['category_name'] for s in any_pred['suggestions']]
