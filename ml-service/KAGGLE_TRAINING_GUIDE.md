# YouTube Toxicity Classifier - Quick Start Guide

## 🚀 Setup and Training

### Prerequisites
```bash
# Install required packages
pip install -r requirements.txt

# Authenticate with Kaggle (if not already done)
# Get your API credentials from https://www.kaggle.com/settings
# Place kaggle.json in ~/.kaggle/ (Linux/Mac) or C:\Users\<username>\.kaggle\ (Windows)
```

### Step 1: Train the Model
```bash
cd ml-service
python train_with_kaggle_dataset.py
```

This will:
1. ✅ Download YouTube toxicity dataset from Kaggle
2. ✅ Preprocess and clean the data
3. ✅ Train Logistic Regression model with TF-IDF
4. ✅ Evaluate model performance
5. ✅ Generate confusion matrix
6. ✅ Save all results and visualizations

### Step 2: Check Results

After training completes, you'll find:

**Model Files:**
- `toxicity_model.pkl` - Trained model
- `toxicity_vectorizer.pkl` - TF-IDF vectorizer

**Visualizations:**
- `confusion_matrix.png` - Confusion matrix heatmap

**Evaluation Results (in `evaluation_results/` folder):**
- `metrics_table.csv` - All performance metrics
- `confusion_matrix_table.csv` - Detailed CM breakdown
- `metrics.json` - Machine-readable metrics
- `top_toxic_features.csv` - Most toxic words/phrases
- `top_safe_features.csv` - Most non-toxic words/phrases

## 📊 Expected Results

### Performance Metrics
```
Accuracy:    85-92%
Precision:   80-88%
Recall:      82-90%
F1 Score:    81-89%
ROC-AUC:     90-96%
```

### Confusion Matrix Example
```
                    Predicted
                Not Toxic    Toxic
Actual  Not Toxic    1,850      150
        Toxic          120      880
```

## 🔍 Understanding the Output

### Confusion Matrix Breakdown
- **True Negatives (TN)**: Non-toxic comments correctly identified
- **False Positives (FP)**: Non-toxic flagged as toxic (Type I Error)
- **False Negatives (FN)**: Toxic comments missed (Type II Error)
- **True Positives (TP)**: Toxic comments correctly caught

### Key Metrics Explained
- **Accuracy**: Overall correctness (correct predictions / total predictions)
- **Precision**: How many flagged comments are actually toxic (TP / (TP + FP))
- **Recall**: How many toxic comments we catch (TP / (TP + FN))
- **F1 Score**: Balance between precision and recall (2 × P × R / (P + R))
- **ROC-AUC**: Model's discrimination ability (0.5 = random, 1.0 = perfect)

## 🎯 Using the Trained Model

```python
import pickle

# Load model
with open('toxicity_model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('toxicity_vectorizer.pkl', 'rb') as f:
    vectorizer = pickle.load(f)

# Predict
text = "Great video, thanks for sharing!"
text_tfidf = vectorizer.transform([text])
prediction = model.predict(text_tfidf)[0]
probability = model.predict_proba(text_tfidf)[0]

print(f"Is toxic: {bool(prediction)}")
print(f"Toxic probability: {probability[1]:.2%}")
```

## 📈 Visualizations

### 1. Confusion Matrix
Shows the distribution of predictions:
- **Diagonal** (TN, TP): Correct predictions
- **Off-diagonal** (FP, FN): Errors

### 2. Metrics Table
Comprehensive list of all performance metrics with values and percentages.

### 3. Feature Importance
- **Top Toxic Features**: Words/phrases most associated with toxicity
- **Top Safe Features**: Words/phrases most associated with non-toxic content

## 🛠️ Troubleshooting

### Issue: Kaggle API not authenticated
**Solution:**
1. Go to https://www.kaggle.com/settings
2. Click "Create New Token"
3. Download `kaggle.json`
4. Place in `~/.kaggle/` (Linux/Mac) or `C:\Users\<username>\.kaggle\` (Windows)
5. Set permissions: `chmod 600 ~/.kaggle/kaggle.json` (Linux/Mac)

### Issue: Out of memory during training
**Solution:**
- Reduce `max_features` in TF-IDF (line 177: change from 5000 to 3000)
- Use smaller training sample: Add `data = data.sample(n=10000)` before training

### Issue: Dataset columns not detected
**Solution:**
The script will auto-detect columns, but you can manually specify:
```python
# In prepare_data() function, add:
text_col = 'your_text_column_name'
label_col = 'your_label_column_name'
```

## 📝 Customization

### Adjust Model Parameters
Edit `train_with_kaggle_dataset.py`, line 188-196:
```python
model = LogisticRegression(
    C=4.0,              # Regularization (higher = less regularization)
    class_weight='balanced',  # Handle imbalanced data
    solver='saga',      # Optimization algorithm
    max_iter=1000,      # Maximum iterations
    random_state=42,    # Reproducibility
    n_jobs=-1          # Use all CPU cores
)
```

### Adjust TF-IDF Parameters
Edit `train_with_kaggle_dataset.py`, line 168-177:
```python
vectorizer = TfidfVectorizer(
    max_features=5000,   # Max vocabulary size
    ngram_range=(1, 2),  # Use 1-grams and 2-grams
    min_df=5,            # Minimum document frequency
    max_df=0.8           # Maximum document frequency
)
```

## 📊 For Your Report

The generated files are perfect for your project report:

1. **Confusion Matrix Image** (`confusion_matrix.png`)
   - High-resolution (300 DPI)
   - Annotated with counts and percentages
   - Ready for direct inclusion

2. **Metrics Tables** (CSV files)
   - Easy to import into Word/Excel
   - Formatted and ready to use
   - Includes descriptions

3. **JSON Metrics** (`metrics.json`)
   - Machine-readable format
   - Timestamped
   - Complete metadata

## 🎓 Academic Citation

If using this in your report:
```
Dataset: YouTube Toxicity Data
Source: Kaggle - reihanenamdari/youtube-toxicity-data
Model: Logistic Regression with TF-IDF vectorization
Framework: scikit-learn 1.3.0
```

## 🔄 Retraining

To retrain with updated data:
```bash
# Simply run again - it will download latest dataset
python train_with_kaggle_dataset.py
```

## ✅ Checklist

Before submitting your report, ensure you have:
- [ ] Confusion matrix image saved
- [ ] Metrics table CSV exported
- [ ] All performance metrics documented
- [ ] Model accuracy > 85%
- [ ] Understanding of TN, FP, FN, TP
- [ ] Feature importance analysis included
- [ ] Results interpretation written

---

**Need help?** Check the console output for detailed logs and error messages.
