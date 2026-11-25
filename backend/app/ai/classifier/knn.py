"""Small in-memory cosine k-NN; scores are similarities, not probabilities."""
from collections import defaultdict
import numpy as np


def rank(query_vector, example_vectors, labels, k: int = 3):
    if len(labels) == 0:
        return []
    scores = np.asarray(example_vectors) @ np.asarray(query_vector)
    top = np.argsort(scores)[::-1][:min(k, len(labels))]
    grouped = defaultdict(list)
    for idx in top:
        grouped[labels[int(idx)]].append(float(scores[idx]))
    return sorted(((label, max(values), sum(values) / len(values)) for label, values in grouped.items()),
                  key=lambda item: (item[2], item[1]), reverse=True)
