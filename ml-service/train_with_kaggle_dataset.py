"""
Complete pipeline: Download YouTube Toxicity Dataset, Train Model, and Generate Evaluation
Uses Kaggle dataset: youtube-toxicity-data
"""

import pandas as pd
import numpy as np
import kagglehub
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    precision_score, recall_score, f1_score, roc_auc_score
)
import matplotlib.pyplot as plt
import seaborn as sns
import pickle
import re
import json
from datetime import datetime

# Set style for plots
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (10, 8)

def preprocess_text(text):
    """Clean and preprocess text"""
    if pd.isna(text):
        return ""
    
    text = str(text)
    # Convert to lowercase
    text = text.lower()
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    # Remove special characters but keep basic punctuation
    text = re.sub(r'[^a-zA-Z0-9\s!?.,:;]', '', text)
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text

def download_and_load_dataset():
    """Download dataset from Kaggle and load it"""
    print("=" * 60)
    print("STEP 1: DOWNLOADING YOUTUBE TOXICITY DATASET")
    print("=" * 60)
    
    try:
        # Download latest version
        path = kagglehub.dataset_download("reihanenamdari/youtube-toxicity-data")
        print(f"✅ Dataset downloaded to: {path}")
        
        # Find CSV files in the downloaded path
        csv_files = []
        for root, dirs, files in os.walk(path):
            for file in files:
                if file.endswith('.csv'):
                    csv_files.append(os.path.join(root, file))
        
        print(f"\n📁 Found {len(csv_files)} CSV file(s):")
        for f in csv_files:
            print(f"   - {f}")
        
        # Load the dataset (assuming first CSV is the main one)
        if csv_files:
            df = pd.read_csv(csv_files[0])
            print(f"\n✅ Loaded dataset: {csv_files[0]}")
            print(f"   Shape: {df.shape}")
            print(f"   Columns: {df.columns.tolist()}")
            return df, path
        else:
            raise FileNotFoundError("No CSV files found in downloaded dataset")
            
    except Exception as e:
        print(f"❌ Error downloading dataset: {e}")
        raise

def prepare_data(df):
    """Prepare and clean the dataset"""
    print("\n" + "=" * 60)
    print("STEP 2: DATA PREPARATION AND PREPROCESSING")
    print("=" * 60)
    
    # Inspect the dataset
    print("\n📊 Dataset Info:")
    print(f"   Total rows: {len(df):,}")
    print(f"   Columns: {df.columns.tolist()}")
    print("\n   First few rows:")
    print(df.head())
    
    # Identify text and label columns
    # Common column names for toxicity datasets
    text_cols = ['text', 'comment', 'content', 'message', 'comment_text']
    label_cols = ['toxic', 'is_toxic', 'toxicity', 'label', 'class']
    
    text_col = None
    label_col = None
    
    for col in df.columns:
        col_lower = col.lower()
        # Exclude ID columns
        if 'id' in col_lower:
            continue
        if col_lower in text_cols or 'text' in col_lower or 'comment' in col_lower:
            text_col = col
            break
    
    for col in df.columns:
        col_lower = col.lower()
        if col_lower in label_cols or 'toxic' in col_lower or 'label' in col_lower:
            label_col = col
            break
    
    if text_col is None or label_col is None:
        print("\n⚠️  Auto-detection failed. Available columns:")
        print(df.columns.tolist())
        print("\n   Sample data:")
        print(df.head())
        
        # Use first column as text and second as label by default
        text_col = df.columns[0]
        label_col = df.columns[1]
        print(f"\n   Using: text_col='{text_col}', label_col='{label_col}'")
    
    print(f"\n✅ Identified columns:")
    print(f"   Text column: {text_col}")
    print(f"   Label column: {label_col}")
    
    # Create clean dataframe
    data = pd.DataFrame({
        'text': df[text_col],
        'is_toxic': df[label_col]
    })
    
    # Handle missing values
    data = data.dropna(subset=['text', 'is_toxic'])
    
    # Convert labels to binary (0/1)
    if data['is_toxic'].dtype == 'object':
        # Try common toxic label formats
        toxic_values = ['toxic', 'yes', 'true', '1', 'positive', 'bad']
        data['is_toxic'] = data['is_toxic'].str.lower().isin(toxic_values).astype(int)
    else:
        data['is_toxic'] = data['is_toxic'].astype(int)
    
    print(f"\n📊 Class Distribution:")
    print(data['is_toxic'].value_counts())
    print(f"\n   Toxic ratio: {data['is_toxic'].mean():.2%}")
    
    # Preprocess text
    print("\n🔄 Preprocessing text...")
    data['text_clean'] = data['text'].apply(preprocess_text)
    
    # Remove empty texts
    data = data[data['text_clean'].str.len() > 0]
    
    print(f"✅ Final dataset size: {len(data):,} samples")
    
    return data

def train_model(data):
    """Train toxicity classification model"""
    print("\n" + "=" * 60)
    print("STEP 3: MODEL TRAINING")
    print("=" * 60)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        data['text_clean'],
        data['is_toxic'],
        test_size=0.2,
        random_state=42,
        stratify=data['is_toxic']
    )
    
    print(f"\n📊 Data Split:")
    print(f"   Training samples: {len(X_train):,}")
    print(f"   Test samples: {len(X_test):,}")
    print(f"   Training toxic ratio: {y_train.mean():.2%}")
    print(f"   Test toxic ratio: {y_test.mean():.2%}")
    
    # Create TF-IDF vectorizer
    print("\n🔄 Creating TF-IDF features...")
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        min_df=2,  # Reduced from 5 to handle smaller datasets
        max_df=0.9,  # Increased from 0.8 to be more permissive
        strip_accents='unicode',
        analyzer='word',
        token_pattern=r'\w{1,}',
        use_idf=True,
        smooth_idf=True,
        sublinear_tf=True
    )
    
    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)
    
    print(f"✅ TF-IDF matrix shape: {X_train_tfidf.shape}")
    
    # Train model
    print("\n🤖 Training Logistic Regression model...")
    model = LogisticRegression(
        C=4.0,
        class_weight='balanced',
        solver='saga',
        max_iter=1000,
        random_state=42,
        n_jobs=-1,
        verbose=1
    )
    
    model.fit(X_train_tfidf, y_train)
    
    print("\n✅ Model training complete!")
    
    # Save model and vectorizer
    print("\n💾 Saving model and vectorizer...")
    with open('toxicity_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    
    with open('toxicity_vectorizer.pkl', 'wb') as f:
        pickle.dump(vectorizer, f)
    
    print("✅ Model saved to: toxicity_model.pkl")
    print("✅ Vectorizer saved to: toxicity_vectorizer.pkl")
    
    return model, vectorizer, X_train_tfidf, X_test_tfidf, y_train, y_test

def evaluate_model(model, X_test_tfidf, y_test):
    """Comprehensive model evaluation"""
    print("\n" + "=" * 60)
    print("STEP 4: MODEL EVALUATION")
    print("=" * 60)
    
    # Predictions
    y_pred = model.predict(X_test_tfidf)
    y_pred_proba = model.predict_proba(X_test_tfidf)[:, 1]
    
    # Calculate metrics
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred),
        'precision': precision_score(y_test, y_pred),
        'recall': recall_score(y_test, y_pred),
        'f1_score': f1_score(y_test, y_pred),
        'roc_auc': roc_auc_score(y_test, y_pred_proba)
    }
    
    # Confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    
    metrics['true_negatives'] = int(tn)
    metrics['false_positives'] = int(fp)
    metrics['false_negatives'] = int(fn)
    metrics['true_positives'] = int(tp)
    metrics['specificity'] = tn / (tn + fp) if (tn + fp) > 0 else 0
    metrics['false_positive_rate'] = fp / (fp + tn) if (fp + tn) > 0 else 0
    metrics['false_negative_rate'] = fn / (fn + tp) if (fn + tp) > 0 else 0
    
    # Print results
    print("\n📊 PERFORMANCE METRICS:")
    print(f"   Accuracy:  {metrics['accuracy']:.4f} ({metrics['accuracy']*100:.2f}%)")
    print(f"   Precision: {metrics['precision']:.4f} ({metrics['precision']*100:.2f}%)")
    print(f"   Recall:    {metrics['recall']:.4f} ({metrics['recall']*100:.2f}%)")
    print(f"   F1 Score:  {metrics['f1_score']:.4f} ({metrics['f1_score']*100:.2f}%)")
    print(f"   ROC-AUC:   {metrics['roc_auc']:.4f} ({metrics['roc_auc']*100:.2f}%)")
    print(f"   Specificity: {metrics['specificity']:.4f} ({metrics['specificity']*100:.2f}%)")
    
    print("\n📊 CONFUSION MATRIX VALUES:")
    print(f"   True Negatives:  {tn:,}")
    print(f"   False Positives: {fp:,}")
    print(f"   False Negatives: {fn:,}")
    print(f"   True Positives:  {tp:,}")
    
    print("\n📊 CLASSIFICATION REPORT:")
    print(classification_report(y_test, y_pred, target_names=['Not Toxic', 'Toxic']))
    
    return metrics, cm, y_pred, y_pred_proba

def plot_confusion_matrix(cm, save_path='confusion_matrix.png'):
    """Plot confusion matrix heatmap"""
    print(f"\n📈 Generating confusion matrix visualization...")
    
    plt.figure(figsize=(10, 8))
    
    # Create annotations
    total = np.sum(cm)
    group_names = ['True Negative', 'False Positive', 'False Negative', 'True Positive']
    group_counts = [f'{value:,}' for value in cm.flatten()]
    group_percentages = [f'{value/total*100:.2f}%' for value in cm.flatten()]
    
    labels = [f'{v1}\n{v2}\n{v3}' for v1, v2, v3 in zip(group_names, group_counts, group_percentages)]
    labels = np.asarray(labels).reshape(2, 2)
    
    # Plot heatmap
    sns.heatmap(cm, annot=labels, fmt='', cmap='Blues', 
                cbar_kws={'label': 'Count'},
                xticklabels=['Not Toxic', 'Toxic'],
                yticklabels=['Not Toxic', 'Toxic'],
                linewidths=2, linecolor='black')
    
    plt.ylabel('True Label', fontsize=14, fontweight='bold')
    plt.xlabel('Predicted Label', fontsize=14, fontweight='bold')
    plt.title('Confusion Matrix - YouTube Toxicity Classifier', fontsize=16, fontweight='bold', pad=20)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✅ Confusion matrix saved to: {save_path}")
    plt.close()

def generate_correlation_matrix(X_train_tfidf, y_train, vectorizer, top_n=30, save_path='correlation_matrix.png'):
    """Generate correlation matrix for top features with toxicity label"""
    print(f"\n📈 Generating correlation matrix for top {top_n} features...")
    
    # Convert sparse matrix to dense for top features
    # Get feature importances from a simple correlation
    feature_names = vectorizer.get_feature_names_out()
    
    # Calculate point-biserial correlation (for binary target)
    correlations = []
    X_dense = X_train_tfidf.toarray()
    
    for i in range(X_dense.shape[1]):
        corr = np.corrcoef(X_dense[:, i], y_train)[0, 1]
        if not np.isnan(corr):
            correlations.append((feature_names[i], abs(corr), corr))
    
    # Sort by absolute correlation
    correlations.sort(key=lambda x: x[1], reverse=True)
    
    # Get top N features
    top_features = [feat[0] for feat in correlations[:top_n]]
    top_indices = [np.where(feature_names == feat)[0][0] for feat in top_features]
    
    # Create dataframe with top features
    X_top = X_dense[:, top_indices]
    feature_data = pd.DataFrame(X_top, columns=top_features)
    feature_data['Toxicity'] = y_train.values
    
    # Calculate correlation matrix
    corr_matrix = feature_data.corr()
    
    # Plot correlation matrix
    plt.figure(figsize=(16, 14))
    
    # Create mask for upper triangle
    mask = np.triu(np.ones_like(corr_matrix, dtype=bool), k=1)
    
    # Plot heatmap
    sns.heatmap(corr_matrix, 
                mask=mask,
                annot=True, 
                fmt='.2f', 
                cmap='coolwarm',
                center=0,
                vmin=-1, 
                vmax=1,
                square=True,
                linewidths=0.5,
                cbar_kws={"shrink": 0.8, "label": "Correlation Coefficient"},
                annot_kws={"size": 8})
    
    plt.title(f'Correlation Matrix - Top {top_n} Features vs Toxicity', 
              fontsize=16, fontweight='bold', pad=20)
    plt.xticks(rotation=45, ha='right', fontsize=9)
    plt.yticks(rotation=0, fontsize=9)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    print(f"✅ Correlation matrix saved to: {save_path}")
    plt.close()
    
    # Save correlation data
    os.makedirs('evaluation_results', exist_ok=True)
    
    # Save feature-toxicity correlations
    toxicity_corr = corr_matrix['Toxicity'].drop('Toxicity').sort_values(ascending=False)
    toxicity_corr_df = pd.DataFrame({
        'Feature': toxicity_corr.index,
        'Correlation': toxicity_corr.values,
        'Abs_Correlation': np.abs(toxicity_corr.values)
    })
    toxicity_corr_df.to_csv('evaluation_results/feature_toxicity_correlation.csv', index=False)
    print(f"✅ Feature correlations saved to: evaluation_results/feature_toxicity_correlation.csv")
    
    # Return top correlations for reporting
    return corr_matrix, toxicity_corr_df

def generate_results_report(metrics, cm, model, vectorizer):
    """Generate comprehensive results report"""
    print("\n" + "=" * 60)
    print("STEP 5: GENERATING COMPREHENSIVE REPORT")
    print("=" * 60)
    
    os.makedirs('evaluation_results', exist_ok=True)
    
    # 1. Metrics table
    metrics_data = {
        'Metric': [
            'Accuracy',
            'Precision',
            'Recall',
            'F1 Score',
            'ROC-AUC',
            'Specificity',
            'False Positive Rate',
            'False Negative Rate'
        ],
        'Value': [
            f"{metrics['accuracy']:.4f}",
            f"{metrics['precision']:.4f}",
            f"{metrics['recall']:.4f}",
            f"{metrics['f1_score']:.4f}",
            f"{metrics['roc_auc']:.4f}",
            f"{metrics['specificity']:.4f}",
            f"{metrics['false_positive_rate']:.4f}",
            f"{metrics['false_negative_rate']:.4f}"
        ],
        'Percentage': [
            f"{metrics['accuracy']*100:.2f}%",
            f"{metrics['precision']*100:.2f}%",
            f"{metrics['recall']*100:.2f}%",
            f"{metrics['f1_score']*100:.2f}%",
            f"{metrics['roc_auc']*100:.2f}%",
            f"{metrics['specificity']*100:.2f}%",
            f"{metrics['false_positive_rate']*100:.2f}%",
            f"{metrics['false_negative_rate']*100:.2f}%"
        ]
    }
    
    df_metrics = pd.DataFrame(metrics_data)
    df_metrics.to_csv('evaluation_results/metrics_table.csv', index=False)
    print("✅ Metrics table saved to: evaluation_results/metrics_table.csv")
    
    # 2. Confusion matrix table
    tn, fp, fn, tp = cm.ravel()
    total = tn + fp + fn + tp
    
    cm_data = {
        'Category': ['True Negatives', 'False Positives', 'False Negatives', 'True Positives', 'Total'],
        'Count': [tn, fp, fn, tp, total],
        'Percentage': [
            f"{(tn/total)*100:.2f}%",
            f"{(fp/total)*100:.2f}%",
            f"{(fn/total)*100:.2f}%",
            f"{(tp/total)*100:.2f}%",
            "100.00%"
        ]
    }
    
    df_cm = pd.DataFrame(cm_data)
    df_cm.to_csv('evaluation_results/confusion_matrix_table.csv', index=False)
    print("✅ Confusion matrix table saved to: evaluation_results/confusion_matrix_table.csv")
    
    # 3. Save metrics to JSON
    metrics_json = {
        'timestamp': datetime.now().isoformat(),
        'dataset': 'youtube-toxicity-data',
        'metrics': {k: float(v) if isinstance(v, (np.floating, float)) else int(v) 
                   for k, v in metrics.items()},
        'confusion_matrix': {
            'true_negatives': int(tn),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'true_positives': int(tp)
        }
    }
    
    with open('evaluation_results/metrics.json', 'w') as f:
        json.dump(metrics_json, f, indent=2)
    print("✅ Metrics JSON saved to: evaluation_results/metrics.json")
    
    # 4. Feature importance
    feature_names = vectorizer.get_feature_names_out()
    coef = model.coef_[0]
    
    # Top toxic features
    top_toxic_idx = np.argsort(coef)[-20:]
    toxic_features = pd.DataFrame({
        'Feature': [feature_names[idx] for idx in reversed(top_toxic_idx)],
        'Coefficient': [coef[idx] for idx in reversed(top_toxic_idx)]
    })
    toxic_features.to_csv('evaluation_results/top_toxic_features.csv', index=False)
    print("✅ Top toxic features saved to: evaluation_results/top_toxic_features.csv")
    
    # Top non-toxic features
    top_safe_idx = np.argsort(coef)[:20]
    safe_features = pd.DataFrame({
        'Feature': [feature_names[idx] for idx in top_safe_idx],
        'Coefficient': [coef[idx] for idx in top_safe_idx]
    })
    safe_features.to_csv('evaluation_results/top_safe_features.csv', index=False)
    print("✅ Top safe features saved to: evaluation_results/top_safe_features.csv")
    
    print("\n" + "=" * 60)
    print("ALL RESULTS SAVED TO: evaluation_results/")
    print("=" * 60)

def main():
    """Main execution pipeline"""
    print("\n" + "=" * 60)
    print("YOUTUBE TOXICITY CLASSIFIER - COMPLETE PIPELINE")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Step 1: Download dataset
        df, dataset_path = download_and_load_dataset()
        
        # Step 2: Prepare data
        data = prepare_data(df)
        
        # Step 3: Train model
        model, vectorizer, X_train_tfidf, X_test_tfidf, y_train, y_test = train_model(data)
        
        # Step 4: Evaluate model
        metrics, cm, y_pred, y_pred_proba = evaluate_model(model, X_test_tfidf, y_test)
        
        # Step 5: Generate visualizations
        plot_confusion_matrix(cm)
        
        # Step 6: Generate correlation matrix
        corr_matrix, toxicity_corr = generate_correlation_matrix(X_train_tfidf, y_train, vectorizer, top_n=30)
        
        # Step 7: Generate comprehensive report
        generate_results_report(metrics, cm, model, vectorizer)
        
        print("\n" + "=" * 60)
        print("✅ PIPELINE COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print(f"\n📊 Final Results:")
        print(f"   Accuracy:  {metrics['accuracy']*100:.2f}%")
        print(f"   Precision: {metrics['precision']*100:.2f}%")
        print(f"   Recall:    {metrics['recall']*100:.2f}%")
        print(f"   F1 Score:  {metrics['f1_score']*100:.2f}%")
        print(f"\n📁 Output Files:")
        print(f"   - toxicity_model.pkl")
        print(f"   - toxicity_vectorizer.pkl")
        print(f"   - confusion_matrix.png")
        print(f"   - correlation_matrix.png")
        print(f"   - evaluation_results/metrics_table.csv")
        print(f"   - evaluation_results/confusion_matrix_table.csv")
        print(f"   - evaluation_results/feature_toxicity_correlation.csv")
        print(f"   - evaluation_results/metrics.json")
        print(f"   - evaluation_results/top_toxic_features.csv")
        print(f"   - evaluation_results/top_safe_features.csv")
        
        print(f"\nCompleted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())
