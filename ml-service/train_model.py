"""
Train a custom toxicity classifier using scikit-learn
Uses TF-IDF + Logistic Regression for lightweight deployment
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
import pickle
import re

# Example: Load your labeled dataset
# Format: CSV with columns ['text', 'is_toxic'] where is_toxic is 0/1
# You can use datasets like:
# - Kaggle Toxic Comment Classification Challenge
# - Wikipedia Toxic Comments dataset
# - Your own labeled data

def preprocess_text(text):
    """Clean and preprocess text"""
    # Convert to lowercase
    text = text.lower()
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    # Remove special characters but keep basic punctuation
    text = re.sub(r'[^a-zA-Z0-9\s!?.,:;]', '', text)
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text

def train_toxicity_model(data_path='toxic_comments.csv'):
    """
    Train a toxicity classification model
    
    Args:
        data_path: Path to CSV with 'text' and 'is_toxic' columns
    """
    print("Loading dataset...")
    df = pd.read_csv(data_path)
    
    # Preprocess
    print("Preprocessing text...")
    df['text_clean'] = df['text'].apply(preprocess_text)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        df['text_clean'], 
        df['is_toxic'],
        test_size=0.2,
        random_state=42,
        stratify=df['is_toxic']
    )
    
    print(f"Training samples: {len(X_train)}")
    print(f"Test samples: {len(X_test)}")
    print(f"Toxic ratio: {y_train.mean():.2%}")
    
    # Vectorize text
    print("Creating TF-IDF features...")
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),  # Unigrams and bigrams
        min_df=5,
        max_df=0.8,
        strip_accents='unicode',
        analyzer='word',
        token_pattern=r'\w{1,}',
        use_idf=True,
        smooth_idf=True,
        sublinear_tf=True
    )
    
    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)
    
    # Train classifier
    print("Training Logistic Regression model...")
    model = LogisticRegression(
        C=4.0,
        class_weight='balanced',  # Handle imbalanced data
        solver='saga',
        max_iter=1000,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train_tfidf, y_train)
    
    # Evaluate
    print("\n=== Model Evaluation ===")
    train_score = model.score(X_train_tfidf, y_train)
    test_score = model.score(X_test_tfidf, y_test)
    
    print(f"Training accuracy: {train_score:.4f}")
    print(f"Test accuracy: {test_score:.4f}")
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_train_tfidf, y_train, cv=5, scoring='f1')
    print(f"Cross-validation F1 score: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
    
    # Predictions
    y_pred = model.predict(X_test_tfidf)
    
    print("\n=== Classification Report ===")
    print(classification_report(y_test, y_pred, target_names=['Not Toxic', 'Toxic']))
    
    print("\n=== Confusion Matrix ===")
    print(confusion_matrix(y_test, y_pred))
    
    # Feature importance
    print("\n=== Top Toxic Features ===")
    feature_names = vectorizer.get_feature_names_out()
    coef = model.coef_[0]
    top_toxic_idx = np.argsort(coef)[-20:]
    print("Most toxic words/phrases:")
    for idx in reversed(top_toxic_idx):
        print(f"  {feature_names[idx]}: {coef[idx]:.3f}")
    
    # Save model
    print("\nSaving model...")
    with open('toxicity_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    
    with open('toxicity_vectorizer.pkl', 'wb') as f:
        pickle.dump(vectorizer, f)
    
    print("✅ Model saved successfully!")
    
    return model, vectorizer

def predict_toxicity(text, model_path='toxicity_model.pkl', vectorizer_path='toxicity_vectorizer.pkl'):
    """
    Predict toxicity of new text
    """
    # Load model
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    
    with open(vectorizer_path, 'rb') as f:
        vectorizer = pickle.load(f)
    
    # Preprocess
    text_clean = preprocess_text(text)
    
    # Vectorize
    text_tfidf = vectorizer.transform([text_clean])
    
    # Predict
    prediction = model.predict(text_tfidf)[0]
    probability = model.predict_proba(text_tfidf)[0]
    
    return {
        'is_toxic': bool(prediction),
        'toxic_probability': float(probability[1]),
        'clean_probability': float(probability[0])
    }

if __name__ == '__main__':
    # Example usage:
    # 1. Download dataset from Kaggle: https://www.kaggle.com/c/jigsaw-toxic-comment-classification-challenge
    # 2. Prepare CSV with 'text' and 'is_toxic' columns
    # 3. Train model
    
    import sys
    
    if len(sys.argv) > 1:
        data_path = sys.argv[1]
        print(f"Training model with data from: {data_path}")
        train_toxicity_model(data_path)
    else:
        print("Usage: python train_model.py <path_to_training_data.csv>")
        print("\nExample data format (CSV):")
        print("text,is_toxic")
        print("\"Great explanation, thanks!\",0")
        print("\"You're an idiot\",1")
