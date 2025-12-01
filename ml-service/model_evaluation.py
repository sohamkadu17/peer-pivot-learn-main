"""
Comprehensive Model Evaluation with Confusion Matrix and Accuracy Metrics
This script generates detailed performance metrics for the toxicity classifier
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    confusion_matrix, classification_report, 
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, precision_recall_curve,
    matthews_corrcoef, cohen_kappa_score
)
from sklearn.model_selection import cross_val_score, cross_val_predict
import pickle
import json

class ModelEvaluator:
    """Comprehensive model evaluation toolkit"""
    
    def __init__(self, model_path='toxicity_model.pkl', vectorizer_path='toxicity_vectorizer.pkl'):
        """Load trained model and vectorizer"""
        with open(model_path, 'rb') as f:
            self.model = pickle.load(f)
        
        with open(vectorizer_path, 'rb') as f:
            self.vectorizer = pickle.load(f)
    
    def evaluate_model(self, X_test, y_test):
        """
        Comprehensive model evaluation
        
        Args:
            X_test: Test features (raw text or TF-IDF matrix)
            y_test: True labels
            
        Returns:
            Dictionary with all metrics
        """
        # Transform text if needed
        if isinstance(X_test, pd.Series) or isinstance(X_test, list):
            X_test_tfidf = self.vectorizer.transform(X_test)
        else:
            X_test_tfidf = X_test
        
        # Predictions
        y_pred = self.model.predict(X_test_tfidf)
        y_pred_proba = self.model.predict_proba(X_test_tfidf)[:, 1]
        
        # Calculate all metrics
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred),
            'recall': recall_score(y_test, y_pred),
            'f1_score': f1_score(y_test, y_pred),
            'roc_auc': roc_auc_score(y_test, y_pred_proba),
            'matthews_corrcoef': matthews_corrcoef(y_test, y_pred),
            'cohen_kappa': cohen_kappa_score(y_test, y_pred)
        }
        
        # Confusion matrix
        cm = confusion_matrix(y_test, y_pred)
        tn, fp, fn, tp = cm.ravel()
        
        # Additional metrics from confusion matrix
        metrics['true_negatives'] = int(tn)
        metrics['false_positives'] = int(fp)
        metrics['false_negatives'] = int(fn)
        metrics['true_positives'] = int(tp)
        metrics['specificity'] = tn / (tn + fp) if (tn + fp) > 0 else 0
        metrics['false_positive_rate'] = fp / (fp + tn) if (fp + tn) > 0 else 0
        metrics['false_negative_rate'] = fn / (fn + tp) if (fn + tp) > 0 else 0
        
        return metrics, cm, y_pred, y_pred_proba
    
    def plot_confusion_matrix(self, cm, save_path='confusion_matrix.png'):
        """
        Plot and save confusion matrix heatmap
        
        Args:
            cm: Confusion matrix
            save_path: Path to save the plot
        """
        plt.figure(figsize=(10, 8))
        
        # Create annotations
        group_names = ['True Negative', 'False Positive', 'False Negative', 'True Positive']
        group_counts = [f'{value:,}' for value in cm.flatten()]
        group_percentages = [f'{value:.2%}' for value in cm.flatten() / np.sum(cm)]
        
        labels = [f'{v1}\n{v2}\n{v3}' for v1, v2, v3 in zip(group_names, group_counts, group_percentages)]
        labels = np.asarray(labels).reshape(2, 2)
        
        # Plot heatmap
        sns.heatmap(cm, annot=labels, fmt='', cmap='Blues', 
                    cbar_kws={'label': 'Count'},
                    xticklabels=['Not Toxic', 'Toxic'],
                    yticklabels=['Not Toxic', 'Toxic'])
        
        plt.ylabel('True Label', fontsize=12)
        plt.xlabel('Predicted Label', fontsize=12)
        plt.title('Confusion Matrix - Toxicity Classifier', fontsize=14, fontweight='bold')
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"✅ Confusion matrix saved to {save_path}")
        plt.close()
    
    def plot_roc_curve(self, y_test, y_pred_proba, save_path='roc_curve.png'):
        """Plot ROC curve"""
        plt.figure(figsize=(10, 8))
        
        fpr, tpr, thresholds = roc_curve(y_test, y_pred_proba)
        roc_auc = roc_auc_score(y_test, y_pred_proba)
        
        plt.plot(fpr, tpr, color='darkorange', lw=2, 
                label=f'ROC curve (AUC = {roc_auc:.4f})')
        plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--', label='Random Classifier')
        
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate', fontsize=12)
        plt.ylabel('True Positive Rate', fontsize=12)
        plt.title('Receiver Operating Characteristic (ROC) Curve', fontsize=14, fontweight='bold')
        plt.legend(loc="lower right")
        plt.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"✅ ROC curve saved to {save_path}")
        plt.close()
    
    def plot_precision_recall_curve(self, y_test, y_pred_proba, save_path='precision_recall_curve.png'):
        """Plot Precision-Recall curve"""
        plt.figure(figsize=(10, 8))
        
        precision, recall, thresholds = precision_recall_curve(y_test, y_pred_proba)
        
        plt.plot(recall, precision, color='blue', lw=2, label='Precision-Recall curve')
        plt.xlabel('Recall', fontsize=12)
        plt.ylabel('Precision', fontsize=12)
        plt.title('Precision-Recall Curve', fontsize=14, fontweight='bold')
        plt.legend(loc="lower left")
        plt.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig(save_path, dpi=300, bbox_inches='tight')
        print(f"✅ Precision-Recall curve saved to {save_path}")
        plt.close()
    
    def generate_metrics_table(self, metrics):
        """
        Generate comprehensive metrics table
        
        Args:
            metrics: Dictionary of metrics
            
        Returns:
            DataFrame with formatted metrics
        """
        # Create metrics DataFrame
        metrics_data = {
            'Metric': [
                'Accuracy',
                'Precision',
                'Recall (Sensitivity)',
                'F1 Score',
                'Specificity',
                'ROC-AUC Score',
                'Matthews Correlation Coefficient',
                'Cohen\'s Kappa',
                'False Positive Rate',
                'False Negative Rate'
            ],
            'Value': [
                f"{metrics['accuracy']:.4f}",
                f"{metrics['precision']:.4f}",
                f"{metrics['recall']:.4f}",
                f"{metrics['f1_score']:.4f}",
                f"{metrics['specificity']:.4f}",
                f"{metrics['roc_auc']:.4f}",
                f"{metrics['matthews_corrcoef']:.4f}",
                f"{metrics['cohen_kappa']:.4f}",
                f"{metrics['false_positive_rate']:.4f}",
                f"{metrics['false_negative_rate']:.4f}"
            ],
            'Percentage': [
                f"{metrics['accuracy']*100:.2f}%",
                f"{metrics['precision']*100:.2f}%",
                f"{metrics['recall']*100:.2f}%",
                f"{metrics['f1_score']*100:.2f}%",
                f"{metrics['specificity']*100:.2f}%",
                f"{metrics['roc_auc']*100:.2f}%",
                '-',
                '-',
                f"{metrics['false_positive_rate']*100:.2f}%",
                f"{metrics['false_negative_rate']*100:.2f}%"
            ],
            'Description': [
                'Overall correctness of predictions',
                'Proportion of positive predictions that are correct',
                'Proportion of actual positives correctly identified',
                'Harmonic mean of precision and recall',
                'Proportion of actual negatives correctly identified',
                'Area under ROC curve (discrimination ability)',
                'Correlation between observed and predicted',
                'Agreement between predictions and truth',
                'Proportion of negatives incorrectly classified',
                'Proportion of positives incorrectly classified'
            ]
        }
        
        df_metrics = pd.DataFrame(metrics_data)
        return df_metrics
    
    def generate_confusion_matrix_table(self, cm):
        """Generate confusion matrix breakdown table"""
        tn, fp, fn, tp = cm.ravel()
        total = tn + fp + fn + tp
        
        cm_data = {
            'Category': [
                'True Negatives (TN)',
                'False Positives (FP)',
                'False Negatives (FN)',
                'True Positives (TP)',
                'Total Samples'
            ],
            'Count': [tn, fp, fn, tp, total],
            'Percentage': [
                f"{(tn/total)*100:.2f}%",
                f"{(fp/total)*100:.2f}%",
                f"{(fn/total)*100:.2f}%",
                f"{(tp/total)*100:.2f}%",
                '100.00%'
            ],
            'Description': [
                'Correctly identified non-toxic comments',
                'Non-toxic comments incorrectly flagged as toxic',
                'Toxic comments missed (not detected)',
                'Correctly identified toxic comments',
                'Total test samples'
            ]
        }
        
        df_cm = pd.DataFrame(cm_data)
        return df_cm
    
    def cross_validation_analysis(self, X, y, cv=5):
        """Perform cross-validation and return metrics"""
        # Transform if needed
        if isinstance(X, pd.Series) or isinstance(X, list):
            X_tfidf = self.vectorizer.transform(X)
        else:
            X_tfidf = X
        
        # Calculate various scores
        cv_scores = {
            'accuracy': cross_val_score(self.model, X_tfidf, y, cv=cv, scoring='accuracy'),
            'precision': cross_val_score(self.model, X_tfidf, y, cv=cv, scoring='precision'),
            'recall': cross_val_score(self.model, X_tfidf, y, cv=cv, scoring='recall'),
            'f1': cross_val_score(self.model, X_tfidf, y, cv=cv, scoring='f1'),
            'roc_auc': cross_val_score(self.model, X_tfidf, y, cv=cv, scoring='roc_auc')
        }
        
        # Create summary table
        cv_data = {
            'Metric': [],
            'Mean': [],
            'Std Dev': [],
            'Min': [],
            'Max': []
        }
        
        for metric_name, scores in cv_scores.items():
            cv_data['Metric'].append(metric_name.upper())
            cv_data['Mean'].append(f"{scores.mean():.4f}")
            cv_data['Std Dev'].append(f"{scores.std():.4f}")
            cv_data['Min'].append(f"{scores.min():.4f}")
            cv_data['Max'].append(f"{scores.max():.4f}")
        
        df_cv = pd.DataFrame(cv_data)
        return df_cv, cv_scores
    
    def generate_full_report(self, X_test, y_test, output_dir='evaluation_results'):
        """
        Generate complete evaluation report with all visualizations and tables
        
        Args:
            X_test: Test features
            y_test: Test labels
            output_dir: Directory to save results
        """
        import os
        os.makedirs(output_dir, exist_ok=True)
        
        print("=" * 60)
        print("TOXICITY CLASSIFIER - COMPREHENSIVE EVALUATION REPORT")
        print("=" * 60)
        
        # 1. Evaluate model
        print("\n📊 Evaluating model performance...")
        metrics, cm, y_pred, y_pred_proba = self.evaluate_model(X_test, y_test)
        
        # 2. Generate metrics table
        print("\n📋 Generating metrics tables...")
        df_metrics = self.generate_metrics_table(metrics)
        print("\n" + "=" * 60)
        print("PERFORMANCE METRICS")
        print("=" * 60)
        print(df_metrics.to_string(index=False))
        df_metrics.to_csv(f'{output_dir}/metrics_table.csv', index=False)
        
        # 3. Generate confusion matrix table
        df_cm = self.generate_confusion_matrix_table(cm)
        print("\n" + "=" * 60)
        print("CONFUSION MATRIX BREAKDOWN")
        print("=" * 60)
        print(df_cm.to_string(index=False))
        df_cm.to_csv(f'{output_dir}/confusion_matrix_table.csv', index=False)
        
        # 4. Classification report
        print("\n" + "=" * 60)
        print("DETAILED CLASSIFICATION REPORT")
        print("=" * 60)
        print(classification_report(y_test, y_pred, target_names=['Not Toxic', 'Toxic']))
        
        # 5. Plot confusion matrix
        print("\n📈 Generating visualizations...")
        self.plot_confusion_matrix(cm, f'{output_dir}/confusion_matrix.png')
        
        # 6. Plot ROC curve
        self.plot_roc_curve(y_test, y_pred_proba, f'{output_dir}/roc_curve.png')
        
        # 7. Plot Precision-Recall curve
        self.plot_precision_recall_curve(y_test, y_pred_proba, f'{output_dir}/precision_recall_curve.png')
        
        # 8. Save metrics to JSON
        with open(f'{output_dir}/metrics.json', 'w') as f:
            json.dump(metrics, f, indent=2)
        print(f"✅ Metrics saved to {output_dir}/metrics.json")
        
        print("\n" + "=" * 60)
        print("EVALUATION COMPLETE")
        print("=" * 60)
        print(f"\n📁 All results saved to: {output_dir}/")
        print(f"   - metrics_table.csv")
        print(f"   - confusion_matrix_table.csv")
        print(f"   - confusion_matrix.png")
        print(f"   - roc_curve.png")
        print(f"   - precision_recall_curve.png")
        print(f"   - metrics.json")
        
        return metrics, cm, df_metrics, df_cm


def main():
    """Example usage"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python model_evaluation.py <test_data.csv>")
        print("\nTest data should have 'text' and 'is_toxic' columns")
        return
    
    # Load test data
    test_data_path = sys.argv[1]
    print(f"Loading test data from: {test_data_path}")
    df_test = pd.read_csv(test_data_path)
    
    # Preprocess if needed
    from train_model import preprocess_text
    if 'text_clean' not in df_test.columns:
        df_test['text_clean'] = df_test['text'].apply(preprocess_text)
    
    X_test = df_test['text_clean']
    y_test = df_test['is_toxic']
    
    # Create evaluator
    evaluator = ModelEvaluator()
    
    # Generate full report
    evaluator.generate_full_report(X_test, y_test)
    
    # Optional: Cross-validation analysis
    print("\n" + "=" * 60)
    print("CROSS-VALIDATION ANALYSIS")
    print("=" * 60)
    df_cv, cv_scores = evaluator.cross_validation_analysis(X_test, y_test, cv=5)
    print(df_cv.to_string(index=False))
    df_cv.to_csv('evaluation_results/cross_validation_scores.csv', index=False)
    print("✅ Cross-validation results saved")


if __name__ == '__main__':
    main()
