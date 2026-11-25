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
