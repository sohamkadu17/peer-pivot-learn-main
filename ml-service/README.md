# Custom ML Service for Toxicity Detection

## Setup and Deployment

### Local Development

1. **Install dependencies**:
```powershell
cd ml-service
pip install -r requirements.txt
```

2. **Run the service**:
```powershell
python app.py
```

The service will start on `http://localhost:5000`

### Docker Deployment

1. **Build the Docker image**:
```powershell
cd ml-service
docker build -t toxicity-ml-service .
```

2. **Run the container**:
```powershell
docker run -p 5000:5000 -e MODEL_NAME=unitary/toxic-bert toxicity-ml-service
```

### Cloud Deployment Options

#### Option 1: Heroku
```bash
heroku create your-toxicity-service
heroku container:push web
heroku container:release web
```

#### Option 2: Google Cloud Run
```bash
gcloud run deploy toxicity-service \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### Option 3: AWS Lambda (with Docker)
Use AWS Lambda with container image support.

## Available Models

### Pre-trained Transformer Models (Best Accuracy)
- `unitary/toxic-bert` (default) - Most robust
- `martin-ha/toxic-comment-model` - Lighter alternative
- `facebook/roberta-hate-speech-dynabench-r4-target` - Hate speech focused

Change model by setting `MODEL_NAME` environment variable.

### Custom Trained Model (Fastest, Lightweight)

Train your own model using `train_model.py`:

1. **Get training data**:
   - Download from [Kaggle Toxic Comments](https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge)
   - Or create your own labeled dataset (CSV with `text` and `is_toxic` columns)

2. **Train**:
```powershell
python train_model.py path/to/toxic_comments.csv
```

3. **Update app.py** to use the trained model:
```python
# Replace the pipeline loading with:
import pickle

with open('toxicity_model.pkl', 'rb') as f:
    model = pickle.load(f)
with open('toxicity_vectorizer.pkl', 'rb') as f:
    vectorizer = pickle.load(f)
```

## API Endpoints

### Health Check
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "model": "unitary/toxic-bert",
  "gpu_available": false
}
```

### Single Prediction
```bash
POST /predict
Content-Type: application/json

{
  "text": "Your comment here",
  "threshold": 0.7
}
```

Response:
```json
{
  "isToxic": true,
  "score": 0.85,
  "categories": ["profanity", "insult"],
  "all_scores": {"toxic": 0.85, "severe_toxic": 0.12, ...},
  "suggestion": "Your comment appears to be non-constructive..."
}
```

### Batch Prediction
```bash
POST /batch-predict
Content-Type: application/json

{
  "texts": ["comment 1", "comment 2"],
  "threshold": 0.7
}
```

## Connect to Supabase Function

Add environment variable to your Supabase project:
```
CUSTOM_ML_SERVICE_URL=https://your-ml-service.herokuapp.com
```

The toxicity-filter function will automatically use it!

## Performance

- **Transformer models**: ~200-500ms per prediction (accurate)
- **Custom sklearn model**: ~10-50ms per prediction (fast)
- **GPU acceleration**: 5-10x faster (if available)

## Model Comparison

| Model | Accuracy | Speed | Size | Best For |
|-------|----------|-------|------|----------|
| toxic-bert | 95%+ | Slow | 400MB | Production |
| Custom sklearn | 85-90% | Fast | 10MB | High traffic |
| Rule-based | 70-80% | Instant | <1KB | Fallback |

## Advanced: Fine-tuning

To fine-tune on your own data:

```python
from transformers import AutoModelForSequenceClassification, Trainer, TrainingArguments

# Load pre-trained model
model = AutoModelForSequenceClassification.from_pretrained('unitary/toxic-bert')

# Prepare your dataset
# ... (see Hugging Face documentation)

# Fine-tune
trainer = Trainer(
    model=model,
    args=TrainingArguments(output_dir='./results'),
    train_dataset=train_dataset,
    eval_dataset=eval_dataset
)
trainer.train()
```

## Monitoring

Add logging and metrics:
- Track prediction latency
- Monitor false positives/negatives
- A/B test different models
- Collect user feedback on flagged content
