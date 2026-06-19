## Software & Systems — subtype emphasis

Beyond the base engineering rubric, hold a software/ML plan to these specifics:

- **Problem framing:** Is the task precisely defined with **measurable success
  metrics** (accuracy, F1, latency, throughput) and a baseline to beat?
- **Data & ground truth:** Where does the data come from? Is it sufficient,
  representative, and split (train/val/test) to avoid leakage? Labeling quality?
- **Approach & alternatives:** Are competing algorithms/architectures considered
  rather than one chosen blindly? Is the choice justified for the constraints?
- **Evaluation:** Is there a rigorous, **reproducible** evaluation plan with
  appropriate test sets, ablations, and error analysis — not just a demo?
- **Engineering:** Reproducibility (seeds, environment), compute budget, and
  honest treatment of limitations (overfitting, bias, generalization).
